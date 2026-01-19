# Salesforce Testing Scripts

Two comprehensive test scripts for validating all Salesforce/Workato API endpoints.

## Quick Start

```bash
# Run automated tests (all endpoints)
npm run test:salesforce

# Run interactive tests (menu-driven)
npm run test:salesforce:interactive
```

## Scripts

### 1. test-salesforce-automated.js

**Non-interactive automated test suite**

Runs all 18 tests automatically and provides a pass/fail report.

```bash
# Recommended: Use npm script
npm run test:salesforce

# Or run directly with tsx
tsx scripts/test-salesforce-automated.ts
```

**Output Example:**
```
✓ Create Room
✓ Search Rooms
✓ Get Room
✓ Update Room
✓ Create Service Request
...

Test Results Summary
Total Tests: 18
Passed: 18
Failed: 0
```

**Exit Codes:**
- `0` - All tests passed
- `1` - One or more tests failed

**Use Cases:**
- CI/CD integration
- Quick validation after changes
- Automated testing

---

### 2. test-salesforce-endpoints.js

**Interactive menu-driven test tool**

Provides a menu interface to test individual endpoints with custom data.

```bash
# Recommended: Use npm script
npm run test:salesforce:interactive

# Or run directly with tsx
tsx scripts/test-salesforce-endpoints.ts
```

**Features:**
- Test individual operations
- Reuse IDs from previous operations
- View test data summary
- Clear cache
- Run full test suite

**Use Cases:**
- Manual testing
- Debugging specific endpoints
- Creating test data
- Exploring API behavior

---

## Configuration

Both scripts use environment variables from `.env`:

```bash
# Required
SALESFORCE_API_COLLECTION_URL=https://your-workato-url
SALESFORCE_API_AUTH_TOKEN=your-token

# Optional
WORKATO_TIMEOUT=30000
WORKATO_RETRY_ATTEMPTS=3
WORKATO_MOCK_MODE=false
WORKATO_CACHE_ENABLED=true
```

---

## Testing Modes

### Mock Mode
```bash
WORKATO_MOCK_MODE=true
```
- Uses in-memory mock data store
- No real API calls
- Fast testing
- Useful for development

### Real API Mode
```bash
WORKATO_MOCK_MODE=false
```
- Calls actual Workato/Salesforce APIs
- Creates real data
- Full integration testing

---

## What Gets Tested

### Room Operations (4 tests)
- ✓ Create room
- ✓ Search rooms
- ✓ Get room by ID
- ✓ Update room status

### Service Request Operations (3 tests)
- ✓ Create service request
- ✓ Search service requests
- ✓ Update service request status

### Maintenance Task Operations (4 tests)
- ✓ Create maintenance task
- ✓ Search maintenance tasks
- ✓ Get maintenance task by ID
- ✓ Update maintenance task status

### Charge Operations (4 tests)
- ✓ Create charge
- ✓ Search charges
- ✓ Get charge by ID
- ✓ Update charge (mark as paid)

### Additional Tests (3 tests)
- ✓ Search all charges (empty criteria)
- ✓ Cache hit test
- ✓ Clear cache

**Total: 18 tests**

---

## Example Workflows

### Automated Testing in CI/CD

```bash
#!/bin/bash
# ci-test.sh

# Set mock mode for CI
export WORKATO_MOCK_MODE=true

# Run tests
npm run test:salesforce

# Check exit code
if [ $? -eq 0 ]; then
  echo "All Salesforce tests passed!"
else
  echo "Salesforce tests failed!"
  exit 1
fi
```

### Interactive Testing Workflow

```bash
# Start interactive tool
npm run test:salesforce:interactive

# Example flow:
# 1. Create a room (option 1)
# 2. Search for the room (option 2)
# 3. Create a service request for that room (option 5)
# 4. Update the service request status (option 7)
# 5. View summary (option 17)
```

### Testing Against Real API

```bash
# Ensure real API mode
export WORKATO_MOCK_MODE=false

# Run automated tests
npm run test:salesforce

# Check Salesforce for created data
# Clean up test data if needed
```

---

## Troubleshooting

### Configuration Errors

```
✗ Failed to initialize client: Missing required Salesforce configuration
```

**Solution:** Check `.env` file has required variables:
- `SALESFORCE_API_COLLECTION_URL`
- `SALESFORCE_API_AUTH_TOKEN`

### API Errors

```
✗ Create Room: Request failed with status code 401
```

**Solutions:**
1. Verify API token is valid
2. Check Workato endpoint URL
3. Ensure Workato recipe is running
4. Check correlation ID in logs

### Mock Mode Not Working

```bash
# Verify mock mode is enabled
echo $WORKATO_MOCK_MODE

# Should output: true
```

### Cache Issues

If seeing stale data:
- Use option 18 in interactive mode to clear cache
- Restart the script
- Set `WORKATO_CACHE_ENABLED=false`

---

## Output Colors

Both scripts use colored output for better readability:

- 🟢 **Green** - Success messages
- 🔴 **Red** - Error messages
- 🔵 **Blue** - Info messages
- 🟡 **Yellow** - Warning messages
- 🔷 **Cyan** - Section headers

---

## Test Data

### Automated Test Data

The automated script creates predictable test data:
- Guest ID: `test-guest-{timestamp}`
- Room Number: `999`
- Floor: `9`

### Interactive Test Data

You provide custom data for each operation.

---

## Integration with Package.json

```json
{
  "scripts": {
    "test:salesforce": "node scripts/test-salesforce-automated.js",
    "test:salesforce:interactive": "node scripts/test-salesforce-endpoints.js"
  }
}
```

---

## Related Documentation

- `docs/SALESFORCE_TESTING_GUIDE.md` - Comprehensive testing guide
- `docs/SALESFORCE_API_MAPPINGS.md` - Complete API endpoint mappings
- `docs/SALESFORCE_NEEDS.md` - Requirements and specifications

---

## Support

For issues:
1. Check correlation IDs in error messages
2. Review Workato recipe logs
3. Verify Salesforce connection status
4. Check environment variables
