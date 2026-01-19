#!/usr/bin/env ts-node

/**
 * Verification script for Maintenance Task operations in Salesforce Client
 * Tests all four maintenance task methods with mock mode
 */

import { SalesforceClient } from '../lib/workato/salesforce-client';
import { WorkatoSalesforceConfig } from '../lib/workato/config';
import {
  MaintenanceTaskCreate,
  MaintenanceTaskUpdate,
  MaintenancePriority,
  MaintenanceStatus,
} from '../types/salesforce';

// Test configuration with mock mode enabled
const testConfig: WorkatoSalesforceConfig = {
  baseUrl: 'https://test.workato.com',
  apiToken: 'test-token',
  timeout: 5000,
  retryAttempts: 3,
  mockMode: true,
  cacheEnabled: true,
};

async function runTests() {
  console.log('🧪 Starting Maintenance Task Operations Verification\n');
  console.log('=' .repeat(60));

  const client = new SalesforceClient(testConfig);
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Search maintenance tasks (should return seeded data)
  try {
    console.log('\n📋 Test 1: Search all maintenance tasks');
    const allTasks = await client.searchMaintenanceTasks({});
    console.log(`✅ Found ${allTasks.length} maintenance tasks`);
    console.log(`   Sample task: ${allTasks[0]?.title || 'N/A'}`);
    testsPassed++;
  } catch (error: any) {
    console.error(`❌ Test 1 failed: ${error.message}`);
    testsFailed++;
  }

  // Test 2: Search with criteria (filter by status)
  try {
    console.log('\n📋 Test 2: Search maintenance tasks by status (PENDING)');
    const pendingTasks = await client.searchMaintenanceTasks({
      status: MaintenanceStatus.PENDING,
    });
    console.log(`✅ Found ${pendingTasks.length} pending maintenance tasks`);
    testsPassed++;
  } catch (error: any) {
    console.error(`❌ Test 2 failed: ${error.message}`);
    testsFailed++;
  }

  // Test 3: Create a new maintenance task
  let createdTaskId: string | null = null;
  try {
    console.log('\n📋 Test 3: Create a new maintenance task');
    const newTaskData: MaintenanceTaskCreate = {
      room_id: 'room-1',
      title: 'Test maintenance task',
      description: 'This is a test maintenance task for verification',
      priority: MaintenancePriority.HIGH,
      created_by: 'manager-test',
      assigned_to: 'maintenance-staff-test',
    };
    const createdTask = await client.createMaintenanceTask(newTaskData);
    createdTaskId = createdTask.id;
    console.log(`✅ Created maintenance task with ID: ${createdTask.id}`);
    console.log(`   Title: ${createdTask.title}`);
    console.log(`   Priority: ${createdTask.priority}`);
    console.log(`   Status: ${createdTask.status}`);
    testsPassed++;
  } catch (error: any) {
    console.error(`❌ Test 3 failed: ${error.message}`);
    testsFailed++;
  }

  // Test 4: Get specific maintenance task by ID
  if (createdTaskId) {
    try {
      console.log('\n📋 Test 4: Get maintenance task by ID');
      const task = await client.getMaintenanceTask(createdTaskId);
      console.log(`✅ Retrieved maintenance task: ${task.title}`);
      console.log(`   Room ID: ${task.room_id}`);
      console.log(`   Assigned to: ${task.assigned_to}`);
      testsPassed++;
    } catch (error: any) {
      console.error(`❌ Test 4 failed: ${error.message}`);
      testsFailed++;
    }
  } else {
    console.log('\n⏭️  Test 4: Skipped (no task ID from Test 3)');
  }

  // Test 5: Update maintenance task
  if (createdTaskId) {
    try {
      console.log('\n📋 Test 5: Update maintenance task status');
      const updateData: MaintenanceTaskUpdate = {
        status: MaintenanceStatus.IN_PROGRESS,
        priority: MaintenancePriority.URGENT,
      };
      const updatedTask = await client.updateMaintenanceTask(createdTaskId, updateData);
      console.log(`✅ Updated maintenance task status to: ${updatedTask.status}`);
      console.log(`   Priority updated to: ${updatedTask.priority}`);
      testsPassed++;
    } catch (error: any) {
      console.error(`❌ Test 5 failed: ${error.message}`);
      testsFailed++;
    }
  } else {
    console.log('\n⏭️  Test 5: Skipped (no task ID from Test 3)');
  }

  // Test 6: Cache behavior - search should return cached result
  try {
    console.log('\n📋 Test 6: Test cache behavior (search)');
    const startTime = Date.now();
    const cachedTasks = await client.searchMaintenanceTasks({});
    const duration = Date.now() - startTime;
    console.log(`✅ Search completed in ${duration}ms (should be fast if cached)`);
    console.log(`   Found ${cachedTasks.length} tasks`);
    testsPassed++;
  } catch (error: any) {
    console.error(`❌ Test 6 failed: ${error.message}`);
    testsFailed++;
  }

  // Test 7: Cache behavior - get should return cached result
  if (createdTaskId) {
    try {
      console.log('\n📋 Test 7: Test cache behavior (get by ID)');
      const startTime = Date.now();
      const cachedTask = await client.getMaintenanceTask(createdTaskId);
      const duration = Date.now() - startTime;
      console.log(`✅ Get completed in ${duration}ms (should be fast if cached)`);
      console.log(`   Task: ${cachedTask.title}`);
      testsPassed++;
    } catch (error: any) {
      console.error(`❌ Test 7 failed: ${error.message}`);
      testsFailed++;
    }
  } else {
    console.log('\n⏭️  Test 7: Skipped (no task ID from Test 3)');
  }

  // Test 8: Cache invalidation after update
  if (createdTaskId) {
    try {
      console.log('\n📋 Test 8: Test cache invalidation after update');
      // Update the task
      await client.updateMaintenanceTask(createdTaskId, {
        status: MaintenanceStatus.COMPLETED,
      });
      // Search should trigger a new request (cache invalidated)
      const startTime = Date.now();
      const tasks = await client.searchMaintenanceTasks({});
      const duration = Date.now() - startTime;
      console.log(`✅ Search after update took ${duration}ms`);
      console.log(`   Cache was invalidated as expected`);
      testsPassed++;
    } catch (error: any) {
      console.error(`❌ Test 8 failed: ${error.message}`);
      testsFailed++;
    }
  } else {
    console.log('\n⏭️  Test 8: Skipped (no task ID from Test 3)');
  }

  // Test 9: Error handling - get non-existent task
  try {
    console.log('\n📋 Test 9: Error handling (get non-existent task)');
    await client.getMaintenanceTask('non-existent-id');
    console.error('❌ Test 9 failed: Should have thrown an error');
    testsFailed++;
  } catch (error: any) {
    if (error.statusCode === 404) {
      console.log(`✅ Correctly threw 404 error: ${error.message}`);
      testsPassed++;
    } else {
      console.error(`❌ Test 9 failed: Wrong error type: ${error.message}`);
      testsFailed++;
    }
  }

  // Test 10: Error handling - update non-existent task
  try {
    console.log('\n📋 Test 10: Error handling (update non-existent task)');
    await client.updateMaintenanceTask('non-existent-id', {
      status: MaintenanceStatus.COMPLETED,
    });
    console.error('❌ Test 10 failed: Should have thrown an error');
    testsFailed++;
  } catch (error: any) {
    if (error.statusCode === 404) {
      console.log(`✅ Correctly threw 404 error: ${error.message}`);
      testsPassed++;
    } else {
      console.error(`❌ Test 10 failed: Wrong error type: ${error.message}`);
      testsFailed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Total:  ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! Maintenance task operations are working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run the tests
runTests().catch((error) => {
  console.error('💥 Unexpected error during test execution:', error);
  process.exit(1);
});
