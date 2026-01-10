/**
 * Cognito Token Validator Module
 * 
 * Validates JWT ID tokens from Amazon Cognito by verifying signatures using JWKS
 * and validating standard and custom claims.
 */

import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';
import type { CognitoConfig } from './config';
import type { CognitoUserClaims } from './client';
import { CognitoValidationError, ERROR_MESSAGES } from './errors';

/**
 * Result of token validation
 */
export interface TokenValidationResult {
  valid: boolean;
  claims?: CognitoUserClaims;
  error?: string;
}

/**
 * JWKS cache entry
 */
interface JWKSCacheEntry {
  jwks: ReturnType<typeof createRemoteJWKSet>;
  expiresAt: number;
}

/**
 * In-memory JWKS cache with 1 hour TTL
 * Key: JWKS URI, Value: Cache entry with JWKS and expiration
 */
const jwksCache = new Map<string, JWKSCacheEntry>();

/**
 * JWKS cache TTL in milliseconds (1 hour)
 */
const JWKS_CACHE_TTL = 60 * 60 * 1000;

/**
 * Fetch JWKS (JSON Web Key Set) from Cognito with caching
 * 
 * @param jwksUri - URI to fetch JWKS from
 * @returns JWKS remote set for signature verification
 */
export function fetchJWKS(jwksUri: string): ReturnType<typeof createRemoteJWKSet> {
  const now = Date.now();
  
  // Check cache
  const cached = jwksCache.get(jwksUri);
  if (cached && cached.expiresAt > now) {
    return cached.jwks;
  }
  
  // Create new JWKS remote set
  const jwks = createRemoteJWKSet(new URL(jwksUri));
  
  // Cache with 1 hour TTL
  jwksCache.set(jwksUri, {
    jwks,
    expiresAt: now + JWKS_CACHE_TTL,
  });
  
  return jwks;
}

/**
 * Clear JWKS cache (useful for testing)
 */
export function clearJWKSCache(): void {
  jwksCache.clear();
}

/**
 * Validate Cognito ID token
 * 
 * Performs comprehensive validation including:
 * - Signature verification using Cognito's public keys (JWKS)
 * - Standard JWT claims (iss, aud, exp, iat)
 * - Cognito-specific claims (token_use, email_verified)
 * 
 * @param token - JWT ID token to validate
 * @param config - Cognito configuration
 * @returns Validation result with valid flag, claims, and error message
 */
export async function validateIdToken(
  token: string,
  config: CognitoConfig
): Promise<TokenValidationResult> {
  try {
    // Fetch JWKS for signature verification
    const jwks = fetchJWKS(config.jwksUri);
    
    // Verify token signature and validate standard claims
    const { payload } = await jwtVerify(token, jwks, {
      issuer: config.issuer,
      audience: config.clientId,
    });
    
    // Cast payload to CognitoUserClaims
    const claims = payload as unknown as CognitoUserClaims;
    
    // Validate token_use claim
    if (claims.token_use !== 'id') {
      return {
        valid: false,
        error: ERROR_MESSAGES.TOKEN_INVALID,
      };
    }
    
    // Validate email_verified claim
    if (!claims.email_verified) {
      return {
        valid: false,
        error: ERROR_MESSAGES.EMAIL_NOT_VERIFIED,
      };
    }
    
    // Validate required claims are present
    if (!claims.sub) {
      return {
        valid: false,
        error: 'Missing required claim: sub',
      };
    }
    
    if (!claims.email) {
      return {
        valid: false,
        error: 'Missing required claim: email',
      };
    }
    
    if (!claims.name) {
      return {
        valid: false,
        error: 'Missing required claim: name',
      };
    }
    
    // Token is valid
    return {
      valid: true,
      claims,
    };
  } catch (error) {
    // Handle specific jose errors
    if (error instanceof Error) {
      // Token expired
      if (error.message.includes('exp')) {
        return {
          valid: false,
          error: ERROR_MESSAGES.TOKEN_EXPIRED,
        };
      }
      
      // Invalid signature
      if (error.message.includes('signature')) {
        return {
          valid: false,
          error: ERROR_MESSAGES.TOKEN_INVALID_SIGNATURE,
        };
      }
      
      // Invalid issuer
      if (error.message.includes('issuer')) {
        return {
          valid: false,
          error: ERROR_MESSAGES.TOKEN_INVALID_ISSUER,
        };
      }
      
      // Invalid audience
      if (error.message.includes('audience')) {
        return {
          valid: false,
          error: ERROR_MESSAGES.TOKEN_INVALID_AUDIENCE,
        };
      }
      
      // Generic validation error
      return {
        valid: false,
        error: `Token validation failed: ${error.message}`,
      };
    }
    
    // Unknown error
    return {
      valid: false,
      error: ERROR_MESSAGES.TOKEN_INVALID,
    };
  }
}
