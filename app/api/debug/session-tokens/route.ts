/**
 * GET /api/debug/session-tokens
 * Debug endpoint to check if current session has Cognito tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getCognitoIdToken } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const idToken = await getCognitoIdToken(session.sessionId);
    
    // Decode ID token to show claims
    let claims = null;
    if (idToken) {
      try {
        const parts = idToken.split('.');
        const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
        claims = JSON.parse(payload);
      } catch (e) {
        console.error('Failed to decode ID token:', e);
      }
    }
    
    return NextResponse.json({
      hasSession: true,
      sessionId: session.sessionId,
      userId: session.userId,
      role: session.role,
      hasIdToken: !!idToken,
      idTokenLength: idToken?.length || 0,
      idToken: idToken, // Include full token for debugging
      claims: claims, // Include decoded claims
      message: idToken 
        ? 'Session has ID token - chat should work' 
        : 'Session missing ID token - please log out and log back in',
    });
  } catch (error) {
    return NextResponse.json({
      hasSession: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 401 });
  }
}
