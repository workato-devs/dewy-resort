/**
 * GET /api/auth/cognito/callback
 * Handle OAuth 2.0 callback from Amazon Cognito
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadCognitoConfig, isCognitoEnabled } from '@/lib/auth/cognito/config';
import { CognitoClient } from '@/lib/auth/cognito/client';
import { validateIdToken } from '@/lib/auth/cognito/validator';
import type { CognitoUserClaims } from '@/lib/auth/cognito/client';
import { createSessionFromCognito, upsertUserFromCognito } from '@/lib/auth/session';
import {
  CognitoConfigurationError,
  CognitoAuthenticationError,
  CognitoTokenError,
  CognitoValidationError,
  ERROR_MESSAGES,
  isCognitoError,
} from '@/lib/auth/cognito/errors';
import {
  logCallbackReceived,
  logTokenExchanged,
  logTokenValidated,
  logUserCreated,
  logUserUpdated,
  logSessionCreated,
  logAuthError,
  logTokenError,
  logValidationError,
  logConfigError,
} from '@/lib/auth/cognito/logger';

/**
 * Map Cognito errors to user-friendly messages
 */
function mapCognitoErrorToMessage(error: unknown): string {
  if (error instanceof CognitoConfigurationError) {
    return ERROR_MESSAGES.CONFIG_MISSING_VARS;
  }
  
  if (error instanceof CognitoAuthenticationError) {
    return error.message || ERROR_MESSAGES.AUTH_FAILED;
  }
  
  if (error instanceof CognitoTokenError) {
    return error.message || ERROR_MESSAGES.TOKEN_EXCHANGE_FAILED;
  }
  
  if (error instanceof CognitoValidationError) {
    return error.message || ERROR_MESSAGES.TOKEN_INVALID;
  }
  
  return ERROR_MESSAGES.UNKNOWN_ERROR;
}

export async function GET(request: NextRequest) {
  try {
    // Check if Cognito is enabled
    if (!isCognitoEnabled()) {
      return NextResponse.redirect(
        new URL('/login?error=Cognito%20is%20not%20enabled&error_description=Set%20AUTH_PROVIDER=cognito%20and%20restart%20the%20server', request.url)
      );
    }

    // Load Cognito configuration
    const config = loadCognitoConfig();
    
    if (!config) {
      throw new CognitoConfigurationError('Failed to load Cognito configuration');
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Log callback received
    logCallbackReceived({ hasCode: !!code, hasError: !!error });

    // Handle error from Cognito
    if (error) {
      logAuthError(errorDescription || error);
      const errorMessage = encodeURIComponent(
        errorDescription || ERROR_MESSAGES.AUTH_DENIED
      );
      return NextResponse.redirect(
        new URL(`/login?error=${errorMessage}`, request.url)
      );
    }

    // Validate required parameters
    if (!code) {
      logAuthError(ERROR_MESSAGES.TOKEN_INVALID_CODE);
      const errorMsg = encodeURIComponent(ERROR_MESSAGES.TOKEN_INVALID_CODE);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    if (!state) {
      logAuthError(ERROR_MESSAGES.AUTH_INVALID_STATE);
      const errorMsg = encodeURIComponent(ERROR_MESSAGES.AUTH_INVALID_STATE);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    // Retrieve and validate state from cookie
    const stateCookie = request.cookies.get('cognito_state')?.value;
    
    if (!stateCookie) {
      logAuthError(ERROR_MESSAGES.AUTH_MISSING_VERIFIER, undefined, { reason: 'state_cookie_missing' });
      const errorMsg = encodeURIComponent(ERROR_MESSAGES.AUTH_MISSING_VERIFIER);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    if (state !== stateCookie) {
      logAuthError(ERROR_MESSAGES.AUTH_INVALID_STATE, undefined, { reason: 'state_mismatch' });
      const errorMsg = encodeURIComponent(ERROR_MESSAGES.AUTH_INVALID_STATE);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    // Retrieve code verifier from cookie
    const codeVerifier = request.cookies.get('cognito_code_verifier')?.value;
    
    if (!codeVerifier) {
      logAuthError(ERROR_MESSAGES.AUTH_MISSING_VERIFIER, undefined, { reason: 'verifier_cookie_missing' });
      const errorMsg = encodeURIComponent(ERROR_MESSAGES.AUTH_MISSING_VERIFIER);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    // Create Cognito client
    const cognitoClient = new CognitoClient(config);

    // Exchange authorization code for tokens
    let tokenResponse;
    try {
      tokenResponse = await cognitoClient.exchangeCodeForTokens(code, codeVerifier);
    } catch (error) {
      logTokenError(error instanceof Error ? error.message : 'Token exchange failed');
      const errorMessage = mapCognitoErrorToMessage(error);
      const errorMsg = encodeURIComponent(errorMessage);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    // Validate ID token
    let validationResult;
    try {
      validationResult = await validateIdToken(tokenResponse.id_token, config);
      
      if (!validationResult.valid) {
        logValidationError(validationResult.error || ERROR_MESSAGES.TOKEN_INVALID);
        const errorMsg = encodeURIComponent(validationResult.error || ERROR_MESSAGES.TOKEN_INVALID);
        return NextResponse.redirect(
          new URL(`/login?error=${errorMsg}`, request.url)
        );
      }
    } catch (error) {
      logValidationError(error instanceof Error ? error.message : 'Token validation exception');
      const errorMessage = mapCognitoErrorToMessage(error);
      const errorMsg = encodeURIComponent(errorMessage);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    // Parse ID token and extract user claims
    let claims: CognitoUserClaims;
    try {
      claims = cognitoClient.parseIdToken(tokenResponse.id_token);
      
      // Log successful token exchange and validation
      logTokenExchanged(claims.sub, claims.email);
      logTokenValidated(claims.sub, claims.email);
    } catch (error) {
      logValidationError(error instanceof Error ? error.message : 'Failed to parse ID token');
      const errorMessage = mapCognitoErrorToMessage(error);
      const errorMsg = encodeURIComponent(errorMessage);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    // Validate custom:role claim exists and has valid value
    const role = claims['custom:role'];
    if (!role) {
      logValidationError(ERROR_MESSAGES.ROLE_NOT_CONFIGURED, { userId: claims.sub });
      const errorMsg = encodeURIComponent(ERROR_MESSAGES.ROLE_NOT_CONFIGURED);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    if (role !== 'guest' && role !== 'manager') {
      logValidationError(ERROR_MESSAGES.ROLE_INVALID, { userId: claims.sub, invalidRole: role });
      const errorMsg = encodeURIComponent(ERROR_MESSAGES.ROLE_INVALID);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    // Upsert user in local database
    try {
      // Create claims object with validated role
      const validatedClaims = {
        sub: claims.sub,
        email: claims.email,
        name: claims.name,
        'custom:role': role,
      };
      
      const { isNewUser } = await upsertUserFromCognito(validatedClaims);
      
      // Log user creation or update
      if (isNewUser) {
        logUserCreated(claims.sub, claims.email, role);
      } else {
        logUserUpdated(claims.sub, claims.email);
      }
    } catch (error) {
      logAuthError(error instanceof Error ? error.message : 'Failed to upsert user', claims.sub);
      const errorMsg = encodeURIComponent(ERROR_MESSAGES.AUTH_FAILED);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    // Create local session with tokens
    let session;
    try {
      session = await createSessionFromCognito(claims.sub, role, {
        idToken: tokenResponse.id_token,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
      });
      
      // Log session creation
      logSessionCreated(claims.sub, session.sessionId);
    } catch (error) {
      logAuthError(error instanceof Error ? error.message : 'Failed to create session', claims.sub);
      const errorMsg = encodeURIComponent(ERROR_MESSAGES.AUTH_FAILED);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    // Determine redirect URL based on role
    const dashboardUrl = role === 'manager' 
      ? '/manager/dashboard' 
      : '/guest/dashboard';

    // Create redirect response
    const response = NextResponse.redirect(new URL(dashboardUrl, request.url));

    // Clear code verifier and state cookies
    response.cookies.delete('cognito_code_verifier');
    response.cookies.delete('cognito_state');

    return response;

  } catch (error) {
    // Log the error
    if (error instanceof CognitoConfigurationError) {
      logConfigError(error.message);
    } else if (error instanceof CognitoAuthenticationError) {
      logAuthError(error.message);
    } else if (error instanceof CognitoTokenError) {
      logTokenError(error.message);
    } else if (error instanceof CognitoValidationError) {
      logValidationError(error.message);
    } else {
      logAuthError(error instanceof Error ? error.message : 'Unknown callback error');
    }
    
    // Map error to user-friendly message
    const errorMessage = mapCognitoErrorToMessage(error);
    const errorMsg = encodeURIComponent(errorMessage);
    
    return NextResponse.redirect(
      new URL(`/login?error=${errorMsg}`, request.url)
    );
  }
}
