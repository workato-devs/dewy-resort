#!/usr/bin/env node

/**
 * Automated Salesforce Endpoints Test Script
 * Non-interactive test that creates and verifies all entity types
 * 
 * Usage: node scripts/test-salesforce-automated.js
 */

import { SalesforceClient } from '../lib/workato/salesforce-client';
import { getWorkatoSalesforceConfig } from '../lib/workato/config';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✓ ${message}`, 'green');
}

function logError(message: string) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message: string) {
  log(`ℹ ${message}`, 'blue');
}

function logSection(title: string) {
  console.log();
  log(`${'='.repeat(70)}`, 'cyan');
  log(`  ${title}`, 'bright');
  log(`${'='.repeat(70)}`, 'cyan');
  console.log();
}

// Test results tracking
const results: {
  passed: number;
  failed: number;
  tests: Array<{ name: string; passed: boolean; error: string | null }>;
} = {
  passed: 0,
  failed: 0,
  tests: [],
};

function recordTest(name: string, passed: boolean, error: string | null = null) {
  results.tests.push({ name, passed, error });
  if (passed) {
    results.passed++;
    logSuccess(name);
  } else {
    results.failed++;
    logError(`${name}: ${error || 'Unknown error'}`);
  }
}

// Test data
const testData = {
  guestId: 'test-guest-' + Date.now(),
  roomNumber: '999',
  floor: 9,
};

async function runTests() {
  logSection('Salesforce API Automated Test Suite');
  
  // Initialize client
  let client;
  try {
    const config = getWorkatoSalesforceConfig();
    logInfo('Configuration:');
    console.log(`  Base URL: ${config.baseUrl}`);
    console.log(`  Mock Mode: ${config.mockMode}`);
    console.log(`  Cache Enabled: ${config.cacheEnabled}`);
    console.log();
    
    client = new SalesforceClient(config);
    logSuccess('Client initialized');
  } catch (error) {
    logError(`Failed to initialize client: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
  
  // ============================================================================
  // Room Tests
  // ============================================================================
  
  logSection('Room Operations');
  
  let createdRoom;
  
  // Test 1: Create Room
  try {
    createdRoom = await client.createRoom({
      room_number: testData.roomNumber,
      floor: testData.floor,
      type: 'standard',
      status: 'available',
    });
    recordTest('Create Room', true);
    logInfo(`  Room ID: ${createdRoom.id}`);
  } catch (error) {
    recordTest('Create Room', false, error);
  }
  
  // Test 2: Search Rooms
  try {
    const rooms = await client.searchRooms({ room_number: testData.roomNumber });
    const found = rooms.length > 0;
    recordTest('Search Rooms', found);
    logInfo(`  Found ${rooms.length} room(s)`);
  } catch (error) {
    recordTest('Search Rooms', false, error);
  }
  
  // Test 3: Get Room
  if (createdRoom) {
    try {
      const room = await client.getRoom(createdRoom.id);
      const valid = room.id === createdRoom.id;
      recordTest('Get Room', valid);
      logInfo(`  Retrieved room: ${room.room_number}`);
    } catch (error) {
      recordTest('Get Room', false, error);
    }
  }
  
  // Test 4: Update Room
  if (createdRoom) {
    try {
      const updatedRoom = await client.updateRoom(createdRoom.id, { status: 'occupied' });
      const valid = updatedRoom.status === 'occupied';
      recordTest('Update Room', valid);
      logInfo(`  New status: ${updatedRoom.status}`);
    } catch (error) {
      recordTest('Update Room', false, error);
    }
  }
  
  // ============================================================================
  // Service Request Tests
  // ============================================================================
  
  logSection('Service Request Operations');
  
  let createdServiceRequest;
  
  // Test 5: Create Service Request
  try {
    createdServiceRequest = await client.createServiceRequest({
      guest_id: testData.guestId,
      room_number: testData.roomNumber,
      type: 'housekeeping',
      priority: 'medium',
      description: 'Automated test - please clean room',
    });
    recordTest('Create Service Request', true);
    logInfo(`  Service Request ID: ${createdServiceRequest.id}`);
  } catch (error) {
    recordTest('Create Service Request', false, error);
  }
  
  // Test 6: Search Service Requests
  try {
    const requests = await client.searchServiceRequests({ guest_id: testData.guestId });
    const found = requests.length > 0;
    recordTest('Search Service Requests', found);
    logInfo(`  Found ${requests.length} request(s)`);
  } catch (error) {
    recordTest('Search Service Requests', false, error);
  }
  
  // Test 7: Update Service Request
  if (createdServiceRequest) {
    try {
      const updated = await client.updateServiceRequest(createdServiceRequest.id, {
        status: 'in_progress',
      });
      const valid = updated.status === 'in_progress';
      recordTest('Update Service Request', valid);
      logInfo(`  New status: ${updated.status}`);
    } catch (error) {
      recordTest('Update Service Request', false, error);
    }
  }
  
  // ============================================================================
  // Maintenance Task Tests
  // ============================================================================
  
  logSection('Maintenance Task Operations');
  
  let createdMaintenanceTask;
  
  // Test 8: Create Maintenance Task
  if (createdRoom) {
    try {
      createdMaintenanceTask = await client.createMaintenanceTask({
        room_id: createdRoom.id,
        type: 'repair',
        priority: 'high',
        description: 'Automated test - fix AC unit',
      });
      recordTest('Create Maintenance Task', true);
      logInfo(`  Maintenance Task ID: ${createdMaintenanceTask.id}`);
    } catch (error) {
      recordTest('Create Maintenance Task', false, error);
    }
  }
  
  // Test 9: Search Maintenance Tasks
  if (createdRoom) {
    try {
      const tasks = await client.searchMaintenanceTasks({ room_id: createdRoom.id });
      const found = tasks.length > 0;
      recordTest('Search Maintenance Tasks', found);
      logInfo(`  Found ${tasks.length} task(s)`);
    } catch (error) {
      recordTest('Search Maintenance Tasks', false, error);
    }
  }
  
  // Test 10: Get Maintenance Task
  if (createdMaintenanceTask) {
    try {
      const task = await client.getMaintenanceTask(createdMaintenanceTask.id);
      const valid = task.id === createdMaintenanceTask.id;
      recordTest('Get Maintenance Task', valid);
      logInfo(`  Retrieved task: ${task.type}`);
    } catch (error) {
      recordTest('Get Maintenance Task', false, error);
    }
  }
  
  // Test 11: Update Maintenance Task
  if (createdMaintenanceTask) {
    try {
      const updated = await client.updateMaintenanceTask(createdMaintenanceTask.id, {
        status: 'completed',
      });
      const valid = updated.status === 'completed';
      recordTest('Update Maintenance Task', valid);
      logInfo(`  New status: ${updated.status}`);
    } catch (error) {
      recordTest('Update Maintenance Task', false, error);
    }
  }
  
  // ============================================================================
  // Charge Tests
  // ============================================================================
  
  logSection('Charge Operations');
  
  let createdCharge;
  
  // Test 12: Create Charge
  try {
    createdCharge = await client.createCharge({
      guest_id: testData.guestId,
      amount: 99.99,
      description: 'Automated test charge',
      category: 'room',
      date: new Date().toISOString(),
      paid: false,
    });
    recordTest('Create Charge', true);
    logInfo(`  Charge ID: ${createdCharge.id}`);
  } catch (error) {
    recordTest('Create Charge', false, error);
  }
  
  // Test 13: Search Charges
  try {
    const charges = await client.searchCharges({ guest_id: testData.guestId });
    const found = charges.length > 0;
    recordTest('Search Charges', found);
    logInfo(`  Found ${charges.length} charge(s)`);
  } catch (error) {
    recordTest('Search Charges', false, error);
  }
  
  // Test 14: Get Charge
  if (createdCharge) {
    try {
      const charge = await client.getCharge(createdCharge.id);
      const valid = charge.id === createdCharge.id;
      recordTest('Get Charge', valid);
      logInfo(`  Retrieved charge: $${charge.amount}`);
    } catch (error) {
      recordTest('Get Charge', false, error);
    }
  }
  
  // Test 15: Update Charge
  if (createdCharge) {
    try {
      const updated = await client.updateCharge(createdCharge.id, { paid: true });
      const valid = updated.paid === true;
      recordTest('Update Charge', valid);
      logInfo(`  Paid status: ${updated.paid}`);
    } catch (error) {
      recordTest('Update Charge', false, error);
    }
  }
  
  // Test 16: Search All Charges (empty criteria)
  try {
    const allCharges = await client.searchCharges({});
    recordTest('Search All Charges', true);
    logInfo(`  Found ${allCharges.length} total charge(s)`);
  } catch (error) {
    recordTest('Search All Charges', false, error);
  }
  
  // ============================================================================
  // Cache Tests
  // ============================================================================
  
  logSection('Cache Operations');
  
  // Test 17: Cache Hit
  if (createdRoom) {
    try {
      const start = Date.now();
      await client.getRoom(createdRoom.id);
      const firstDuration = Date.now() - start;
      
      const start2 = Date.now();
      await client.getRoom(createdRoom.id);
      const secondDuration = Date.now() - start2;
      
      // Second call should be faster (cached)
      const cached = secondDuration < firstDuration || secondDuration < 10;
      recordTest('Cache Hit Test', cached);
      logInfo(`  First call: ${firstDuration}ms, Second call: ${secondDuration}ms`);
    } catch (error) {
      recordTest('Cache Hit Test', false, error);
    }
  }
  
  // Test 18: Clear Cache
  try {
    client.clearCache();
    recordTest('Clear Cache', true);
  } catch (error) {
    recordTest('Clear Cache', false, error);
  }
  
  // ============================================================================
  // Summary
  // ============================================================================
  
  logSection('Test Results Summary');
  
  console.log(`Total Tests: ${results.tests.length}`);
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  console.log();
  
  if (results.failed > 0) {
    log('Failed Tests:', 'red');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  - ${t.name}`);
        if (t.error) {
          console.log(`    Error: ${t.error}`);
          }
        }
      });
  }
  
  console.log();
  log('Test Data Created:', 'cyan');
  console.log(`  Guest ID: ${testData.guestId}`);
  console.log(`  Room Number: ${testData.roomNumber}`);
  if (createdRoom) console.log(`  Room ID: ${createdRoom.id}`);
  if (createdServiceRequest) console.log(`  Service Request ID: ${createdServiceRequest.id}`);
  if (createdMaintenanceTask) console.log(`  Maintenance Task ID: ${createdMaintenanceTask.id}`);
  if (createdCharge) console.log(`  Charge ID: ${createdCharge.id}`);
  
  console.log();
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  logError(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
  console.error(error);
  process.exit(1);
});
