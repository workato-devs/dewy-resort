/**
 * Okta Client Service
 * 
 * Handles OAuth 2.0 Authorization Code Flow interactions with Okta.
 * Implements token exchange, ID token parsing, and validation.
 */

import { decodeJwt } from 'jose';
import { OktaConfig } from './config';
import { validateIdToken, OktaUserClaims } from './validator';
import { OktaTokenError, OktaValidationError, ERROR_MESSAGES } from './errors';

/**
 * Okta token response from token endpoint
 */
export interface OktaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token: string;
}

/**
 * Okta Client for OAuth 2.0 Authorization Code Flow
 */
export class OktaClient {
  private config: OktaConfig;

  /**
   * Create a new OktaClient instance
   * @param config - Okta configuration
   */
  constructor(config: OktaConfig) {
    this.config = config;
  }

  /**
   * Generate authorization URL for OAuth 2.0 flow
   * 
   * @param codeChallenge - PKCE code challenge
   * @param state - Random state parameter for CSRF protection
   * @returns Authorization URL to redirect user to
   */
  getAuthorizationUrl(codeChallenge: string, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'openid profile email',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${this.config.authorizationEndpoint}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens with retry logic
   * 
   * @param code - Authorization code from Okta callback
   * @param codeVerifier - PKCE code verifier
   * @returns Token response containing ID token and access token
   * @throws OktaTokenError if token exchange fails after retries
   */
  async exchangeCodeForTokens(
    code: string,
    codeVerifier: string
  ): Promise<OktaTokenResponse> {
    const maxAttempts = 3;
    const timeout = 10000; // 10 seconds
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Prepare request body
        const body = new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.config.redirectUri,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code_verifier: codeVerifier,
        });

        // Make token exchange request
        const response = await fetch(this.config.tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          body: body.toString(),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle non-200 responses
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error_description || errorData.error || 'Token exchange failed';
          
          throw new OktaTokenError(
            `Token exchange failed: ${errorMessage}`,
            response.status
          );
        }

        // Parse and return token response
        const tokenResponse: OktaTokenResponse = await response.json();
        
        // Validate response contains required fields
        if (!tokenResponse.id_token || !tokenResponse.access_token) {
          throw new OktaTokenError('Invalid token response: missing required tokens');
        }

        return tokenResponse;

      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx)
        if (error instanceof OktaTokenError && error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }

        // Handle abort/timeout errors
        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new OktaTokenError(ERROR_MESSAGES.TOKEN_TIMEOUT);
        }

        // If this was the last attempt, throw the error
        if (attempt === maxAttempts) {
          break;
        }

        // Exponential backoff: wait 2^attempt seconds before retry
        const backoffMs = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    // All retries failed
    throw lastError || new OktaTokenError(ERROR_MESSAGES.TOKEN_EXCHANGE_FAILED);
  }

  /**
   * Parse ID token and extract user claims
   * 
   * @param idToken - JWT ID token from Okta
   * @returns User claims extracted from the token
   * @throws OktaValidationError if token is invalid or missing required claims
   */
  parseIdToken(idToken: string): OktaUserClaims {
    try {
      // Decode JWT without verification (verification happens separately)
      const payload = decodeJwt(idToken);
      console.log('=== FULL DECODE ===');
      console.log(JSON.stringify(idToken, null, 2));

      // Extract claims
      const sub = payload.sub as string | undefined;
      const email = payload.email as string | undefined;
      const name = payload.name as string | undefined;
      // Extract userRole claim and normalize to lowercase
      const userRole = (payload as any).userRole as string | undefined;
      const role = userRole ? userRole.toLowerCase() : undefined;
      const email_verified = payload.email_verified as boolean | undefined;

      // Validate required claims exist
      if (!sub) {
        throw new OktaValidationError('Missing required claim: sub (user ID)');
      }

      if (!email) {
        throw new OktaValidationError('Missing required claim: email');
      }

      if (!name) {
        throw new OktaValidationError('Missing required claim: name');
      }

      // In development, we can be more lenient with email verification
      const requireEmailVerification = process.env.NODE_ENV === 'production';
      if (requireEmailVerification && email_verified !== true) {
        throw new OktaValidationError('Email address is not verified');
      }

      // Validate role claim
      if (!role) {
        throw new OktaValidationError(ERROR_MESSAGES.VALIDATION_MISSING_ROLE);
      }

      if (role !== 'guest' && role !== 'manager') {
        throw new OktaValidationError(ERROR_MESSAGES.VALIDATION_INVALID_ROLE);
      }

      return {
        sub,
        email,
        name,
        role,
        email_verified: email_verified ?? false,
      };
    } catch (error) {
      if (error instanceof OktaValidationError) {
        throw error;
      }

      // Handle JWT decode errors
      throw new OktaValidationError(
        `Failed to parse ID token: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate ID token signature and claims
   * 
   * @param idToken - JWT ID token from Okta
   * @returns true if token is valid, false otherwise
   */
  async validateIdToken(idToken: string): Promise<boolean> {
    const result = await validateIdToken(idToken, this.config);
    return result.valid;
  }
}
