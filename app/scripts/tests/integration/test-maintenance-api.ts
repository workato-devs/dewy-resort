#!/usr/bin/env tsx
/**
 * Test Maintenance API
 * Tests the maintenance task endpoints to verify Salesforce integration
 */

import { getSalesforceClient } from '../src/lib/workato/config';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

async function testSearchMaintenanceTasks() {
  logSection('Test 1: Search Maintenance Tasks');
  
  try {
    const client = getSalesforceClient();
    
    log('Searching for all maintenance tasks...', 'yellow');
    const tasks = await client.searchMaintenanceTasks({
      status: 'pending,in_progress,assigned,completed'
    });
    
    log(`✓ Found ${tasks.length} maintenance tasks`, 'green');
    
    if (tasks.length > 0) {
      log('\nFirst task:', 'blue');
      console.log(JSON.stringify(tasks[0], null, 2));
    } else {
      log('No tasks found in Salesforce', 'yellow');
    }
    
    return true;
  } catch (error: any) {
    log(`✗ Error: ${error.message}`, 'red');
    if (error.statusCode) {
      log(`  Status Code: ${error.statusCode}`, 'red');
    }
    console.error(error);
    return false;
  }
}

async function testCreateMaintenanceTask() {
  logSection('Test 2: Create Maintenance Task');
  
  try {
    const client = getSalesforceClient();
    
    log('Creating a test maintenance task...', 'yellow');
    const task = await client.createMaintenanceTask({
      room_id: 'a01Qy000009yLNkIAM', // Use a valid room ID from your Salesforce
      title: 'Test Maintenance Task',
      description: 'This is a test maintenance task created via API',
      priority: 'medium',
      created_by: 'manager_test',
    });
    
    log(`✓ Created task: ${task.id}`, 'green');
    log('\nTask details:', 'blue');
    console.log(JSON.stringify(task, null, 2));
    
    return task.id;
  } catch (error: any) {
    log(`✗ Error: ${error.message}`, 'red');
    if (error.statusCode) {
      log(`  Status Code: ${error.statusCode}`, 'red');
    }
    console.error(error);
    return null;
  }
}

async function testUpdateMaintenanceTask(taskId: string) {
  logSection('Test 3: Update Maintenance Task');
  
  try {
    const client = getSalesforceClient();
    
    log(`Updating task ${taskId}...`, 'yellow');
    const task = await client.updateMaintenanceTask(taskId, {
      status: 'in_progress',
      priority: 'high',
    });
    
    log(`✓ Updated task successfully`, 'green');
    log('\nUpdated task details:', 'blue');
    console.log(JSON.stringify(task, null, 2));
    
    return true;
  } catch (error: any) {
    log(`✗ Error: ${error.message}`, 'red');
    if (error.statusCode) {
      log(`  Status Code: ${error.statusCode}`, 'red');
    }
    console.error(error);
    return false;
  }
}

async function testAPIEndpoint() {
  logSection('Test 4: API Endpoint');
  
  try {
    log('Testing GET /api/manager/maintenance...', 'yellow');
    const response = await fetch('http://localhost:3000/api/manager/maintenance');
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API returned ${response.status}: ${error.error || 'Unknown error'}`);
    }
    
    const data = await response.json();
    log(`✓ API returned ${data.tasks?.length || 0} tasks`, 'green');
    
    if (data.tasks && data.tasks.length > 0) {
      log('\nFirst task from API:', 'blue');
      console.log(JSON.stringify(data.tasks[0], null, 2));
    }
    
    return true;
  } catch (error: any) {
    log(`✗ Error: ${error.message}`, 'red');
    console.error(error);
    return false;
  }
}

async function main() {
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                                                            ║', 'cyan');
  log('║          Maintenance API Test Suite                       ║', 'bright');
  log('║                                                            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  // Test 1: Search for existing tasks
  const searchSuccess = await testSearchMaintenanceTasks();
  
  // Test 2: Create a new task
  let taskId: string | null = null;
  if (searchSuccess) {
    taskId = await testCreateMaintenanceTask();
  }
  
  // Test 3: Update the task
  if (taskId) {
    await testUpdateMaintenanceTask(taskId);
  }
  
  // Test 4: Test the API endpoint
  await testAPIEndpoint();
  
  logSection('Test Summary');
  log('All tests completed. Check the results above.', 'bright');
}

main().catch(console.error);
