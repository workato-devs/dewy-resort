/**
 * Fetch utilities with optional SSL verification bypass
 * 
 * When behind corporate proxies like ZScaler, SSL certificate verification
 * may need to be disabled. Set DISABLE_SSL_VERIFICATION=true in .env to enable.
 * 
 * SECURITY WARNING: Only use this in development environments behind corporate proxies.
 * Never disable SSL verification in production!
 */

/**
 * Enhanced fetch that respects DISABLE_SSL_VERIFICATION environment variable
 * 
 * @param url - URL to fetch
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export async function secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Check if SSL verification should be disabled
  const disableSSL = process.env.DISABLE_SSL_VERIFICATION === 'true';
  
  if (disableSSL && typeof process !== 'undefined') {
    // Store original value
    const originalValue = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    
    // Disable SSL verification
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    try {
      const response = await fetch(url, options);
      return response;
    } finally {
      // Always restore original value
      if (originalValue !== undefined) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalValue;
      } else {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      }
    }
  }
  
  // Normal fetch with SSL verification
  return fetch(url, options);
}

/**
 * Check if SSL verification is disabled
 * Useful for logging or displaying warnings
 */
export function isSSLVerificationDisabled(): boolean {
  return process.env.DISABLE_SSL_VERIFICATION === 'true';
}

/**
 * Get a warning message if SSL verification is disabled
 */
export function getSSLWarning(): string | null {
  if (isSSLVerificationDisabled()) {
    return 'SSL verification is disabled. This should only be used in development behind corporate proxies.';
  }
  return null;
}
