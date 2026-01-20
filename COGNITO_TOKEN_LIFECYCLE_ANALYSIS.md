# Cognito Token Lifecycle Analysis

## Problem Statement

After a period of idle time in the manager chat screen, users receive the error:
**"Chat Error: Failed to exchange ID token for AWS credentials"**

The user must logout and login again, but this is not obvious from the error message (poor UX).

## Root Cause Analysis

### Token Lifecycle Overview

The application uses **three types of Cognito tokens**:

1. **ID Token** (JWT) - Used to exchange for AWS credentials via Identity Pool
   - **Expiration**: 1 hour (default Cognito setting)
   - **Stored in**: `sessions.cognito_id_token` column
   - **Purpose**: Authenticate with Cognito Identity Pool to get temporary AWS credentials

2. **Access Token** (JWT) - Used for API authorization
   - **Expiration**: 1 hour (default Cognito setting)
   - **Stored in**: `sessions.cognito_access_token` column
   - **Purpose**: Access Cognito User Pool APIs

3. **Refresh Token** (opaque token) - Used to obtain new ID and Access tokens
   - **Expiration**: 30 days (default Cognito setting, configurable)
   - **Stored in**: `sessions.cognito_refresh_token` column
   - **Purpose**: Refresh expired ID and Access tokens

### AWS Temporary Credentials Lifecycle

When the ID token is exchanged with Cognito Identity Pool:
- **Temporary AWS credentials** are returned
- **Expiration**: 1 hour (default)
- **Cached in**: `IdentityPoolService.credentialsCache` (in-memory Map)
- **Refresh buffer**: 5 minutes before expiration

## Current Implementation Flow

### 1. Initial Authentication (Login)
```
User Login → Cognito OAuth → Exchange code for tokens → Store in session
  ↓
Session table stores:
  - cognito_id_token (expires in 1 hour)
  - cognito_access_token (expires in 1 hour)
  - cognito_refresh_token (expires in 30 days)
```

### 2. Chat Request Flow
```
User sends chat message
  ↓
POST /api/chat/stream
  ↓
getCognitoIdToken(sessionId, autoRefresh=true)
  ↓
Check if ID token is expired (with 5-minute buffer)
  ↓
If expired → refreshCognitoTokens(sessionId)
  ↓
Exchange ID token for AWS credentials via Identity Pool
  ↓
Use credentials to invoke Bedrock
```

### 3. Token Refresh Mechanism

**Location**: `app/src/lib/auth/session.ts`

#### `getCognitoIdToken()` function:
- Retrieves ID token from session
- Checks if token is expired or close to expiring (5-minute buffer)
- **Automatically calls** `refreshCognitoTokens()` if expired
- Returns refreshed token or expired token if refresh fails

#### `refreshCognitoTokens()` function:
- Retrieves refresh token from session
- Calls `CognitoClient.refreshTokens(refreshToken)`
- Updates session with new ID and Access tokens
- **Does NOT update refresh token** (Cognito may or may not return a new one)

#### `isTokenExpired()` helper:
- Decodes JWT to get `exp` claim
- Compares with current time + buffer (default 5 minutes)
- Returns true if expired or close to expiring

## The Problem: Why Token Refresh Fails

### Issue #1: Refresh Token Expiration Not Handled

**Current behavior**:
- Refresh token expires after 30 days (or configured duration)
- When refresh token expires, `CognitoClient.refreshTokens()` throws error
- Error is caught and logged, but returns `null`
- `getCognitoIdToken()` returns the expired ID token anyway
- Identity Pool exchange fails with "Failed to exchange ID token for AWS credentials"

**Code location**: `app/src/lib/auth/session.ts:653-677`
```typescript
export async function refreshCognitoTokens(
  sessionId: string
): Promise<{ idToken: string; accessToken: string } | null> {
  // ...
  try {
    const tokenResponse = await client.refreshTokens(session.cognito_refresh_token);
    // ...
  } catch (error) {
    console.error('[Token Refresh] Failed to refresh Cognito tokens:', error);
    return null; // ← Returns null, but caller uses expired token anyway
  }
}
```

### Issue #2: Identity Pool Credentials Cache Not Synchronized

**Current behavior**:
- AWS credentials are cached in-memory with 5-minute refresh buffer
- ID token is checked separately with 5-minute buffer
- **Race condition**: Credentials may be cached but ID token expired
- When credentials expire, new exchange attempt uses expired ID token

**Code location**: `app/src/lib/bedrock/identity-pool.ts:60-95`
```typescript
async getCredentialsForUser(
  idToken: string,
  sessionId: string,
  userId?: string,
  role?: string
): Promise<TemporaryCredentials> {
  // Check cache first
  const cached = this.credentialsCache.get(sessionId);
  if (cached && !this.needsRefresh(cached.credentials)) {
    return cached.credentials; // ← May return cached creds even if ID token expired
  }
  // ...
}
```

### Issue #3: Error Recovery in Chat Stream Endpoint

**Current behavior**:
- Chat stream endpoint has ONE retry attempt for token refresh
- Only retries if error message contains "Token expired" or "NotAuthorizedException"
- If refresh fails, throws generic "session has expired" error
- **Does not invalidate session** or redirect to login

**Code location**: `app/src/app/api/chat/stream/route.ts:119-145`
```typescript
try {
  credentials = await identityPoolService.getCredentialsForUser(
    idToken,
    sessionId,
    userId,
    role
  );
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  if (errorMessage.includes('Token expired') || errorMessage.includes('NotAuthorizedException')) {
    const refreshed = await refreshCognitoTokens(sessionId);
    
    if (refreshed) {
      credentials = await identityPoolService.getCredentialsForUser(
        refreshed.idToken,
        sessionId,
        userId,
        role
      );
      // ...
    } else {
      throw new AuthenticationError(
        'Your session has expired. Please refresh the page to continue.',
        { userId, role }
      );
    }
  } else {
    throw error;
  }
}
```

### Issue #4: Frontend Error Handling

**Current behavior**:
- Frontend displays generic error: "Failed to exchange ID token for AWS credentials"
- **Does not detect** that session is invalid
- **Does not redirect** to login page
- **Does not clear** local state
- User must manually logout and login

**Code location**: `app/src/app/manager/chat/page.tsx:157-162`
```typescript
const handleBedrockError = (error: Error) => {
  console.error('Bedrock chat error:', error);
  toast({
    title: 'Chat Error',
    description: error.message || 'An error occurred in the chat',
    variant: 'destructive',
  });
};
```

## Token Expiration Timeline

```
Time 0:00    User logs in
             ├─ ID Token expires at 1:00
             ├─ Access Token expires at 1:00
             └─ Refresh Token expires at 30 days

Time 0:55    ID Token check (5-min buffer)
             └─ Token considered expired, refresh triggered

Time 0:55    Refresh successful
             ├─ New ID Token expires at 1:55
             ├─ New Access Token expires at 1:55
             └─ Refresh Token may or may not be rotated

Time 1:50    ID Token check (5-min buffer)
             └─ Token considered expired, refresh triggered

... (continues until refresh token expires)

Time 30 days Refresh Token expires
             └─ Next refresh attempt FAILS
             └─ User sees "Failed to exchange ID token" error
```

## Why Previous Refresh Attempts Failed

Based on the code, previous attempts to fix this likely failed because:

1. **Refresh logic exists but has gaps**: The `getCognitoIdToken()` function does attempt to refresh, but:
   - Returns expired token if refresh fails (line 641)
   - Doesn't handle refresh token expiration
   - Doesn't invalidate session on refresh failure

2. **No session invalidation**: When refresh fails, the session remains in database
   - User can still access protected pages
   - But cannot use Bedrock chat
   - Creates confusing state

3. **No frontend detection**: Frontend doesn't detect authentication errors
   - Doesn't redirect to login
   - Doesn't show appropriate message
   - User doesn't know they need to re-authenticate

## Recommended Solutions

### Solution 1: Proper Session Invalidation (Backend)

**Modify**: `app/src/lib/auth/session.ts`

```typescript
export async function getCognitoIdToken(
  sessionId: string, 
  autoRefresh: boolean = true
): Promise<string | null> {
  const session = executeQueryOne<SessionRow>(
    `SELECT cognito_id_token FROM sessions WHERE id = ?`,
    [sessionId]
  );
  
  if (!session || !session.cognito_id_token) {
    return null;
  }
  
  // Check if token is expired or close to expiring
  if (autoRefresh && isTokenExpired(session.cognito_id_token)) {
    console.log('[Token Check] ID token is expired or close to expiring, refreshing...');
    
    const refreshed = await refreshCognitoTokens(sessionId);
    
    if (refreshed) {
      console.log('[Token Check] Successfully refreshed ID token');
      return refreshed.idToken;
    } else {
      // *** FIX: Invalidate session when refresh fails ***
      console.error('[Token Check] Failed to refresh token, invalidating session');
      await deleteSession(sessionId);
      return null; // Return null instead of expired token
    }
  }
  
  return session.cognito_id_token;
}
```

### Solution 2: Better Error Handling in Chat Endpoint

**Modify**: `app/src/app/api/chat/stream/route.ts`

```typescript
// Get ID token from session
let idToken = await getCognitoIdToken(sessionId);

if (!idToken) {
  // Session was invalidated (refresh token expired)
  throw new AuthenticationError(
    'Your session has expired. Please log in again.',
    { 
      userId, 
      role,
      code: 'SESSION_EXPIRED', // Add error code for frontend detection
      requiresLogin: true 
    }
  );
}

// Exchange ID token for AWS credentials
try {
  credentials = await identityPoolService.getCredentialsForUser(
    idToken,
    sessionId,
    userId,
    role
  );
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Check for authentication errors
  if (errorMessage.includes('Token expired') || 
      errorMessage.includes('NotAuthorizedException') ||
      errorMessage.includes('Invalid login token')) {
    
    // Try one more refresh
    const refreshed = await refreshCognitoTokens(sessionId);
    
    if (refreshed) {
      // Retry with new token
      credentials = await identityPoolService.getCredentialsForUser(
        refreshed.idToken,
        sessionId,
        userId,
        role
      );
    } else {
      // Refresh failed - invalidate session
      await deleteSession(sessionId);
      throw new AuthenticationError(
        'Your session has expired. Please log in again.',
        { 
          userId, 
          role,
          code: 'SESSION_EXPIRED',
          requiresLogin: true 
        }
      );
    }
  } else {
    throw error;
  }
}
```

### Solution 3: Frontend Authentication Error Detection

**Modify**: `app/src/app/manager/chat/page.tsx`

```typescript
const handleBedrockError = (error: Error) => {
  console.error('Bedrock chat error:', error);
  
  // Check if error indicates session expiration
  const errorMessage = error.message || '';
  const isAuthError = 
    errorMessage.includes('session has expired') ||
    errorMessage.includes('Please log in again') ||
    errorMessage.includes('Failed to exchange ID token');
  
  if (isAuthError) {
    // Show clear message and redirect to login
    toast({
      title: 'Session Expired',
      description: 'Your session has expired. Redirecting to login...',
      variant: 'destructive',
    });
    
    // Redirect to login after 2 seconds
    setTimeout(() => {
      window.location.href = '/login';
    }, 2000);
  } else {
    // Generic error
    toast({
      title: 'Chat Error',
      description: error.message || 'An error occurred in the chat',
      variant: 'destructive',
    });
  }
};
```

### Solution 4: Proactive Token Refresh

**Add**: Background token refresh before expiration

```typescript
// In BedrockChatInterfaceAuto or similar component
useEffect(() => {
  // Refresh tokens every 50 minutes (before 1-hour expiration)
  const refreshInterval = setInterval(async () => {
    try {
      await fetch('/api/auth/refresh', { method: 'POST' });
      console.log('Proactively refreshed tokens');
    } catch (error) {
      console.error('Failed to refresh tokens:', error);
      // Session may be expired, let next API call handle it
    }
  }, 50 * 60 * 1000); // 50 minutes

  return () => clearInterval(refreshInterval);
}, []);
```

**Add**: New API endpoint `/api/auth/refresh`

```typescript
// app/src/app/api/auth/refresh/route.ts
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const { sessionId } = session;
    
    // Attempt to refresh tokens
    const refreshed = await refreshCognitoTokens(sessionId);
    
    if (!refreshed) {
      // Refresh failed - invalidate session
      await deleteSession(sessionId);
      return createErrorResponse(
        new AuthenticationError('Session expired'),
        'auth.refresh'
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error, 'auth.refresh');
  }
}
```

## Summary

The root cause is a **multi-layered token expiration issue**:

1. **ID tokens expire after 1 hour** and need refresh
2. **Refresh tokens expire after 30 days** and cannot be refreshed
3. **Current refresh logic** returns expired tokens when refresh fails
4. **Session is not invalidated** when refresh token expires
5. **Frontend doesn't detect** authentication errors properly
6. **Error message is generic** and doesn't guide user to re-login

The fix requires:
- ✅ Invalidate session when refresh fails
- ✅ Return null instead of expired token
- ✅ Better error codes for frontend detection
- ✅ Frontend redirect to login on auth errors
- ✅ Clearer error messages
- ✅ Optional: Proactive token refresh to prevent expiration
