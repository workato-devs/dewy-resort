/**
 * POST /api/auth/cognito/login-direct
 * Direct login with Cognito using username/password (no redirect)
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  CognitoIdentityProviderClient, 
  InitiateAuthCommand,
  AuthFlowType 
} from '@aws-sdk/client-cognito-identity-provider';
import { createHmac } from 'crypto';
import { loadCognitoConfig } from '@/lib/auth/cognito/config';
import { getAuthProvider } from '@/lib/auth/config';
import { createSessionFromCognito, upsertUserFromCognito } from '@/lib/auth/session';
import { CognitoClient } from '@/lib/auth/cognito/client';

interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Calculate SECRET_HASH for Cognito API calls
 * Returns undefined for public clients (no secret)
 */
function calculateSecretHash(username: string, clientId: string, clientSecret?: string): string | undefined {
  if (!clientSecret) {
    return undefined; // Public client - no secret hash needed
  }
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
    const body = await request.json() as LoginRequest;
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email and password are required',
      }, { status: 400 });
    }

    // Initialize Cognito client
    const client = new CognitoIdentityProviderClient({
      region: config.region,
      credentials: undefined,
    });

    // Calculate SECRET_HASH (only for confidential clients)
    const secretHash = calculateSecretHash(email, config.clientId, config.clientSecret);

    // Debug logging
    console.log('Cognito login attempt:', {
      clientId: config.clientId,
      userPoolId: config.userPoolId,
      region: config.region,
      email: email,
      hasSecret: !!config.clientSecret,
    });

    // Build auth parameters
    const authParameters: Record<string, string> = {
      USERNAME: email,
      PASSWORD: password,
    };

    // Only include SECRET_HASH if client has a secret (confidential client)
    if (secretHash) {
      authParameters.SECRET_HASH = secretHash;
    }

    // Initiate authentication
    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: config.clientId,
      AuthParameters: authParameters,
    });

    const response = await client.send(command);

    // Check if authentication was successful
    if (!response.AuthenticationResult?.IdToken) {
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
      }, { status: 401 });
    }

    // Parse ID token to get user claims
    const cognitoClient = new CognitoClient(config);
    const claims = cognitoClient.parseIdToken(response.AuthenticationResult.IdToken);

    // Validate role
    const role = claims['custom:role'];
    if (!role || (role !== 'guest' && role !== 'manager')) {
      return NextResponse.json({
        success: false,
        error: 'User role not configured properly',
      }, { status: 400 });
    }

    // Upsert user in local database
    await upsertUserFromCognito({
      sub: claims.sub,
      email: claims.email,
      name: claims.name,
      'custom:role': role,
    });

    // Create local session with tokens
    const session = await createSessionFromCognito(claims.sub, role, {
      idToken: response.AuthenticationResult.IdToken,
      accessToken: response.AuthenticationResult.AccessToken,
      refreshToken: response.AuthenticationResult.RefreshToken,
    });

    // Return success with redirect URL
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      redirectUrl: role === 'manager' ? '/manager/dashboard' : '/guest/dashboard',
      user: {
        id: claims.sub,
        email: claims.email,
        name: claims.name,
        role: role,
      },
    });

  } catch (error: any) {
    console.error('Direct login error:', error);
    
    // Handle specific Cognito errors
    if (error.name === 'NotAuthorizedException') {
      return NextResponse.json({
        success: false,
        error: 'Invalid email or password',
      }, { status: 401 });
    }
    
    if (error.name === 'UserNotConfirmedException') {
      return NextResponse.json({
        success: false,
        error: 'Please verify your email before logging in',
        needsVerification: true,
      }, { status: 403 });
    }
    
    if (error.name === 'UserNotFoundException') {
      return NextResponse.json({
        success: false,
        error: 'Invalid email or password',
      }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: error.message || 'Login failed',
    }, { status: 500 });
  }
}
