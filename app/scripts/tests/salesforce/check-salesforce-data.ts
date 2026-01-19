#!/usr/bin/env tsx
/**
 * Check Salesforce Data
 * Quick script to check what data exists in Salesforce
 */

import { getSalesforceClient } from '../src/lib/workato/config';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║          Checking Salesforce Data                         ║', 'bright');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  const client = getSalesforceClient();
  
  // Check rooms
  log('\n1. Checking Rooms...', 'yellow');
  try {
    const rooms = await client.searchRooms({ status: 'vacant,occupied,cleaning,maintenance' });
    log(`   Found ${rooms.length} rooms`, 'green');
    if (rooms.length > 0) {
      log(`   First room: ${rooms[0].room_number} (ID: ${rooms[0].id})`, 'cyan');
    }
  } catch (error: any) {
    log(`   Error: ${error.message}`, 'red');
  }
  
  // Check maintenance tasks
  log('\n2. Checking Maintenance Tasks...', 'yellow');
  try {
    const tasks = await client.searchMaintenanceTasks({ 
      status: 'pending,in_progress,assigned,completed' 
    });
    log(`   Found ${tasks.length} maintenance tasks`, 'green');
    if (tasks.length > 0) {
      log(`   First task: ${tasks[0].title} (Status: ${tasks[0].status})`, 'cyan');
    } else {
      log('   No maintenance tasks found. You may need to create some.', 'yellow');
    }
  } catch (error: any) {
    log(`   Error: ${error.message}`, 'red');
  }
  
  // Check service requests
  log('\n3. Checking Service Requests...', 'yellow');
  try {
    const requests = await client.searchServiceRequests({ 
      status: 'pending,in_progress,completed' 
    });
    log(`   Found ${requests.length} service requests`, 'green');
    if (requests.length > 0) {
      log(`   First request: ${requests[0].description} (Status: ${requests[0].status})`, 'cyan');
    }
  } catch (error: any) {
    log(`   Error: ${error.message}`, 'red');
  }
  
  log('\n✓ Data check complete', 'green');
}

main().catch(console.error);
