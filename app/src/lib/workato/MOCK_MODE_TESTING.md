# Mock Mode Testing Guide

This guide explains how to test the Workato mock mode functionality.

## What is Mock Mode?

Mock mode allows you to develop and test the Workato integration without making real API calls. When enabled, all Workato client methods return simulated responses that match the real API format.

## Enabling Mock Mode

Set the environment variable in your `.env` file:

```bash
WORKATO_MOCK_MODE=true
```

## Testing Mock Mode

### Option 1: Using the Test API Endpoint

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Visit the test endpoint in your browser:
   ```
   http://localhost:3000/api/test/mock-mode
   ```

3. You should see a JSON response with test results:
   ```json
   {
     "success": true,
     "summary": {
       "total": 6,
       "passed": 6,
       "failed": 0
     },
     "results": [...]
   }
   ```

### Option 2: Using curl

```bash
curl http://localhost:3000/api/test/mock-mode | jq
```

### Option 3: Manual Testing

You can manually test mock mode by:

1. Setting `WORKATO_MOCK_MODE=true` in `.env`
2. Starting the dev server
3. Creating a service request through the guest portal
4. Searching for contacts in the manager dashboard
5. Checking the logs - you should see `_mockMode: true` in the logged data

## What Gets Tested

The test endpoint verifies:

1. ✅ **createCase** - Creates a mock Salesforce case
2. ✅ **getCase** - Retrieves a mock case by ID
3. ✅ **upsertContact** - Creates/updates a mock contact
4. ✅ **getContact** - Retrieves a mock contact by ID
5. ✅ **searchContacts** - Searches mock contacts
6. ✅ **correlationId** - Verifies correlation IDs are generated

## Mock Response Characteristics

- **Case IDs**: Start with `MOCK-CASE-`
- **Contact IDs**: Start with `MOCK-CONTACT-`
- **Case Numbers**: Format `CASE-XXXXX` (5 digits)
- **Network Delay**: Simulated 100-300ms delay
- **Correlation IDs**: Generated for all requests
- **Response Format**: Matches real Workato API responses

## Verifying Mock Mode is Active

When mock mode is enabled, you'll see log entries like:

```
{
  "timestamp": "2024-11-11T...",
  "correlationId": "INIT",
  "method": "INFO",
  "endpoint": "MOCK_MODE",
  "requestData": {
    "message": "Workato client initialized in MOCK MODE - no real API calls will be made"
  }
}
```

## Disabling Mock Mode

To use real Workato APIs, set:

```bash
WORKATO_MOCK_MODE=false
```

Or remove the variable entirely (defaults to `false`).

## Troubleshooting

### Mock mode not working

1. Check `.env` file has `WORKATO_MOCK_MODE=true`
2. Restart the dev server after changing environment variables
3. Check the logs for the "MOCK MODE" initialization message

### Tests failing

1. Ensure the dev server is running
2. Check for TypeScript compilation errors
3. Review the test results JSON for specific failure details

## Integration with Real APIs

When you're ready to test with real Workato APIs:

1. Set `WORKATO_MOCK_MODE=false`
2. Ensure `SALESFORCE_API_AUTH_TOKEN` is set
3. Ensure `SALESFORCE_API_COLLECTION_URL` is set
4. Restart the dev server
5. Test with real data

Mock mode and real API mode use the same code paths, so switching between them is seamless.
