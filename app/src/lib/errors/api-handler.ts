/**
 * API Handler Wrapper
 * Provides consistent error handling for all API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from './api-response';

type ApiHandler<T = any> = (request: NextRequest, context?: any) => Promise<NextResponse<T>>;

/**
 * Wrap API handler with automatic error handling
 * Usage:
 * export const GET = apiHandler(async (request) => {
 *   // Your handler code
 *   return NextResponse.json({ data });
 * }, 'GET /api/your-route');
 */
export function apiHandler<T = any>(
  handler: ApiHandler<T>,
  context?: string
): ApiHandler<T> {
  return async (request: NextRequest, routeContext?: any) => {
    try {
      return await handler(request, routeContext);
    } catch (error) {
      return createErrorResponse(error, context) as any;
    }
  };
}
