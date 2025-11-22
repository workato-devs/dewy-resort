/**
 * POST /api/auth/logout
 * Destroy user session
 * 
 * Handles both local and Okta sessions:
 * - For Okta sessions: Revokes session in Okta via Management API
 * - For local sessions: Deletes from local database
 * - Always clears session cookie
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, deleteSession } from '@/lib/auth';
import { AuthenticationError } from '@/lib/errors';
import { createErrorResponse } from '@/lib/errors/api-response';
import { logInfo } from '@/lib/auth/okta/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      throw new AuthenticationError('No active session');
    }
    
    // Log logout event
    logInfo('okta.session.deleted', { 
      userId: session.userId,
      metadata: { sessionId: session.sessionId }
    });
    
    // Delete session (handles both Okta and local sessions)
    await deleteSession(session.sessionId);
    
    // Redirect to login page
    return NextResponse.redirect(new URL('/login', request.url));
    
  } catch (error) {
    return createErrorResponse(error, 'POST /api/auth/logout');
  }
}
