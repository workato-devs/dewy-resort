'use client';

/**
 * Root Error Boundary
 * Top-level error boundary for the entire application
 */

import { ErrorBoundary } from './ErrorBoundary';
import { ReactNode } from 'react';

export function RootErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to external service in production
        console.error('Root Error Boundary caught error:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
