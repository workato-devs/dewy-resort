/**
 * Custom error class for Workato Salesforce API errors
 * 
 * This error class encapsulates all error information from Workato API calls,
 * including HTTP status codes, endpoint information, correlation IDs for tracking,
 * and whether the error is retryable.
 */
export class WorkatoSalesforceError extends Error {
  /**
   * Creates a new WorkatoSalesforceError
   * 
   * @param message - Human-readable error message
   * @param statusCode - HTTP status code from the API response
   * @param endpoint - The API endpoint that was called
   * @param correlationId - Unique identifier for tracking this error across logs
   * @param retryable - Whether this error should trigger a retry attempt
   */
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string,
    public correlationId: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'WorkatoSalesforceError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WorkatoSalesforceError);
    }
  }

  /**
   * Serializes the error to a JSON-compatible object
   * Useful for logging and API responses
   * 
   * @returns Object containing all error properties
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      endpoint: this.endpoint,
      correlationId: this.correlationId,
      retryable: this.retryable,
    };
  }
}

/**
 * Determines if an error should trigger a retry attempt
 * 
 * Retryable errors include:
 * - 429 (Rate Limit): Too many requests, should retry with backoff
 * - 500 (Internal Server Error): Server error, may be transient
 * - 503 (Service Unavailable): Service temporarily down
 * - Network errors: Connection failures, timeouts
 * 
 * Non-retryable errors include:
 * - 400 (Bad Request): Validation error, won't succeed on retry
 * - 401 (Unauthorized): Authentication failure, needs credential fix
 * - 404 (Not Found): Resource doesn't exist, won't appear on retry
 * 
 * @param error - The error to classify
 * @returns true if the error is retryable, false otherwise
 */
export function isRetryableError(error: any): boolean {
  // If it's our custom error, use the retryable flag
  if (error instanceof WorkatoSalesforceError) {
    return error.retryable;
  }

  // Check for network-level errors (axios error codes)
  if (error.code) {
    const retryableNetworkErrors = [
      'ECONNRESET',   // Connection reset by peer
      'ETIMEDOUT',    // Request timeout
      'ENOTFOUND',    // DNS lookup failed
      'ECONNREFUSED', // Connection refused
      'ENETUNREACH',  // Network unreachable
    ];
    return retryableNetworkErrors.includes(error.code);
  }

  // Check HTTP status codes if available
  if (error.response?.status) {
    const status = error.response.status;
    // Retryable status codes: 429, 500, 502, 503, 504
    return status === 429 || (status >= 500 && status <= 504);
  }

  // Default to not retryable for unknown errors
  return false;
}

/**
 * Creates a WorkatoSalesforceError from an HTTP response or network error
 * 
 * @param error - The original error from axios or other HTTP client
 * @param endpoint - The API endpoint that was called
 * @param correlationId - Unique identifier for tracking
 * @returns A properly formatted WorkatoSalesforceError
 */
export function createWorkatoError(
  error: any,
  endpoint: string,
  correlationId: string
): WorkatoSalesforceError {
  // Extract status code
  const statusCode = error.response?.status || error.statusCode || 500;
  
  // Determine if retryable based on status code
  const retryable = isRetryableError(error);
  
  // Create appropriate error message
  let message: string;
  
  if (error.response?.data?.message) {
    // Use API error message if available
    message = error.response.data.message;
  } else if (error.code) {
    // Network errors take precedence over status code messages
    message = `Network Error: ${error.code} - ${error.message}`;
  } else if (statusCode === 400) {
    message = 'Bad Request: Invalid request parameters';
  } else if (statusCode === 401) {
    message = 'Unauthorized: Authentication failed';
  } else if (statusCode === 404) {
    message = 'Not Found: Resource does not exist';
  } else if (statusCode === 429) {
    message = 'Rate Limit Exceeded: Too many requests';
  } else if (statusCode === 500) {
    message = 'Internal Server Error: Server encountered an error';
  } else if (statusCode === 503) {
    message = 'Service Unavailable: Service temporarily unavailable';
  } else {
    message = error.message || 'Unknown error occurred';
  }
  
  return new WorkatoSalesforceError(
    message,
    statusCode,
    endpoint,
    correlationId,
    retryable
  );
}

/**
 * Handles errors from Workato API calls by creating a properly formatted error
 * and logging it with context information
 * 
 * @param error - The original error
 * @param context - Context string describing where the error occurred
 * @param correlationId - Unique identifier for tracking
 * @param endpoint - The API endpoint that was called
 * @returns A properly formatted WorkatoSalesforceError
 */
export function handleWorkatoError(
  error: any,
  context: string,
  correlationId: string,
  endpoint: string
): WorkatoSalesforceError {
  // If it's already a WorkatoSalesforceError, return it
  if (error instanceof WorkatoSalesforceError) {
    return error;
  }
  
  // Create a new WorkatoSalesforceError
  return createWorkatoError(error, endpoint, correlationId);
}

/**
 * Alias for backward compatibility
 * Use WorkatoSalesforceError for new code
 */
export const WorkatoError = WorkatoSalesforceError;
export type WorkatoError = WorkatoSalesforceError;
