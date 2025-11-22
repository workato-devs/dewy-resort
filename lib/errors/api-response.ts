/**
 * API Error Response Utilities
 * Standardized error responses for API routes
 */

import { NextResponse } from 'next/server';
import { AppError, ErrorLogger, getErrorCode, getErrorMessage, getStatusCode } from './index';

/**
 * Error response format
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: unknown,
  context?: string
): NextResponse<ErrorResponse> {
  // Log the error
  ErrorLogger.log(error, context);

  const statusCode = getStatusCode(error);
  const code = getErrorCode(error);
  const message = getErrorMessage(error);

  const response: ErrorResponse = {
    error: {
      code,
      message,
    },
  };

  // Add details for AppError instances
  if (error instanceof AppError && error.details) {
    response.error.details = error.details;
  }

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Success response helper
 */
export function createSuccessResponse<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

/**
 * API handler wrapper with error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<NextResponse<T>>,
  context?: string
): Promise<NextResponse<T | ErrorResponse>> {
  return handler().catch((error) => createErrorResponse(error, context));
}
