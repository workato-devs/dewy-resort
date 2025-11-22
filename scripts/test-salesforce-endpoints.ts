#!/usr/bin/env node

/**
 * Salesforce Endpoints Test Script
 * Interactive CLI tool to test all Salesforce/Workato API endpoints
 * 
 * Usage: node scripts/test-salesforce-endpoints.js
 */

import * as readline from 'readline';
import { randomUUID } from 'crypto';

// Import the Salesforce client
import { SalesforceClient } from '../lib/workato/salesforce-client';
import { getWorkatoSalesforceConfig } from '../lib/workato/config';

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Test data storage
const testData = {
  rooms: [],
  serviceRequests: [],
  maintenanceTasks: [],
  charges: [],
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promisify readline question
function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

// Logging helpers
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logSection(title) {
  console.log();
  log(`${'='.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
  console.log();
}

function logJSON(data) {
  console.log(JSON.stringify(data, null, 2));
}

// Initialize client
let client;

async function initializeClient() {
  try {
    logSection('Initializing Salesforce Client');
    const config = getWorkatoSalesforceConfig();
    
    logInfo('Configuration:');
    console.log(`  Base URL: ${config.baseUrl}`);
    console.log(`  Token: ${config.apiToken ? '***' + config.apiToken.slice(-4) : 'NOT SET'}`);
    console.log(`  Timeout: ${config.timeout}ms`);
    console.log(`  Retry Attempts: ${config.retryAttempts}`);
    console.log(`  Mock Mode: ${config.mockMode}`);
    console.log(`  Cache Enabled: ${config.cacheEnabled}`);
    
    client = new SalesforceClient(config);
    logSuccess('Client initialized successfully');
    
    return true;
  } catch (error) {
    logError(`Failed to initialize client: ${error.message}`);
    return false;
  }
}

// ============================================================================
// Room Operations
// ============================================================================

async function testCreateRoom() {
  logSection('Test: Create Room');
  
  const roomNumber = await question('Room Number (e.g., 101): ');
  const floor = await question('Floor (e.g., 1): ');
  const type = await question('Type (standard/deluxe/suite): ');
  const status = await question('Status (available/occupied/maintenance): ');
  
  try {
    const room = await client.createRoom({
      room_number: roomNumber,
      floor: parseInt(floor),
      type,
      status,
    });
    
    testData.rooms.push(room);
    logSuccess('Room created successfully');
    logJSON(room);
    
    return room;
  } catch (error) {
    logError(`Failed to create room: ${error.message}`);
    if (error.correlationId) {
      logInfo(`Correlation ID: ${error.correlationId}`);
    }
    return null;
  }
}

async function testSearchRooms() {
  logSection('Test: Search Rooms');
  
  const roomNumber = await question('Room Number (optional, press Enter to skip): ');
  const status = await question('Status (optional, press Enter to skip): ');
  const floor = await question('Floor (optional, press Enter to skip): ');
  
  const criteria = {};
  if (roomNumber) criteria.room_number = roomNumber;
  if (status) criteria.status = status;
  if (floor) criteria.floor = parseInt(floor);
  
  try {
    const rooms = await client.searchRooms(criteria);
    
    logSuccess(`Found ${rooms.length} room(s)`);
    logJSON(rooms);
    
    if (rooms.length > 0) {
      testData.rooms = rooms;
    }
    
    return rooms;
  } catch (error) {
    logError(`Failed to search rooms: ${error.message}`);
    if (error.correlationId) {
      logInfo(`Correlation ID: ${error.correlationId}`);
    }
    return [];
  }
}

async function testGetRoom() {
  logSection('Test: Get Room');
  
  let roomId = await question('Room ID (or press Enter to use last created): ');
  
  if (!roomId && testData.rooms.length > 0) {
    roomId = testData.rooms[testData.rooms.length - 1].id;
    logInfo(`Using room ID: ${roomId}`);
  }
  
  if (!roomId) {
    logWarning('No room ID available. Create a room first.');
    return null;
  }
  
  try {
    const room = await client.getRoom(roomId);
    
    logSuccess('Room retrieved successfully');
    logJSON(room);
    
    return room;
  } catch (error) {
    logError(`Failed to get room: ${error.message}`);
    if (error.correlationId) {
      logInfo(`Correlation ID: ${error.correlationId}`);
    }
    return null;
  }
}

async function testUpdateRoom() {
  logSection('Test: Update Room');
  
  let roomId = await question('Room ID (or press Enter to use last created): ');
  
  if (!roomId && testData.rooms.length > 0) {
    roomId = testData.rooms[testData.rooms.length - 1].id;
    logInfo(`Using room ID: ${roomId}`);
  }
  
  if (!roomId) {
    logWarning('No room ID available. Create a room first.');
    return null;
  }
  
  const status = await question('New Status (available/occupied/maintenance): ');
  
  try {
    const room = await client.updateRoom(roomId, { status });
    
    logSuccess('Room updated successfully');
    logJSON(room);
    
    return room;
  } catch (error) {
    logError(`Failed to update room: ${error.message}`);
    if (error.correlationId) {
      logInfo(`Correlation ID: ${error.correlationId}`);
    }
    return null;
  }
}

// ============================================================================
// Service Request Operations
// ============================================================================

async function testCreateServiceRequest() {
  logSection('Test: Create Service Request');
  
  const guestId = await question('Guest ID: ');
  const roomNumber = await question('Room Number: ');
  const type = await question('Type (housekeeping/room_service/maintenance/concierge): ');
  const priority = await question('Priority (low/medium/high): ');
  const description = await question('Description: ');
  
  try {
    const serviceRequest = await client.createServiceRequest({
      guest_id: guestId,
      room_number: roomNumber,
      type,
      priority,
      description,
    });
    
    testData.serviceRequests.push(serviceRequest);
    logSuccess('Service request created successfully');
    logJSON(serviceRequest);
    
    return serviceRequest;
  } catch (error) {
    logError(`Failed to create service request: ${error.message}`);
    if (error.correlationId) {
      logInfo(`Correlation ID: ${error.correlationId}`);
    }
    return null;
  }
}

async function testSearchServiceRequests() {
  logSection('Test: Search Service Requests');
  
  const guestId = await question('Guest ID (optional, press Enter to skip): ');
  const status = await question('Status (optional, press Enter to skip): ');
  const type = await question('Type (optional, press Enter to skip): ');
  
  const criteria = {};
  if (guestId) criteria.guest_id = guestId;
  if (status) criteria.status = status;
  if (type) criteria.type = type;
  
  try {
    const serviceRequests = await client.searchServiceRequests(criteria);
    
    logSuccess(`Found ${serviceRequests.length} service request(s)`);
    logJSON(serviceRequests);
    
    if (serviceRequests.length > 0) {
      testData.serviceRequests = serviceRequests;
    }
    
    return serviceRequests;
  } catch (error) {
    logError(`Failed to search service requests: ${error.message}`);
    if (error.correlationId) {
      logInfo(`Correlation ID: ${error.correlationId}`);
    }
    return [];
  }
}

async function testUpdateServiceRequest() {
  logSection('Test: Update Service Request');
  
  let id = await question('Service Request ID (or press Enter to use last created): ');
  
  if (!id && testData.serviceRequests.length > 0) {
    id = testData.serviceRequests[testData.serviceRequests.length - 1].id;
    logInfo(`Using service request ID: ${id}`);
  }
  
  if (!id) {
    logWarning('No service request ID available. Create one first.');
    return null;
  }
  
  const status = await question('New Status (pending/in_progress/completed/cancelled): ');
  
  try {
    const serviceRequest = await client.updateServiceRequest(id, { status });
    
    logSuccess('Service request updated successfully');
    logJSON(serviceRequest);
    
    return serviceRequest;
  } catch (error) {
    logError(`Failed to update service request: ${error.message}`);
    if (error.correlationId) {
      logInfo(`Correlation ID: ${error.correlationId}`);
    }
    return null;
  }
}

// ============================================================================
// Maintenance Task Operations
// ============================================================================

async function testCreateMaintenanceTask() {
  logSection('Test: Create Maintenance Task');
  
  const roomId = await question('Room ID: ');
  const type = await question('Type (repair/inspection/cleaning/upgrade): ');
  const priority = await question('Priority (low/medium/high/urgent): ');
  const description = await question('Description: ');
  
  try {
    const maintenanceTask = await client.createMaintenanceTask({
      room_id: roomId,
      type,
      priority,
      description,
    });
    
    testData.maintenanceTasks.push(maintenanceTask);
    logSuccess('Maintenance task created successfully');
    logJSON(maintenanceTask);
    
    return maintenanceTask;
  } catch (error) {
    logError(`Failed to create maintenance task: ${error.message}`);
    if (error.correlationId) {
      logInfo(`Correlation ID: ${error.correlationId}`);
    }
    return null;
  }
}

async function testSearchMaintenanceTasks() {
  logSection('Test: Search Maintenance Tasks');
  
  const roomId = await question('Room ID (optional, press Enter to skip): ');
  const status = await question('Status (optional, press Enter to skip): ');
  const priority = await question('Priority (optional, press Enter to skip): ');
  
  const criteria = {};
  if (roomId) criteria.room_id = roomId;
  if (status) criteria.status = status;
  if (priority) criteria.priority = priority;
  
  try {
    const maintenanceTasks = await client.searchMaintenanceTasks(criteria);
    
    logSuccess(`Found ${maintenanceTasks.length} maintenance task(s)`);
    logJSON(maintenanceTasks);
    
    if (maintenanceTasks.length > 0) {
      testData.maintenanceTasks = maintenanceTasks;
    }
    
    return maintenanceTasks;
  } catch (error) {
    logError(`Failed to search maintenance tasks: ${error.message}`);
    if (error.correlationId) {
      logInfo(`Correlation ID: ${error.correlationId}`);
    }
    return [];
  }
}

async function testGetMaintenanceTask() {
  logSection('Test: Get Maintenance Task');
  
  let id = await question('Maintenance Task ID (or press Enter to use last created): ');
  
  if (!id && testData.maintenanceTasks.length > 0) {
    id = testData.maintenanceTasks[testData.maintenanceTasks.length - 1].id;
    logInfo(`Using maintenance task ID: ${id}`);
  }
  
  if (!id) {
    logWarning('No maintenance task ID available. Create one first.');
    return null;
  }
  
  try {
    const maintenanceTask = await client.getMaintenanceTask(id);
    
    logSuccess('Maintenance task retrieved successfully');
    logJSON(maintenanceTask);
    
    return maintenanceTask;
  } catch (error) {
    logError(`Failed to get maintenance task: ${error.message}`);
    if (error.correlationId) {
      logInfo(`Correlation ID: ${error.correlationId}`);
    }
    return null;
  }
}

async function testUpdateMaintenanceTask() {
  logSection('Test: Update Maintenance Task');
  
  let id = await question('Maintenance Task ID (or press Enter to use last created): ');
  
  if (!id && testData.maintenanceTasks.length > 0) {
    id = testData.maintenanceTasks[testData.maintenanceTasks.length - 1].id;
    logInfo(`Using maintenance task ID: ${id}`);
  }
  
  if (!id) {
    logWarning('No maintenance task ID available. Create one first.');
    return null;
  }
  
  const status = await question('New Status (pending/in_progress/completed/cancelled): ');
  
  try {
    const maintenanceTask = await client.updateMaintenanceTask(id, { status });
    
    logSuccess('Maintenance task updated successfully');
    logJSON(maintenanceTask);
    
    return maintenanceTask;
  } catch (error) {
    logError(`Failed to update maintenance task: ${error.message}`);
    if (error.correlationId) {
      logInfo(`Correlation ID: ${error.correlationId}`);
    }
    return null;
  }
}

// ============================================================================
// Charge Operations
// ============================================================================

async function testCreateCharge() {
  logSection('Test: Create Charge');
  
  const guestId = await question('Guest ID: ');
  const amount = await question('Amount (e.g., 99.99): ');
  const description = await question('Description: ');
  const category = await question('Category (room/food/service/other): ');
  
  try {
    const charge = await client.createCharge({
      guest_id: guestId,
      amount: parseFloat(amount),
      description,
      category,
      date: new Date().toISOString(),
      paid: false,
    });
    
    testData.charges.push(charge);
    logSuccess('Charge created successfully');
    logJSON(charge);
    
    return charge;
  } catch (error) {
    logError(`Failed to create charge: ${error.message}`);
    if (error.correlationId) {
      logInfo(`Correlation ID: ${error.correlationId}`);
    }
    return null;
  }
}

async function testSearchCharges() {
  logSection('Test: Search Charges');
  
  const guestId = await question('Guest ID (optional, press Enter to skip): ');
  const paid = await question('Paid status (true/false, press Enter to skip): ');
  
  const criteria = {};
  if (guestId) criteria.guest_id = guestId;
  if (paid) criteria.paid = paid === 'true';
  
  try {
    const charges = await client.searchCharges(criteria);
    
    logSuccess(`Found ${charges.length} charge(s)`);
    logJSON(charges);
    
    if (charges.length > 0) {
      testData.charges = charges;
    }
    
    return charges;
  } catch (error) {
    logError(`Failed to search charges: ${error.message}`);
    if (error.correlationId) {
      logInfo(`Correlation ID: ${error.correlationId}`);
    }
    return [];
  }
}

async function testGetCharge() {
  logSection('Test: Get Charge');
  
  let id = await question('Charge ID (or press Enter to use last created): ');
  
  if (!id && testData.charges.length > 0) {
    id = testData.charges[testData.charges.length - 1].id;
    logInfo(`Using charge ID: ${id}`);
  }
  
  if (!id) {
    logWarning('No charge ID available. Create one first.');
    return null;
  }
  
  try {
    const charge = await client.getCharge(id);
    
    logSuccess('Charge retrieved successfully');
    logJSON(charge);
    
    return charge;
  } catch (error) {
    logError(`Failed to get charge: ${error.message}`);
    if (error.correlationId) {
      logInfo(`Correlation ID: ${error.correlationId}`);
    }
    return null;
  }
}

async function testUpdateCharge() {
  logSection('Test: Update Charge');
  
  let id = await question('Charge ID (or press Enter to use last created): ');
  
  if (!id && testData.charges.length > 0) {
    id = testData.charges[testData.charges.length - 1].id;
    logInfo(`Using charge ID: ${id}`);
  }
  
  if (!id) {
    logWarning('No charge ID available. Create one first.');
    return null;
  }
  
  const paid = await question('Mark as paid? (true/false): ');
  
  try {
    const charge = await client.updateCharge(id, { paid: paid === 'true' });
    
    logSuccess('Charge updated successfully');
    logJSON(charge);
    
    return charge;
  } catch (error) {
    logError(`Failed to update charge: ${error.message}`);
    if (error.correlationId) {
      logInfo(`Correlation ID: ${error.correlationId}`);
    }
    return null;
  }
}

// ============================================================================
// Menu System
// ============================================================================

async function showMenu() {
  console.log();
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         Salesforce Endpoints Test Menu                    ║', 'bright');
  log('╠════════════════════════════════════════════════════════════╣', 'cyan');
  log('║  ROOM OPERATIONS                                           ║', 'yellow');
  log('║    1. Create Room                                          ║', 'reset');
  log('║    2. Search Rooms                                         ║', 'reset');
  log('║    3. Get Room                                             ║', 'reset');
  log('║    4. Update Room                                          ║', 'reset');
  log('║                                                            ║', 'reset');
  log('║  SERVICE REQUEST OPERATIONS                                ║', 'yellow');
  log('║    5. Create Service Request                               ║', 'reset');
  log('║    6. Search Service Requests                              ║', 'reset');
  log('║    7. Update Service Request                               ║', 'reset');
  log('║                                                            ║', 'reset');
  log('║  MAINTENANCE TASK OPERATIONS                               ║', 'yellow');
  log('║    8. Create Maintenance Task                              ║', 'reset');
  log('║    9. Search Maintenance Tasks                             ║', 'reset');
  log('║   10. Get Maintenance Task                                 ║', 'reset');
  log('║   11. Update Maintenance Task                              ║', 'reset');
  log('║                                                            ║', 'reset');
  log('║  CHARGE OPERATIONS                                         ║', 'yellow');
  log('║   12. Create Charge                                        ║', 'reset');
  log('║   13. Search Charges                                       ║', 'reset');
  log('║   14. Get Charge                                           ║', 'reset');
  log('║   15. Update Charge                                        ║', 'reset');
  log('║                                                            ║', 'reset');
  log('║  UTILITIES                                                 ║', 'yellow');
  log('║   16. Run Full Test Suite                                  ║', 'reset');
  log('║   17. Show Test Data Summary                               ║', 'reset');
  log('║   18. Clear Cache                                          ║', 'reset');
  log('║    0. Exit                                                 ║', 'reset');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  console.log();
}

async function showTestDataSummary() {
  logSection('Test Data Summary');
  
  console.log(`Rooms: ${testData.rooms.length}`);
  if (testData.rooms.length > 0) {
    testData.rooms.forEach((room, i) => {
      console.log(`  ${i + 1}. ${room.room_number} (${room.status}) - ID: ${room.id}`);
    });
  }
  
  console.log(`\nService Requests: ${testData.serviceRequests.length}`);
  if (testData.serviceRequests.length > 0) {
    testData.serviceRequests.forEach((sr, i) => {
      console.log(`  ${i + 1}. ${sr.type} (${sr.status}) - ID: ${sr.id}`);
    });
  }
  
  console.log(`\nMaintenance Tasks: ${testData.maintenanceTasks.length}`);
  if (testData.maintenanceTasks.length > 0) {
    testData.maintenanceTasks.forEach((mt, i) => {
      console.log(`  ${i + 1}. ${mt.type} (${mt.status}) - ID: ${mt.id}`);
    });
  }
  
  console.log(`\nCharges: ${testData.charges.length}`);
  if (testData.charges.length > 0) {
    testData.charges.forEach((charge, i) => {
      console.log(`  ${i + 1}. $${charge.amount} - ${charge.description} (${charge.paid ? 'Paid' : 'Unpaid'}) - ID: ${charge.id}`);
    });
  }
}

async function runFullTestSuite() {
  logSection('Running Full Test Suite');
  
  logInfo('This will create test data for all entity types...');
  const confirm = await question('Continue? (yes/no): ');
  
  if (confirm.toLowerCase() !== 'yes') {
    logWarning('Test suite cancelled');
    return;
  }
  
  // Test Rooms
  log('\n--- Testing Room Operations ---', 'magenta');
  await testCreateRoom();
  await testSearchRooms();
  await testGetRoom();
  await testUpdateRoom();
  
  // Test Service Requests
  log('\n--- Testing Service Request Operations ---', 'magenta');
  await testCreateServiceRequest();
  await testSearchServiceRequests();
  await testUpdateServiceRequest();
  
  // Test Maintenance Tasks
  log('\n--- Testing Maintenance Task Operations ---', 'magenta');
  await testCreateMaintenanceTask();
  await testSearchMaintenanceTasks();
  await testGetMaintenanceTask();
  await testUpdateMaintenanceTask();
  
  // Test Charges
  log('\n--- Testing Charge Operations ---', 'magenta');
  await testCreateCharge();
  await testSearchCharges();
  await testGetCharge();
  await testUpdateCharge();
  
  logSuccess('\nFull test suite completed!');
  await showTestDataSummary();
}

async function clearCache() {
  logSection('Clear Cache');
  
  try {
    client.clearCache();
    logSuccess('Cache cleared successfully');
  } catch (error) {
    logError(`Failed to clear cache: ${error.message}`);
  }
}

// ============================================================================
// Main Loop
// ============================================================================

async function main() {
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                                                            ║', 'cyan');
  log('║     Salesforce/Workato API Endpoint Testing Tool          ║', 'bright');
  log('║                                                            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  console.log();
  
  // Initialize client
  const initialized = await initializeClient();
  if (!initialized) {
    logError('Failed to initialize. Please check your configuration.');
    rl.close();
    process.exit(1);
  }
  
  // Main menu loop
  while (true) {
    await showMenu();
    const choice = await question('Select an option: ');
    
    switch (choice) {
      case '1':
        await testCreateRoom();
        break;
      case '2':
        await testSearchRooms();
        break;
      case '3':
        await testGetRoom();
        break;
      case '4':
        await testUpdateRoom();
        break;
      case '5':
        await testCreateServiceRequest();
        break;
      case '6':
        await testSearchServiceRequests();
        break;
      case '7':
        await testUpdateServiceRequest();
        break;
      case '8':
        await testCreateMaintenanceTask();
        break;
      case '9':
        await testSearchMaintenanceTasks();
        break;
      case '10':
        await testGetMaintenanceTask();
        break;
      case '11':
        await testUpdateMaintenanceTask();
        break;
      case '12':
        await testCreateCharge();
        break;
      case '13':
        await testSearchCharges();
        break;
      case '14':
        await testGetCharge();
        break;
      case '15':
        await testUpdateCharge();
        break;
      case '16':
        await runFullTestSuite();
        break;
      case '17':
        await showTestDataSummary();
        break;
      case '18':
        await clearCache();
        break;
      case '0':
        log('\nGoodbye!', 'green');
        rl.close();
        process.exit(0);
      default:
        logWarning('Invalid option. Please try again.');
    }
    
    await question('\nPress Enter to continue...');
  }
}

// Run the script
main().catch((error) => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  rl.close();
  process.exit(1);
});
