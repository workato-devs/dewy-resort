/**
 * Error handling utilities
 * Centralized error classes and error logging
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', details?: any) {
    super(401, message, 'AUTH_ERROR', details);
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, message, 'AUTHZ_ERROR');
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, message, 'VALIDATION_ERROR', details);
  }
}

/**
 * External service error (502)
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(502, `${service} error: ${message}`, 'EXTERNAL_SERVICE_ERROR');
  }
}

/**
 * Database error (500)
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(500, `Database error: ${message}`, 'DATABASE_ERROR', details);
  }
}

/**
 * Error logger utility
 */
export class ErrorLogger {
  private static isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Log error with context
   */
  static log(error: unknown, context?: string) {
    const timestamp = new Date().toISOString();
    const prefix = context ? `[${context}]` : '';
    
    if (error instanceof AppError) {
      console.error(
        `${timestamp} ${prefix} ${error.name}:`,
        {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
          details: error.details,
          stack: this.isDevelopment ? error.stack : undefined,
        }
      );
    } else if (error instanceof Error) {
      console.error(
        `${timestamp} ${prefix} ${error.name}:`,
        {
          message: error.message,
          stack: this.isDevelopment ? error.stack : undefined,
        }
      );
    } else {
      console.error(
        `${timestamp} ${prefix} Unknown error:`,
        error
      );
    }
  }

  /**
   * Log warning
   */
  static warn(message: string, context?: string) {
    const timestamp = new Date().toISOString();
    const prefix = context ? `[${context}]` : '';
    console.warn(`${timestamp} ${prefix} ${message}`);
  }

  /**
   * Log info (only in development)
   */
  static info(message: string, context?: string) {
    if (this.isDevelopment) {
      const timestamp = new Date().toISOString();
      const prefix = context ? `[${context}]` : '';
      console.log(`${timestamp} ${prefix} ${message}`);
    }
  }

  /**
   * Log error message
   */
  static error(message: string, context?: string) {
    const timestamp = new Date().toISOString();
    const prefix = context ? `[${context}]` : '';
    console.error(`${timestamp} ${prefix} ERROR: ${message}`);
  }
}

/**
 * Check if error is an AppError instance
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Get error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

/**
 * Get error code from unknown error
 */
export function getErrorCode(error: unknown): string {
  if (isAppError(error)) {
    return error.code || 'UNKNOWN_ERROR';
  }
  if (error instanceof Error) {
    return error.name.toUpperCase().replace(/ERROR$/, '_ERROR');
  }
  return 'UNKNOWN_ERROR';
}

/**
 * Get status code from unknown error
 */
export function getStatusCode(error: unknown): number {
  if (isAppError(error)) {
    return error.statusCode;
  }
  return 500;
}
