# Salesforce Testing - Quick Start

## Run Tests Now

```bash
# Automated test (all 18 tests) - RECOMMENDED
npm run test:salesforce

# Interactive menu-driven test
npm run test:salesforce:interactive
```

## With Mock Mode (No Real API Calls)

```bash
# Automated with mock data
WORKATO_MOCK_MODE=true npm run test:salesforce

# Interactive with mock data
WORKATO_MOCK_MODE=true npm run test:salesforce:interactive
```

## Common Issues

### Error: Cannot find module '.../test-salesforce-endpoints.js'

**Problem:** Trying to run the old `.js` file directly

**Solution:** Use the npm scripts instead:
```bash
# DON'T DO THIS:
node scripts/test-salesforce-endpoints.js  ❌

# DO THIS:
npm run test:salesforce:interactive  ✅
```

### Error: Missing configuration

**Problem:** Missing required environment variables

**Solution:** Check your `.env` file has:
```bash
SALESFORCE_API_COLLECTION_URL=https://your-workato-url
SALESFORCE_API_AUTH_TOKEN=your-token
```

### Getting 401 errors

**Problem:** Invalid API token or hitting real API without credentials

**Solution:** Use mock mode for testing:
```bash
WORKATO_MOCK_MODE=true npm run test:salesforce
```

## What Gets Tested

✅ 18 automated tests:
- 4 Room operations
- 3 Service Request operations  
- 4 Maintenance Task operations
- 4 Charge operations
- 3 Utility tests (cache, search all)

## Expected Output (Mock Mode)

```
✓ Create Room
✓ Search Rooms
✓ Get Room
✓ Update Room
✓ Create Service Request
✓ Search Service Requests
✓ Update Service Request
✓ Create Maintenance Task
✓ Search Maintenance Tasks
✓ Get Maintenance Task
✓ Update Maintenance Task
✓ Create Charge
✓ Search Charges
✓ Get Charge
✓ Update Charge
✓ Search All Charges
✓ Cache Hit Test
✓ Clear Cache

Total Tests: 18
Passed: 18
Failed: 0
```

## More Info

- Full guide: `docs/SALESFORCE_TESTING_GUIDE.md`
- API mappings: `docs/SALESFORCE_API_MAPPINGS.md`
- Script details: `scripts/README_SALESFORCE_TESTS.md`
