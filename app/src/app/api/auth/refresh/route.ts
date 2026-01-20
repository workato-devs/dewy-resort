/**
 * POST /api/auth/refresh
 * Proactive token refresh endpoint
 * 
 * This endpoint allows the frontend to proactively refresh Cognito tokens
 * before they expire, preventing authentication errors during chat sessions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { createErrorResponse } from '@/lib/errors/api-response';
import { AuthenticationError } from '@/lib/errors';
import { refreshCognitoTokens, deleteSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    // Validate session and get user info
    const session = await requireAuth(request);
    const { sessionId, userId, role } = session;

    console.log(`[Token Refresh] Proactive refresh request from user ${userId} with role ${role}`);

    // Check if this is a Cognito session before attempting refresh
    const { executeQueryOne } = await import('@/lib/db/client');
    const { SessionRow } = await import('@/types');
    
    const sessionData = executeQueryOne<any>(
      `SELECT cognito_refresh_token FROM sessions WHERE id = ?`,
      [sessionId]
    );
    
    // If no Cognito refresh token, this is not a Cognito session (Mock or Okta)
    // Return success without attempting refresh
    if (!sessionData || !sessionData.cognito_refresh_token) {
      console.log(`[Token Refresh] Not a Cognito session, skipping refresh for user ${userId}`);
      return NextResponse.json({ 
        success: true,
        message: 'Session does not require token refresh',
        skipped: true
      });
    }

    // Attempt to refresh Cognito tokens
    const refreshed = await refreshCognitoTokens(sessionId);
    
    if (!refreshed) {
      // Refresh failed - invalidate session
      console.error(`[Token Refresh] Failed to refresh tokens for session ${sessionId}, invalidating session`);
      await deleteSession(sessionId);
      
      return createErrorResponse(
        new AuthenticationError(
          'Your session has expired. Please log in again.',
          { 
            userId, 
            role,
            code: 'SESSION_EXPIRED',
            requiresLogin: true 
          }
        ),
        'auth.refresh'
      );
    }
    
    console.log(`[Token Refresh] Successfully refreshed tokens for user ${userId}`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Tokens refreshed successfully'
    });
  } catch (error) {
    console.error('[Token Refresh] Error:', error);
    return createErrorResponse(error, 'auth.refresh');
  }
}
