/**
 * Authentication middleware for API routes
 * 
 * This middleware works seamlessly with all authentication providers:
 * - Mock Mode: Local sessions with email/password authentication
 * - Okta: OAuth 2.0 sessions (can be local or Okta-managed)
 * - Cognito: OAuth 2.0 sessions (local sessions with Cognito authentication)
 * 
 * The session validation logic in getSession() handles all types automatically.
 */

import { NextRequest } from 'next/server';
import { getSession } from './session';
import { AuthenticationError, AuthorizationError } from '@/lib/errors';

// Re-export for backward compatibility
export { AuthenticationError, AuthorizationError };

/**
 * Require authentication for API route
 * 
 * Works with all authentication providers:
 * - Mock Mode: Local sessions
 * - Okta: OAuth 2.0 sessions
 * - Cognito: OAuth 2.0 sessions
 * 
 * The underlying getSession() function handles validation for all types.
 * 
 * @param request - Next.js request object
 * @returns Session data including userId and role
 * @throws AuthenticationError if no valid session exists
 */
export async function requireAuth(request: NextRequest) {
  const session = await getSession();
  
  if (!session) {
    throw new AuthenticationError('You must be logged in to access this resource');
  }
  
  // Validate that session has required fields
  if (!session.userId || !session.role) {
    throw new AuthenticationError('Invalid session data');
  }
  
  return session;
}

/**
 * Require specific role for API route
 * 
 * Works with all authentication providers (Mock, Okta, Cognito).
 * Role information is stored in the session data regardless of auth method.
 * 
 * @param request - Next.js request object
 * @param allowedRoles - Array of allowed roles
 * @returns Session data if role is authorized
 * @throws AuthenticationError if not authenticated
 * @throws AuthorizationError if role is not authorized
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: ('guest' | 'manager')[]
) {
  const session = await requireAuth(request);
  
  if (!allowedRoles.includes(session.role)) {
    throw new AuthorizationError(`Access denied. Required role: ${allowedRoles.join(' or ')}`);
  }
  
  return session;
}

/**
 * Require guest role
 * 
 * Works with all authentication providers (Mock, Okta, Cognito).
 * 
 * @param request - Next.js request object
 * @returns Session data if user has guest role
 * @throws AuthenticationError if not authenticated
 * @throws AuthorizationError if user is not a guest
 */
export async function requireGuest(request: NextRequest) {
  return requireRole(request, ['guest']);
}

/**
 * Require manager role
 * 
 * Works with all authentication providers (Mock, Okta, Cognito).
 * 
 * @param request - Next.js request object
 * @returns Session data if user has manager role
 * @throws AuthenticationError if not authenticated
 * @throws AuthorizationError if user is not a manager
 */
export async function requireManager(request: NextRequest) {
  return requireRole(request, ['manager']);
}

/**
 * Error response helper
 * @deprecated Use createErrorResponse from @/lib/errors/api-response instead
 */
export function errorResponse(error: unknown, status = 500) {
  const { createErrorResponse } = require('@/lib/errors/api-response');
  return createErrorResponse(error);
}
