/**
 * POST /api/debug/clear-credentials-cache
 * Debug endpoint to clear cached Bedrock credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { BedrockService } from '@/lib/bedrock/client';
import { IdentityPoolService } from '@/lib/bedrock/identity-pool';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    
    // Create identity pool client and clear cache
    const identityPool = new IdentityPoolService({
      identityPoolId: process.env.COGNITO_IDENTITY_POOL_ID!,
      userPoolId: process.env.COGNITO_USER_POOL_ID!,
      clientId: process.env.COGNITO_CLIENT_ID!,
      region: process.env.AWS_REGION || 'us-west-2',
    });
    
    identityPool.clearCache(session.sessionId);
    
    return NextResponse.json({
      success: true,
      message: 'Credentials cache cleared for your session',
      sessionId: session.sessionId,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 401 });
  }
}
