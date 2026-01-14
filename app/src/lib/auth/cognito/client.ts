/**
 * Cognito OAuth Client Module
 * 
 * Handles OAuth 2.0 Authorization Code Flow with PKCE for Amazon Cognito.
 * Provides methods for generating authorization URLs, exchanging codes for tokens,
 * and parsing ID tokens.
 */

import { decodeJwt } from 'jose';
import type { CognitoConfig } from './config';
import { CognitoTokenError, CognitoAuthenticationError, ERROR_MESSAGES } from './errors';

/**
 * Token response from Cognito token endpoint
 */
export interface CognitoTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token: string;
  refresh_token: string;
}

/**
 * User claims extracted from Cognito ID token
 */
export interface CognitoUserClaims {
  sub: string;                    // Cognito user ID (UUID)
  email: string;                  // User's email address
  name: string;                   // User's full name
  'custom:role'?: string;         // Custom role attribute (guest or manager)
  email_verified: boolean;        // Whether email is verified
  token_use: string;              // Should be "id" for ID tokens
  iss: string;                    // Token issuer
  aud: string;                    // Token audience (client ID)
  exp: number;                    // Expiration timestamp
  iat: number;                    // Issued at timestamp
}

/**
 * Cognito OAuth 2.0 client for handling authentication flows
 */
export class CognitoClient {
  private config: CognitoConfig;

  constructor(config: CognitoConfig) {
    this.config = config;
  }

  /**
   * Generate authorization URL for Cognito Hosted UI with PKCE parameters
   * 
   * @param codeChallenge - PKCE code challenge (SHA-256 hash of verifier)
   * @param state - Random state parameter for CSRF protection
   * @returns Complete authorization URL to redirect user to
   */
  getAuthorizationUrl(codeChallenge: string, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'openid email profile',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${this.config.authorizationEndpoint}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens with retry logic
   * 
   * @param code - Authorization code from Cognito callback
   * @param codeVerifier - PKCE code verifier (original random string)
   * @returns Token response containing access token, ID token, and refresh token
   * @throws CognitoTokenError if token exchange fails after retries
   */
  async exchangeCodeForTokens(
    code: string,
    codeVerifier: string
  ): Promise<CognitoTokenResponse> {
    const maxAttempts = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.performTokenExchange(code, codeVerifier);
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on client errors (4xx)
        if (error instanceof CognitoTokenError && error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }

        // If this isn't the last attempt, wait before retrying with exponential backoff
        if (attempt < maxAttempts) {
          const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // All retries failed
    throw new CognitoTokenError(
      `${ERROR_MESSAGES.TOKEN_EXCHANGE_FAILED} (${maxAttempts} attempts)`,
      lastError instanceof CognitoTokenError ? lastError.statusCode : undefined
    );
  }

  /**
   * Perform a single token exchange request
   * 
   * @param code - Authorization code
   * @param codeVerifier - PKCE code verifier
   * @returns Token response
   * @throws CognitoTokenError on failure
   */
  private async performTokenExchange(
    code: string,
    codeVerifier: string
  ): Promise<CognitoTokenResponse> {
    // Prepare request body (application/x-www-form-urlencoded)
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      code: code,
      redirect_uri: this.config.redirectUri,
      code_verifier: codeVerifier,
    });

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    // Build headers - use Basic Auth if client secret is provided, otherwise just send client_id
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (this.config.clientSecret) {
      // Confidential client: use Basic Auth
      const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }
    // For public clients, client_id is already in the body

    try {
      const response = await fetch(this.config.tokenEndpoint, {
        method: 'POST',
        headers,
        body: body.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error_description || errorData.error || ERROR_MESSAGES.TOKEN_EXCHANGE_FAILED;
        
        throw new CognitoTokenError(
          errorMessage,
          response.status
        );
      }

      const tokenResponse: CognitoTokenResponse = await response.json();

      // Validate response contains required fields
      if (!tokenResponse.id_token || !tokenResponse.access_token) {
        throw new CognitoTokenError('Invalid token response: missing required tokens');
      }

      return tokenResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new CognitoTokenError(ERROR_MESSAGES.TOKEN_TIMEOUT);
      }

      // Handle network errors
      if (error instanceof TypeError) {
        throw new CognitoTokenError(ERROR_MESSAGES.TOKEN_NETWORK_ERROR);
      }

      // Re-throw CognitoTokenError as-is
      if (error instanceof CognitoTokenError) {
        throw error;
      }

      // Wrap other errors
      throw new CognitoTokenError(
        `Token exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Refresh tokens using refresh token
   * 
   * @param refreshToken - Cognito refresh token
   * @returns Token response with new access token and ID token
   * @throws CognitoTokenError if token refresh fails
   */
  async refreshTokens(refreshToken: string): Promise<CognitoTokenResponse> {
    const maxAttempts = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.performTokenRefresh(refreshToken);
      } catch (error) {
        lastError = error as Error;
        console.error(`[Cognito Client] Token refresh attempt ${attempt}/${maxAttempts} failed:`, {
          error: error instanceof Error ? error.message : String(error),
          statusCode: error instanceof CognitoTokenError ? error.statusCode : undefined,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        });
        
        // Don't retry on client errors (4xx)
        if (error instanceof CognitoTokenError && error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          console.error('[Cognito Client] Client error (4xx), not retrying');
          throw error;
        }

        // If this isn't the last attempt, wait before retrying with exponential backoff
        if (attempt < maxAttempts) {
          const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          console.log(`[Cognito Client] Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // All retries failed
    console.error('[Cognito Client] All token refresh attempts failed');
    throw new CognitoTokenError(
      `${ERROR_MESSAGES.TOKEN_EXCHANGE_FAILED} (${maxAttempts} attempts)`,
      lastError instanceof CognitoTokenError ? lastError.statusCode : undefined
    );
  }

  /**
   * Perform a single token refresh request
   * 
   * @param refreshToken - Refresh token
   * @returns Token response
   * @throws CognitoTokenError on failure
   */
  private async performTokenRefresh(refreshToken: string): Promise<CognitoTokenResponse> {
    // Prepare request body (application/x-www-form-urlencoded)
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      refresh_token: refreshToken,
    });

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    // Build headers - use Basic Auth if client secret is provided, otherwise just send client_id
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (this.config.clientSecret) {
      // Confidential client: use Basic Auth
      const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }
    // For public clients, client_id is already in the body

    try {
      const response = await fetch(this.config.tokenEndpoint, {
        method: 'POST',
        headers,
        body: body.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error_description || errorData.error || 'Token refresh failed';
        
        // Log the actual Cognito error for debugging
        console.error('[Cognito Token Refresh] Error response:', {
          status: response.status,
          error: errorData.error,
          errorDescription: errorData.error_description,
        });
        
        throw new CognitoTokenError(
          errorMessage,
          response.status
        );
      }

      const tokenResponse: CognitoTokenResponse = await response.json();

      // Validate response contains required fields
      if (!tokenResponse.id_token || !tokenResponse.access_token) {
        throw new CognitoTokenError('Invalid token response: missing required tokens');
      }

      return tokenResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new CognitoTokenError('Token refresh timeout');
      }

      // Handle network errors
      if (error instanceof TypeError) {
        console.error('[Cognito Token Refresh] Network error details:', {
          message: error.message,
          stack: error.stack,
          tokenEndpoint: this.config.tokenEndpoint,
        });
        throw new CognitoTokenError(`Token refresh network error: ${error.message}`);
      }

      // Re-throw CognitoTokenError as-is
      if (error instanceof CognitoTokenError) {
        throw error;
      }

      // Wrap other errors
      console.error('[Cognito Token Refresh] Unexpected error:', error);
      throw new CognitoTokenError(
        `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Parse ID token and extract user claims
   * 
   * @param idToken - JWT ID token from Cognito
   * @returns Decoded user claims
   * @throws CognitoAuthenticationError if token cannot be parsed
   */
  parseIdToken(idToken: string): CognitoUserClaims {
    try {
      // Decode JWT without verification (verification happens separately in validator)
      const claims = decodeJwt(idToken) as unknown as CognitoUserClaims;

      // Validate required claims are present
      if (!claims.sub) {
        throw new CognitoAuthenticationError('ID token missing required claim: sub');
      }
      if (!claims.email) {
        throw new CognitoAuthenticationError('ID token missing required claim: email');
      }
      if (!claims.name) {
        throw new CognitoAuthenticationError('ID token missing required claim: name');
      }

      return claims;
    } catch (error) {
      if (error instanceof CognitoAuthenticationError) {
        throw error;
      }
      
      throw new CognitoAuthenticationError(
        `Failed to parse ID token: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
