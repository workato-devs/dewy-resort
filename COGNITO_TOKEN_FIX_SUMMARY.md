# Cognito Token Expiration Fix - Implementation Summary

## Problem Fixed

After idle time in chat screens, users received the error:
**"Chat Error: Failed to exchange ID token for AWS credentials"**

Users had to logout and login manually, with no clear indication that their session had expired.

## Root Cause

1. **ID tokens expire after 1 hour** and need to be refreshed using the refresh token
2. **Refresh tokens expire after 30 days** and cannot be renewed
3. When refresh token expired, the code still returned the expired ID token
4. Session was never invalidated, leaving users in a broken state
5. Frontend didn't detect authentication errors or redirect to login

## Changes Implemented

### 1. Backend: Session Invalidation on Refresh Failure

**File**: `app/src/lib/auth/session.ts`

**Change**: Modified `getCognitoIdToken()` to invalidate session when token refresh fails:

```typescript
if (refreshed) {
  return refreshed.idToken;
} else {
  // Refresh failed (likely refresh token expired) - invalidate session
  console.error('[Token Check] Failed to refresh token, invalidating session');
  await deleteSession(sessionId);
  return null; // Return null instead of expired token
}
```

**Impact**: When refresh token expires, the session is properly cleaned up and null is returned, preventing use of expired tokens.

---

### 2. Backend: Better Error Handling in Chat Stream

**File**: `app/src/app/api/chat/stream/route.ts`

**Changes**:
- Check if `idToken` is null before attempting credential exchange
- Throw clear `AuthenticationError` with `SESSION_EXPIRED` code
- Invalidate session on refresh failure
- Improved error detection for token expiration

```typescript
let idToken = await getCognitoIdToken(sessionId);

if (!idToken) {
  // Session was invalidated (refresh token expired or no token available)
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
```

**Impact**: Clear error messages and proper session cleanup when tokens expire.

---

### 3. Frontend: Authentication Error Detection & Redirect

**Files Modified**:
- `app/src/app/manager/chat/page.tsx`
- `app/src/app/guest/chat/page.tsx`
- `app/src/app/housekeeping/chat/page.tsx`
- `app/src/app/maintenance/chat/page.tsx`

**Change**: Enhanced `handleBedrockError()` to detect auth errors and redirect:

```typescript
const handleBedrockError = (error: Error) => {
  const errorMessage = error.message || '';
  const isAuthError = 
    errorMessage.includes('session has expired') ||
    errorMessage.includes('Please log in again') ||
    errorMessage.includes('Failed to exchange ID token') ||
    errorMessage.toLowerCase().includes('authentication') ||
    errorMessage.toLowerCase().includes('unauthorized');
  
  if (isAuthError) {
    toast({
      title: 'Session Expired',
      description: 'Your session has expired. Redirecting to login...',
      variant: 'destructive',
    });
    
    setTimeout(() => {
      window.location.href = '/login';
    }, 2000);
  } else {
    // Generic error handling
  }
};
```

**Impact**: Users now see a clear "Session Expired" message and are automatically redirected to login.

---

### 4. Proactive Token Refresh Hook

**New File**: `app/src/hooks/use-token-refresh.ts`

**Purpose**: Automatically refresh tokens every 50 minutes (before 1-hour expiration)

**Features**:
- Configurable refresh interval (default: 50 minutes)
- Can be enabled/disabled
- Callbacks for success/error
- Prevents concurrent refresh attempts
- Automatic cleanup on unmount

**Usage**:
```typescript
useTokenRefresh({
  enabled: bedrockEnabled,
  onRefreshError: (error) => {
    console.error('Token refresh failed:', error);
  },
});
```

**Impact**: Prevents token expiration during active chat sessions by refreshing proactively.

---

### 5. Token Refresh API Endpoint

**New File**: `app/src/app/api/auth/refresh/route.ts`

**Purpose**: Backend endpoint for proactive token refresh

**Features**:
- Validates current session
- Attempts to refresh Cognito tokens
- Invalidates session if refresh fails
- Returns clear error codes

**Impact**: Provides a dedicated endpoint for the frontend to refresh tokens without waiting for them to expire.

---

### 6. Integration in All Chat Pages

**Files Modified**:
- `app/src/app/manager/chat/page.tsx`
- `app/src/app/guest/chat/page.tsx`
- `app/src/app/housekeeping/chat/page.tsx`
- `app/src/app/maintenance/chat/page.tsx`

**Changes**:
- Added `useTokenRefresh` hook import
- Enabled proactive token refresh when Bedrock chat is active
- Enhanced error handling with redirect

**Impact**: All chat interfaces now have consistent token management and error handling.

---

## Token Lifecycle After Fix

```
Time 0:00    User logs in
             ├─ ID Token expires at 1:00
             ├─ Access Token expires at 1:00
             └─ Refresh Token expires at 30 days

Time 0:50    Proactive refresh (useTokenRefresh hook)
             ├─ New ID Token expires at 1:50
             ├─ New Access Token expires at 1:50
             └─ Refresh Token may be rotated

Time 1:40    Proactive refresh
             └─ Continues every 50 minutes...

Time 30 days Refresh Token expires
             ↓
Next refresh attempt FAILS
             ↓
Session invalidated in database
             ↓
getCognitoIdToken() returns null
             ↓
Chat API throws AuthenticationError
             ↓
Frontend detects auth error
             ↓
Shows "Session Expired" message
             ↓
Redirects to /login after 2 seconds
```

## Benefits

### Before Fix
❌ Generic error: "Failed to exchange ID token for AWS credentials"  
❌ Session remains in database but unusable  
❌ No indication that re-login is needed  
❌ User must manually logout and login  
❌ Tokens expire during long chat sessions  

### After Fix
✅ Clear error: "Your session has expired. Please log in again."  
✅ Session automatically invalidated when tokens expire  
✅ Automatic redirect to login page  
✅ Proactive token refresh prevents expiration during active use  
✅ Consistent behavior across all chat interfaces  

## Testing Recommendations

### 1. Test Token Expiration
- Login and wait for ID token to expire (1 hour)
- Attempt to send a chat message
- Verify: Clear error message and redirect to login

### 2. Test Refresh Token Expiration
- Manually expire refresh token in database or wait 30 days
- Attempt to send a chat message
- Verify: Session invalidated, clear error, redirect to login

### 3. Test Proactive Refresh
- Login and use chat for extended period
- Monitor console logs for refresh attempts every 50 minutes
- Verify: No token expiration errors during active use

### 4. Test All Chat Interfaces
- Test manager, guest, housekeeping, and maintenance chat pages
- Verify consistent error handling and redirect behavior

### 5. Test Edge Cases
- Network errors during token refresh
- Multiple concurrent refresh attempts
- Token refresh during active chat streaming

## Configuration

### Environment Variables
No new environment variables required. Uses existing Cognito configuration:
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- `COGNITO_IDENTITY_POOL_ID`
- `AWS_REGION` or `COGNITO_REGION`

### Token Expiration Settings
Default Cognito token expiration (configurable in AWS Console):
- **ID Token**: 1 hour
- **Access Token**: 1 hour
- **Refresh Token**: 30 days

### Refresh Interval
Default: 50 minutes (can be customized in `useTokenRefresh` hook)

## Files Changed

### New Files
1. `app/src/hooks/use-token-refresh.ts` - Proactive token refresh hook
2. `app/src/app/api/auth/refresh/route.ts` - Token refresh API endpoint

### Modified Files
1. `app/src/lib/auth/session.ts` - Session invalidation on refresh failure
2. `app/src/app/api/chat/stream/route.ts` - Better error handling
3. `app/src/app/manager/chat/page.tsx` - Auth error detection + proactive refresh
4. `app/src/app/guest/chat/page.tsx` - Auth error detection + proactive refresh
5. `app/src/app/housekeeping/chat/page.tsx` - Auth error detection + proactive refresh
6. `app/src/app/maintenance/chat/page.tsx` - Auth error detection + proactive refresh

### Documentation Files
1. `COGNITO_TOKEN_LIFECYCLE_ANALYSIS.md` - Detailed analysis of the issue
2. `COGNITO_TOKEN_FIX_SUMMARY.md` - This implementation summary

## Deployment Notes

1. **No database migrations required** - Uses existing session table columns
2. **No breaking changes** - Backward compatible with existing sessions
3. **Graceful degradation** - If token refresh fails, users are redirected to login
4. **No configuration changes needed** - Uses existing Cognito settings

## Monitoring

### Log Messages to Watch
- `[Token Check] ID token is expired or close to expiring, refreshing...`
- `[Token Check] Successfully refreshed ID token`
- `[Token Check] Failed to refresh token, invalidating session`
- `[Token Refresh] Proactively refreshing tokens...`
- `[Token Refresh] Tokens refreshed successfully`
- `[Token Refresh] Failed to refresh tokens`

### Metrics to Track
- Token refresh success rate
- Session invalidation frequency
- Authentication error rate
- Time between login and session expiration

## Future Enhancements

1. **Token refresh on visibility change**: Refresh tokens when user returns to tab
2. **Refresh token rotation**: Implement refresh token rotation for better security
3. **Session extension**: Allow users to extend session before expiration
4. **Multi-tab synchronization**: Coordinate token refresh across multiple tabs
5. **Offline handling**: Better handling of token refresh when offline
