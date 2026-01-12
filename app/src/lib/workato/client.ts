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
} from './types';
import { secureFetch } from '@/lib/fetch-utils';

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

      const response = await secureFetch(url, options);

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

  // NOTE: Previously contained methods for legacy Salesforce API endpoints
  // (createCase, getCase, upsertContact, getContact, searchContacts, searchCases)
  // These were removed in Dec 2025 when the workato/Salesforce/ API collection was deprecated.
  //
  // For Salesforce operations, use SalesforceClient instead:
  // - import { getSalesforceClient } from '@/lib/workato/config';
  // - const client = getSalesforceClient();
  // - await client.createServiceRequest(...), client.searchRooms(...), etc.
  //
  // See docs/TESTING.md for future testing plans when MCP server deployment is available.

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
        // Note: Mock handlers for legacy Salesforce endpoints (create-case, get-case-info,
        // upsert-contact, get-contact-info, search-contacts, search-cases) were removed Dec 2025.
        // Generic mock response
        mockData = { success: true, message: 'Mock response' };

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

  // NOTE: Mock generator methods for legacy Salesforce endpoints removed Dec 2025
  // (generateMockCaseResponse, generateMockContactResponse,
  //  generateMockContactSearchResponse, generateMockCaseSearchResponse)

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
