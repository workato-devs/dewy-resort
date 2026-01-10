/**
 * GET /api/auth/okta/login
 * Initiate Okta OAuth 2.0 Authorization Code Flow with PKCE
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadOktaConfig, isOktaEnabled } from '@/lib/auth/okta/config';
import { generatePKCE } from '@/lib/auth/okta/pkce';
import { OktaClient } from '@/lib/auth/okta/client';
import { OktaConfigurationError, ERROR_MESSAGES, mapOktaErrorToMessage } from '@/lib/auth/okta/errors';
import { logLoginInitiated, logConfigError, logAuthError } from '@/lib/auth/okta/logger';
import * as crypto from 'crypto';

/**
 * Generate a cryptographically random state parameter for CSRF protection
 */
function generateState(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export async function GET(request: NextRequest) {
  try {
    // Check if Okta is enabled (mock mode disabled)
    if (!isOktaEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Okta authentication is disabled in mock mode.',
          details: 'Set WORKATO_MOCK_MODE=false and restart the server to enable Okta authentication.',
        },
        { status: 400 }
      );
    }

    // Load Okta configuration
    const config = loadOktaConfig();
    
    if (!config) {
      throw new OktaConfigurationError('Failed to load Okta configuration');
    }

    // Generate PKCE pair
    const { codeVerifier, codeChallenge } = generatePKCE();

    // Generate random state parameter for CSRF protection
    const state = generateState();

    // Create Okta client
    const oktaClient = new OktaClient(config);

    // Generate authorization URL
    const authorizationUrl = oktaClient.getAuthorizationUrl(codeChallenge, state);

    // Log login initiation
    logLoginInitiated();

    // Create response with redirect
    const response = NextResponse.redirect(authorizationUrl);

    // Store code verifier in HTTP-only cookie (5 min expiration)
    response.cookies.set('okta_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60, // 5 minutes
      path: '/api/auth/okta',
    });

    // Store state in HTTP-only cookie (5 min expiration)
    response.cookies.set('okta_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60, // 5 minutes
      path: '/api/auth/okta',
    });

    return response;

  } catch (error) {
    // Log the error based on type
    if (error instanceof OktaConfigurationError) {
      logConfigError(
        error.message,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    } else {
      logAuthError(
        'Okta login initiation error',
        undefined,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }

    // Map error to user-friendly message
    const errorMessage = mapOktaErrorToMessage(error);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
