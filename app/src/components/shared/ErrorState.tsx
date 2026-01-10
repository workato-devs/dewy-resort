/**
 * Error State Component
 * Displays error messages with retry functionality
 */

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function ErrorState({ 
  title = 'Error', 
  message, 
  onRetry,
  showRetry = true 
}: ErrorStateProps) {
  return (
    <Card className="border-destructive">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">{title}</CardTitle>
        </div>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      {showRetry && onRetry && (
        <CardContent>
          <Button onClick={onRetry} variant="outline" size="sm">
            Try Again
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Inline Error Message
 * Smaller error display for inline use
 */
interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
}

export function InlineError({ message, onRetry }: InlineErrorProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-md">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <p className="text-sm text-destructive">{message}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="ghost" size="sm">
          Retry
        </Button>
      )}
    </div>
  );
}
