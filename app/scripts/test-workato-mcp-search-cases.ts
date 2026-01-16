#!/usr/bin/env ts-node
/**
 * Test Workato MCP API - Search Cases for Staff
 * 
 * This script tests the Workato MCP API endpoint that's failing:
 * POST https://apim.trial.workato.com/zaynet2/dewy-hotel-apis-v1/search-cases-for-staff
 * 
 * This is the endpoint behind the Search_cases_on_behalf_of_staff MCP tool
 * that's returning 500 errors in the manager chat.
 * 
 * Note: Run this with: npx tsx scripts/test-workato-mcp-search-cases.ts
 * (tsx automatically loads .env files)
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
// Helper: Make API Request
// ============================================================================

async function makeWorkatoRequest(
  endpoint: string,
  body: any,
  description: string
): Promise<any> {
  const baseUrl = process.env.MCP_OPERATIONS_URL;
  const token = process.env.MCP_OPERATIONS_TOKEN;
  
  if (!baseUrl) {
    throw new Error('MCP_OPERATIONS_URL not set in .env');
  }
  
  if (!token) {
    throw new Error('MCP_OPERATIONS_TOKEN not set in .env');
  }
  
  const url = `${baseUrl}${endpoint}`;
  
  logInfo(`Request: POST ${url}`);
  logInfo(`Body: ${JSON.stringify(body, null, 2)}`);
  
  const startTime = Date.now();
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
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
// Test 1: Search Cases with room_number (the failing case)
// ============================================================================

async function testSearchCasesWithRoomNumber() {
  const result = await makeWorkatoRequest(
    '/search-cases-for-staff',
    { room_number: '101' },
    'Search cases with room_number'
  );
  
  logSuccess(`Returned ${result.cases?.length || 0} cases`);
}

// ============================================================================
// Test 2: Search Cases with no parameters
// ============================================================================

async function testSearchCasesNoParams() {
  const result = await makeWorkatoRequest(
    '/search-cases-for-staff',
    {},
    'Search cases with no parameters'
  );
  
  logSuccess(`Returned ${result.cases?.length || 0} cases`);
}

// ============================================================================
// Test 3: Search Cases with status filter
// ============================================================================

async function testSearchCasesWithStatus() {
  const result = await makeWorkatoRequest(
    '/search-cases-for-staff',
    { status: 'New' },
    'Search cases with status filter'
  );
  
  logSuccess(`Returned ${result.cases?.length || 0} cases with status=New`);
}

// ============================================================================
// Test 4: Search Cases with type filter
// ============================================================================

async function testSearchCasesWithType() {
  const result = await makeWorkatoRequest(
    '/search-cases-for-staff',
    { type: 'Maintenance' },
    'Search cases with type filter'
  );
  
  logSuccess(`Returned ${result.cases?.length || 0} cases with type=Maintenance`);
}

// ============================================================================
// Test 5: Search Cases with multiple filters
// ============================================================================

async function testSearchCasesMultipleFilters() {
  const result = await makeWorkatoRequest(
    '/search-cases-for-staff',
    { 
      room_number: '101',
      status: 'New',
      type: 'Maintenance'
    },
    'Search cases with multiple filters'
  );
  
  logSuccess(`Returned ${result.cases?.length || 0} cases with multiple filters`);
}

// ============================================================================
// Test 6: Try alternative endpoint (search-cases-in-salesforce)
// ============================================================================

async function testAlternativeEndpoint() {
  // This is the endpoint that works in SalesforceClient
  const baseUrl = process.env.SALESFORCE_API_COLLECTION_URL;
  const token = process.env.SALESFORCE_API_AUTH_TOKEN;
  
  if (!baseUrl || !token) {
    logWarning('SALESFORCE_API_COLLECTION_URL or SALESFORCE_API_AUTH_TOKEN not set');
    return;
  }
  
  const url = `${baseUrl}/search-cases-in-salesforce`;
  
  logInfo(`Request: POST ${url}`);
  logInfo(`Body: ${JSON.stringify({ search_field: '*', limit: 10 }, null, 2)}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-TOKEN': token,
    },
    body: JSON.stringify({ search_field: '*', limit: 10 }),
  });
  
  logInfo(`Response Status: ${response.status}`);
  
  const data = await response.json();
  logInfo(`Response Body: ${JSON.stringify(data, null, 2)}`);
  
  if (!response.ok) {
    throw new Error(`Alternative endpoint failed with status ${response.status}`);
  }
  
  logSuccess(`Alternative endpoint works! Returned ${data.length || 0} cases`);
}

// ============================================================================
// Test 7: Check MCP tools/list endpoint
// ============================================================================

async function testMCPToolsList() {
  const baseUrl = process.env.MCP_OPERATIONS_URL;
  const token = process.env.MCP_OPERATIONS_TOKEN;
  
  if (!baseUrl || !token) {
    throw new Error('MCP_OPERATIONS_URL or MCP_OPERATIONS_TOKEN not set');
  }
  
  const url = `${baseUrl}/tools/list`;
  
  logInfo(`Request: POST ${url}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    }),
  });
  
  logInfo(`Response Status: ${response.status}`);
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`MCP tools/list failed with status ${response.status}`);
  }
  
  const tools = data.result?.tools || data.result || [];
  logSuccess(`Found ${tools.length} MCP tools`);
  
  // Find the Search_cases_on_behalf_of_staff tool
  const searchTool = tools.find((t: any) => t.name === 'Search_cases_on_behalf_of_staff');
  
  if (searchTool) {
    logSuccess('Found Search_cases_on_behalf_of_staff tool');
    logInfo(`Tool definition: ${JSON.stringify(searchTool, null, 2)}`);
  } else {
    logWarning('Search_cases_on_behalf_of_staff tool not found in MCP server');
  }
}

// ============================================================================
// Test 8: Call MCP tool directly via tools/call (with MCP_OPERATIONS_TOKEN)
// ============================================================================

async function testMCPToolCall() {
  const baseUrl = process.env.MCP_OPERATIONS_URL;
  const token = process.env.MCP_OPERATIONS_TOKEN;
  
  if (!baseUrl || !token) {
    throw new Error('MCP_OPERATIONS_URL or MCP_OPERATIONS_TOKEN not set');
  }
  
  const url = `${baseUrl}/tools/call`;
  
  const requestBody = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'Search_cases_on_behalf_of_staff',
      arguments: {
        room_number: '101'
      },
    },
  };
  
  logInfo(`Request: POST ${url}`);
  logInfo(`Auth: Bearer ${token.substring(0, 10)}...`);
  logInfo(`Body: ${JSON.stringify(requestBody, null, 2)}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(requestBody),
  });
  
  logInfo(`Response Status: ${response.status}`);
  
  const data = await response.json();
  logInfo(`Response Body: ${JSON.stringify(data, null, 2)}`);
  
  if (data.error) {
    throw new Error(`MCP tool call failed: ${data.error.message || JSON.stringify(data.error)}`);
  }
  
  if (data.result?.isError) {
    const errorText = data.result.content?.[0]?.text || 'Tool execution failed';
    throw new Error(`MCP tool returned error: ${errorText}`);
  }
  
  logSuccess('MCP tool call succeeded');
  logInfo(`Result: ${JSON.stringify(data.result, null, 2)}`);
}

// ============================================================================
// Test 9: Call MCP tool with SALESFORCE_API_AUTH_TOKEN instead
// ============================================================================

async function testMCPToolCallWithWorkatoToken() {
  const baseUrl = process.env.MCP_OPERATIONS_URL;
  const token = process.env.SALESFORCE_API_AUTH_TOKEN;
  
  if (!baseUrl || !token) {
    throw new Error('MCP_OPERATIONS_URL or SALESFORCE_API_AUTH_TOKEN not set');
  }
  
  const url = `${baseUrl}/tools/call`;
  
  const requestBody = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'Search_cases_on_behalf_of_staff',
      arguments: {
        room_number: '101'
      },
    },
  };
  
  logInfo(`Request: POST ${url}`);
  logInfo(`Auth: Bearer ${token.substring(0, 10)}...`);
  logInfo(`Body: ${JSON.stringify(requestBody, null, 2)}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(requestBody),
  });
  
  logInfo(`Response Status: ${response.status}`);
  
  const data = await response.json();
  logInfo(`Response Body: ${JSON.stringify(data, null, 2)}`);
  
  if (data.error) {
    throw new Error(`MCP tool call failed: ${data.error.message || JSON.stringify(data.error)}`);
  }
  
  if (data.result?.isError) {
    const errorText = data.result.content?.[0]?.text || 'Tool execution failed';
    throw new Error(`MCP tool returned error: ${errorText}`);
  }
  
  logSuccess('MCP tool call succeeded with SALESFORCE_API_AUTH_TOKEN');
  logInfo(`Result: ${JSON.stringify(data.result, null, 2)}`);
}

// ============================================================================
// Test 10: Call MCP tool with API-TOKEN header (like SalesforceClient)
// ============================================================================

async function testMCPToolCallWithAPITokenHeader() {
  const baseUrl = process.env.MCP_OPERATIONS_URL;
  const token = process.env.SALESFORCE_API_AUTH_TOKEN;
  
  if (!baseUrl || !token) {
    throw new Error('MCP_OPERATIONS_URL or SALESFORCE_API_AUTH_TOKEN not set');
  }
  
  const url = `${baseUrl}/tools/call`;
  
  const requestBody = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'Search_cases_on_behalf_of_staff',
      arguments: {
        room_number: '101'
      },
    },
  };
  
  logInfo(`Request: POST ${url}`);
  logInfo(`Auth: API-TOKEN ${token.substring(0, 10)}...`);
  logInfo(`Body: ${JSON.stringify(requestBody, null, 2)}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-TOKEN': token,
    },
    body: JSON.stringify(requestBody),
  });
  
  logInfo(`Response Status: ${response.status}`);
  
  const data = await response.json();
  logInfo(`Response Body: ${JSON.stringify(data, null, 2)}`);
  
  if (data.error) {
    throw new Error(`MCP tool call failed: ${data.error.message || JSON.stringify(data.error)}`);
  }
  
  if (data.result?.isError) {
    const errorText = data.result.content?.[0]?.text || 'Tool execution failed';
    throw new Error(`MCP tool returned error: ${errorText}`);
  }
  
  logSuccess('MCP tool call succeeded with API-TOKEN header');
  logInfo(`Result: ${JSON.stringify(data.result, null, 2)}`);
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function main() {
  logSection('Workato MCP API - Search Cases for Staff Tests');
  
  log('Testing the failing endpoint:', colors.yellow);
  log('  POST /search-cases-for-staff', colors.yellow);
  log('  This is the endpoint behind Search_cases_on_behalf_of_staff MCP tool', colors.yellow);
  
  // Check environment variables
  const baseUrl = process.env.MCP_OPERATIONS_URL;
  const token = process.env.MCP_OPERATIONS_TOKEN;
  
  if (!baseUrl) {
    logError('MCP_OPERATIONS_URL not set in .env');
    process.exit(1);
  }
  
  if (!token) {
    logError('MCP_OPERATIONS_TOKEN not set in .env');
    process.exit(1);
  }
  
  logSuccess(`Base URL: ${baseUrl}`);
  logSuccess(`Token: ${token.substring(0, 10)}...`);
  
  // Run tests
  await runTest('Test 1: Search Cases with room_number (the failing case)', testSearchCasesWithRoomNumber);
  await runTest('Test 2: Search Cases with no parameters', testSearchCasesNoParams);
  await runTest('Test 3: Search Cases with status filter', testSearchCasesWithStatus);
  await runTest('Test 4: Search Cases with type filter', testSearchCasesWithType);
  await runTest('Test 5: Search Cases with multiple filters', testSearchCasesMultipleFilters);
  await runTest('Test 6: Try alternative endpoint (search-cases-in-salesforce)', testAlternativeEndpoint);
  await runTest('Test 7: Check MCP tools/list endpoint', testMCPToolsList);
  await runTest('Test 8: Call MCP tool directly via tools/call (MCP_OPERATIONS_TOKEN)', testMCPToolCall);
  await runTest('Test 9: Call MCP tool with SALESFORCE_API_AUTH_TOKEN', testMCPToolCallWithWorkatoToken);
  await runTest('Test 10: Call MCP tool with API-TOKEN header', testMCPToolCallWithAPITokenHeader);
  
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
      if (r.response) {
        log(`    Response: ${JSON.stringify(r.response, null, 2)}`, colors.red);
      }
    });
  }
  
  // Print detailed results
  log('\nDetailed Results:', colors.cyan);
  testResults.forEach(r => {
    const status = r.passed ? '✓' : '✗';
    const color = r.passed ? colors.green : colors.red;
    log(`  ${status} ${r.name} (${r.duration}ms)`, color);
    if (r.error) {
      log(`    Error: ${r.error}`, colors.red);
    }
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
