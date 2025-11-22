/**
 * Cognito Error Handling Module
 * 
 * Defines custom error classes for different types of Cognito authentication failures
 * and provides user-friendly error messages.
 */

/**
 * Error thrown when Cognito configuration is invalid or incomplete
 * Used for missing environment variables, invalid region format, etc.
 */
export class CognitoConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CognitoConfigurationError';
    Object.setPrototypeOf(this, CognitoConfigurationError.prototype);
  }
}

/**
 * Error thrown during OAuth 2.0 authentication flow
 * Used for authorization failures, state mismatches, CSRF issues, etc.
 */
export class CognitoAuthenticationError extends Error {
  public code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'CognitoAuthenticationError';
    this.code = code;
    Object.setPrototypeOf(this, CognitoAuthenticationError.prototype);
  }
}

/**
 * Error thrown during token exchange operations
 * Used for token endpoint failures, network issues, invalid codes, etc.
 */
export class CognitoTokenError extends Error {
  public statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'CognitoTokenError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, CognitoTokenError.prototype);
  }
}

/**
 * Error thrown during token validation
 * Used for invalid signatures, expired tokens, missing claims, etc.
 */
export class CognitoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CognitoValidationError';
    Object.setPrototypeOf(this, CognitoValidationError.prototype);
  }
}

/**
 * User-friendly error messages for common Cognito error scenarios
 * These messages are safe to display to end users
 */
export const ERROR_MESSAGES = {
  // Configuration errors
  CONFIG_MISSING_VARS: 'Missing required Cognito configuration. Please contact your system administrator.',
  CONFIG_INVALID_REGION: 'Invalid AWS region configuration. Please contact your system administrator.',
  CONFIG_NOT_ENABLED: 'Cognito authentication is not enabled for this application.',
  
  // Authentication flow errors
  AUTH_INVALID_STATE: 'Invalid authentication request. Please try again.',
  AUTH_MISSING_VERIFIER: 'Authentication session expired. Please try again.',
  AUTH_DENIED: 'Access denied by authentication provider.',
  AUTH_FAILED: 'Authentication failed. Please try again.',
  
  // Token exchange errors
  TOKEN_EXCHANGE_FAILED: 'Failed to complete authentication. Please try again.',
  TOKEN_NETWORK_ERROR: 'Unable to connect to authentication service. Please check your connection.',
  TOKEN_TIMEOUT: 'Authentication request timed out. Please try again.',
  TOKEN_INVALID_CODE: 'Invalid authorization code. Please try again.',
  
  // Token validation errors
  TOKEN_INVALID: 'Invalid or expired authentication token.',
  TOKEN_EXPIRED: 'Your authentication session has expired. Please sign in again.',
  TOKEN_INVALID_SIGNATURE: 'Authentication token signature verification failed.',
  TOKEN_INVALID_ISSUER: 'Authentication token from unexpected source.',
  TOKEN_INVALID_AUDIENCE: 'Authentication token not intended for this application.',
  
  // Role and claims errors
  ROLE_NOT_CONFIGURED: 'Your account is not properly configured. Please contact support.',
  ROLE_INVALID: 'Your account has an invalid role assignment. Please contact support.',
  ROLE_MISSING: 'User role information is missing. Please contact support.',
  EMAIL_NOT_VERIFIED: 'Your email address must be verified before you can sign in.',
  
  // User management errors
  USER_ALREADY_EXISTS: 'An account with this email already exists.',
  USER_NOT_FOUND: 'User account not found.',
  INVALID_PASSWORD: 'Password does not meet the required security policy.',
  INVALID_EMAIL: 'Invalid email address format.',
  
  // Generic fallback
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again or contact support.',
} as const;

/**
 * Type for error message keys
 */
export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;

/**
 * Helper function to get user-friendly error message
 */
export function getErrorMessage(key: ErrorMessageKey): string {
  return ERROR_MESSAGES[key];
}

/**
 * Helper function to determine if an error is a Cognito-specific error
 */
export function isCognitoError(error: unknown): error is CognitoConfigurationError | CognitoAuthenticationError | CognitoTokenError | CognitoValidationError {
  return (
    error instanceof CognitoConfigurationError ||
    error instanceof CognitoAuthenticationError ||
    error instanceof CognitoTokenError ||
    error instanceof CognitoValidationError
  );
}
