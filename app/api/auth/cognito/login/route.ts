/**
 * GET /api/auth/cognito/login
 * Initiate Amazon Cognito OAuth 2.0 Authorization Code Flow with PKCE
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadCognitoConfig, isCognitoEnabled } from '@/lib/auth/cognito/config';
import { generatePKCE } from '@/lib/auth/okta/pkce';
import { CognitoClient } from '@/lib/auth/cognito/client';
import { CognitoConfigurationError, ERROR_MESSAGES } from '@/lib/auth/cognito/errors';
import { logLoginInitiated, logConfigError } from '@/lib/auth/cognito/logger';
import * as crypto from 'crypto';

/**
 * Generate a cryptographically random state parameter for CSRF protection
 */
function generateState(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export async function GET(request: NextRequest) {
  try {
    // Check if Cognito is enabled (AUTH_PROVIDER is "cognito")
    if (!isCognitoEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: ERROR_MESSAGES.CONFIG_NOT_ENABLED,
          details: 'Set AUTH_PROVIDER=cognito and restart the server to enable Cognito authentication.',
        },
        { status: 400 }
      );
    }

    // Load Cognito configuration
    const config = loadCognitoConfig();
    
    if (!config) {
      throw new CognitoConfigurationError('Failed to load Cognito configuration');
    }

    // Generate PKCE pair using shared PKCE generator
    const { codeVerifier, codeChallenge } = generatePKCE();

    // Generate random state parameter for CSRF protection
    const state = generateState();

    // Create Cognito client
    const cognitoClient = new CognitoClient(config);

    // Generate authorization URL with PKCE parameters
    const authorizationUrl = cognitoClient.getAuthorizationUrl(codeChallenge, state);

    // Log login initiated event
    logLoginInitiated({ redirectUri: config.redirectUri });

    // Create response with redirect to Cognito Hosted UI
    const response = NextResponse.redirect(authorizationUrl);

    // Store code verifier in HTTP-only cookie (5 min expiration)
    response.cookies.set('cognito_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60, // 5 minutes
      path: '/api/auth/cognito',
    });

    // Store state in HTTP-only cookie (5 min expiration)
    response.cookies.set('cognito_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60, // 5 minutes
      path: '/api/auth/cognito',
    });

    return response;

  } catch (error) {
    // Determine error message based on error type
    let errorMessage: string;
    let statusCode = 500;

    if (error instanceof CognitoConfigurationError) {
      errorMessage = ERROR_MESSAGES.CONFIG_MISSING_VARS;
      statusCode = 500;
      logConfigError(error.message);
    } else {
      errorMessage = ERROR_MESSAGES.AUTH_FAILED;
      logConfigError(error instanceof Error ? error.message : 'Unknown error during login');
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: statusCode }
    );
  }
}
