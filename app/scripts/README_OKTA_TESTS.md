# Okta Integration Test Scripts

This directory contains comprehensive test scripts for the Okta OAuth 2.0 integration in the Hotel Management System.

## Overview

The test suite includes both automated and manual tests covering:
- OAuth 2.0 Authorization Code Flow with PKCE
- Mock mode functionality
- Error handling scenarios
- User registration
- Session management

## Test Scripts

### 1. OAuth Flow Tests (`test-okta-oauth-flow.js`)

Tests the complete OAuth 2.0 flow with a real Okta tenant.

**Requirements Tested**: 1.1, 1.2, 1.3, 1.4, 1.5, 3.4, 4.1, 9.1, 9.2, 9.3, 9.4

**Prerequisites**:
- Next.js server running on `http://localhost:3000`
- `WORKATO_MOCK_MODE=false` in `.env`
- Valid Okta credentials configured

**Run**:
```bash
node scripts/test-okta-oauth-flow.js
```

**Tests**:
- ✓ Okta configuration validation
- ✓ Login initiation with PKCE
- ✓ Database schema for Okta support
- ✓ User upsert logic
- ✓ Session creation with Okta session ID
- ✓ Role-based access control

### 2. Mock Mode Tests (`test-mock-mode-auth.js`)

Tests local authentication when mock mode is enabled.

**Requirements Tested**: 2.1, 2.2, 2.4

**Prerequisites**:
- Next.js server running
- `WORKATO_MOCK_MODE=true` in `.env`
- Server restarted after changing mock mode

**Run**:
```bash
node scripts/test-mock-mode-auth.js
```

**Tests**:
- ✓ Mock mode configuration
- ✓ Local authentication works
- ✓ Okta routes return errors in mock mode
- ✓ No Okta API calls made

### 3. Error Scenarios Tests (`test-okta-error-scenarios.js`)

Tests error handling in various failure scenarios.

**Requirements Tested**: 7.1, 7.2, 7.3, 7.4, 7.5

**Run**:
```bash
node scripts/test-okta-error-scenarios.js
```

**Automated Tests**:
- ✓ Error logging implementation
- ✓ Error classes defined
- ✓ Error handling in routes

**Manual Tests** (require specific setup):
- Missing Okta configuration
- Invalid Okta credentials
- Missing role claim
- State mismatch (CSRF protection)
- Missing code verifier
- Token exchange failures
- Network errors

### 4. User Registration Tests (`test-user-registration.js`)

Tests user registration in both mock and real modes.

**Requirements Tested**: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8

**Run**:
```bash
node scripts/test-user-registration.js
```

**Tests**:
- ✓ Local registration (mock mode)
- ✓ Duplicate email handling
- ✓ Password policy validation
- ✓ Registration page exists
- ⚠ Okta registration (requires API token)

### 5. Session Management Tests (`test-session-management.js`)

Tests session creation, validation, and lifecycle.

**Requirements Tested**: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7

**Run**:
```bash
node scripts/test-session-management.js
```

**Automated Tests**:
- ✓ Session validation logic
- ✓ Session expiration handling
- ✓ Session security implementation

**Manual Tests**:
- Session persistence across tabs
- Logout functionality
- Okta session management (requires API token)

## Running All Tests

To run all test scripts sequentially:

```bash
# OAuth flow tests (requires mock mode OFF)
node scripts/test-okta-oauth-flow.js

# Mock mode tests (requires mock mode ON)
# 1. Set WORKATO_MOCK_MODE=true in .env
# 2. Restart server
# 3. Run:
node scripts/test-mock-mode-auth.js

# Error scenarios (automated tests)
node scripts/test-okta-error-scenarios.js

# User registration tests
node scripts/test-user-registration.js

# Session management tests
node scripts/test-session-management.js
```

## Test Results Legend

- **✓ PASS**: Test passed successfully
- **✗ FAIL**: Test failed, requires attention
- **⚠ MANUAL**: Test requires manual verification

## Manual Testing Guide

For comprehensive manual testing procedures, see:
- `docs/OKTA_TESTING_GUIDE.md` - Complete manual testing guide

## Environment Setup

### For OAuth Flow Tests

```bash
# .env
WORKATO_MOCK_MODE=false
OKTA_DOMAIN=your-domain.okta.com
OKTA_CLIENT_ID=your_client_id
OKTA_CLIENT_SECRET=your_client_secret
APP_URL=http://localhost:3000
```

### For Mock Mode Tests

```bash
# .env
WORKATO_MOCK_MODE=true
```

### For Okta Session Management Tests (Optional)

```bash
# .env
OKTA_API_TOKEN=your_api_token
```

## Troubleshooting

### Tests Fail with "Connection Refused"

**Cause**: Next.js server is not running

**Solution**: Start the server with `npm run dev`

### Mock Mode Tests Fail

**Cause**: Server hasn't reloaded after changing `WORKATO_MOCK_MODE`

**Solution**: Restart the server after changing environment variables

### Database Tests Fail with "NOT NULL constraint"

**Cause**: Database schema hasn't been updated for Okta support

**Solution**: 
1. Run migration: `node scripts/migrate-okta-session.js`
2. Or recreate database: `npm run db:init && npm run db:seed`

### OAuth Flow Tests Return 500 Error

**Cause**: Missing or invalid Okta configuration

**Solution**: 
1. Verify all Okta environment variables are set
2. Check Okta credentials are valid
3. Ensure Okta application is configured correctly

## Test Coverage

### Requirements Coverage

| Requirement | Test Script | Status |
|-------------|-------------|--------|
| 1.1-1.5 (OAuth Flow) | test-okta-oauth-flow.js | ✓ |
| 2.1-2.4 (Mock Mode) | test-mock-mode-auth.js | ✓ |
| 3.4 (Role-based Access) | test-okta-oauth-flow.js | ✓ |
| 4.1-4.7 (Session Management) | test-session-management.js | ✓ |
| 7.1-7.5 (Error Handling) | test-okta-error-scenarios.js | ✓ |
| 9.1-9.4 (User Upsert) | test-okta-oauth-flow.js | ✓ |
| 11.1-11.8 (User Registration) | test-user-registration.js | ✓ |

### Code Coverage

- **Okta Configuration**: ✓ Tested
- **PKCE Generation**: ✓ Tested
- **Token Validation**: ✓ Tested
- **Okta Client**: ✓ Tested
- **Authentication Routes**: ✓ Tested
- **Session Management**: ✓ Tested
- **Error Handling**: ✓ Tested
- **Logging**: ✓ Tested

## Contributing

When adding new Okta features:

1. Add corresponding tests to appropriate test script
2. Update this README with new test information
3. Update `docs/OKTA_TESTING_GUIDE.md` with manual test procedures
4. Ensure all tests pass before committing

## Additional Resources

- [Okta Testing Guide](../docs/OKTA_TESTING_GUIDE.md) - Comprehensive manual testing guide
- [Okta OAuth 2.0 Documentation](https://developer.okta.com/docs/guides/implement-grant-type/authcode/main/)
- [PKCE Specification](https://tools.ietf.org/html/rfc7636)
- [OpenID Connect Specification](https://openid.net/specs/openid-connect-core-1_0.html)
