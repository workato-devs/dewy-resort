/**
 * API Logger Utility
 * Provides pretty-printed logging for API requests and responses
 * SERVER-SIDE ONLY - Do not import in client components
 */

interface ApiLogOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  response?: any;
  error?: any;
  duration?: number;
}

/**
 * Check if API response logging is enabled
 * Safe to call from both server and client (returns false on client)
 */
export function isApiLoggingEnabled(): boolean {
  // Check if we're on the server
  if (typeof window === 'undefined') {
    return process.env.SHOW_API_RESPONSES === 'true';
  }
  return false;
}

/**
 * Check if fallback error banner should be shown
 * Safe to call from both server and client (returns false on client)
 */
export function shouldShowFallbackErrors(): boolean {
  // Check if we're on the server
  if (typeof window === 'undefined') {
    return process.env.SHOW_FALLBACK_ERRORS === 'true';
  }
  return false;
}

/**
 * Pretty print API request details
 */
export function logApiRequest(options: Pick<ApiLogOptions, 'method' | 'url' | 'headers' | 'body'>): void {
  if (!isApiLoggingEnabled()) return;

  console.group(`🔵 API Request: ${options.method} ${options.url}`);
  
  if (options.headers) {
    console.log('Headers:', JSON.stringify(sanitizeHeaders(options.headers), null, 2));
  }
  
  if (options.body) {
    console.log('Body:', JSON.stringify(options.body, null, 2));
  }
  
  console.groupEnd();
}

/**
 * Pretty print API response details
 */
export function logApiResponse(options: Pick<ApiLogOptions, 'method' | 'url' | 'response' | 'duration'>): void {
  if (!isApiLoggingEnabled()) return;

  const durationText = options.duration ? ` (${options.duration}ms)` : '';
  console.group(`🟢 API Response: ${options.method} ${options.url}${durationText}`);
  
  if (options.response) {
    console.log('Response:', JSON.stringify(options.response, null, 2));
  }
  
  console.groupEnd();
}

/**
 * Pretty print API error details
 */
export function logApiError(options: Pick<ApiLogOptions, 'method' | 'url' | 'error' | 'duration'>): void {
  if (!isApiLoggingEnabled()) return;

  const durationText = options.duration ? ` (${options.duration}ms)` : '';
  console.group(`🔴 API Error: ${options.method} ${options.url}${durationText}`);
  
  if (options.error) {
    console.error('Error:', options.error);
  }
  
  console.groupEnd();
}

/**
 * Sanitize headers to remove sensitive information
 */
function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized = { ...headers };
  
  // Mask sensitive headers
  const sensitiveHeaders = ['authorization', 'api-token', 'x-api-key', 'cookie'];
  
  for (const key of Object.keys(sanitized)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      const value = sanitized[key];
      if (value && value.length > 8) {
        sanitized[key] = `${value.substring(0, 8)}...`;
      } else {
        sanitized[key] = '***';
      }
    }
  }
  
  return sanitized;
}
