/**
 * Okta-specific error classes for authentication and authorization
 */

/**
 * Error thrown when Okta configuration is missing or invalid
 * Used for: Missing environment variables, invalid domain format
 */
export class OktaConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OktaConfigurationError';
    Object.setPrototypeOf(this, OktaConfigurationError.prototype);
  }
}

/**
 * Error thrown during OAuth authentication flow
 * Used for: Authorization denied, state mismatch, missing code verifier
 */
export class OktaAuthenticationError extends Error {
  public code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'OktaAuthenticationError';
    this.code = code;
    Object.setPrototypeOf(this, OktaAuthenticationError.prototype);
  }
}

/**
 * Error thrown during token exchange or token-related operations
 * Used for: Invalid authorization code, token exchange timeout, network errors
 */
export class OktaTokenError extends Error {
  public statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'OktaTokenError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, OktaTokenError.prototype);
  }
}

/**
 * Error thrown during token validation
 * Used for: Invalid signature, missing claims, invalid role value
 */
export class OktaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OktaValidationError';
    Object.setPrototypeOf(this, OktaValidationError.prototype);
  }
}

/**
 * Maps error scenarios to user-friendly messages
 */
export const ERROR_MESSAGES = {
  // Configuration errors
  CONFIG_MISSING: 'Authentication service not configured',
  CONFIG_INVALID_DOMAIN: 'Invalid authentication configuration',
  
  // Authentication errors
  AUTH_DENIED: 'Access denied by authentication provider',
  AUTH_INVALID_STATE: 'Invalid authentication request. Please try again.',
  AUTH_MISSING_VERIFIER: 'Authentication session expired. Please try again.',
  
  // Token errors
  TOKEN_EXCHANGE_FAILED: 'Authentication failed. Please try again.',
  TOKEN_TIMEOUT: 'Unable to connect to authentication service',
  
  // Validation errors
  VALIDATION_FAILED: 'Authentication failed. Please try again.',
  VALIDATION_MISSING_ROLE: 'Your account is not properly configured. Please contact support.',
  VALIDATION_INVALID_ROLE: 'Your account is not properly configured. Please contact support.',
} as const;

/**
 * Maps Okta API error codes to user-friendly messages
 */
export function mapOktaErrorToMessage(error: any): string {
  // Handle Okta API error responses
  if (error.errorCode) {
    switch (error.errorCode) {
      case 'invalid_grant':
        return ERROR_MESSAGES.TOKEN_EXCHANGE_FAILED;
      case 'invalid_client':
        return ERROR_MESSAGES.CONFIG_MISSING;
      case 'access_denied':
        return ERROR_MESSAGES.AUTH_DENIED;
      case 'invalid_request':
        return ERROR_MESSAGES.TOKEN_EXCHANGE_FAILED;
      default:
        return ERROR_MESSAGES.TOKEN_EXCHANGE_FAILED;
    }
  }

  // Handle custom error types
  if (error instanceof OktaConfigurationError) {
    return error.message;
  }
  
  if (error instanceof OktaAuthenticationError) {
    return error.message;
  }
  
  if (error instanceof OktaTokenError) {
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return ERROR_MESSAGES.TOKEN_TIMEOUT;
    }
    return ERROR_MESSAGES.TOKEN_EXCHANGE_FAILED;
  }
  
  if (error instanceof OktaValidationError) {
    if (error.message.includes('role')) {
      return ERROR_MESSAGES.VALIDATION_MISSING_ROLE;
    }
    return ERROR_MESSAGES.VALIDATION_FAILED;
  }

  // Handle network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return ERROR_MESSAGES.TOKEN_TIMEOUT;
  }

  // Default fallback
  return ERROR_MESSAGES.TOKEN_EXCHANGE_FAILED;
}

/**
 * Determines the appropriate action based on error type
 */
export function getErrorAction(error: any): 'show_error' | 'redirect_login' {
  if (error instanceof OktaConfigurationError) {
    return 'show_error';
  }
  
  // All other errors should redirect to login
  return 'redirect_login';
}
