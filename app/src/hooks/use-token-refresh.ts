/**
 * useTokenRefresh Hook
 * 
 * Proactively refreshes Cognito tokens before they expire to prevent
 * authentication errors during long chat sessions.
 * 
 * Tokens expire after 1 hour, so we refresh every 50 minutes to stay ahead.
 */

import { useEffect, useRef } from 'react';

/**
 * Hook options
 */
export interface UseTokenRefreshOptions {
  /**
   * Interval in milliseconds between refresh attempts
   * Default: 50 minutes (3000000ms)
   */
  refreshInterval?: number;
  
  /**
   * Whether to enable automatic refresh
   * Default: true
   */
  enabled?: boolean;
  
  /**
   * Callback when refresh succeeds
   */
  onRefreshSuccess?: () => void;
  
  /**
   * Callback when refresh fails
   */
  onRefreshError?: (error: Error) => void;
}

/**
 * useTokenRefresh Hook
 * 
 * Automatically refreshes authentication tokens at regular intervals
 * to prevent session expiration during active use.
 * 
 * @param options - Configuration options
 */
export function useTokenRefresh(options: UseTokenRefreshOptions = {}) {
  const {
    refreshInterval = 50 * 60 * 1000, // 50 minutes
    enabled = true,
    onRefreshSuccess,
    onRefreshError,
  } = options;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    /**
     * Perform token refresh
     */
    const refreshTokens = async () => {
      // Prevent concurrent refresh attempts
      if (isRefreshingRef.current) {
        console.log('[Token Refresh] Refresh already in progress, skipping');
        return;
      }

      isRefreshingRef.current = true;

      try {
        console.log('[Token Refresh] Proactively refreshing tokens...');
        
        const response = await fetch('/api/auth/refresh', { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || 'Token refresh failed');
        }

        console.log('[Token Refresh] Tokens refreshed successfully');
        
        if (onRefreshSuccess) {
          onRefreshSuccess();
        }
      } catch (error) {
        console.error('[Token Refresh] Failed to refresh tokens:', error);
        
        const refreshError = error instanceof Error 
          ? error 
          : new Error('Token refresh failed');
        
        if (onRefreshError) {
          onRefreshError(refreshError);
        }
        
        // If refresh fails, the next API call will handle session expiration
        // and redirect to login if needed
      } finally {
        isRefreshingRef.current = false;
      }
    };

    // Set up interval for periodic refresh
    intervalRef.current = setInterval(refreshTokens, refreshInterval);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, refreshInterval, onRefreshSuccess, onRefreshError]);

  return {
    // Could expose manual refresh function if needed
    // refreshNow: refreshTokens
  };
}
