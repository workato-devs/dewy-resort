/**
 * POST /api/auth/cognito/confirm
 * Confirm user signup with verification code
 */

import { NextRequest, NextResponse } from 'next/server';
import { CognitoIdentityProviderClient, ConfirmSignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import { createHmac } from 'crypto';
import { loadCognitoConfig } from '@/lib/auth/cognito/config';
import { CognitoAuthenticationError } from '@/lib/auth/cognito/errors';
import { getAuthProvider } from '@/lib/auth/config';

interface ConfirmRequest {
  email: string;
  code: string;
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

    if (!config.clientSecret) {
      return NextResponse.json({
        success: false,
        error: 'Cognito client secret is not configured',
      }, { status: 500 });
    }

    // Parse request body
    const body = await request.json() as ConfirmRequest;
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json({
        success: false,
        error: 'Email and verification code are required',
      }, { status: 400 });
    }

    // Initialize Cognito client
    const client = new CognitoIdentityProviderClient({
      region: config.region,
      credentials: undefined,
    });

    // Calculate SECRET_HASH
    const secretHash = calculateSecretHash(email, config.clientId, config.clientSecret);

    // Confirm signup
    const command = new ConfirmSignUpCommand({
      ClientId: config.clientId,
      SecretHash: secretHash,
      Username: email,
      ConfirmationCode: code,
    });

    await client.send(command);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully. You can now sign in.',
    });

  } catch (error: any) {
    console.error('Confirmation error:', error);
    
    // Handle specific Cognito errors
    if (error.name === 'CodeMismatchException') {
      return NextResponse.json({
        success: false,
        error: 'Invalid verification code. Please try again.',
      }, { status: 400 });
    }
    
    if (error.name === 'ExpiredCodeException') {
      return NextResponse.json({
        success: false,
        error: 'Verification code has expired. Please request a new one.',
      }, { status: 400 });
    }
    
    if (error.name === 'NotAuthorizedException') {
      return NextResponse.json({
        success: false,
        error: 'User is already confirmed or code is invalid.',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to verify email',
    }, { status: 500 });
  }
}
