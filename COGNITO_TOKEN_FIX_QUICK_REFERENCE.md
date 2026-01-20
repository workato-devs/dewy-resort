# Cognito Token Expiration Fix - Quick Reference

## What Was Fixed

**Problem**: After idle time, users got "Failed to exchange ID token for AWS credentials" error and had to manually logout/login.

**Solution**: Implemented automatic session invalidation, proactive token refresh, and clear error messages with auto-redirect to login.

## Key Changes

### 1. Session Invalidation
When refresh token expires, session is automatically deleted from database.

**Location**: `app/src/lib/auth/session.ts` - `getCognitoIdToken()`

### 2. Proactive Token Refresh
Tokens are automatically refreshed every 50 minutes (before 1-hour expiration).

**Location**: `app/src/hooks/use-token-refresh.ts`

### 3. Clear Error Messages
Users see "Session Expired" message and are redirected to login automatically.

**Location**: All chat pages (`**/chat/page.tsx`)

### 4. Better Error Handling
Chat API properly detects token expiration and invalidates session.

**Location**: `app/src/app/api/chat/stream/route.ts`

## User Experience

### Before
1. User idle for 30+ days
2. Tries to send chat message
3. Sees: "Failed to exchange ID token for AWS credentials"
4. Confused, must manually logout and login

### After
1. User idle for 30+ days
2. Tries to send chat message
3. Sees: "Session Expired. Redirecting to login..."
4. Automatically redirected to login page after 2 seconds

## For Developers

### How Token Refresh Works

```typescript
// Automatic refresh every 50 minutes
useTokenRefresh({
  enabled: bedrockEnabled,
  onRefreshError: (error) => {
    console.error('Token refresh failed:', error);
  },
});
```

### How Session Invalidation Works

```typescript
// When refresh fails, session is deleted
const refreshed = await refreshCognitoTokens(sessionId);
if (!refreshed) {
  await deleteSession(sessionId);
  return null;
}
```

### How Error Detection Works

```typescript
// Frontend detects auth errors and redirects
const isAuthError = 
  errorMessage.includes('session has expired') ||
  errorMessage.includes('Please log in again') ||
  errorMessage.includes('Failed to exchange ID token');

if (isAuthError) {
  // Show message and redirect to login
}
```

## Testing

### Quick Test
1. Login to any chat interface
2. Wait 50 minutes
3. Check console for: `[Token Refresh] Tokens refreshed successfully`
4. Continue using chat without interruption

### Expiration Test
1. Login to chat interface
2. Manually delete refresh token from database:
   ```sql
   UPDATE sessions SET cognito_refresh_token = NULL WHERE user_id = 'your-user-id';
   ```
3. Try to send a chat message
4. Should see "Session Expired" and redirect to login

## Monitoring

### Success Indicators
- ✅ No "Failed to exchange ID token" errors
- ✅ Users see clear "Session Expired" messages
- ✅ Automatic redirect to login
- ✅ Token refresh logs every 50 minutes
- ✅ No session expiration during active use

### Log Messages
```
[Token Refresh] Proactively refreshing tokens...
[Token Refresh] Tokens refreshed successfully
[Token Check] ID token is expired or close to expiring, refreshing...
[Token Check] Successfully refreshed ID token
```

### Error Messages (Expected)
```
[Token Check] Failed to refresh token, invalidating session
[Token Refresh] Failed to refresh tokens
```

## Configuration

### Token Lifetimes (AWS Cognito Console)
- **ID Token**: 1 hour (default)
- **Access Token**: 1 hour (default)
- **Refresh Token**: 30 days (default)

### Refresh Interval
- **Default**: 50 minutes
- **Customizable**: Pass `refreshInterval` to `useTokenRefresh` hook

### Session Duration
- **Default**: 24 hours
- **Location**: `app/src/lib/auth/session.ts` - `SESSION_DURATION_MS`

## Troubleshooting

### Issue: Users still see "Failed to exchange ID token"
**Check**:
1. Are all chat pages updated with new error handling?
2. Is `useTokenRefresh` hook imported and used?
3. Check browser console for token refresh logs

### Issue: Token refresh not happening
**Check**:
1. Is `bedrockEnabled` true?
2. Check console for errors in `/api/auth/refresh`
3. Verify Cognito configuration is correct

### Issue: Users not redirected to login
**Check**:
1. Is `handleBedrockError` updated with auth error detection?
2. Check browser console for error messages
3. Verify error message contains expected keywords

## Files to Review

### Core Logic
- `app/src/lib/auth/session.ts` - Session management
- `app/src/app/api/chat/stream/route.ts` - Chat API
- `app/src/hooks/use-token-refresh.ts` - Proactive refresh

### Chat Pages
- `app/src/app/manager/chat/page.tsx`
- `app/src/app/guest/chat/page.tsx`
- `app/src/app/housekeeping/chat/page.tsx`
- `app/src/app/maintenance/chat/page.tsx`

### API Endpoints
- `app/src/app/api/auth/refresh/route.ts` - Token refresh endpoint

## Support

For issues or questions:
1. Check console logs for token refresh messages
2. Review `COGNITO_TOKEN_LIFECYCLE_ANALYSIS.md` for detailed explanation
3. Review `COGNITO_TOKEN_FIX_SUMMARY.md` for implementation details
