# Error Handling System

This directory contains the comprehensive error handling utilities for the Hotel Management Demo application.

## Overview

The error handling system provides:
- Standardized error classes
- Centralized error logging
- API error response formatting
- Frontend error boundaries
- Toast notifications for errors
- Retry mechanisms for failed requests

## Error Classes

### Base Error Class

```typescript
import { AppError } from '@/lib/errors';

throw new AppError(statusCode, message, code, details);
```

### Specific Error Types

```typescript
import {
  AuthenticationError,    // 401 - Authentication failed
  AuthorizationError,     // 403 - Insufficient permissions
  NotFoundError,          // 404 - Resource not found
  ValidationError,        // 400 - Invalid input
  ExternalServiceError,   // 502 - External service error
  DatabaseError,          // 500 - Database error
} from '@/lib/errors';

// Usage examples
throw new AuthenticationError('Invalid credentials');
throw new NotFoundError('User');
throw new ValidationError('Email is required');
throw new ExternalServiceError('Stripe', 'Payment failed');
```

## API Error Handling

### Using createErrorResponse

```typescript
import { createErrorResponse } from '@/lib/errors/api-response';

export async function GET(request: NextRequest) {
  try {
    // Your API logic
    return NextResponse.json({ data });
  } catch (error) {
    return createErrorResponse(error, 'GET /api/your-route');
  }
}
```

### Using apiHandler Wrapper

```typescript
import { apiHandler } from '@/lib/errors/api-handler';

export const GET = apiHandler(async (request) => {
  // Your API logic - errors are automatically handled
  return NextResponse.json({ data });
}, 'GET /api/your-route');
```

## Frontend Error Handling

### Error Boundaries

Wrap components with error boundaries to catch React errors:

```typescript
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

For API-specific errors:

```typescript
import { ApiErrorBoundary } from '@/components/shared/ApiErrorBoundary';

<ApiErrorBoundary onRetry={refetchData}>
  <YourDataComponent />
</ApiErrorBoundary>
```

### Using Error Hooks

```typescript
import { useApiError } from '@/hooks/use-api-error';

function MyComponent() {
  const { handleError, handleSuccess } = useApiError();

  const submitForm = async () => {
    try {
      const response = await fetch('/api/endpoint', { method: 'POST' });
      const data = await response.json();
      
      if (!response.ok) {
        handleError(data);
        return;
      }
      
      handleSuccess('Form submitted successfully');
    } catch (error) {
      handleError(error);
    }
  };
}
```

### Using Fetch with Retry

```typescript
import { useApiFetch } from '@/hooks/use-api-fetch';

function MyComponent() {
  const { data, loading, error, fetch, refetch } = useApiFetch();

  useEffect(() => {
    fetch('/api/endpoint', {
      retries: 2,
      retryDelay: 1000,
    });
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  
  return <div>{/* Render data */}</div>;
}
```

## Error Logging

```typescript
import { ErrorLogger } from '@/lib/errors';

// Log errors
ErrorLogger.log(error, 'ComponentName');

// Log warnings
ErrorLogger.warn('Something might be wrong', 'ComponentName');

// Log info (development only)
ErrorLogger.info('Debug information', 'ComponentName');
```

## Error Display Components

### ErrorState Component

```typescript
import { ErrorState } from '@/components/shared/ErrorState';

<ErrorState
  title="Failed to Load"
  message="Unable to fetch data"
  onRetry={refetch}
/>
```

### InlineError Component

```typescript
import { InlineError } from '@/components/shared/ErrorState';

<InlineError
  message="Invalid email format"
  onRetry={validateAgain}
/>
```

## Best Practices

1. **Always use typed errors in API routes**
   ```typescript
   if (!user) {
     throw new NotFoundError('User');
   }
   ```

2. **Provide context when logging errors**
   ```typescript
   return createErrorResponse(error, 'POST /api/auth/login');
   ```

3. **Use error boundaries around major components**
   - Wrap each page/route with ErrorBoundary
   - Use ApiErrorBoundary for data-fetching components

4. **Show user-friendly error messages**
   - Use toast notifications for transient errors
   - Use ErrorState component for persistent errors
   - Provide retry mechanisms when appropriate

5. **Log errors for debugging**
   - All errors are automatically logged with context
   - Include stack traces in development mode
   - Sanitize sensitive data before logging

## Error Response Format

All API errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": {
      "field": "email"
    }
  }
}
```

## Migration Guide

To update existing API routes:

1. Import error utilities:
   ```typescript
   import { ValidationError, NotFoundError } from '@/lib/errors';
   import { createErrorResponse } from '@/lib/errors/api-response';
   ```

2. Replace manual error responses with typed errors:
   ```typescript
   // Before
   return NextResponse.json(
     { error: { code: 'NOT_FOUND', message: 'User not found' } },
     { status: 404 }
   );
   
   // After
   throw new NotFoundError('User');
   ```

3. Update catch blocks:
   ```typescript
   // Before
   } catch (error) {
     console.error('Error:', error);
     return NextResponse.json({ error: 'Internal error' }, { status: 500 });
   }
   
   // After
   } catch (error) {
     return createErrorResponse(error, 'GET /api/your-route');
   }
   ```
