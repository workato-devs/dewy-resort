# Integration Tests

Cross-system integration tests that validate end-to-end workflows and system configuration.

## Test Files

### verify-mock-mode.js
Validates mock mode configuration and environment setup.

**Purpose**: Checks if `WORKATO_MOCK_MODE` is properly configured and validates required environment variables based on the mode.

**Usage**:
```bash
npm run verify:mock
# or
node scripts/tests/integration/verify-mock-mode.js
```

**What it checks**:
- Mock mode enabled (true):
  - Confirms local SQLite authentication
  - Confirms mocked API responses
  - Lists demo credentials
  - Warns if Okta vars are set (they'll be ignored)

- Mock mode disabled (false):
  - Confirms Okta OAuth 2.0 authentication
  - Confirms real API requests
  - Validates required Okta environment variables:
    - `OKTA_DOMAIN`
    - `OKTA_CLIENT_ID`
    - `OKTA_CLIENT_SECRET`
    - `APP_URL`

### test-env-isolation.sh
Tests environment variable isolation between different configurations.

### test-maintenance-api.ts
Tests the maintenance API endpoints and workflows.

### test-mock-mode.js
Tests mock mode functionality and data handling.

### test-mock-mode.sh
Shell script for testing mock mode setup.

### quick-check.sh
Quick validation of system configuration and readiness.

## Running All Integration Tests

```bash
# Run individual tests
npm run verify:mock
tsx scripts/tests/integration/test-maintenance-api.ts
node scripts/tests/integration/test-mock-mode.js
bash scripts/tests/integration/quick-check.sh
```

## Notes

- Integration tests validate cross-system functionality
- Tests may require specific environment configuration
- Some tests work in both mock and real modes
- Always check environment variables before running tests
