/**
 * API Fetch Hook with Retry Logic
 * Provides fetch wrapper with automatic retry and error handling
 */

import { useState, useCallback } from 'react';
import { useApiError } from './use-api-error';

interface FetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
}

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  fetch: (url: string, options?: FetchOptions) => Promise<T | null>;
  refetch: () => Promise<T | null>;
}

export function useApiFetch<T = any>(): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastRequest, setLastRequest] = useState<{ url: string; options?: FetchOptions } | null>(null);
  const { handleError } = useApiError();

  const fetchWithRetry = useCallback(
    async (url: string, options: FetchOptions = {}): Promise<T | null> => {
      const { retries = 1, retryDelay = 1000, ...fetchOptions } = options;
      
      setLoading(true);
      setError(null);
      setLastRequest({ url, options });

      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const response = await fetch(url, fetchOptions);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();
          setData(result);
          setLoading(false);
          return result;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));

          // If this is not the last attempt, wait before retrying
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }

      // All retries failed
      setError(lastError);
      setLoading(false);
      handleError(lastError);
      return null;
    },
    [handleError]
  );

  const refetch = useCallback(async () => {
    if (!lastRequest) {
      return null;
    }
    return fetchWithRetry(lastRequest.url, lastRequest.options);
  }, [lastRequest, fetchWithRetry]);

  return {
    data,
    loading,
    error,
    fetch: fetchWithRetry,
    refetch,
  };
}

/**
 * Simplified hook for single API call
 */
export function useApiCall<T = any>(
  url: string,
  options?: FetchOptions
) {
  const { data, loading, error, fetch, refetch } = useApiFetch<T>();
  const [called, setCalled] = useState(false);

  const execute = useCallback(async () => {
    setCalled(true);
    return fetch(url, options);
  }, [url, options, fetch]);

  return {
    data,
    loading,
    error,
    called,
    execute,
    refetch,
  };
}
