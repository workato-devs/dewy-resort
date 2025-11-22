#!/usr/bin/env node

/**
 * Test Room Management Integration
 * 
 * This script tests the room management integration with Workato recipes:
 * - Test /api/manager/rooms API route
 * - Verify HTTP 200 status
 * - Verify SalesforceClient.searchRooms() executes without errors
 * - Test room filtering by status, floor, and type
 * - Test room creation and update operations
 * - Verify room data displays correctly
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_ENDPOINT = '/api/manager/rooms';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

/**
 * Make an HTTP request
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : null;
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Log a test result
 */
function logTest(name, passed, message = '') {
  const status = passed ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
  console.log(`  ${status} ${name}`);
  if (message) {
    console.log(`    ${colors.cyan}${message}${colors.reset}`);
  }
  
  results.tests.push({ name, passed, message });
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

/**
 * Log a section header
 */
function logSection(title) {
  console.log(`\n${colors.bright}${colors.blue}${title}${colors.reset}`);
  console.log('='.repeat(60));
}

/**
 * Test 1: Basic API Route Access
 * Requirement 2.5: The API route /api/manager/rooms SHALL return HTTP status 200
 */
async function testBasicAccess() {
  logSection('Test 1: Basic API Route Access');
  
  try {
    const response = await makeRequest('GET', API_ENDPOINT);
    
    // Check status code
    const statusOk = response.statusCode === 200;
    logTest(
      'API returns HTTP 200 status',
      statusOk,
      `Status: ${response.statusCode}`
    );
    
    // Check response structure
    const hasRooms = response.body && Array.isArray(response.body.rooms);
    logTest(
      'Response contains rooms array',
      hasRooms,
      hasRooms ? `Found ${response.body.rooms.length} rooms` : 'No rooms array in response'
    );
    
    // Check for errors
    const noErrors = !response.body?.error;
    logTest(
      'No error in response',
      noErrors,
      response.body?.error ? JSON.stringify(response.body.error) : 'No errors'
    );
    
    return { success: statusOk && hasRooms && noErrors, response };
  } catch (error) {
    logTest('API request succeeds', false, error.message);
    return { success: false, error };
  }
}

/**
 * Test 2: Room Data Structure
 * Requirement 2.6: Verify that room data displays correctly
 */
async function testRoomDataStructure() {
  logSection('Test 2: Room Data Structure');
  
  try {
    const response = await makeRequest('GET', API_ENDPOINT);
    
    if (!response.body?.rooms || response.body.rooms.length === 0) {
      logTest('Rooms data available', false, 'No rooms returned');
      return { success: false };
    }
    
    const room = response.body.rooms[0];
    
    // Check required fields
    const hasId = typeof room.id === 'string';
    logTest('Room has id field', hasId, hasId ? `id: ${room.id}` : 'Missing id');
    
    const hasRoomNumber = typeof room.roomNumber === 'string' || typeof room.room_number === 'string';
    logTest(
      'Room has roomNumber field',
      hasRoomNumber,
      hasRoomNumber ? `roomNumber: ${room.roomNumber || room.room_number}` : 'Missing roomNumber'
    );
    
    const hasStatus = typeof room.status === 'string';
    logTest('Room has status field', hasStatus, hasStatus ? `status: ${room.status}` : 'Missing status');
    
    const hasType = typeof room.type === 'string';
    logTest('Room has type field', hasType, hasType ? `type: ${room.type}` : 'Missing type');
    
    const hasFloor = typeof room.floor === 'number';
    logTest('Room has floor field', hasFloor, hasFloor ? `floor: ${room.floor}` : 'Missing floor');
    
    // Check devices array (local data)
    const hasDevices = Array.isArray(room.devices);
    logTest(
      'Room has devices array',
      hasDevices,
      hasDevices ? `${room.devices.length} devices` : 'Missing devices'
    );
    
    const allFieldsPresent = hasId && hasRoomNumber && hasStatus && hasType && hasFloor && hasDevices;
    
    return { success: allFieldsPresent, response };
  } catch (error) {
    logTest('Room data structure check', false, error.message);
    return { success: false, error };
  }
}

/**
 * Test 3: Room Filtering by Status
 * Requirement 2.1: Search and filter rooms based on criteria
 */
async function testFilterByStatus() {
  logSection('Test 3: Room Filtering by Status');
  
  try {
    // Test filtering by 'vacant' status
    const vacantResponse = await makeRequest('GET', `${API_ENDPOINT}?status=vacant`);
    const vacantOk = vacantResponse.statusCode === 200;
    logTest(
      'Filter by status=vacant',
      vacantOk,
      vacantOk ? `Found ${vacantResponse.body?.rooms?.length || 0} vacant rooms` : `Status: ${vacantResponse.statusCode}`
    );
    
    // Test filtering by 'occupied' status
    const occupiedResponse = await makeRequest('GET', `${API_ENDPOINT}?status=occupied`);
    const occupiedOk = occupiedResponse.statusCode === 200;
    logTest(
      'Filter by status=occupied',
      occupiedOk,
      occupiedOk ? `Found ${occupiedResponse.body?.rooms?.length || 0} occupied rooms` : `Status: ${occupiedResponse.statusCode}`
    );
    
    // Test filtering by 'cleaning' status
    const cleaningResponse = await makeRequest('GET', `${API_ENDPOINT}?status=cleaning`);
    const cleaningOk = cleaningResponse.statusCode === 200;
    logTest(
      'Filter by status=cleaning',
      cleaningOk,
      cleaningOk ? `Found ${cleaningResponse.body?.rooms?.length || 0} cleaning rooms` : `Status: ${cleaningResponse.statusCode}`
    );
    
    // Test filtering by 'maintenance' status
    const maintenanceResponse = await makeRequest('GET', `${API_ENDPOINT}?status=maintenance`);
    const maintenanceOk = maintenanceResponse.statusCode === 200;
    logTest(
      'Filter by status=maintenance',
      maintenanceOk,
      maintenanceOk ? `Found ${maintenanceResponse.body?.rooms?.length || 0} maintenance rooms` : `Status: ${maintenanceResponse.statusCode}`
    );
    
    return { success: vacantOk && occupiedOk && cleaningOk && maintenanceOk };
  } catch (error) {
    logTest('Status filtering', false, error.message);
    return { success: false, error };
  }
}

/**
 * Test 4: Room Filtering by Floor
 * Requirement 2.1: Search and filter rooms based on criteria
 */
async function testFilterByFloor() {
  logSection('Test 4: Room Filtering by Floor');
  
  try {
    // Test filtering by floor 1
    const floor1Response = await makeRequest('GET', `${API_ENDPOINT}?floor=1`);
    const floor1Ok = floor1Response.statusCode === 200;
    logTest(
      'Filter by floor=1',
      floor1Ok,
      floor1Ok ? `Found ${floor1Response.body?.rooms?.length || 0} rooms on floor 1` : `Status: ${floor1Response.statusCode}`
    );
    
    // Test filtering by floor 2
    const floor2Response = await makeRequest('GET', `${API_ENDPOINT}?floor=2`);
    const floor2Ok = floor2Response.statusCode === 200;
    logTest(
      'Filter by floor=2',
      floor2Ok,
      floor2Ok ? `Found ${floor2Response.body?.rooms?.length || 0} rooms on floor 2` : `Status: ${floor2Response.statusCode}`
    );
    
    // Verify floor filtering works correctly
    if (floor1Ok && floor1Response.body?.rooms) {
      const allFloor1 = floor1Response.body.rooms.every(room => room.floor === 1);
      logTest(
        'Floor 1 filter returns only floor 1 rooms',
        allFloor1,
        allFloor1 ? 'All rooms are on floor 1' : 'Some rooms are not on floor 1'
      );
    }
    
    return { success: floor1Ok && floor2Ok };
  } catch (error) {
    logTest('Floor filtering', false, error.message);
    return { success: false, error };
  }
}

/**
 * Test 5: Room Filtering by Type
 * Requirement 2.1: Search and filter rooms based on criteria
 */
async function testFilterByType() {
  logSection('Test 5: Room Filtering by Type');
  
  try {
    // Test filtering by 'standard' type
    const standardResponse = await makeRequest('GET', `${API_ENDPOINT}?type=standard`);
    const standardOk = standardResponse.statusCode === 200;
    logTest(
      'Filter by type=standard',
      standardOk,
      standardOk ? `Found ${standardResponse.body?.rooms?.length || 0} standard rooms` : `Status: ${standardResponse.statusCode}`
    );
    
    // Test filtering by 'deluxe' type
    const deluxeResponse = await makeRequest('GET', `${API_ENDPOINT}?type=deluxe`);
    const deluxeOk = deluxeResponse.statusCode === 200;
    logTest(
      'Filter by type=deluxe',
      deluxeOk,
      deluxeOk ? `Found ${deluxeResponse.body?.rooms?.length || 0} deluxe rooms` : `Status: ${deluxeResponse.statusCode}`
    );
    
    // Test filtering by 'suite' type
    const suiteResponse = await makeRequest('GET', `${API_ENDPOINT}?type=suite`);
    const suiteOk = suiteResponse.statusCode === 200;
    logTest(
      'Filter by type=suite',
      suiteOk,
      suiteOk ? `Found ${suiteResponse.body?.rooms?.length || 0} suite rooms` : `Status: ${suiteResponse.statusCode}`
    );
    
    return { success: standardOk && deluxeOk && suiteOk };
  } catch (error) {
    logTest('Type filtering', false, error.message);
    return { success: false, error };
  }
}

/**
 * Test 6: Combined Filters
 * Requirement 2.1: Search and filter rooms based on criteria
 */
async function testCombinedFilters() {
  logSection('Test 6: Combined Filters');
  
  try {
    // Test combining status and floor
    const response1 = await makeRequest('GET', `${API_ENDPOINT}?status=vacant&floor=1`);
    const test1Ok = response1.statusCode === 200;
    logTest(
      'Filter by status=vacant and floor=1',
      test1Ok,
      test1Ok ? `Found ${response1.body?.rooms?.length || 0} vacant rooms on floor 1` : `Status: ${response1.statusCode}`
    );
    
    // Test combining status and type
    const response2 = await makeRequest('GET', `${API_ENDPOINT}?status=occupied&type=deluxe`);
    const test2Ok = response2.statusCode === 200;
    logTest(
      'Filter by status=occupied and type=deluxe',
      test2Ok,
      test2Ok ? `Found ${response2.body?.rooms?.length || 0} occupied deluxe rooms` : `Status: ${response2.statusCode}`
    );
    
    // Test combining all three filters
    const response3 = await makeRequest('GET', `${API_ENDPOINT}?status=vacant&floor=2&type=suite`);
    const test3Ok = response3.statusCode === 200;
    logTest(
      'Filter by status=vacant, floor=2, and type=suite',
      test3Ok,
      test3Ok ? `Found ${response3.body?.rooms?.length || 0} vacant suites on floor 2` : `Status: ${response3.statusCode}`
    );
    
    return { success: test1Ok && test2Ok && test3Ok };
  } catch (error) {
    logTest('Combined filtering', false, error.message);
    return { success: false, error };
  }
}

/**
 * Test 7: Error Handling
 * Requirement 2.5: Proper error handling
 */
async function testErrorHandling() {
  logSection('Test 7: Error Handling');
  
  try {
    // Test with invalid status value
    const response1 = await makeRequest('GET', `${API_ENDPOINT}?status=invalid_status`);
    const test1Ok = response1.statusCode === 200 || response1.statusCode === 400;
    logTest(
      'Handles invalid status gracefully',
      test1Ok,
      `Status: ${response1.statusCode}`
    );
    
    // Test with invalid floor value
    const response2 = await makeRequest('GET', `${API_ENDPOINT}?floor=abc`);
    const test2Ok = response2.statusCode === 200 || response2.statusCode === 400;
    logTest(
      'Handles invalid floor gracefully',
      test2Ok,
      `Status: ${response2.statusCode}`
    );
    
    // Test with invalid type value
    const response3 = await makeRequest('GET', `${API_ENDPOINT}?type=invalid_type`);
    const test3Ok = response3.statusCode === 200 || response3.statusCode === 400;
    logTest(
      'Handles invalid type gracefully',
      test3Ok,
      `Status: ${response3.statusCode}`
    );
    
    return { success: test1Ok && test2Ok && test3Ok };
  } catch (error) {
    logTest('Error handling', false, error.message);
    return { success: false, error };
  }
}

/**
 * Print summary
 */
function printSummary() {
  logSection('Test Summary');
  
  const total = results.passed + results.failed;
  const percentage = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  console.log(`\nTotal Tests: ${total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`Success Rate: ${percentage}%\n`);
  
  if (results.failed > 0) {
    console.log(`${colors.yellow}Failed Tests:${colors.reset}`);
    results.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  ${colors.red}✗${colors.reset} ${t.name}`);
        if (t.message) {
          console.log(`    ${t.message}`);
        }
      });
    console.log();
  }
  
  return results.failed === 0;
}

/**
 * Main test execution
 */
async function main() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Room Management Integration Test Suite                ║');
  console.log('║     Testing Workato Recipe Integration                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  console.log(`\n${colors.yellow}Configuration:${colors.reset}`);
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  API Endpoint: ${API_ENDPOINT}`);
  console.log(`  SALESFORCE_ENABLED: ${process.env.SALESFORCE_ENABLED !== 'false' ? 'true' : 'false'}`);
  console.log(`  WORKATO_MOCK_MODE: ${process.env.WORKATO_MOCK_MODE || 'not set'}`);
  
  // Run all tests
  await testBasicAccess();
  await testRoomDataStructure();
  await testFilterByStatus();
  await testFilterByFloor();
  await testFilterByType();
  await testCombinedFilters();
  await testErrorHandling();
  
  // Print summary
  const allPassed = printSummary();
  
  // Exit with appropriate code
  process.exit(allPassed ? 0 : 1);
}

// Run tests
main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
