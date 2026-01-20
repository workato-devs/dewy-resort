# Cognito Token Fix - Testing Checklist

## Pre-Deployment Checklist

### Code Review
- [x] All TypeScript files compile without errors
- [x] No new linting errors introduced
- [x] All chat pages updated consistently
- [x] Error handling implemented in all chat interfaces
- [x] Token refresh hook properly integrated
- [x] Session invalidation logic correct

### Files Modified
- [x] `app/src/lib/auth/session.ts` - Session invalidation
- [x] `app/src/app/api/chat/stream/route.ts` - Error handling
- [x] `app/src/app/manager/chat/page.tsx` - Error detection + refresh
- [x] `app/src/app/guest/chat/page.tsx` - Error detection + refresh
- [x] `app/src/app/housekeeping/chat/page.tsx` - Error detection + refresh
- [x] `app/src/app/maintenance/chat/page.tsx` - Error detection + refresh

### Files Created
- [x] `app/src/hooks/use-token-refresh.ts` - Proactive refresh hook
- [x] `app/src/app/api/auth/refresh/route.ts` - Refresh endpoint
- [x] `COGNITO_TOKEN_LIFECYCLE_ANALYSIS.md` - Detailed analysis
- [x] `COGNITO_TOKEN_FIX_SUMMARY.md` - Implementation summary
- [x] `COGNITO_TOKEN_FIX_QUICK_REFERENCE.md` - Quick reference
- [x] `COGNITO_TOKEN_FIX_FLOW_DIAGRAM.md` - Visual diagrams
- [x] `COGNITO_TOKEN_FIX_TESTING_CHECKLIST.md` - This checklist

---

## Functional Testing

### Test 1: Proactive Token Refresh (Happy Path)
**Objective**: Verify tokens are refreshed automatically during active use

**Steps**:
1. [ ] Login to manager chat page
2. [ ] Open browser console
3. [ ] Wait 50 minutes (or temporarily reduce interval for testing)
4. [ ] Verify console log: `[Token Refresh] Proactively refreshing tokens...`
5. [ ] Verify console log: `[Token Refresh] Tokens refreshed successfully`
6. [ ] Send a chat message
7. [ ] Verify message sends successfully without errors

**Expected Result**: 
- ✅ Tokens refresh automatically every 50 minutes
- ✅ No interruption to chat functionality
- ✅ No authentication errors

---

### Test 2: ID Token Expiration (Manual Refresh)
**Objective**: Verify manual token refresh works when ID token expires

**Steps**:
1. [ ] Login to guest chat page
2. [ ] Wait for ID token to expire (1 hour) OR manually set token expiration in database
3. [ ] Send a chat message
4. [ ] Verify console log: `[Token Check] ID token is expired or close to expiring, refreshing...`
5. [ ] Verify console log: `[Token Check] Successfully refreshed ID token`
6. [ ] Verify message sends successfully

**Expected Result**:
- ✅ Token automatically refreshed on first API call
- ✅ Chat message sends successfully
- ✅ No error shown to user

---

### Test 3: Refresh Token Expiration (Session Invalidation)
**Objective**: Verify session is invalidated when refresh token expires

**Steps**:
1. [ ] Login to housekeeping chat page
2. [ ] Manually expire refresh token in database:
   ```sql
   UPDATE sessions 
   SET cognito_refresh_token = NULL 
   WHERE user_id = 'your-user-id';
   ```
3. [ ] Send a chat message
4. [ ] Verify console log: `[Token Check] Failed to refresh token, invalidating session`
5. [ ] Verify toast appears: "Session Expired. Redirecting to login..."
6. [ ] Verify redirect to `/login` after 2 seconds
7. [ ] Verify session deleted from database:
   ```sql
   SELECT * FROM sessions WHERE user_id = 'your-user-id';
   ```

**Expected Result**:
- ✅ Clear error message shown
- ✅ Automatic redirect to login
- ✅ Session removed from database
- ✅ No expired token used

---

### Test 4: Network Error During Refresh
**Objective**: Verify graceful handling of network errors

**Steps**:
1. [ ] Login to maintenance chat page
2. [ ] Open browser DevTools > Network tab
3. [ ] Set network throttling to "Offline"
4. [ ] Wait for proactive refresh attempt (50 minutes)
5. [ ] Verify console log: `[Token Refresh] Failed to refresh tokens`
6. [ ] Set network back to "Online"
7. [ ] Send a chat message
8. [ ] Verify message sends successfully (triggers refresh on demand)

**Expected Result**:
- ✅ Failed refresh logged but doesn't crash app
- ✅ Next API call triggers refresh
- ✅ User can continue after network restored

---

### Test 5: Multiple Concurrent Refresh Attempts
**Objective**: Verify only one refresh happens at a time

**Steps**:
1. [ ] Login to manager chat page
2. [ ] Open browser console
3. [ ] Manually trigger multiple refresh attempts:
   ```javascript
   // In browser console
   Promise.all([
     fetch('/api/auth/refresh', { method: 'POST' }),
     fetch('/api/auth/refresh', { method: 'POST' }),
     fetch('/api/auth/refresh', { method: 'POST' })
   ]);
   ```
4. [ ] Verify console log: `[Token Refresh] Refresh already in progress, skipping`
5. [ ] Verify only one actual refresh occurs

**Expected Result**:
- ✅ Concurrent requests prevented
- ✅ Only one refresh executed
- ✅ No race conditions

---

### Test 6: All Chat Interfaces
**Objective**: Verify consistent behavior across all chat pages

**For each chat page** (manager, guest, housekeeping, maintenance):

1. [ ] Login to chat page
2. [ ] Verify `useTokenRefresh` hook is active (check console)
3. [ ] Manually expire refresh token
4. [ ] Send a chat message
5. [ ] Verify "Session Expired" toast appears
6. [ ] Verify redirect to `/login`

**Expected Result**:
- ✅ All chat pages behave consistently
- ✅ Same error messages
- ✅ Same redirect behavior

---

### Test 7: Token Refresh API Endpoint
**Objective**: Verify refresh endpoint works correctly

**Steps**:
1. [ ] Login to any chat page
2. [ ] Get session cookie from browser DevTools
3. [ ] Call refresh endpoint manually:
   ```bash
   curl -X POST http://localhost:3000/api/auth/refresh \
     -H "Cookie: hotel_session=YOUR_SESSION_ID"
   ```
4. [ ] Verify response: `{ "success": true, "message": "Tokens refreshed successfully" }`
5. [ ] Verify tokens updated in database:
   ```sql
   SELECT cognito_id_token, cognito_access_token 
   FROM sessions 
   WHERE id = 'YOUR_SESSION_ID';
   ```

**Expected Result**:
- ✅ Endpoint returns success
- ✅ Tokens updated in database
- ✅ New tokens are valid

---

### Test 8: Error Message Detection
**Objective**: Verify all auth error keywords are detected

**Test each error message**:
1. [ ] "session has expired"
2. [ ] "Please log in again"
3. [ ] "Failed to exchange ID token"
4. [ ] "authentication failed"
5. [ ] "unauthorized"

**Steps** (for each message):
1. [ ] Modify chat API to throw error with specific message
2. [ ] Send a chat message
3. [ ] Verify "Session Expired" toast appears
4. [ ] Verify redirect to `/login`

**Expected Result**:
- ✅ All auth error keywords detected
- ✅ Consistent redirect behavior
- ✅ Clear error messages

---

### Test 9: Long Chat Session
**Objective**: Verify tokens stay fresh during extended use

**Steps**:
1. [ ] Login to guest chat page
2. [ ] Use chat continuously for 2+ hours
3. [ ] Monitor console for refresh logs every 50 minutes
4. [ ] Verify no authentication errors occur
5. [ ] Verify all messages send successfully

**Expected Result**:
- ✅ Tokens refresh automatically
- ✅ No interruption to chat
- ✅ No manual re-login required

---

### Test 10: Session Cleanup
**Objective**: Verify expired sessions are properly cleaned up

**Steps**:
1. [ ] Login to manager chat page
2. [ ] Note session ID from cookie
3. [ ] Manually expire refresh token
4. [ ] Send a chat message
5. [ ] Verify session deleted from database:
   ```sql
   SELECT * FROM sessions WHERE id = 'YOUR_SESSION_ID';
   ```
6. [ ] Verify cookie cleared in browser

**Expected Result**:
- ✅ Session removed from database
- ✅ Cookie cleared
- ✅ No orphaned sessions

---

## Edge Cases

### Edge Case 1: Token Refresh During Active Streaming
**Steps**:
1. [ ] Login to chat page
2. [ ] Send a long message that triggers tool use
3. [ ] While streaming, trigger token refresh
4. [ ] Verify streaming continues without interruption

**Expected Result**:
- ✅ Streaming not interrupted
- ✅ Token refresh happens in background

---

### Edge Case 2: Browser Tab Inactive
**Steps**:
1. [ ] Login to chat page
2. [ ] Switch to different browser tab
3. [ ] Wait 50+ minutes
4. [ ] Switch back to chat tab
5. [ ] Send a chat message
6. [ ] Verify token refresh happens on demand

**Expected Result**:
- ✅ Token refreshed when tab becomes active
- ✅ Message sends successfully

---

### Edge Case 3: Multiple Browser Tabs
**Steps**:
1. [ ] Login to chat page in Tab 1
2. [ ] Open same chat page in Tab 2 (same session)
3. [ ] Wait for token refresh in Tab 1
4. [ ] Send message in Tab 2
5. [ ] Verify both tabs work correctly

**Expected Result**:
- ✅ Both tabs share same session
- ✅ Token refresh in one tab benefits other tab
- ✅ No conflicts

---

### Edge Case 4: Rapid Logout/Login
**Steps**:
1. [ ] Login to chat page
2. [ ] Immediately logout
3. [ ] Immediately login again
4. [ ] Send a chat message
5. [ ] Verify no stale session issues

**Expected Result**:
- ✅ Old session properly cleaned up
- ✅ New session works correctly
- ✅ No token conflicts

---

## Performance Testing

### Performance Test 1: Token Refresh Overhead
**Objective**: Verify token refresh doesn't impact performance

**Steps**:
1. [ ] Login to chat page
2. [ ] Monitor network tab during token refresh
3. [ ] Measure refresh API response time
4. [ ] Verify < 500ms response time

**Expected Result**:
- ✅ Refresh completes quickly
- ✅ No noticeable impact on UX

---

### Performance Test 2: Memory Leaks
**Objective**: Verify no memory leaks from refresh interval

**Steps**:
1. [ ] Login to chat page
2. [ ] Open browser DevTools > Memory tab
3. [ ] Take heap snapshot
4. [ ] Wait for multiple refresh cycles (2+ hours)
5. [ ] Take another heap snapshot
6. [ ] Compare memory usage

**Expected Result**:
- ✅ No significant memory increase
- ✅ Intervals properly cleaned up

---

## Security Testing

### Security Test 1: Token Storage
**Objective**: Verify tokens stored securely

**Steps**:
1. [ ] Login to chat page
2. [ ] Check browser localStorage
3. [ ] Check browser sessionStorage
4. [ ] Verify tokens NOT stored in browser storage
5. [ ] Verify tokens only in httpOnly cookie

**Expected Result**:
- ✅ Tokens not in localStorage
- ✅ Tokens not in sessionStorage
- ✅ Tokens only in httpOnly cookie

---

### Security Test 2: Token Exposure
**Objective**: Verify tokens not exposed in logs

**Steps**:
1. [ ] Login to chat page
2. [ ] Review browser console logs
3. [ ] Review server logs
4. [ ] Verify full tokens NOT logged
5. [ ] Verify only token length logged

**Expected Result**:
- ✅ Full tokens not in console
- ✅ Full tokens not in server logs
- ✅ Only metadata logged

---

## Browser Compatibility

### Browser Test Matrix

Test on each browser:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**For each browser**:
1. [ ] Login to chat page
2. [ ] Verify proactive refresh works
3. [ ] Verify error handling works
4. [ ] Verify redirect works

**Expected Result**:
- ✅ Consistent behavior across browsers
- ✅ No browser-specific issues

---

## Monitoring & Logging

### Log Verification
**Check for these log messages**:

**Success Logs**:
- [ ] `[Token Refresh] Proactively refreshing tokens...`
- [ ] `[Token Refresh] Tokens refreshed successfully`
- [ ] `[Token Check] Successfully refreshed ID token`

**Error Logs**:
- [ ] `[Token Check] Failed to refresh token, invalidating session`
- [ ] `[Token Refresh] Failed to refresh tokens`

**Info Logs**:
- [ ] `[Token Check] ID token is expired or close to expiring, refreshing...`

---

## Rollback Plan

### If Issues Found

1. **Immediate Rollback**:
   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Restore Previous Behavior**:
   - Revert `getCognitoIdToken()` to return expired token
   - Remove `useTokenRefresh` hook usage
   - Restore old error handling

3. **Notify Users**:
   - Post maintenance notice
   - Explain temporary revert
   - Provide timeline for fix

---

## Post-Deployment Monitoring

### First 24 Hours
- [ ] Monitor error rates in logs
- [ ] Check token refresh success rate
- [ ] Monitor session invalidation frequency
- [ ] Check user complaints/support tickets

### First Week
- [ ] Analyze token refresh patterns
- [ ] Review session duration metrics
- [ ] Check for any edge cases
- [ ] Gather user feedback

### Metrics to Track
- [ ] Token refresh success rate (target: >99%)
- [ ] Session invalidation rate
- [ ] Authentication error rate (target: <1%)
- [ ] Average session duration
- [ ] Time between login and expiration

---

## Sign-Off

### Testing Complete
- [ ] All functional tests passed
- [ ] All edge cases tested
- [ ] All browsers tested
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Documentation complete

### Approvals
- [ ] Developer: _______________
- [ ] QA: _______________
- [ ] Product Owner: _______________
- [ ] DevOps: _______________

### Deployment
- [ ] Code reviewed
- [ ] Tests passed
- [ ] Documentation updated
- [ ] Monitoring configured
- [ ] Rollback plan ready
- [ ] Deployed to production
- [ ] Post-deployment verification complete

---

## Notes

Use this space to document any issues found during testing:

```
Date: _______________
Tester: _______________

Issues Found:
1. 
2. 
3. 

Resolutions:
1. 
2. 
3. 
```
