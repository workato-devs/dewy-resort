/**
 * POST /api/auth/cognito/resend-code
 * Resend verification code to user's email
 */

import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, ResendConfirmationCodeCommand } from '@aws-sdk/client-cognito-identity-provider';
import { createHmac } from 'crypto';
import { loadCognitoConfig } from '@/lib/auth/cognito/config';
import { getAuthProvider } from '@/lib/auth/config';

interface ResendRequest {
  email: string;
}

/**
 * Calculate SECRET_HASH for Cognito API calls
 */
function calculateSecretHash(username: string, clientId: string, clientSecret: string): string {
  const message = username + clientId;
  const hmac = createHmac('sha256', clientSecret);
  hmac.update(message);
  return hmac.digest('base64');
}

export async function POST(request: NextRequest) {
  try {
    // Validate AUTH_PROVIDER is "cognito"
    const authProvider = getAuthProvider();
    if (authProvider !== 'cognito') {
      return NextResponse.json({
        success: false,
        error: 'Cognito is not enabled',
      }, { status: 400 });
    }

    // Load Cognito configuration
    const config = loadCognitoConfig();
    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Cognito is not configured',
      }, { status: 500 });
    }

    // Parse request body
    const body = await request.json() as ResendRequest;
    const { email } = body;

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email is required',
      }, { status: 400 });
    }

    // Initialize Cognito client
    const client = new CognitoIdentityProviderClient({
      region: config.region,
      credentials: undefined,
    });

    // Calculate SECRET_HASH
    const secretHash = calculateSecretHash(email, config.clientId, config.clientSecret);

    // Resend confirmation code
    const command = new ResendConfirmationCodeCommand({
      ClientId: config.clientId,
      SecretHash: secretHash,
      Username: email,
    });

    await client.send(command);

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email.',
    });

  } catch (error: any) {
    console.error('Resend code error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to resend verification code',
    }, { status: 500 });
  }
}
