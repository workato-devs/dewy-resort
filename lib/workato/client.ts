/**
 * Workato Client
 * Core client for making authenticated requests to Workato API
 */

import { loadWorkatoConfig, WorkatoConfig } from './config';
import { ResponseCache, generateCacheKey } from './cache';
import { WorkatoLogger } from './logger';
import {
  WorkatoError,
  handleWorkatoError,
  isRetryableError,
} from './errors';
import {
  WorkatoResponse,
  RequestOptions,
  CreateCaseRequest,
  CaseResponse,
  ContactData,
  ContactResponse,
  SearchCriteria,
  SearchCasesRequest,
} from './types';

/**
 * Workato API Client
 */
export class WorkatoClient {
  private config: WorkatoConfig;
  private logger: WorkatoLogger;
  private cache: ResponseCache;

  constructor(config?: WorkatoConfig) {
    this.config = config || loadWorkatoConfig();
    this.logger = new WorkatoLogger(
      this.config.logging.enabled,
      this.config.logging.level
    );
    this.cache = new ResponseCache();

    // Log mock mode status
    if (this.config.mockMode) {
      this.logger.logRequest({
        timestamp: new Date().toISOString(),
        correlationId: 'INIT',
        method: 'INFO',
        endpoint: 'MOCK_MODE',
        requestData: { message: 'Workato client initialized in MOCK MODE - no real API calls will be made' },
      });
    }
  }

  /**
   * Core request method with authentication, retry logic, and error handling
   */
  async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<WorkatoResponse<T>> {
    const correlationId = this.generateCorrelationId();
    const timeout = options?.timeout || this.config.timeout;
    const skipCache = options?.skipCache || false;
    const skipRetry = options?.skipRetry || false;

    // Return mock response if mock mode is enabled
    if (this.config.mockMode) {
      return this.getMockResponse<T>(method, endpoint, data, correlationId);
    }

    // Check cache for GET requests
    if (method === 'GET' && !skipCache && this.config.cache.enabled) {
      const cacheKey = generateCacheKey(endpoint, data);
      const cachedData = this.cache.get<T>(cacheKey);
      if (cachedData) {
        return {
          success: true,
          data: cachedData,
          correlationId,
        };
      }
    }

    const startTime = Date.now();

    // Log request
    this.logger.logRequest({
      timestamp: new Date().toISOString(),
      correlationId,
      method,
      endpoint,
      requestData: data,
    });

    try {
      const response = await this.makeRequest<T>(
        method,
        endpoint,
        data,
        correlationId,
        timeout,
        skipRetry
      );

      const duration = Date.now() - startTime;

      // Log response
      this.logger.logResponse({
        timestamp: new Date().toISOString(),
        correlationId,
        method,
        endpoint,
        statusCode: 200,
        duration,
        responseData: response.data,
      });

      // Cache GET responses
      if (method === 'GET' && !skipCache && this.config.cache.enabled && response.data) {
        const cacheKey = generateCacheKey(endpoint, data);
        this.cache.set(cacheKey, response.data, this.config.cache.ttl);
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const workatoError = error instanceof WorkatoError
        ? error
        : handleWorkatoError(error, `${method} ${endpoint}`, correlationId, endpoint);

      // Log error
      this.logger.logError({
        timestamp: new Date().toISOString(),
        correlationId,
        method,
        endpoint,
        statusCode: workatoError.statusCode,
        duration,
        error: workatoError.message,
      });

      return {
        success: false,
        error: workatoError.message,
        correlationId,
      };
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(
    method: string,
    endpoint: string,
    data: any,
    correlationId: string,
    timeout: number,
    skipRetry: boolean
  ): Promise<WorkatoResponse<T>> {
    let lastError: WorkatoError | null = null;
    const maxAttempts = skipRetry ? 1 : this.config.retry.maxAttempts;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await this.executeRequest<T>(
          method,
          endpoint,
          data,
          correlationId,
          timeout
        );
        return result;
      } catch (error) {
        const workatoError = error instanceof WorkatoError
          ? error
          : handleWorkatoError(error, `${method} ${endpoint}`, correlationId, endpoint);

        lastError = workatoError;

        // Don't retry if error is not retryable or this is the last attempt
        if (!isRetryableError(workatoError) || attempt === maxAttempts - 1) {
          throw workatoError;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.config.retry.initialDelay * Math.pow(this.config.retry.backoffMultiplier, attempt),
          this.config.retry.maxDelay
        );

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Request failed');
  }

  /**
   * Execute HTTP request
   */
  private async executeRequest<T>(
    method: string,
    endpoint: string,
    data: any,
    correlationId: string,
    timeout: number
  ): Promise<WorkatoResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const url = `${this.config.salesforce.baseUrl}${endpoint}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.salesforce.apiToken}`,
        'X-Correlation-ID': correlationId,
      };

      const options: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorBody = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorBody);
        } catch {
          errorData = { message: errorBody };
        }

        throw handleWorkatoError(
          {
            statusCode: response.status,
            status: response.status,
            body: errorData,
            message: errorData.message || response.statusText,
          },
          `${method} ${endpoint}`,
          correlationId,
          endpoint
        );
      }

      const responseData = await response.json();

      return {
        success: true,
        data: responseData as T,
        correlationId,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Create a Salesforce Case
   */
  async createCase(caseData: CreateCaseRequest): Promise<WorkatoResponse<CaseResponse>> {
    return this.request<CaseResponse>(
      'POST',
      '/salesforce/create-case',
      caseData,
      { skipCache: true }
    );
  }

  /**
   * Get a Salesforce Case by ID
   */
  async getCase(caseId: string): Promise<WorkatoResponse<CaseResponse>> {
    return this.request<CaseResponse>(
      'GET',
      `/salesforce/get-case-info/${caseId}`
    );
  }

  /**
   * Upsert a Salesforce Contact
   */
  async upsertContact(contactData: ContactData): Promise<WorkatoResponse<ContactResponse>> {
    return this.request<ContactResponse>(
      'POST',
      '/salesforce/upsert-contact',
      contactData,
      { skipCache: true }
    );
  }

  /**
   * Get a Salesforce Contact by ID
   */
  async getContact(contactId: string): Promise<WorkatoResponse<ContactResponse>> {
    return this.request<ContactResponse>(
      'GET',
      `/salesforce/get-contact-info/${contactId}`
    );
  }

  /**
   * Search Salesforce Contacts
   */
  async searchContacts(criteria: SearchCriteria): Promise<WorkatoResponse<ContactResponse[]>> {
    // Enforce maximum limit
    const searchCriteria = {
      ...criteria,
      limit: Math.min(criteria.limit || 50, 50),
    };

    return this.request<ContactResponse[]>(
      'POST',
      '/salesforce/search-contacts',
      searchCriteria
    );
  }

  /**
   * Search Salesforce Cases
   */
  async searchCases(criteria: SearchCasesRequest): Promise<WorkatoResponse<CaseResponse[]>> {
    // Enforce maximum limit
    const searchCriteria = {
      ...criteria,
      limit: Math.min(criteria.limit || 100, 100),
    };

    return this.request<CaseResponse[]>(
      'POST',
      '/salesforce/search-cases',
      searchCriteria
    );
  }

  /**
   * Get logger instance (for testing/debugging)
   */
  getLogger(): WorkatoLogger {
    return this.logger;
  }

  /**
   * Get cache instance (for testing/debugging)
   */
  getCache(): ResponseCache {
    return this.cache;
  }

  /**
   * Generate mock response based on endpoint
   */
  private getMockResponse<T>(
    method: string,
    endpoint: string,
    data: any,
    correlationId: string
  ): Promise<WorkatoResponse<T>> {
    // Log mock request
    this.logger.logRequest({
      timestamp: new Date().toISOString(),
      correlationId,
      method,
      endpoint,
      requestData: { ...data, _mockMode: true },
    });

    // Simulate network delay
    const delay = Math.random() * 200 + 100; // 100-300ms

    return new Promise((resolve) => {
      setTimeout(() => {
        let mockData: any;

        // Generate mock response based on endpoint
        if (endpoint.includes('/salesforce/create-case')) {
          mockData = this.generateMockCaseResponse(data);
        } else if (endpoint.includes('/salesforce/get-case-info/')) {
          const caseId = endpoint.split('/').pop();
          mockData = this.generateMockCaseResponse({ id: caseId });
        } else if (endpoint.includes('/salesforce/upsert-contact')) {
          mockData = this.generateMockContactResponse(data);
        } else if (endpoint.includes('/salesforce/get-contact-info/')) {
          const contactId = endpoint.split('/').pop();
          mockData = this.generateMockContactResponse({ id: contactId });
        } else if (endpoint.includes('/salesforce/search-contacts')) {
          mockData = this.generateMockContactSearchResponse(data);
        } else if (endpoint.includes('/salesforce/search-cases')) {
          mockData = this.generateMockCaseSearchResponse(data);
        } else {
          // Generic mock response
          mockData = { success: true, message: 'Mock response' };
        }

        // Log mock response
        this.logger.logResponse({
          timestamp: new Date().toISOString(),
          correlationId,
          method,
          endpoint,
          statusCode: 200,
          duration: delay,
          responseData: { ...mockData, _mockMode: true },
        });

        resolve({
          success: true,
          data: mockData as T,
          correlationId,
        });
      }, delay);
    });
  }

  /**
   * Generate mock Case response
   */
  private generateMockCaseResponse(data: any): CaseResponse {
    const caseId = data?.id || `MOCK-CASE-${Date.now()}`;
    const caseNumber = `CASE-${Math.floor(Math.random() * 10000).toString().padStart(5, '0')}`;

    return {
      id: caseId,
      caseNumber,
      status: data?.status || 'New',
      priority: data?.priority || 'Medium',
      subject: data?.subject || `Mock Case: ${data?.type || 'Service Request'}`,
      description: data?.description || 'Mock case description',
      type: data?.type || 'Service Request',
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      contactId: data?.contactId,
    };
  }

  /**
   * Generate mock Contact response
   */
  private generateMockContactResponse(data: any): ContactResponse {
    const contactId = data?.id || `MOCK-CONTACT-${Date.now()}`;
    const firstName = data?.firstName || 'Mock';
    const lastName = data?.lastName || 'User';

    return {
      id: contactId,
      email: data?.email || `mock.user${Date.now()}@example.com`,
      name: `${firstName} ${lastName}`,
      phone: data?.phone || '+1-555-0100',
    };
  }

  /**
   * Generate mock Contact search response
   */
  private generateMockContactSearchResponse(data: SearchCriteria): ContactResponse[] {
    const limit = Math.min(data.limit || 10, 50);
    const results: ContactResponse[] = [];

    // Generate 3-5 mock contacts
    const count = Math.min(Math.floor(Math.random() * 3) + 3, limit);

    for (let i = 0; i < count; i++) {
      results.push({
        id: `MOCK-CONTACT-${Date.now()}-${i}`,
        email: `mock.user${i}@example.com`,
        name: `Mock User ${i + 1}`,
        phone: `+1-555-010${i}`,
      });
    }

    return results;
  }

  /**
   * Generate mock Case search response
   */
  private generateMockCaseSearchResponse(data: SearchCasesRequest): CaseResponse[] {
    const limit = Math.min(data.limit || 10, 100);
    const results: CaseResponse[] = [];

    // Generate 5-10 mock cases
    const count = Math.min(Math.floor(Math.random() * 6) + 5, limit);
    const statuses = ['New', 'In Progress', 'Closed'];
    const priorities = ['Low', 'Medium', 'High'];
    const types = ['Housekeeping', 'Room Service', 'Maintenance', 'Concierge'];

    for (let i = 0; i < count; i++) {
      results.push({
        id: `MOCK-CASE-${Date.now()}-${i}`,
        caseNumber: `CASE-${Math.floor(Math.random() * 10000).toString().padStart(5, '0')}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        subject: `Mock ${types[Math.floor(Math.random() * types.length)]} Request`,
        description: `Mock case description ${i + 1}`,
        type: types[Math.floor(Math.random() * types.length)],
        createdDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedDate: new Date().toISOString(),
      });
    }

    return results;
  }

  /**
   * Generate a unique correlation ID
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
