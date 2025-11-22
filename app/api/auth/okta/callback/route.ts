/**
 * GET /api/auth/okta/callback
 * Handle OAuth 2.0 callback from Okta
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadOktaConfig, isOktaEnabled } from '@/lib/auth/okta/config';
import { OktaClient } from '@/lib/auth/okta/client';
import { OktaUserClaims } from '@/lib/auth/okta/validator';
import { createSessionFromOkta, upsertUserFromOkta } from '@/lib/auth/session';
import { 
  OktaConfigurationError, 
  OktaAuthenticationError, 
  OktaTokenError, 
  OktaValidationError,
  mapOktaErrorToMessage,
  getErrorAction,
  ERROR_MESSAGES
} from '@/lib/auth/okta/errors';
import { 
  logCallbackReceived,
  logTokenExchanged,
  logTokenValidated,
  logUserCreated,
  logUserUpdated,
  logSessionCreated,
  logConfigError,
  logAuthError,
  logTokenError,
  logValidationError
} from '@/lib/auth/okta/logger';

export async function GET(request: NextRequest) {
  try {
    // Check if Okta is enabled
    if (!isOktaEnabled()) {
      return NextResponse.redirect(
        new URL('/login?error=Okta%20is%20disabled%20in%20mock%20mode&error_description=Set%20WORKATO_MOCK_MODE=false%20and%20restart%20the%20server', request.url)
      );
    }

    // Load Okta configuration
    const config = loadOktaConfig();
    
    if (!config) {
      throw new OktaConfigurationError('Failed to load Okta configuration');
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle error from Okta
    if (error) {
      logAuthError(`Okta authorization error: ${error}`, undefined, { 
        errorDescription 
      });
      const errorMessage = encodeURIComponent(
        errorDescription || ERROR_MESSAGES.AUTH_DENIED
      );
      return NextResponse.redirect(
        new URL(`/login?error=${errorMessage}`, request.url)
      );
    }

    // Log callback received
    logCallbackReceived();

    // Validate required parameters
    if (!code) {
      const errorMsg = encodeURIComponent(ERROR_MESSAGES.TOKEN_EXCHANGE_FAILED);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    if (!state) {
      const errorMsg = encodeURIComponent(ERROR_MESSAGES.AUTH_INVALID_STATE);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    // Retrieve and validate state from cookie
    const stateCookie = request.cookies.get('okta_state')?.value;
    
    if (!stateCookie) {
      logAuthError('State cookie missing');
      const errorMsg = encodeURIComponent(ERROR_MESSAGES.AUTH_MISSING_VERIFIER);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    if (state !== stateCookie) {
      logAuthError('State mismatch - possible CSRF attack', undefined, { 
        receivedState: state.substring(0, 10) + '...' 
      });
      const errorMsg = encodeURIComponent(ERROR_MESSAGES.AUTH_INVALID_STATE);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    // Retrieve code verifier from cookie
    const codeVerifier = request.cookies.get('okta_code_verifier')?.value;
    
    if (!codeVerifier) {
      logAuthError('Code verifier cookie missing');
      const errorMsg = encodeURIComponent(ERROR_MESSAGES.AUTH_MISSING_VERIFIER);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    // Create Okta client
    const oktaClient = new OktaClient(config);

    // Exchange authorization code for tokens
    let tokenResponse;
    try {
      tokenResponse = await oktaClient.exchangeCodeForTokens(code, codeVerifier);
    } catch (error) {
      logTokenError(
        'Token exchange failed',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      const errorMessage = mapOktaErrorToMessage(error);
      const errorMsg = encodeURIComponent(errorMessage);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    // Validate ID token
    let validationResult;
    try {
      // Import validateIdToken directly to get detailed results
      const { validateIdToken } = await import('@/lib/auth/okta/validator');
      validationResult = await validateIdToken(tokenResponse.id_token, config);
      
      if (!validationResult.valid) {
        console.error('Token validation failed:', validationResult.error);
        logValidationError(
          'Token validation failed',
          { error: validationResult.error || 'Unknown validation error' }
        );
        const errorMsg = encodeURIComponent(validationResult.error || ERROR_MESSAGES.VALIDATION_FAILED);
        return NextResponse.redirect(
          new URL(`/login?error=${errorMsg}`, request.url)
        );
      }
    } catch (error) {
      console.error('Token validation exception:', error);
      logValidationError(
        'Token validation failed',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      const errorMessage = mapOktaErrorToMessage(error);
      const errorMsg = encodeURIComponent(errorMessage);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    // Parse ID token and extract user claims
    let claims: OktaUserClaims;
    try {
      // First, let's decode the token to see what's in it
      const { decodeJwt } = await import('jose');
      const decodedToken = decodeJwt(tokenResponse.id_token);
      console.log('=== DECODED ID TOKEN ===');
      console.log(JSON.stringify(decodedToken, null, 2));
      console.log('=== HAS ROLE CLAIM? ===', 'role' in decodedToken);
      console.log('=== ROLE VALUE ===', decodedToken.role);
      console.log('========================');
      
      claims = oktaClient.parseIdToken(tokenResponse.id_token);
      
      // Log successful token exchange and validation
      logTokenExchanged(claims.sub, claims.email);
      logTokenValidated(claims.sub, claims.email);
    } catch (error) {
      // Log the full error for debugging
      console.error('Failed to parse ID token:', error);
      console.error('Token response:', { 
        hasIdToken: !!tokenResponse.id_token,
        tokenLength: tokenResponse.id_token?.length 
      });
      
      logValidationError(
        'Failed to parse ID token',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      const errorMessage = mapOktaErrorToMessage(error);
      const errorMsg = encodeURIComponent(errorMessage);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    // Validate role claim (additional check, though parseIdToken already validates)
    if (!claims.role || (claims.role !== 'guest' && claims.role !== 'manager')) {
      logValidationError('Invalid role claim', { role: claims.role });
      const errorMsg = encodeURIComponent(ERROR_MESSAGES.VALIDATION_INVALID_ROLE);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    // Upsert user in local database
    try {
      await upsertUserFromOkta(claims);
      
      // Log user creation or update
      logUserCreated(claims.sub, claims.email, claims.role);
    } catch (error) {
      logAuthError(
        'Failed to upsert user',
        claims.sub,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      const errorMsg = encodeURIComponent(ERROR_MESSAGES.TOKEN_EXCHANGE_FAILED);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    // Create session (handles both local and Okta sessions based on configuration)
    let session;
    try {
      session = await createSessionFromOkta(claims.sub, claims.role);
      
      // Log session creation
      logSessionCreated(claims.sub, session.sessionId, false);
    } catch (error) {
      logAuthError(
        'Failed to create session',
        claims.sub,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
      const errorMsg = encodeURIComponent(ERROR_MESSAGES.TOKEN_EXCHANGE_FAILED);
      return NextResponse.redirect(
        new URL(`/login?error=${errorMsg}`, request.url)
      );
    }

    // Determine redirect URL based on role
    const dashboardUrl = claims.role === 'manager' 
      ? '/manager/dashboard' 
      : '/guest/dashboard';

    // Create redirect response
    const response = NextResponse.redirect(new URL(dashboardUrl, request.url));

    // Clear PKCE and state cookies
    response.cookies.delete('okta_code_verifier');
    response.cookies.delete('okta_state');

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
        'Okta callback error',
        undefined,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }

    // Map error to user-friendly message
    const errorMessage = mapOktaErrorToMessage(error);
    const errorMsg = encodeURIComponent(errorMessage);
    
    return NextResponse.redirect(
      new URL(`/login?error=${errorMsg}`, request.url)
    );
  }
}
