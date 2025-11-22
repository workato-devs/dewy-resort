import * as crypto from 'crypto';

/**
 * PKCE (Proof Key for Code Exchange) pair containing code verifier and challenge
 */
export interface PKCEPair {
  codeVerifier: string;   // Random string, 43-128 chars
  codeChallenge: string;  // Base64URL(SHA256(codeVerifier))
}

/**
 * Base64URL encode a buffer (URL-safe base64 without padding)
 */
function base64URLEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate a cryptographically random code verifier
 * @returns A base64url-encoded random string (43 characters)
 */
export function generateCodeVerifier(): string {
  // Generate 32 random bytes (256 bits)
  const randomBytes = crypto.randomBytes(32);
  
  // Base64URL encode to get 43 character string
  return base64URLEncode(randomBytes);
}

/**
 * Generate a code challenge from a code verifier using SHA-256
 * @param verifier The code verifier to hash
 * @returns Base64URL-encoded SHA-256 hash of the verifier
 */
export function generateCodeChallenge(verifier: string): string {
  // SHA-256 hash the verifier
  const hash = crypto.createHash('sha256').update(verifier).digest();
  
  // Base64URL encode the hash
  return base64URLEncode(hash);
}

/**
 * Generate a complete PKCE pair (verifier and challenge)
 * @returns PKCEPair containing both code verifier and code challenge
 */
export function generatePKCE(): PKCEPair {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  return {
    codeVerifier,
    codeChallenge,
  };
}
