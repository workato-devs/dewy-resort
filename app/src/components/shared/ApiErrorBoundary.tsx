'use client';

/**
 * API Error Boundary Component
 * Specialized error boundary for API-related errors
 */

import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ApiErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
}

export function ApiErrorBoundary({ children, onRetry }: ApiErrorBoundaryProps) {
  const fallback = (
    <div className="flex items-center justify-center min-h-[300px] p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-destructive">Connection Error</CardTitle>
          <CardDescription>
            Unable to load data. Please check your connection and try again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {onRetry && (
              <Button onClick={onRetry} variant="default">
                Retry
              </Button>
            )}
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>;
}
