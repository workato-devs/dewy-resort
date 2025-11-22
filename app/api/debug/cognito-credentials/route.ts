/**
 * GET /api/debug/cognito-credentials
 * 
 * DEBUG ENDPOINT - DEVELOPMENT ONLY
 * 
 * Exfiltrates AWS credentials obtained from Cognito Identity Pool.
 * This allows developers to copy credentials for local testing.
 * 
 * SECURITY: Only enabled when DEBUG_EXPOSE_CREDENTIALS=true
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { IdentityPoolService } from '@/lib/bedrock/identity-pool';
import { getCognitoIdToken } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  // Check if debug feature is enabled
  if (process.env.DEBUG_EXPOSE_CREDENTIALS !== 'true') {
    return NextResponse.json({
      error: 'This endpoint is disabled. Set DEBUG_EXPOSE_CREDENTIALS=true in .env to enable.',
    }, { status: 403 });
  }

  // Warn in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      error: 'This endpoint is disabled in production for security reasons.',
    }, { status: 403 });
  }

  try {
    // Validate session
    const session = await requireAuth(request);
    const { userId, role, sessionId } = session;

    // Get ID token from session
    const idToken = await getCognitoIdToken(sessionId);
    
    if (!idToken) {
      return NextResponse.json({
        error: 'No ID token found in session. Please log out and log back in.',
      }, { status: 400 });
    }

    // Exchange ID token for AWS credentials via Identity Pool
    const identityPoolService = new IdentityPoolService({
      identityPoolId: process.env.COGNITO_IDENTITY_POOL_ID!,
      region: process.env.AWS_REGION || process.env.COGNITO_REGION || 'us-west-2',
      userPoolId: process.env.COGNITO_USER_POOL_ID!,
      clientId: process.env.COGNITO_CLIENT_ID!,
    });

    const credentials = await identityPoolService.getCredentialsForUser(
      idToken,
      sessionId,
      userId,
      role
    );

    // Return credentials in a format ready to copy to .env
    return NextResponse.json({
      success: true,
      userId,
      role,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
        expiration: credentials.expiration.toISOString(),
      },
      envFormat: {
        AWS_ACCESS_KEY_ID: credentials.accessKeyId,
        AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
        AWS_SESSION_TOKEN: credentials.sessionToken,
      },
      copyPaste: [
        '# Copy these to your .env file:',
        `AWS_ACCESS_KEY_ID=${credentials.accessKeyId}`,
        `AWS_SECRET_ACCESS_KEY=${credentials.secretAccessKey}`,
        `AWS_SESSION_TOKEN=${credentials.sessionToken}`,
        `# Expires: ${credentials.expiration.toISOString()}`,
      ].join('\n'),
      expiresIn: Math.floor((credentials.expiration.getTime() - Date.now()) / 1000 / 60) + ' minutes',
    });

  } catch (error) {
    console.error('Error getting Cognito credentials:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to get credentials',
      details: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
