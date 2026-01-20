/**
 * Salesforce Client for Workato API Integration
 * 
 * This client encapsulates all Workato API communication for Salesforce operations,
 * providing a clean TypeScript interface with error handling, caching, and retry logic.
 */

import axios, { AxiosInstance } from 'axios';
import { randomUUID } from 'crypto';
import { WorkatoSalesforceConfig } from './config';
import { WorkatoSalesforceError, createWorkatoError, isRetryableError } from './errors';
import { MockDataStore } from './mock-data-store';
import { WorkatoLogger } from './logger';
import { logApiRequest, logApiResponse, logApiError } from '../utils/api-logger';
import { isValidIdempotencyToken } from '../utils/idempotency';
import {
  Room,
  RoomSearchCriteria,
  ServiceRequest,
  ServiceRequestCreate,
  ServiceRequestSearch,
  ServiceRequestUpdate,
  MaintenanceTask,
  MaintenanceTaskCreate,
  MaintenanceTaskSearch,
  MaintenanceTaskUpdate,
  Charge,
  ChargeCreate,
  ChargeSearch,
  ChargeUpdate,
  Contact,
  ContactSearchCriteria,
} from '../../types/salesforce';

/**
 * Cache entry structure for storing cached responses
 */
interface CacheEntry {
  data: any;
  expiresAt: number;  // Unix timestamp in milliseconds
  createdAt: number;  // Unix timestamp in milliseconds
}

/**
 * Salesforce Client class
 * Handles all communication with Workato API for Salesforce operations
 */
export class SalesforceClient {
  private config: WorkatoSalesforceConfig;
  private cache: Map<string, CacheEntry>;
  private httpClient: AxiosInstance;
  private mockDataStore: MockDataStore | null;
  private logger: WorkatoLogger;

  /**
   * Creates a new SalesforceClient instance
   * 
   * @param config - Configuration for the Salesforce client
   */
  constructor(config: WorkatoSalesforceConfig) {
    this.config = config;
    this.cache = new Map<string, CacheEntry>();
    
    // Initialize mock data store if in mock mode
    this.mockDataStore = config.mockMode ? new MockDataStore() : null;

    // Initialize logger
    this.logger = new WorkatoLogger(true, 'info');

    // Initialize HTTP client with axios
    this.httpClient = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'API-TOKEN': config.apiToken,
      },
    });

    // Log configuration for debugging (without exposing full token)
    if (process.env.SHOW_API_RESPONSES === 'true') {
      console.log('[SalesforceClient] Configuration:', {
        baseURL: config.baseUrl,
        timeout: config.timeout,
        apiTokenPrefix: config.apiToken.substring(0, 10) + '...',
        mockMode: config.mockMode,
      });
    }
  }

  /**
   * Generates a cache key from method name and parameters
   * 
   * @param method - The method name (e.g., 'getRoom', 'searchRooms')
   * @param params - The parameters passed to the method
   * @returns A unique cache key string
   */
  private getCacheKey(method: string, params: any): string {
    // Convert params to a stable string representation
    const paramsString = JSON.stringify(params, Object.keys(params).sort());
    return `${method}:${paramsString}`;
  }

  /**
   * Retrieves a cached response if it exists and hasn't expired
   * 
   * @param key - The cache key
   * @returns The cached data if valid, null otherwise
   */
  private getCachedResponse<T>(key: string): T | null {
    if (!this.config.cacheEnabled) {
      return null;
    }

    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    
    // Check if cache entry has expired (>= to handle edge case of 0ms TTL)
    if (now >= entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Stores a response in the cache with a TTL (time to live)
   * 
   * @param key - The cache key
   * @param data - The data to cache
   * @param ttl - Time to live in milliseconds
   */
  private setCachedResponse<T>(key: string, data: T, ttl: number): void {
    if (!this.config.cacheEnabled) {
      return;
    }

    const now = Date.now();
    
    const entry: CacheEntry = {
      data,
      expiresAt: now + ttl,
      createdAt: now,
    };

    this.cache.set(key, entry);
  }

  /**
   * Invalidates all cache entries that start with a given prefix
   * Used to clear related cache entries when data is modified
   * 
   * @param prefix - The prefix to match (e.g., 'room:', 'service:')
   */
  private invalidateCacheByPrefix(prefix: string): void {
    if (!this.config.cacheEnabled) {
      return;
    }

    const keysToDelete: string[] = [];
    
    // Convert iterator to array to avoid downlevelIteration requirement
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Clears all cached data
   * Public method for manual cache clearing
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Validates that at least one search criterion is provided
   * Required by Salesforce API - queries with no filters will fail
   * 
   * @param criteria - The search criteria object
   * @param requiredFields - List of valid filter field names
   * @param operationName - Name of the operation for error messages
   * @throws WorkatoSalesforceError if no valid filters are provided
   */
  private validateSearchCriteria(
    criteria: any,
    requiredFields: string[],
    operationName: string
  ): void {
    const hasAtLeastOne = requiredFields.some(field => {
      const value = criteria[field];
      return value !== undefined && value !== null && value !== '';
    });
    
    if (!hasAtLeastOne) {
      throw new WorkatoSalesforceError(
        `At least one filter parameter is required for ${operationName}: ${requiredFields.join(', ')}`,
        400,
        operationName,
        randomUUID(),
        false
      );
    }
  }

  // ============================================================================
  // Request Handling and Retry Logic
  // ============================================================================

  /**
   * Makes an HTTP request to the Workato API with error handling and logging
   * 
   * @param method - HTTP method (GET, POST, PUT, PATCH, DELETE)
   * @param endpoint - API endpoint path
   * @param data - Request body data (optional)
   * @returns Promise resolving to the response data
   * @throws WorkatoSalesforceError on failure
   */
  private async makeRequest<T>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<T> {
    const correlationId = randomUUID();
    const startTime = Date.now();
    const fullUrl = `${this.config.baseUrl}${endpoint}`;

    // Log the request (internal logger)
    this.logger.logRequest({
      timestamp: new Date().toISOString(),
      correlationId,
      method: method.toUpperCase(),
      endpoint,
      requestData: data,
    });

    // Pretty print API request if enabled
    logApiRequest({
      method: method.toUpperCase(),
      url: fullUrl,
      headers: {
        'Content-Type': 'application/json',
        'API-TOKEN': this.config.apiToken,
      },
      body: data,
    });

    try {
      // Make the HTTP request
      const response = await this.httpClient.request({
        method: method.toLowerCase(),
        url: endpoint,
        data,
      });

      const duration = Date.now() - startTime;

      // Log successful response (internal logger)
      this.logger.logResponse({
        timestamp: new Date().toISOString(),
        correlationId,
        method: method.toUpperCase(),
        endpoint,
        statusCode: response.status,
        duration,
        responseData: response.data,
      });

      // Pretty print API response if enabled
      logApiResponse({
        method: method.toUpperCase(),
        url: fullUrl,
        response: response.data,
        duration,
      });

      return response.data as T;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Create a WorkatoSalesforceError from the error
      const workatoError = createWorkatoError(error, endpoint, correlationId);

      // Log the error (internal logger)
      this.logger.logError({
        timestamp: new Date().toISOString(),
        correlationId,
        method: method.toUpperCase(),
        endpoint,
        statusCode: workatoError.statusCode,
        duration,
        error: workatoError.message,
        requestData: data,
      });

      // Pretty print API error if enabled
      logApiError({
        method: method.toUpperCase(),
        url: fullUrl,
        error: workatoError,
        duration,
      });

      // Throw the formatted error
      throw workatoError;
    }
  }

  /**
   * Retries a function with exponential backoff
   * 
   * @param fn - The function to retry
   * @param attempts - Number of retry attempts (from config)
   * @returns Promise resolving to the function result
   * @throws WorkatoSalesforceError if all retries fail
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    attempts: number
  ): Promise<T> {
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error: any) {
        // If this is the last attempt or error is not retryable, throw immediately
        if (i === attempts - 1 || !this.isRetryable(error)) {
          throw error;
        }

        // Calculate exponential backoff delay (2^i * 1000ms, max 10s)
        const delay = Math.min(1000 * Math.pow(2, i), 10000);

        // Log retry attempt
        console.warn(
          `[Workato Retry] Attempt ${i + 1}/${attempts} failed. Retrying in ${delay}ms...`,
          {
            error: error.message,
            correlationId: error.correlationId,
          }
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // This should never be reached due to the throw in the loop
    throw new Error('Retry logic failed unexpectedly');
  }

  /**
   * Determines if an error should trigger a retry attempt
   * 
   * @param error - The error to classify
   * @returns true if the error is retryable, false otherwise
   */
  private isRetryable(error: any): boolean {
    return isRetryableError(error);
  }

  // ============================================================================
  // Contact Operations
  // ============================================================================

  /**
   * Search for contacts based on criteria
   * Implements caching with 60s TTL for search results
   * 
   * MIGRATION NOTE: Uses new /search-contacts endpoint
   * Requires at least one filter parameter (query, email, or contact_type)
   * 
   * @param criteria - Search criteria for filtering contacts (query, email, contact_type)
   * @returns Promise resolving to array of matching contacts
   * @throws WorkatoSalesforceError if no filters provided
   */
  async searchContacts(criteria: ContactSearchCriteria = {}): Promise<Contact[]> {
    // Check cache first
    const cacheKey = this.getCacheKey('searchContacts', criteria);
    const cachedResult = this.getCachedResponse<Contact[]>(cacheKey);
    
    if (cachedResult !== null) {
      return cachedResult;
    }

    // Mock mode: return mock data
    if (this.mockDataStore) {
      // For mock mode, return sample contacts
      const mockContacts: Contact[] = [
        {
          id: 'contact_001',
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1-555-0101',
          contact_type: 'Guest',
          loyalty_number: 'LOYAL123',
          account_name: 'Doe Family',
          created_date: new Date().toISOString(),
          last_modified_date: new Date().toISOString(),
        },
        {
          id: 'contact_002',
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@example.com',
          phone: '+1-555-0102',
          contact_type: 'Guest',
          account_name: 'Smith Family',
          created_date: new Date().toISOString(),
          last_modified_date: new Date().toISOString(),
        },
      ];

      // Filter mock contacts based on criteria
      let filtered = mockContacts;
      
      if (criteria.query) {
        const queryLower = criteria.query.toLowerCase();
        filtered = filtered.filter(c => 
          c.first_name.toLowerCase().includes(queryLower) ||
          c.last_name.toLowerCase().includes(queryLower) ||
          c.email.toLowerCase().includes(queryLower)
        );
      }
      
      if (criteria.email) {
        filtered = filtered.filter(c => 
          c.email.toLowerCase() === criteria.email!.toLowerCase()
        );
      }
      
      if (criteria.contact_type) {
        filtered = filtered.filter(c => c.contact_type === criteria.contact_type);
      }

      const limited = criteria.limit ? filtered.slice(0, criteria.limit) : filtered;
      this.setCachedResponse(cacheKey, limited, 60000); // 60s TTL
      return limited;
    }

    // Validate that at least one filter is provided (required by real API)
    this.validateSearchCriteria(
      criteria,
      ['query', 'email', 'contact_type'],
      'searchContacts'
    );

    // Real API call with retry logic
    // New endpoint: /search-contacts (API Collection)
    const response = await this.retryWithBackoff(
      () => this.makeRequest<{ contacts: any[]; count: number; found: boolean }>(
        'POST', 
        '/search-contacts', 
        criteria
      ),
      this.config.retryAttempts
    );

    // Transform API response to match Contact interface
    const contacts: Contact[] = (response.contacts || []).map((c: any) => ({
      id: c.Id || c.id,
      first_name: c.FirstName || c.first_name || '',
      last_name: c.LastName || c.last_name || '',
      email: c.Email || c.email || '',
      phone: c.Phone || c.phone || undefined,
      contact_type: c.Contact_Type__c || c.contact_type || undefined,
      loyalty_number: c.Loyalty_Number__c || c.loyalty_number || undefined,
      account_id: c.AccountId || c.account_id || undefined,
      account_name: c.Account?.Name || c.account_name || undefined,
      created_date: c.CreatedDate || c.created_date || new Date().toISOString(),
      last_modified_date: c.LastModifiedDate || c.last_modified_date || new Date().toISOString(),
    }));

    // Cache the result
    this.setCachedResponse(cacheKey, contacts, 60000); // 60s TTL
    
    return contacts;
  }

  // ============================================================================
  // Room Operations
  // ============================================================================

  /**
   * Search for rooms based on criteria
   * Implements caching with 60s TTL for search results
   * 
   * MIGRATION NOTE: Updated to use new /search-rooms endpoint
   * Requires at least one filter parameter (status, floor, or type)
   * 
   * @param criteria - Search criteria for filtering rooms (status, floor, type, etc.)
   * @returns Promise resolving to array of matching rooms
   * @throws WorkatoSalesforceError if no filters provided
   */
  async searchRooms(criteria: RoomSearchCriteria = {}): Promise<Room[]> {
    // Check cache first
    const cacheKey = this.getCacheKey('searchRooms', criteria);
    const cachedResult = this.getCachedResponse<Room[]>(cacheKey);
    
    if (cachedResult !== null) {
      return cachedResult;
    }

    // Mock mode: use mock data store (no validation required)
    if (this.mockDataStore) {
      const rooms = await this.mockDataStore.getRooms(criteria);
      this.setCachedResponse(cacheKey, rooms, 60000); // 60s TTL
      return rooms;
    }

    // Validate that at least one filter is provided (required by real API)
    this.validateSearchCriteria(
      criteria,
      ['status', 'floor', 'type'],
      'searchRooms'
    );

    // Real API call with retry logic
    // Updated endpoint: /search-rooms (API Collection)
    const response = await this.retryWithBackoff(
      () => this.makeRequest<{ rooms: any[]; count: number; found: boolean }>(
        'POST', 
        '/search-rooms', 
        criteria
      ),
      this.config.retryAttempts
    );

    // Transform API response to match Room interface
    const rooms: Room[] = (response.rooms || []).map((r: any) => ({
      id: r.id,
      room_number: r.room_number,
      floor: r.floor,
      type: r.room_type?.toLowerCase() || 'standard', // Transform room_type to type and lowercase
      status: r.status?.toLowerCase() || 'vacant', // Ensure status is lowercase
      current_guest_id: r.current_guest_id || null,
      assigned_manager_id: r.assigned_manager_id || null,
      created_at: r.created_at || new Date().toISOString(),
      updated_at: r.updated_at || new Date().toISOString(),
    }));

    // Cache the result
    this.setCachedResponse(cacheKey, rooms, 60000); // 60s TTL
    
    return rooms;
  }

  // ============================================================================
  // Service Request Operations
  // ============================================================================

  /**
   * Create a new service request
   * Invalidates all service request-related cache entries
   * 
   * @param data - The service request data to create
   * @returns Promise resolving to the created service request
   * @throws WorkatoSalesforceError if creation fails or invalid idempotency token
   */
  async createServiceRequest(data: ServiceRequestCreate): Promise<ServiceRequest> {
    // Generate idempotency token if not provided
    if (!data.idempotency_token) {
      data.idempotency_token = randomUUID();
    }
    
    // Validate idempotency token
    if (!isValidIdempotencyToken(data.idempotency_token)) {
      throw new WorkatoSalesforceError(
        `Invalid idempotency token: "${data.idempotency_token}". Must be a valid UUID v4.`,
        400,
        '/submit-guest-service-request',
        randomUUID(),
        false
      );
    }

    // Mock mode: use mock data store
    if (this.mockDataStore) {
      const serviceRequest = await this.mockDataStore.createServiceRequest(data);
      // Invalidate all service request cache entries (updated for new cache keys)
      this.invalidateCacheByPrefix('searchCases:Housekeeping:');
      this.invalidateCacheByPrefix('searchCases:Room Service:');
      return serviceRequest;
    }

    // Real API call with retry logic
    const serviceRequest = await this.retryWithBackoff(
      () => this.makeRequest<ServiceRequest>('POST', '/submit-guest-service-request', data),
      this.config.retryAttempts
    );

    // Invalidate all service request cache entries (updated for new cache keys)
    this.invalidateCacheByPrefix('searchCases:Housekeeping:');
    this.invalidateCacheByPrefix('searchCases:Room Service:');
    
    return serviceRequest;
  }

  /**
   * Search for service requests based on criteria
   * Implements caching with 60s TTL for search results
   * 
   * MIGRATION NOTE: Updated to use new /search-cases endpoint
   * Searches for Housekeeping and Room Service case types (Salesforce picklist values)
   * Requires at least one additional filter parameter
   * Uses business identifiers (guest_email, not guest_id)
   * 
   * @param criteria - Search criteria for filtering service requests
   * @returns Promise resolving to array of matching service requests
   * @throws WorkatoSalesforceError if no filters provided
   */
  async searchServiceRequests(criteria: ServiceRequestSearch = {}): Promise<ServiceRequest[]> {
    // Mock mode: use mock data store (no validation required)
    if (this.mockDataStore) {
      const cacheKey = this.getCacheKey('searchCases:ServiceRequest', criteria);
      const cachedResult = this.getCachedResponse<ServiceRequest[]>(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
      
      const serviceRequests = await this.mockDataStore.getServiceRequests(criteria);
      this.setCachedResponse(cacheKey, serviceRequests, 60000); // 60s TTL
      return serviceRequests;
    }

    // Real API: Search for Housekeeping and Room Service case types
    // Since the API doesn't support OR queries, we need to make separate calls
    const serviceTypes = ['Housekeeping', 'Room Service'];
    const allServiceRequests: ServiceRequest[] = [];
    
    for (const caseType of serviceTypes) {
      // Build case search criteria for this type
      const caseSearchCriteria: any = {
        type: caseType,
        status: criteria.status,
        room_number: criteria.room_number,
        guest_email: criteria.guest_email || criteria.guest_id, // Support both for backward compatibility
        limit: 1000,
      };

      // Check cache first
      const cacheKey = this.getCacheKey(`searchCases:${caseType}`, caseSearchCriteria);
      const cachedResult = this.getCachedResponse<ServiceRequest[]>(cacheKey);
      
      if (cachedResult !== null) {
        allServiceRequests.push(...cachedResult);
        continue;
      }

      try {
        // Validate that at least one filter is provided (type is always present, so this will pass)
        this.validateSearchCriteria(
          caseSearchCriteria,
          ['type', 'status', 'room_number', 'guest_email'],
          'searchServiceRequests'
        );

        // Real API call with retry logic
        const response = await this.retryWithBackoff(
          () => this.makeRequest<{ cases: any[]; count: number; found: boolean }>(
            'POST', 
            '/search-cases', 
            caseSearchCriteria
          ),
          this.config.retryAttempts
        );

        // Extract cases array from response
        const cases = response.cases || [];

        // Map cases to ServiceRequest format
        const serviceRequests: ServiceRequest[] = cases.map((c: any) => ({
          id: c.id,
          guest_id: c.contact_id || '',
          room_number: c.room_number || '',
          type: this.mapCaseTypeToServiceRequestType(c.type),
          priority: this.mapPriority(c.priority) as any,
          description: c.description || '',
          status: this.mapServiceRequestStatus(c.status) as any,
          salesforce_ticket_id: c.case_number,
          created_at: c.created_date,
          updated_at: c.last_modified_date,
        }));

        // Cache the result for this type
        this.setCachedResponse(cacheKey, serviceRequests, 60000); // 60s TTL
        
        allServiceRequests.push(...serviceRequests);
      } catch (error) {
        // If one type fails, continue with others
        console.warn(`[SalesforceClient] Failed to fetch ${caseType} service requests: ${(error as Error).message}`);
      }
    }
    
    return allServiceRequests;
  }

  /**
   * Helper: Map Salesforce Case Type to ServiceRequestType
   */
  private mapCaseTypeToServiceRequestType(caseType: string): any {
    const mapping: Record<string, string> = {
      'Housekeeping': 'housekeeping',
      'Room Service': 'room_service',
      'Maintenance': 'maintenance',
      'Concierge': 'concierge',
    };
    return mapping[caseType] || 'concierge';
  }

  /**
   * Helper: Map case subject to ServiceRequestType (legacy fallback)
   */
  private mapServiceRequestType(subject: string): any {
    // Try to extract type from subject
    const lower = subject.toLowerCase();
    if (lower.includes('housekeeping')) return 'housekeeping';
    if (lower.includes('room service')) return 'room_service';
    if (lower.includes('maintenance')) return 'maintenance';
    if (lower.includes('concierge')) return 'concierge';
    return 'concierge'; // Default
  }

  /**
   * Update a service request's properties
   * Invalidates all service request-related cache entries
   * 
   * @param id - The service request ID to update
   * @param data - The service request properties to update
   * @returns Promise resolving to the updated service request
   * @throws WorkatoSalesforceError if service request not found or update fails
   */
  async updateServiceRequest(id: string, data: ServiceRequestUpdate): Promise<ServiceRequest> {
    // Mock mode: use mock data store
    if (this.mockDataStore) {
      const serviceRequest = await this.mockDataStore.updateServiceRequest(id, data);
      if (!serviceRequest) {
        throw new WorkatoSalesforceError(
          `Service request not found: ${id}`,
          404,
          `/update-service-request-in-salesforce`,
          randomUUID(),
          false
        );
      }
      // Invalidate all service request cache entries (updated for new cache keys)
      this.invalidateCacheByPrefix('searchCases:Housekeeping:');
      this.invalidateCacheByPrefix('searchCases:Room Service:');
      return serviceRequest;
    }

    // Real API call with retry logic
    const serviceRequest = await this.retryWithBackoff(
      () => this.makeRequest<ServiceRequest>('POST', `/update-service-request-in-salesforce`, { id, ...data }),
      this.config.retryAttempts
    );

    // Invalidate all service request cache entries (updated for new cache keys)
    this.invalidateCacheByPrefix('searchCases:Housekeeping:');
    this.invalidateCacheByPrefix('searchCases:Room Service:');
    
    return serviceRequest;
  }

  // ============================================================================
  // Maintenance Task Operations
  // ============================================================================

  /**
   * Create a new maintenance task
   * Invalidates all maintenance task-related cache entries
   * 
   * @param data - The maintenance task data to create
   * @returns Promise resolving to the created maintenance task
   * @throws WorkatoSalesforceError if creation fails or invalid idempotency token
   */
  async createMaintenanceTask(data: MaintenanceTaskCreate): Promise<MaintenanceTask> {
    // Generate idempotency token if not provided
    if (!data.idempotency_token) {
      data.idempotency_token = randomUUID();
    }
    
    // Validate idempotency token
    if (!isValidIdempotencyToken(data.idempotency_token)) {
      throw new WorkatoSalesforceError(
        `Invalid idempotency token: "${data.idempotency_token}". Must be a valid UUID v4.`,
        400,
        '/submit-maintenance-request',
        randomUUID(),
        false
      );
    }

    // Mock mode: use mock data store
    if (this.mockDataStore) {
      const maintenanceTask = await this.mockDataStore.createMaintenanceTask(data);
      // Invalidate all maintenance task cache entries (updated for new cache keys)
      this.invalidateCacheByPrefix('searchCases:Maintenance:');
      this.invalidateCacheByPrefix('searchCases:Facilities:');
      this.invalidateCacheByPrefix('getMaintenanceTask:');
      return maintenanceTask;
    }

    // Real API call with retry logic
    const maintenanceTask = await this.retryWithBackoff(
      () => this.makeRequest<MaintenanceTask>('POST', '/submit-maintenance-request', data),
      this.config.retryAttempts
    );

    // Invalidate all maintenance task cache entries (updated for new cache keys)
    this.invalidateCacheByPrefix('searchCases:Maintenance:');
    this.invalidateCacheByPrefix('searchCases:Facilities:');
    this.invalidateCacheByPrefix('getMaintenanceTask:');
    
    return maintenanceTask;
  }

  /**
   * Search for maintenance tasks based on criteria
   * Implements caching with 60s TTL for search results
   * 
   * MIGRATION NOTE: Updated to use new /search-cases endpoint
   * Searches for Maintenance and Facilities case types (Salesforce picklist values)
   * Requires at least one additional filter parameter
   * Uses business identifiers (room_number, not room_id)
   * 
   * @param criteria - Search criteria for filtering maintenance tasks
   * @returns Promise resolving to array of matching maintenance tasks
   * @throws WorkatoSalesforceError if no filters provided
   */
  async searchMaintenanceTasks(criteria: MaintenanceTaskSearch = {}): Promise<MaintenanceTask[]> {
    // Mock mode: use mock data store (no validation required)
    if (this.mockDataStore) {
      const cacheKey = this.getCacheKey('searchCases:Maintenance', criteria);
      const cachedResult = this.getCachedResponse<MaintenanceTask[]>(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
      
      const maintenanceTasks = await this.mockDataStore.getMaintenanceTasks(criteria);
      this.setCachedResponse(cacheKey, maintenanceTasks, 60000); // 60s TTL
      return maintenanceTasks;
    }

    // Real API: Search for Maintenance and Facilities case types
    // Since the API doesn't support OR queries, we need to make separate calls
    const maintenanceTypes = ['Maintenance', 'Facilities'];
    const allMaintenanceTasks: MaintenanceTask[] = [];
    
    for (const caseType of maintenanceTypes) {
      // Build case search criteria for this type
      const caseSearchCriteria: any = {
        type: caseType,
        status: criteria.status,
        priority: criteria.priority,
        assigned_to: criteria.assigned_to,
        room_number: criteria.room_number || criteria.room_id, // Support both for backward compatibility
        limit: 1000,
      };

      // Check cache first
      const cacheKey = this.getCacheKey(`searchCases:${caseType}`, caseSearchCriteria);
      const cachedResult = this.getCachedResponse<MaintenanceTask[]>(cacheKey);
      
      if (cachedResult !== null) {
        allMaintenanceTasks.push(...cachedResult);
        continue;
      }

      try {
        // Validate that at least one filter is provided (type is always present, so this will pass)
        this.validateSearchCriteria(
          caseSearchCriteria,
          ['type', 'status', 'priority', 'room_number', 'assigned_to'],
          'searchMaintenanceTasks'
        );

        // Real API call with retry logic
        const response = await this.retryWithBackoff(
          () => this.makeRequest<{ cases: any[]; count: number; found: boolean }>(
            'POST', 
            '/search-cases', 
            caseSearchCriteria
          ),
          this.config.retryAttempts
        );

        // Extract cases array from response
        const cases = response.cases || [];

        // Map cases to MaintenanceTask format
        const maintenanceTasks: MaintenanceTask[] = cases.map((c: any) => ({
          id: c.id,
          room_id: c.room_id || '',
          title: c.subject || '',
          description: c.description || '',
          priority: this.mapPriority(c.priority),
          status: this.mapMaintenanceStatus(c.status),
          assigned_to: c.owner_id || null,
          created_by: c.owner_id || '',
          created_at: c.created_date,
          updated_at: c.last_modified_date,
        }));

        // Cache the result for this type
        this.setCachedResponse(cacheKey, maintenanceTasks, 60000); // 60s TTL
        
        allMaintenanceTasks.push(...maintenanceTasks);
      } catch (error) {
        // If one type fails, continue with others
        console.warn(`[SalesforceClient] Failed to fetch ${caseType} maintenance tasks: ${(error as Error).message}`);
      }
    }
    
    return allMaintenanceTasks;
  }

  /**
   * Helper: Map Salesforce priority to MaintenancePriority
   */
  private mapPriority(sfPriority: string): any {
    const mapping: Record<string, string> = {
      'Low': 'low',
      'Medium': 'medium',
      'High': 'high',
      'Urgent': 'urgent',
    };
    return mapping[sfPriority] || 'medium';
  }

  /**
   * Helper: Map Salesforce status to MaintenanceStatus
   */
  private mapMaintenanceStatus(sfStatus: string): any {
    const mapping: Record<string, string> = {
      'New': 'pending',
      'Working': 'in_progress',
      'Escalated': 'in_progress',
      'Closed': 'completed',
    };
    return mapping[sfStatus] || 'pending';
  }

  /**
   * Helper: Map Salesforce status to ServiceRequestStatus
   */
  private mapServiceRequestStatus(sfStatus: string): any {
    const mapping: Record<string, string> = {
      'New': 'pending',
      'Working': 'in_progress',
      'Escalated': 'in_progress',
      'Closed': 'completed',
    };
    return mapping[sfStatus] || 'pending';
  }

  /**
   * Update a maintenance task's properties
   * Invalidates all maintenance task-related cache entries
   * 
   * @param id - The maintenance task ID to update
   * @param data - The maintenance task properties to update
   * @returns Promise resolving to the updated maintenance task
   * @throws WorkatoSalesforceError if maintenance task not found or update fails
   */
  async updateMaintenanceTask(id: string, data: MaintenanceTaskUpdate): Promise<MaintenanceTask> {
    // Mock mode: use mock data store
    if (this.mockDataStore) {
      const maintenanceTask = await this.mockDataStore.updateMaintenanceTask(id, data);
      if (!maintenanceTask) {
        throw new WorkatoSalesforceError(
          `Maintenance task not found: ${id}`,
          404,
          `/update-maintenance-task-in-salesforce`,
          randomUUID(),
          false
        );
      }
      // Invalidate all maintenance task cache entries (updated for new cache keys)
      this.invalidateCacheByPrefix('searchCases:Maintenance:');
      this.invalidateCacheByPrefix('getMaintenanceTask:');
      return maintenanceTask;
    }

    // Real API call with retry logic
    const maintenanceTask = await this.retryWithBackoff(
      () => this.makeRequest<MaintenanceTask>('POST', `/update-maintenance-task-in-salesforce`, { id, ...data }),
      this.config.retryAttempts
    );

    // Invalidate all maintenance task cache entries (updated for new cache keys)
    this.invalidateCacheByPrefix('searchCases:Maintenance:');
    this.invalidateCacheByPrefix('getMaintenanceTask:');
    
    return maintenanceTask;
  }

  /**
   * Get a specific maintenance task by ID
   * 
   * @deprecated This method is deprecated per Salesforce API migration spec.
   * Use searchMaintenanceTasks() with contextual filters instead.
   * The endpoint /retrieve-maintenance-task-info-in-salesforce is deprecated.
   * 
   * @param id - The maintenance task ID to retrieve
   * @returns Promise resolving to the maintenance task
   * @throws WorkatoSalesforceError if maintenance task not found
   */
  async getMaintenanceTask(id: string): Promise<MaintenanceTask> {
    console.warn(
      '[DEPRECATED] getMaintenanceTask() is deprecated. ' +
      'Use searchMaintenanceTasks() with contextual filters instead.'
    );

    // Check cache first
    const cacheKey = this.getCacheKey('getMaintenanceTask', { id });
    const cachedResult = this.getCachedResponse<MaintenanceTask>(cacheKey);
    
    if (cachedResult !== null) {
      return cachedResult;
    }

    // Mock mode: use mock data store
    if (this.mockDataStore) {
      const maintenanceTask = await this.mockDataStore.getMaintenanceTask(id);
      if (!maintenanceTask) {
        throw new WorkatoSalesforceError(
          `Maintenance task not found: ${id}`,
          404,
          `/retrieve-maintenance-task-info-in-salesforce`,
          randomUUID(),
          false
        );
      }
      this.setCachedResponse(cacheKey, maintenanceTask, 120000); // 120s TTL
      return maintenanceTask;
    }

    // Real API call with retry logic (still using old endpoint for backward compatibility)
    const maintenanceTask = await this.retryWithBackoff(
      () => this.makeRequest<MaintenanceTask>('POST', `/retrieve-maintenance-task-info-in-salesforce`, { id }),
      this.config.retryAttempts
    );

    // Cache the result
    this.setCachedResponse(cacheKey, maintenanceTask, 120000); // 120s TTL
    
    return maintenanceTask;
  }

  // ============================================================================
  // Charge Operations
  // ============================================================================

  /**
   * Create a new charge
   * Invalidates all charge-related cache entries
   * 
   * @param data - The charge data to create
   * @returns Promise resolving to the created charge
   * @throws WorkatoSalesforceError if creation fails
   */
  async createCharge(data: ChargeCreate): Promise<Charge> {
    // Mock mode: use mock data store
    if (this.mockDataStore) {
      const charge = await this.mockDataStore.createCharge(data);
      // Invalidate all charge cache entries
      this.invalidateCacheByPrefix('searchCharges:');
      this.invalidateCacheByPrefix('getCharge:');
      return charge;
    }

    // Real API call with retry logic
    const charge = await this.retryWithBackoff(
      () => this.makeRequest<Charge>('POST', '/create-charge-in-salesforce', data),
      this.config.retryAttempts
    );

    // Invalidate all charge cache entries
    this.invalidateCacheByPrefix('searchCharges:');
    this.invalidateCacheByPrefix('getCharge:');
    
    return charge;
  }

  /**
   * Search for charges based on criteria
   * Implements caching with 60s TTL for search results
   * 
   * @param criteria - Search criteria for filtering charges
   * @returns Promise resolving to array of matching charges
   */
  async searchCharges(criteria: ChargeSearch = {}): Promise<Charge[]> {
    // Check cache first
    const cacheKey = this.getCacheKey('searchCharges', criteria);
    const cachedResult = this.getCachedResponse<Charge[]>(cacheKey);
    
    if (cachedResult !== null) {
      return cachedResult;
    }

    // Mock mode: use mock data store
    if (this.mockDataStore) {
      const charges = await this.mockDataStore.getCharges(criteria);
      this.setCachedResponse(cacheKey, charges, 60000); // 60s TTL
      return charges;
    }

    // Real API call with retry logic
    const charges = await this.retryWithBackoff(
      () => this.makeRequest<Charge[]>('POST', '/search-for-charges-in-salesforce', criteria),
      this.config.retryAttempts
    );

    // Cache the result
    this.setCachedResponse(cacheKey, charges, 60000); // 60s TTL
    
    return charges;
  }

  /**
   * Get a specific charge by ID
   * Implements caching with 300s TTL
   * 
   * @param id - The charge ID to retrieve
   * @returns Promise resolving to the charge
   * @throws WorkatoSalesforceError if charge not found
   */
  async getCharge(id: string): Promise<Charge> {
    // Check cache first
    const cacheKey = this.getCacheKey('getCharge', { id });
    const cachedResult = this.getCachedResponse<Charge>(cacheKey);
    
    if (cachedResult !== null) {
      return cachedResult;
    }

    // Mock mode: use mock data store
    if (this.mockDataStore) {
      const charge = await this.mockDataStore.getCharge(id);
      if (!charge) {
        throw new WorkatoSalesforceError(
          `Charge not found: ${id}`,
          404,
          `/retrieve-charge-info-in-salesforce`,
          randomUUID(),
          false
        );
      }
      this.setCachedResponse(cacheKey, charge, 300000); // 300s TTL
      return charge;
    }

    // Real API call with retry logic
    const charge = await this.retryWithBackoff(
      () => this.makeRequest<Charge>('POST', `/retrieve-charge-info-in-salesforce`, { id }),
      this.config.retryAttempts
    );

    // Cache the result
    this.setCachedResponse(cacheKey, charge, 300000); // 300s TTL
    
    return charge;
  }

  /**
   * Update a charge's properties
   * Invalidates all charge-related cache entries
   * 
   * @param id - The charge ID to update
   * @param data - The charge properties to update
   * @returns Promise resolving to the updated charge
   * @throws WorkatoSalesforceError if charge not found or update fails
   */
  async updateCharge(id: string, data: ChargeUpdate): Promise<Charge> {
    // Mock mode: use mock data store
    if (this.mockDataStore) {
      const charge = await this.mockDataStore.updateCharge(id, data);
      if (!charge) {
        throw new WorkatoSalesforceError(
          `Charge not found: ${id}`,
          404,
          `/update-charge-in-salesforce`,
          randomUUID(),
          false
        );
      }
      // Invalidate all charge cache entries
      this.invalidateCacheByPrefix('searchCharges:');
      this.invalidateCacheByPrefix('getCharge:');
      return charge;
    }

    // Real API call with retry logic
    const charge = await this.retryWithBackoff(
      () => this.makeRequest<Charge>('POST', `/update-charge-in-salesforce`, { id, ...data }),
      this.config.retryAttempts
    );

    // Invalidate all charge cache entries
    this.invalidateCacheByPrefix('searchCharges:');
    this.invalidateCacheByPrefix('getCharge:');
    
    return charge;
  }

  // ============================================================================
  // User-Room Association Operations (to be implemented in task 11)
  // ============================================================================

  async assignGuestToRoom(guestId: string, roomId: string): Promise<Room> {
    throw new Error('Not yet implemented - Task 11');
  }

  async assignManagerToRooms(managerId: string, roomIds: string[]): Promise<Room[]> {
    throw new Error('Not yet implemented - Task 11');
  }

  async checkoutGuest(guestId: string): Promise<Room> {
    throw new Error('Not yet implemented - Task 11');
  }

  async getGuestRoom(guestId: string): Promise<Room | null> {
    throw new Error('Not yet implemented - Task 11');
  }

  async getManagerRooms(managerId: string): Promise<Room[]> {
    throw new Error('Not yet implemented - Task 11');
  }
}
