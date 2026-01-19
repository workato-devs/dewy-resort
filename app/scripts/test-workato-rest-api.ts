#!/usr/bin/env ts-node
/**
 * Test Workato REST API - Direct Endpoint Testing
 * 
 * This script tests the direct REST API endpoints at:
 * https://220.apim.trial.workato.com/zaynet2/dewy-hotel-apis-v1
 * 
 * These are the actual REST endpoints that the MCP server wraps.
 * 
 * Note: Run this with: npx tsx scripts/test-workato-rest-api.ts
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(80));
  log(title, colors.cyan);
  console.log('='.repeat(80) + '\n');
}

function logTest(testName: string) {
  log(`\n▶ ${testName}`, colors.blue);
}

function logSuccess(message: string) {
  log(`  ✓ ${message}`, colors.green);
}

function logError(message: string) {
  log(`  ✗ ${message}`, colors.red);
}

function logWarning(message: string) {
  log(`  ⚠ ${message}`, colors.yellow);
}

function logInfo(message: string) {
  log(`  ℹ ${message}`, colors.cyan);
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
  statusCode?: number;
  response?: any;
}

const testResults: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  logTest(name);
  const startTime = Date.now();
  
  try {
    await testFn();
    const duration = Date.now() - startTime;
    testResults.push({ name, passed: true, duration });
    logSuccess(`Passed (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    testResults.push({ 
      name, 
      passed: false, 
      error: error.message, 
      duration,
      statusCode: error.statusCode,
      response: error.response,
    });
    logError(`Failed: ${error.message}`);
    if (error.statusCode) {
      logError(`  Status Code: ${error.statusCode}`);
    }
    if (error.response) {
      logError(`  Response: ${JSON.stringify(error.response, null, 2)}`);
    }
  }
}

// ============================================================================
// Helper: Make REST API Request
// ============================================================================

async function makeRestRequest(
  endpoint: string,
  body: any,
  description: string,
  useApiTokenHeader: boolean = true
): Promise<any> {
  // Use the REST API base URL (not the MCP URL)
  // MCP URL: https://220.apim.mcp.trial.workato.com/zaynet2/dewy-hotel-apis-v1
  // REST URL: https://apim.trial.workato.com/zaynet2/dewy-hotel-apis-v1
  const mcpUrl = process.env.MCP_MANAGER_URL;
  const apiToken = process.env.SALESFORCE_API_AUTH_TOKEN;
  
  if (!mcpUrl) {
    throw new Error('MCP_MANAGER_URL not set in .env');
  }
  
  if (!apiToken) {
    throw new Error('SALESFORCE_API_AUTH_TOKEN not set in .env');
  }
  
  // Remove the MCP subdomain to get the REST API URL
  const baseUrl = mcpUrl.replace('220.apim.mcp.trial.workato.com', 'apim.trial.workato.com');
  
  const url = `${baseUrl}${endpoint}`;
  
  logInfo(`Request: POST ${url}`);
  logInfo(`Auth: API-TOKEN ${apiToken.substring(0, 10)}...`);
  logInfo(`Body: ${JSON.stringify(body, null, 2)}`);
  
  const startTime = Date.now();
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-TOKEN': apiToken,
    },
    body: JSON.stringify(body),
  });
  
  const duration = Date.now() - startTime;
  
  logInfo(`Response Status: ${response.status} (${duration}ms)`);
  
  let responseData: any;
  const contentType = response.headers.get('content-type');
  
  if (contentType && contentType.includes('application/json')) {
    responseData = await response.json();
    logInfo(`Response Body: ${JSON.stringify(responseData, null, 2)}`);
  } else {
    const text = await response.text();
    logInfo(`Response Body (text): ${text}`);
    responseData = { text };
  }
  
  if (!response.ok) {
    const error: any = new Error(`${description} failed with status ${response.status}`);
    error.statusCode = response.status;
    error.response = responseData;
    throw error;
  }
  
  return responseData;
}

// ============================================================================
// Test 1: Search cases for staff with room_number
// ============================================================================

async function testSearchCasesForStaff() {
  const result = await makeRestRequest(
    '/search-cases-for-staff',
    { room_number: '101' },
    'Search cases for staff'
  );
  
  logSuccess(`Returned ${result.cases?.length || 0} cases`);
}

// ============================================================================
// Test 2: Search cases for guest
// ============================================================================

async function testSearchCasesForGuest() {
  const result = await makeRestRequest(
    '/search-cases-for-guest',
    { guest_email: 'test@example.com' },
    'Search cases for guest'
  );
  
  logSuccess(`Returned ${result.cases?.length || 0} cases`);
}

// ============================================================================
// Test 3: Search rooms for staff
// ============================================================================

async function testSearchRoomsForStaff() {
  const result = await makeRestRequest(
    '/search-rooms-for-staff',
    { status: 'Available' },
    'Search rooms for staff'
  );
  
  logSuccess(`Returned ${result.rooms?.length || 0} rooms`);
}

// ============================================================================
// Test 4: Search rooms for guest
// ============================================================================

async function testSearchRoomsForGuest() {
  const result = await makeRestRequest(
    '/search-rooms-for-guest',
    { guest_email: 'test@example.com' },
    'Search rooms for guest'
  );
  
  logSuccess(`Returned ${result.rooms?.length || 0} rooms`);
}

// ============================================================================
// Test 5: Submit guest service request
// ============================================================================

async function testSubmitServiceRequest() {
  const result = await makeRestRequest(
    '/submit-guest-service-request',
    {
      guest_email: 'test@example.com',
      room_number: '101',
      request_type: 'Housekeeping',
      description: 'Test service request',
      priority: 'Medium'
    },
    'Submit guest service request'
  );
  
  logSuccess(`Created service request: ${result.id || 'unknown'}`);
}

// ============================================================================
// Test 6: Submit maintenance request
// ============================================================================

async function testSubmitMaintenanceRequest() {
  const result = await makeRestRequest(
    '/submit-maintenance-request',
    {
      room_number: '101',
      request_type: 'Maintenance',
      description: 'Test maintenance request',
      priority: 'High'
    },
    'Submit maintenance request'
  );
  
  logSuccess(`Created maintenance request: ${result.id || 'unknown'}`);
}

// ============================================================================
// Test 7: Check in guest
// ============================================================================

async function testCheckInGuest() {
  const result = await makeRestRequest(
    '/check-in-guest',
    {
      guest_email: 'test@example.com',
      room_number: '101'
    },
    'Check in guest'
  );
  
  logSuccess(`Check-in result: ${JSON.stringify(result)}`);
}

// ============================================================================
// Test 8: Process guest checkout
// ============================================================================

async function testProcessCheckout() {
  const result = await makeRestRequest(
    '/process-guest-checkout',
    {
      guest_email: 'test@example.com',
      room_number: '101'
    },
    'Process guest checkout'
  );
  
  logSuccess(`Checkout result: ${JSON.stringify(result)}`);
}

// ============================================================================
// Test 9: Create contact if not found
// ============================================================================

async function testCreateContact() {
  const result = await makeRestRequest(
    '/create-contact-if-not-found',
    {
      email: 'newguest@example.com',
      first_name: 'Test',
      last_name: 'Guest',
      phone: '555-1234'
    },
    'Create contact if not found'
  );
  
  logSuccess(`Contact result: ${result.id || 'unknown'}`);
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function main() {
  logSection('Workato REST API - Direct Endpoint Tests');
  
  // Check environment variables
  const mcpUrl = process.env.MCP_MANAGER_URL;
  const mcpToken = process.env.MCP_MANAGER_TOKEN;
  const workatoToken = process.env.SALESFORCE_API_AUTH_TOKEN;
  
  if (!mcpUrl) {
    logError('MCP_MANAGER_URL not set in .env');
    process.exit(1);
  }
  
  if (!mcpToken) {
    logError('MCP_MANAGER_TOKEN not set in .env');
    process.exit(1);
  }
  
  // Convert MCP URL to REST API URL
  const restUrl = mcpUrl.replace('220.apim.mcp.trial.workato.com', 'apim.trial.workato.com');
  
  log('Testing direct REST API endpoints:', colors.yellow);
  log(`  MCP URL:  ${mcpUrl}`, colors.yellow);
  log(`  REST URL: ${restUrl}`, colors.cyan);
  
  logSuccess(`MCP Token: ${mcpToken.substring(0, 10)}...`);
  if (workatoToken) {
    logSuccess(`Salesforce Token: ${workatoToken.substring(0, 10)}...`);
  }
  
  // Run tests with SALESFORCE_API_AUTH_TOKEN
  await runTest('Test 1: Search cases for staff (room_number=101)', testSearchCasesForStaff);
  await runTest('Test 2: Search cases for guest', testSearchCasesForGuest);
  await runTest('Test 3: Search rooms for staff', testSearchRoomsForStaff);
  await runTest('Test 4: Search rooms for guest', testSearchRoomsForGuest);
  await runTest('Test 5: Submit guest service request', testSubmitServiceRequest);
  await runTest('Test 6: Submit maintenance request', testSubmitMaintenanceRequest);
  await runTest('Test 7: Check in guest', testCheckInGuest);
  await runTest('Test 8: Process guest checkout', testProcessCheckout);
  await runTest('Test 9: Create contact if not found', testCreateContact);
  
  // Print summary
  logSection('Test Summary');
  
  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const total = testResults.length;
  
  log(`Total Tests: ${total}`);
  log(`Passed: ${passed}`, colors.green);
  log(`Failed: ${failed}`, failed > 0 ? colors.red : colors.green);
  
  if (failed > 0) {
    log('\nFailed Tests:', colors.red);
    testResults.filter(r => !r.passed).forEach(r => {
      log(`  - ${r.name}`, colors.red);
      log(`    Error: ${r.error}`, colors.red);
      if (r.statusCode) {
        log(`    Status Code: ${r.statusCode}`, colors.red);
      }
    });
  }
  
  // Print detailed results
  log('\nDetailed Results:', colors.cyan);
  testResults.forEach(r => {
    const status = r.passed ? '✓' : '✗';
    const color = r.passed ? colors.green : colors.red;
    log(`  ${status} ${r.name} (${r.duration}ms)`, color);
  });
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
main().catch(error => {
  logError(`Unhandled error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
