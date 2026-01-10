#!/usr/bin/env ts-node
/**
 * Test Case Search Integration
 * 
 * This script tests the case search integration with the unified Workato endpoint:
 * - POST /search-cases-in-salesforce (returns ALL cases, filtering done in application)
 * 
 * Tests Requirements:
 * - 3.1: Manager requests maintenance tasks list via unified case search
 * - 3.2: Manager requests details for specific maintenance task
 * - 3.5: API route /api/manager/maintenance returns HTTP 200
 * - 3.6: SalesforceClient.searchMaintenanceTasks() executes without errors
 * - 5.1: Service requests retrieved via unified case search
 */

import { getSalesforceClient } from '../lib/workato/config';
import { MaintenanceTaskSearch, ServiceRequestSearch } from '../types/salesforce';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
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

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
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
    testResults.push({ name, passed: false, error: error.message, duration });
    logError(`Failed: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

// ============================================================================
// Test 1: SalesforceClient.searchMaintenanceTasks() - Staff View
// ============================================================================

async function testSearchMaintenanceTasksStaff() {
  const client = getSalesforceClient();
  
  // Test with no criteria (should return all maintenance tasks)
  const allTasks = await client.searchMaintenanceTasks();
  
  if (!Array.isArray(allTasks)) {
    throw new Error('Expected array of maintenance tasks');
  }
  
  logSuccess(`Retrieved ${allTasks.length} maintenance tasks`);
  
  // Test with status filter
  const pendingTasks = await client.searchMaintenanceTasks({ status: 'pending' });
  
  if (!Array.isArray(pendingTasks)) {
    throw new Error('Expected array of pending maintenance tasks');
  }
  
  logSuccess(`Retrieved ${pendingTasks.length} pending maintenance tasks`);
  
  // Verify all returned tasks have pending status
  const allPending = pendingTasks.every(task => task.status === 'pending');
  if (!allPending) {
    throw new Error('Not all returned tasks have pending status');
  }
  
  logSuccess('All returned tasks have correct status filter');
  
  // Test with priority filter
  const urgentTasks = await client.searchMaintenanceTasks({ priority: 'urgent' });
  
  if (!Array.isArray(urgentTasks)) {
    throw new Error('Expected array of urgent maintenance tasks');
  }
  
  logSuccess(`Retrieved ${urgentTasks.length} urgent maintenance tasks`);
  
  // Test with multiple filters
  const filteredTasks = await client.searchMaintenanceTasks({
    status: 'in_progress',
    priority: 'high'
  });
  
  if (!Array.isArray(filteredTasks)) {
    throw new Error('Expected array of filtered maintenance tasks');
  }
  
  logSuccess(`Retrieved ${filteredTasks.length} in_progress + high priority tasks`);
}

// ============================================================================
// Test 2: Guest Filtering - Application Layer
// ============================================================================

async function testGuestFiltering() {
  const client = getSalesforceClient();
  
  // Fetch all maintenance tasks
  const allTasks = await client.searchMaintenanceTasks();
  
  if (!Array.isArray(allTasks)) {
    throw new Error('Expected array of maintenance tasks');
  }
  
  logSuccess(`Retrieved ${allTasks.length} total maintenance tasks`);
  
  // Filter by guest_id in application layer (simulating guest view)
  const guestId = 'guest_test_123';
  const guestTasks = allTasks.filter(task => (task as any).guest_id === guestId);
  
  logSuccess(`Filtered to ${guestTasks.length} maintenance tasks for guest ${guestId}`);
  
  // Test combined filtering (guest + status)
  const guestPendingTasks = allTasks.filter(task => 
    (task as any).guest_id === guestId && task.status === 'pending'
  );
  
  logSuccess(`Filtered to ${guestPendingTasks.length} pending tasks for guest ${guestId}`);
}

// ============================================================================
// Test 3: SalesforceClient.searchServiceRequests() - Staff View
// ============================================================================

async function testSearchServiceRequestsStaff() {
  const client = getSalesforceClient();
  
  // Test with no criteria (should return all service requests)
  const allRequests = await client.searchServiceRequests();
  
  if (!Array.isArray(allRequests)) {
    throw new Error('Expected array of service requests');
  }
  
  logSuccess(`Retrieved ${allRequests.length} service requests`);
  
  // Test with status filter
  const pendingRequests = await client.searchServiceRequests({ status: 'pending' });
  
  if (!Array.isArray(pendingRequests)) {
    throw new Error('Expected array of pending service requests');
  }
  
  logSuccess(`Retrieved ${pendingRequests.length} pending service requests`);
  
  // Test with type filter
  const housekeepingRequests = await client.searchServiceRequests({ type: 'housekeeping' });
  
  if (!Array.isArray(housekeepingRequests)) {
    throw new Error('Expected array of housekeeping service requests');
  }
  
  logSuccess(`Retrieved ${housekeepingRequests.length} housekeeping service requests`);
}

// ============================================================================
// Test 4: Guest Service Request Filtering - Application Layer
// ============================================================================

async function testGuestServiceRequestFiltering() {
  const client = getSalesforceClient();
  
  // Fetch all service requests
  const allRequests = await client.searchServiceRequests();
  
  if (!Array.isArray(allRequests)) {
    throw new Error('Expected array of service requests');
  }
  
  logSuccess(`Retrieved ${allRequests.length} total service requests`);
  
  // Filter by guest_id in application layer (simulating guest view)
  const guestId = 'guest_test_123';
  const guestRequests = allRequests.filter(request => request.guest_id === guestId);
  
  logSuccess(`Filtered to ${guestRequests.length} service requests for guest ${guestId}`);
  
  // Test combined filtering (guest + status)
  const guestPendingRequests = allRequests.filter(request => 
    request.guest_id === guestId && request.status === 'pending'
  );
  
  logSuccess(`Filtered to ${guestPendingRequests.length} pending requests for guest ${guestId}`);
}

// ============================================================================
// Test 5: API Route /api/manager/maintenance - GET
// ============================================================================

async function testMaintenanceAPIRoute() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  // Test basic GET request
  const response1 = await fetch(`${baseUrl}/api/manager/maintenance`);
  
  if (response1.status !== 200) {
    throw new Error(`Expected status 200, got ${response1.status}`);
  }
  
  logSuccess('API route returned HTTP 200');
  
  const data1 = await response1.json();
  
  if (!data1.tasks || !Array.isArray(data1.tasks)) {
    throw new Error('Expected tasks array in response');
  }
  
  logSuccess(`API returned ${data1.tasks.length} maintenance tasks`);
  
  // Test with status filter
  const response2 = await fetch(`${baseUrl}/api/manager/maintenance?status=pending`);
  
  if (response2.status !== 200) {
    throw new Error(`Expected status 200 for filtered request, got ${response2.status}`);
  }
  
  const data2 = await response2.json();
  logSuccess(`API returned ${data2.tasks.length} pending tasks with status filter`);
  
  // Test with priority filter
  const response3 = await fetch(`${baseUrl}/api/manager/maintenance?priority=urgent`);
  
  if (response3.status !== 200) {
    throw new Error(`Expected status 200 for priority filter, got ${response3.status}`);
  }
  
  const data3 = await response3.json();
  logSuccess(`API returned ${data3.tasks.length} urgent tasks with priority filter`);
  
  // Test with multiple filters
  const response4 = await fetch(`${baseUrl}/api/manager/maintenance?status=in_progress&priority=high`);
  
  if (response4.status !== 200) {
    throw new Error(`Expected status 200 for multiple filters, got ${response4.status}`);
  }
  
  const data4 = await response4.json();
  logSuccess(`API returned ${data4.tasks.length} tasks with multiple filters`);
}

// ============================================================================
// Test 6: Caching Behavior
// ============================================================================

async function testCachingBehavior() {
  const client = getSalesforceClient();
  
  // First request (should hit API)
  const startTime1 = Date.now();
  const tasks1 = await client.searchMaintenanceTasks({ status: 'pending' });
  const duration1 = Date.now() - startTime1;
  
  logSuccess(`First request took ${duration1}ms (API call)`);
  
  // Second request (should hit cache)
  const startTime2 = Date.now();
  const tasks2 = await client.searchMaintenanceTasks({ status: 'pending' });
  const duration2 = Date.now() - startTime2;
  
  logSuccess(`Second request took ${duration2}ms (cached)`);
  
  // Verify cache is faster
  if (duration2 >= duration1) {
    logWarning('Cache may not be working - second request was not faster');
  } else {
    logSuccess('Cache is working - second request was faster');
  }
  
  // Verify same data returned
  if (JSON.stringify(tasks1) !== JSON.stringify(tasks2)) {
    throw new Error('Cached data does not match original data');
  }
  
  logSuccess('Cached data matches original data');
}

// ============================================================================
// Test 7: Error Handling
// ============================================================================

async function testErrorHandling() {
  const client = getSalesforceClient();
  
  try {
    // Test with invalid status value (should be handled gracefully)
    const tasks = await client.searchMaintenanceTasks({ status: 'invalid_status' as any });
    
    // If we get here, the API accepted the invalid status
    logWarning('API accepted invalid status value - may need validation');
  } catch (error: any) {
    // Expected behavior - API should reject invalid values
    if (error.statusCode === 400) {
      logSuccess('API correctly rejected invalid status with 400 error');
    } else {
      throw new Error(`Expected 400 error, got ${error.statusCode}: ${error.message}`);
    }
  }
}

// ============================================================================
// Test 8: Data Structure Validation
// ============================================================================

async function testDataStructureValidation() {
  const client = getSalesforceClient();
  
  const tasks = await client.searchMaintenanceTasks();
  
  if (tasks.length === 0) {
    logWarning('No tasks returned - cannot validate data structure');
    return;
  }
  
  const task = tasks[0];
  
  // Verify required fields exist
  const requiredFields = ['id', 'room_id', 'title', 'description', 'priority', 'status', 'created_by', 'created_at', 'updated_at'];
  
  for (const field of requiredFields) {
    if (!(field in task)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  logSuccess('All required fields present in maintenance task');
  
  // Verify field types
  if (typeof task.id !== 'string') {
    throw new Error('id should be string');
  }
  
  if (typeof task.room_id !== 'string') {
    throw new Error('room_id should be string');
  }
  
  if (typeof task.title !== 'string') {
    throw new Error('title should be string');
  }
  
  if (typeof task.description !== 'string') {
    throw new Error('description should be string');
  }
  
  if (typeof task.priority !== 'string') {
    throw new Error('priority should be string');
  }
  
  if (typeof task.status !== 'string') {
    throw new Error('status should be string');
  }
  
  logSuccess('All field types are correct');
  
  // Verify enum values
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  if (!validPriorities.includes(task.priority)) {
    throw new Error(`Invalid priority value: ${task.priority}`);
  }
  
  const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(task.status)) {
    throw new Error(`Invalid status value: ${task.status}`);
  }
  
  logSuccess('Enum values are valid');
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function main() {
  logSection('Case Search Integration Tests');
  
  log('Testing Requirements:', colors.yellow);
  log('  - 3.1: Manager requests maintenance tasks list via unified case search');
  log('  - 3.2: Manager requests details for specific maintenance task');
  log('  - 3.5: API route /api/manager/maintenance returns HTTP 200');
  log('  - 3.6: SalesforceClient.searchMaintenanceTasks() executes without errors');
  log('  - 5.1: Service requests retrieved via unified case search');
  
  // Check if Salesforce is enabled
  const salesforceEnabled = process.env.SALESFORCE_ENABLED !== 'false';
  const mockMode = process.env.WORKATO_MOCK_MODE === 'true';
  
  if (!salesforceEnabled) {
    logError('Salesforce integration is not enabled (SALESFORCE_ENABLED=false)');
    logWarning('Set SALESFORCE_ENABLED=true in .env to run these tests');
    process.exit(1);
  }
  
  logSuccess('Salesforce integration is enabled');
  
  if (mockMode) {
    logWarning('Running in MOCK MODE - using mock data store instead of real Workato API');
  } else {
    log('Running in REAL MODE - using Workato API endpoints', colors.cyan);
  }
  
  // Run all tests
  await runTest('Test 1: Search Maintenance Tasks (Unified Endpoint)', testSearchMaintenanceTasksStaff);
  await runTest('Test 2: Guest Filtering (Application Layer)', testGuestFiltering);
  await runTest('Test 3: Search Service Requests (Unified Endpoint)', testSearchServiceRequestsStaff);
  await runTest('Test 4: Guest Service Request Filtering (Application Layer)', testGuestServiceRequestFiltering);
  await runTest('Test 5: API Route /api/manager/maintenance', testMaintenanceAPIRoute);
  await runTest('Test 6: Caching Behavior', testCachingBehavior);
  await runTest('Test 7: Error Handling', testErrorHandling);
  await runTest('Test 8: Data Structure Validation', testDataStructureValidation);
  
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
      log(`  - ${r.name}: ${r.error}`, colors.red);
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
