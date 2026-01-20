# Cognito Token Fix - Flow Diagrams

## Before Fix: Token Expiration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ User sends chat message after 30 days idle                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ getCognitoIdToken(sessionId)                                    │
│ - Retrieves ID token from session                              │
│ - Detects token is expired                                     │
│ - Calls refreshCognitoTokens()                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ refreshCognitoTokens(sessionId)                                 │
│ - Attempts to refresh using refresh token                      │
│ - ❌ FAILS: Refresh token expired (30 days)                    │
│ - Returns null                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ ❌ OLD BEHAVIOR: getCognitoIdToken()                            │
│ - Logs warning                                                  │
│ - Returns EXPIRED ID token anyway                              │
│ - Session remains in database                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Identity Pool Exchange                                          │
│ - Attempts to exchange expired ID token                        │
│ - ❌ FAILS: Token expired                                       │
│ - Throws error                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ ❌ OLD ERROR HANDLING                                           │
│ - Generic error: "Failed to exchange ID token"                 │
│ - No redirect to login                                         │
│ - User confused, must manually logout                          │
└─────────────────────────────────────────────────────────────────┘
```

## After Fix: Token Expiration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ User sends chat message after 30 days idle                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ getCognitoIdToken(sessionId)                                    │
│ - Retrieves ID token from session                              │
│ - Detects token is expired                                     │
│ - Calls refreshCognitoTokens()                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ refreshCognitoTokens(sessionId)                                 │
│ - Attempts to refresh using refresh token                      │
│ - ❌ FAILS: Refresh token expired (30 days)                    │
│ - Returns null                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ ✅ NEW BEHAVIOR: getCognitoIdToken()                            │
│ - Detects refresh failed                                       │
│ - Calls deleteSession(sessionId)                               │
│ - Returns null (not expired token)                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Chat Stream API                                                 │
│ - Receives null from getCognitoIdToken()                       │
│ - Throws AuthenticationError                                   │
│ - Message: "Your session has expired. Please log in again."    │
│ - Code: SESSION_EXPIRED                                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ ✅ NEW ERROR HANDLING (Frontend)                                │
│ - Detects auth error keywords                                  │
│ - Shows toast: "Session Expired. Redirecting to login..."      │
│ - Redirects to /login after 2 seconds                          │
└─────────────────────────────────────────────────────────────────┘
```

## Proactive Token Refresh Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ User opens chat page                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ useTokenRefresh Hook Initialized                                │
│ - Sets up interval: 50 minutes                                 │
│ - Enabled when bedrockEnabled = true                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ User actively using chat                                        │
│ Time: 0:00 - 0:50                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ ⏰ 50 Minutes Elapsed                                           │
│ - useTokenRefresh triggers                                     │
│ - Calls POST /api/auth/refresh                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Token Refresh API                                               │
│ - Gets session from cookie                                     │
│ - Calls refreshCognitoTokens(sessionId)                        │
│ - Updates session with new tokens                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ ✅ Success                                                       │
│ - New ID token valid for 1 hour                                │
│ - New access token valid for 1 hour                            │
│ - Refresh token may be rotated                                 │
│ - User continues chatting without interruption                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ ⏰ Another 50 Minutes Elapsed                                   │
│ - Process repeats                                              │
│ - Tokens stay fresh during active use                          │
└─────────────────────────────────────────────────────────────────┘
```

## Token Lifecycle Timeline

```
Login
  │
  ├─ ID Token (expires in 1 hour)
  ├─ Access Token (expires in 1 hour)
  └─ Refresh Token (expires in 30 days)
  │
  │
0:50 ─── Proactive Refresh ✅
  │      └─ New ID Token (expires in 1 hour)
  │      └─ New Access Token (expires in 1 hour)
  │      └─ Refresh Token (may be rotated)
  │
  │
1:40 ─── Proactive Refresh ✅
  │      └─ New tokens...
  │
  │
  ... (continues every 50 minutes)
  │
  │
30 days ─── Refresh Token Expires ❌
  │         │
  │         ▼
  │      Next refresh attempt fails
  │         │
  │         ▼
  │      Session invalidated
  │         │
  │         ▼
  │      User sees "Session Expired"
  │         │
  │         ▼
  │      Redirect to /login
```

## Error Detection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Chat API throws error                                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ handleBedrockError(error)                                       │
│ - Receives error from chat hook                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Check Error Message                                             │
│ - "session has expired"?                                       │
│ - "Please log in again"?                                       │
│ - "Failed to exchange ID token"?                               │
│ - "authentication"?                                            │
│ - "unauthorized"?                                              │
└────────────┬────────────────────────────┬───────────────────────┘
             │                            │
             │ YES                        │ NO
             ▼                            ▼
┌──────────────────────────┐  ┌──────────────────────────────────┐
│ Authentication Error     │  │ Generic Error                    │
├──────────────────────────┤  ├──────────────────────────────────┤
│ 1. Show toast:           │  │ 1. Show toast:                   │
│    "Session Expired.     │  │    "Chat Error"                  │
│     Redirecting..."      │  │    [error message]               │
│                          │  │                                  │
│ 2. Wait 2 seconds        │  │ 2. User can retry                │
│                          │  │                                  │
│ 3. Redirect to /login    │  │                                  │
└──────────────────────────┘  └──────────────────────────────────┘
```

## Component Integration

```
┌─────────────────────────────────────────────────────────────────┐
│ Chat Page Component                                             │
│ (manager/guest/housekeeping/maintenance)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ useTokenRefresh Hook                                      │ │
│  │ - Refreshes tokens every 50 minutes                       │ │
│  │ - Prevents expiration during active use                   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ handleBedrockError Function                               │ │
│  │ - Detects authentication errors                           │ │
│  │ - Shows clear message                                     │ │
│  │ - Redirects to login                                      │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ BedrockChatInterface                                      │ │
│  │ - Renders chat UI                                         │ │
│  │ - Calls handleBedrockError on error                       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Session State Diagram

```
┌─────────────┐
│   No        │
│  Session    │
└──────┬──────┘
       │
       │ User logs in
       ▼
┌─────────────┐
│   Valid     │◄──────────────┐
│  Session    │               │
│  (Active)   │               │
└──────┬──────┘               │
       │                      │
       │ Token expires        │ Proactive refresh
       ▼                      │ (every 50 min)
┌─────────────┐               │
│  Expired    │               │
│   Token     │───────────────┘
│ (Refreshing)│    Success
└──────┬──────┘
       │
       │ Refresh fails
       │ (refresh token expired)
       ▼
┌─────────────┐
│  Invalid    │
│  Session    │
│ (Deleted)   │
└──────┬──────┘
       │
       │ User sees error
       │ and redirects
       ▼
┌─────────────┐
│   Login     │
│    Page     │
└─────────────┘
```

## Key Improvements Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Token Expiration** | Returns expired token | Invalidates session, returns null |
| **Error Message** | "Failed to exchange ID token" | "Session Expired. Redirecting..." |
| **User Action** | Manual logout required | Automatic redirect to login |
| **Session State** | Remains in database | Deleted from database |
| **Active Use** | Tokens expire after 1 hour | Proactive refresh every 50 min |
| **UX** | Confusing, unclear | Clear, automatic |
