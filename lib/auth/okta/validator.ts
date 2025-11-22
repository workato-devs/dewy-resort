/**
 * Okta Token Validator Module
 * 
 * Validates JWT tokens from Okta using JWKS (JSON Web Key Set).
 * Implements caching to reduce API calls to Okta's JWKS endpoint.
 */

import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { OktaConfig } from './config';

/**
 * User claims extracted from Okta ID token
 */
export interface OktaUserClaims {
  sub: string;           // Okta user ID
  email: string;
  name: string;
  role?: string;         // Custom claim
  email_verified: boolean;
}

/**
 * Result of token validation
 */
export interface TokenValidationResult {
  valid: boolean;
  claims?: OktaUserClaims;
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
 * In-memory cache for JWKS with 1 hour TTL
 */
const jwksCache = new Map<string, JWKSCacheEntry>();

/**
 * JWKS cache TTL in milliseconds (1 hour)
 */
const JWKS_CACHE_TTL = 60 * 60 * 1000;

/**
 * Fetch JWKS (JSON Web Key Set) from Okta with caching
 * 
 * @param issuer - The Okta issuer URL
 * @returns JWKS remote function for token verification
 */
export function fetchJWKS(issuer: string): ReturnType<typeof createRemoteJWKSet> {
  const now = Date.now();
  
  // Check if we have a valid cached entry
  const cached = jwksCache.get(issuer);
  if (cached && cached.expiresAt > now) {
    return cached.jwks;
  }
  
  // Create new JWKS remote function
  const jwksUrl = new URL(`${issuer}/v1/keys`);
  const jwks = createRemoteJWKSet(jwksUrl);
  
  // Cache the JWKS with expiration
  jwksCache.set(issuer, {
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
 * Validate Okta ID token
 * 
 * Verifies the token signature using JWKS and validates all required claims.
 * 
 * @param token - The ID token JWT string
 * @param config - Okta configuration
 * @returns TokenValidationResult with validation status and claims or error
 */
export async function validateIdToken(
  token: string,
  config: OktaConfig
): Promise<TokenValidationResult> {
  try {
    // Fetch JWKS for signature verification
    const jwks = fetchJWKS(config.issuer);
    
    // Verify token signature and validate standard claims
    const { payload } = await jwtVerify(token, jwks, {
      issuer: config.issuer,
      audience: config.clientId,
    });
    
    // Extract claims - payload contains all JWT claims
    const claims = payload as JWTPayload & {
      email?: string;
      name?: string;
      userRole?: string;
      email_verified?: boolean;
      [key: string]: any; // Allow access to any additional claims
    };
    
    // DEBUG: Log to see what's actually in the token
    console.log('=== FULL PAYLOAD ===');
    console.log(JSON.stringify(claims, null, 2));
    console.log('=== userRole value ===', claims.userRole);
    console.log('====================');
    
    // Validate required claims exist
    if (!claims.sub) {
      return {
        valid: false,
        error: 'Missing required claim: sub (user ID)',
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
    
    // Validate email_verified is true
    // In development, we can be more lenient with email verification
    const requireEmailVerification = process.env.NODE_ENV === 'production';
    if (requireEmailVerification && claims.email_verified !== true) {
      return {
        valid: false,
        error: 'Email address is not verified',
      };
    }
    
    // Extract and validate role claim
    // The claim is named "userRole" and contains values like "Manager" or "Guest"
    const userRole = claims.userRole;
    
    if (!userRole) {
      return {
        valid: false,
        error: 'Missing required claim: userRole. User role not configured in Okta.',
      };
    }
    
    // Normalize to lowercase for comparison
    const role = userRole.toLowerCase();
    
    if (role !== 'guest' && role !== 'manager') {
      return {
        valid: false,
        error: `Invalid role value: "${userRole}". Role must be "guest" or "manager" (case-insensitive).`,
      };
    }
    
    // Return successful validation with claims
    return {
      valid: true,
      claims: {
        sub: claims.sub,
        email: claims.email,
        name: claims.name,
        role: role,
        email_verified: claims.email_verified ?? false,
      },
    };
  } catch (error) {
    // Handle JWT verification errors
    if (error instanceof Error) {
      // Provide detailed error messages for common issues
      if (error.message.includes('expired')) {
        return {
          valid: false,
          error: 'ID token has expired',
        };
      }
      
      if (error.message.includes('signature')) {
        return {
          valid: false,
          error: 'Invalid token signature',
        };
      }
      
      if (error.message.includes('issuer')) {
        return {
          valid: false,
          error: 'Invalid token issuer',
        };
      }
      
      if (error.message.includes('audience')) {
        return {
          valid: false,
          error: 'Invalid token audience',
        };
      }
      
      // Generic error message
      return {
        valid: false,
        error: `Token validation failed: ${error.message}`,
      };
    }
    
    return {
      valid: false,
      error: 'Unknown token validation error',
    };
  }
}
