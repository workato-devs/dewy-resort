#!/usr/bin/env ts-node
/**
 * Test Room Management Integration with Salesforce
 * 
 * This script tests the /api/manager/rooms API route and verifies:
 * 1. The route returns HTTP 200 status
 * 2. SalesforceClient.searchRooms() executes without errors
 * 3. Room filtering by status, floor, and type works correctly
 * 4. Room data displays correctly
 * 
 * Task: 6b from salesforce-integration-fixes spec
 */

import axios from 'axios';

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const API_ENDPOINT = `${BASE_URL}/api/manager/rooms`;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

/**
 * Helper function to add test result
 */
function addResult(name: string, passed: boolean, error?: string, details?: any) {
  results.push({ name, passed, error, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (error) {
    console.log(`  Error: ${error}`);
  }
  if (details) {
    console.log(`  Details:`, JSON.stringify(details, null, 2));
  }
}

/**
 * Test 1: Basic GET request returns 200
 */
async function testBasicGet() {
  try {
    const response = await axios.get(API_ENDPOINT);
    
    if (response.status === 200) {
      addResult('GET /api/manager/rooms returns HTTP 200', true, undefined, {
        status: response.status,
        roomCount: response.data.rooms?.length || 0
      });
      return response.data;
    } else {
      addResult('GET /api/manager/rooms returns HTTP 200', false, `Expected 200, got ${response.status}`);
      return null;
    }
  } catch (error: any) {
    addResult('GET /api/manager/rooms returns HTTP 200', false, error.message, {
      status: error.response?.status,
      data: error.response?.data
    });
    return null;
  }
}

/**
 * Test 2: Response has correct structure
 */
function testResponseStructure(data: any) {
  if (!data) {
    addResult('Response has correct structure', false, 'No data returned from previous test');
    return false;
  }

  try {
    // Check if rooms array exists
    if (!Array.isArray(data.rooms)) {
      addResult('Response has correct structure', false, 'Response does not contain rooms array');
      return false;
    }

    // Check if rooms have expected properties
    if (data.rooms.length > 0) {
      const room = data.rooms[0];
      const requiredFields = ['id', 'room_number', 'floor', 'type', 'status'];
      const missingFields = requiredFields.filter(field => !(field in room));
      
      if (missingFields.length > 0) {
        addResult('Response has correct structure', false, `Missing required fields: ${missingFields.join(', ')}`, {
          sampleRoom: room
        });
        return false;
      }
    }

    addResult('Response has correct structure', true, undefined, {
      roomCount: data.rooms.length,
      sampleRoom: data.rooms[0] || 'No rooms in response'
    });
    return true;
  } catch (error: any) {
    addResult('Response has correct structure', false, error.message);
    return false;
  }
}

/**
 * Test 3: Filter by status
 */
async function testFilterByStatus() {
  try {
    const statuses = ['vacant', 'occupied', 'cleaning', 'maintenance'];
    let allPassed = true;

    for (const status of statuses) {
      try {
        const response = await axios.get(`${API_ENDPOINT}?status=${status}`);
        
        if (response.status === 200) {
          const rooms = response.data.rooms || [];
          
          // Check if all returned rooms have the requested status
          const invalidRooms = rooms.filter((room: any) => room.status !== status);
          
          if (invalidRooms.length > 0) {
            addResult(`Filter by status: ${status}`, false, `Found ${invalidRooms.length} rooms with incorrect status`, {
              requestedStatus: status,
              invalidRooms: invalidRooms.map((r: any) => ({ id: r.id, status: r.status }))
            });
            allPassed = false;
          } else {
            console.log(`  ✓ Status filter '${status}' works correctly (${rooms.length} rooms)`);
          }
        } else {
          addResult(`Filter by status: ${status}`, false, `Expected 200, got ${response.status}`);
          allPassed = false;
        }
      } catch (error: any) {
        addResult(`Filter by status: ${status}`, false, error.message);
        allPassed = false;
      }
    }

    if (allPassed) {
      addResult('Filter by status (all statuses)', true);
    }
  } catch (error: any) {
    addResult('Filter by status', false, error.message);
  }
}

/**
 * Test 4: Filter by floor
 */
async function testFilterByFloor() {
  try {
    const floors = [1, 2, 3];
    let allPassed = true;

    for (const floor of floors) {
      try {
        const response = await axios.get(`${API_ENDPOINT}?floor=${floor}`);
        
        if (response.status === 200) {
          const rooms = response.data.rooms || [];
          
          // Check if all returned rooms are on the requested floor
          const invalidRooms = rooms.filter((room: any) => room.floor !== floor);
          
          if (invalidRooms.length > 0) {
            addResult(`Filter by floor: ${floor}`, false, `Found ${invalidRooms.length} rooms on incorrect floor`, {
              requestedFloor: floor,
              invalidRooms: invalidRooms.map((r: any) => ({ id: r.id, floor: r.floor }))
            });
            allPassed = false;
          } else {
            console.log(`  ✓ Floor filter '${floor}' works correctly (${rooms.length} rooms)`);
          }
        } else {
          addResult(`Filter by floor: ${floor}`, false, `Expected 200, got ${response.status}`);
          allPassed = false;
        }
      } catch (error: any) {
        addResult(`Filter by floor: ${floor}`, false, error.message);
        allPassed = false;
      }
    }

    if (allPassed) {
      addResult('Filter by floor (all floors)', true);
    }
  } catch (error: any) {
    addResult('Filter by floor', false, error.message);
  }
}

/**
 * Test 5: Filter by type
 */
async function testFilterByType() {
  try {
    const types = ['standard', 'deluxe', 'suite'];
    let allPassed = true;

    for (const type of types) {
      try {
        const response = await axios.get(`${API_ENDPOINT}?type=${type}`);
        
        if (response.status === 200) {
          const rooms = response.data.rooms || [];
          
          // Check if all returned rooms have the requested type
          const invalidRooms = rooms.filter((room: any) => room.type !== type);
          
          if (invalidRooms.length > 0) {
            addResult(`Filter by type: ${type}`, false, `Found ${invalidRooms.length} rooms with incorrect type`, {
              requestedType: type,
              invalidRooms: invalidRooms.map((r: any) => ({ id: r.id, type: r.type }))
            });
            allPassed = false;
          } else {
            console.log(`  ✓ Type filter '${type}' works correctly (${rooms.length} rooms)`);
          }
        } else {
          addResult(`Filter by type: ${type}`, false, `Expected 200, got ${response.status}`);
          allPassed = false;
        }
      } catch (error: any) {
        addResult(`Filter by type: ${type}`, false, error.message);
        allPassed = false;
      }
    }

    if (allPassed) {
      addResult('Filter by type (all types)', true);
    }
  } catch (error: any) {
    addResult('Filter by type', false, error.message);
  }
}

/**
 * Test 6: Combined filters
 */
async function testCombinedFilters() {
  try {
    const response = await axios.get(`${API_ENDPOINT}?status=vacant&floor=1&type=standard`);
    
    if (response.status === 200) {
      const rooms = response.data.rooms || [];
      
      // Check if all returned rooms match all criteria
      const invalidRooms = rooms.filter((room: any) => 
        room.status !== 'vacant' || room.floor !== 1 || room.type !== 'standard'
      );
      
      if (invalidRooms.length > 0) {
        addResult('Combined filters (status + floor + type)', false, `Found ${invalidRooms.length} rooms not matching criteria`, {
          criteria: { status: 'vacant', floor: 1, type: 'standard' },
          invalidRooms: invalidRooms.map((r: any) => ({ 
            id: r.id, 
            status: r.status, 
            floor: r.floor, 
            type: r.type 
          }))
        });
      } else {
        addResult('Combined filters (status + floor + type)', true, undefined, {
          matchingRooms: rooms.length
        });
      }
    } else {
      addResult('Combined filters (status + floor + type)', false, `Expected 200, got ${response.status}`);
    }
  } catch (error: any) {
    addResult('Combined filters (status + floor + type)', false, error.message);
  }
}

/**
 * Test 7: Verify devices are included
 */
async function testDevicesIncluded() {
  try {
    const response = await axios.get(API_ENDPOINT);
    
    if (response.status === 200) {
      const rooms = response.data.rooms || [];
      
      // Check if rooms have devices array
      const roomsWithoutDevices = rooms.filter((room: any) => !Array.isArray(room.devices));
      
      if (roomsWithoutDevices.length > 0) {
        addResult('Rooms include devices array', false, `Found ${roomsWithoutDevices.length} rooms without devices array`);
      } else {
        // Count rooms with actual devices
        const roomsWithDevices = rooms.filter((room: any) => room.devices.length > 0);
        
        addResult('Rooms include devices array', true, undefined, {
          totalRooms: rooms.length,
          roomsWithDevices: roomsWithDevices.length
        });
      }
    } else {
      addResult('Rooms include devices array', false, `Expected 200, got ${response.status}`);
    }
  } catch (error: any) {
    addResult('Rooms include devices array', false, error.message);
  }
}

/**
 * Test 8: Verify no errors in response
 */
async function testNoErrors() {
  try {
    const response = await axios.get(API_ENDPOINT);
    
    if (response.status === 200) {
      const data = response.data;
      
      // Check if response contains error field
      if (data.error) {
        addResult('Response contains no errors', false, 'Response contains error field', {
          error: data.error
        });
      } else {
        addResult('Response contains no errors', true);
      }
    } else {
      addResult('Response contains no errors', false, `Expected 200, got ${response.status}`);
    }
  } catch (error: any) {
    addResult('Response contains no errors', false, error.message);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('='.repeat(80));
  console.log('Testing Room Management Integration with Salesforce');
  console.log('Task 6b: salesforce-integration-fixes');
  console.log('='.repeat(80));
  console.log();

  console.log('Configuration:');
  console.log(`  API Endpoint: ${API_ENDPOINT}`);
  console.log(`  SALESFORCE_ENABLED: ${process.env.SALESFORCE_ENABLED || 'true (default)'}`);
  console.log(`  WORKATO_MOCK_MODE: ${process.env.WORKATO_MOCK_MODE || 'false (default)'}`);
  console.log();

  console.log('Running tests...');
  console.log();

  // Test 1: Basic GET request
  const data = await testBasicGet();
  
  // Test 2: Response structure
  testResponseStructure(data);
  
  // Test 3: Filter by status
  await testFilterByStatus();
  
  // Test 4: Filter by floor
  await testFilterByFloor();
  
  // Test 5: Filter by type
  await testFilterByType();
  
  // Test 6: Combined filters
  await testCombinedFilters();
  
  // Test 7: Devices included
  await testDevicesIncluded();
  
  // Test 8: No errors
  await testNoErrors();

  // Summary
  console.log();
  console.log('='.repeat(80));
  console.log('Test Summary');
  console.log('='.repeat(80));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`Total: ${total} tests`);
  console.log(`Passed: ${passed} tests`);
  console.log(`Failed: ${failed} tests`);
  console.log();

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}`);
      if (r.error) {
        console.log(`     ${r.error}`);
      }
    });
    console.log();
  }

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
