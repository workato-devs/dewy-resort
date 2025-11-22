/**
 * API Error Handling Hook
 * Provides utilities for handling API errors with toast notifications
 */

import { useToast } from './use-toast';

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export function useApiError() {
  const { toast } = useToast();

  /**
   * Handle API error response
   */
  const handleError = (error: unknown, fallbackMessage = 'An error occurred') => {
    let errorMessage = fallbackMessage;
    let errorCode = 'UNKNOWN_ERROR';

    if (isApiError(error)) {
      errorMessage = error.error.message;
      errorCode = error.error.code;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    toast({
      variant: 'destructive',
      title: 'Error',
      description: errorMessage,
    });

    // Log error for debugging
    console.error(`[${errorCode}]`, errorMessage);
  };

  /**
   * Handle API success with toast
   */
  const handleSuccess = (message: string) => {
    toast({
      title: 'Success',
      description: message,
    });
  };

  /**
   * Show warning toast
   */
  const handleWarning = (message: string) => {
    toast({
      title: 'Warning',
      description: message,
      variant: 'default',
    });
  };

  return {
    handleError,
    handleSuccess,
    handleWarning,
  };
}

/**
 * Type guard for API error
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof (error as any).error === 'object' &&
    'code' in (error as any).error &&
    'message' in (error as any).error
  );
}

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}
