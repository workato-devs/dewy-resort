#!/usr/bin/env node

/**
 * Verification script for MockDataStore
 * Tests basic functionality without requiring a test framework
 */

const { MockDataStore } = require('../lib/workato/mock-data-store.ts');

async function verifyMockDataStore() {
  console.log('🧪 Verifying MockDataStore implementation...\n');

  const store = new MockDataStore();
  let passed = 0;
  let failed = 0;

  // Test 1: Verify seeded rooms
  try {
    const rooms = await store.getRooms();
    if (rooms.length >= 5) {
      console.log('✅ Test 1: Seeded rooms (found', rooms.length, 'rooms)');
      passed++;
    } else {
      console.log('❌ Test 1: Expected at least 5 rooms, got', rooms.length);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 1: Error -', error.message);
    failed++;
  }

  // Test 2: Verify room filtering by status
  try {
    const vacantRooms = await store.getRooms({ status: 'vacant' });
    const allVacant = vacantRooms.every((r) => r.status === 'vacant');
    if (allVacant) {
      console.log('✅ Test 2: Room filtering by status');
      passed++;
    } else {
      console.log('❌ Test 2: Room filtering returned non-vacant rooms');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 2: Error -', error.message);
    failed++;
  }

  // Test 3: Verify room creation
  try {
    const newRoom = await store.createRoom({
      room_number: '999',
      floor: 9,
      type: 'suite',
      status: 'vacant',
    });
    if (newRoom.id && newRoom.room_number === '999') {
      console.log('✅ Test 3: Room creation');
      passed++;
    } else {
      console.log('❌ Test 3: Room creation failed');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 3: Error -', error.message);
    failed++;
  }

  // Test 4: Verify seeded service requests
  try {
    const requests = await store.getServiceRequests();
    if (requests.length >= 3) {
      console.log('✅ Test 4: Seeded service requests (found', requests.length, 'requests)');
      passed++;
    } else {
      console.log('❌ Test 4: Expected at least 3 service requests, got', requests.length);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 4: Error -', error.message);
    failed++;
  }

  // Test 5: Verify service request creation
  try {
    const newRequest = await store.createServiceRequest({
      guest_id: 'guest-test',
      room_number: '101',
      type: 'housekeeping',
      priority: 'medium',
      description: 'Test request',
    });
    if (newRequest.id && newRequest.status === 'pending') {
      console.log('✅ Test 5: Service request creation');
      passed++;
    } else {
      console.log('❌ Test 5: Service request creation failed');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 5: Error -', error.message);
    failed++;
  }

  // Test 6: Verify seeded maintenance tasks
  try {
    const tasks = await store.getMaintenanceTasks();
    if (tasks.length >= 2) {
      console.log('✅ Test 6: Seeded maintenance tasks (found', tasks.length, 'tasks)');
      passed++;
    } else {
      console.log('❌ Test 6: Expected at least 2 maintenance tasks, got', tasks.length);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 6: Error -', error.message);
    failed++;
  }

  // Test 7: Verify maintenance task creation
  try {
    const newTask = await store.createMaintenanceTask({
      room_id: 'room-1',
      title: 'Test task',
      description: 'Test description',
      priority: 'low',
      created_by: 'manager-1',
    });
    if (newTask.id && newTask.status === 'pending') {
      console.log('✅ Test 7: Maintenance task creation');
      passed++;
    } else {
      console.log('❌ Test 7: Maintenance task creation failed');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 7: Error -', error.message);
    failed++;
  }

  // Test 8: Verify seeded charges
  try {
    const charges = await store.getCharges();
    if (charges.length >= 4) {
      console.log('✅ Test 8: Seeded charges (found', charges.length, 'charges)');
      passed++;
    } else {
      console.log('❌ Test 8: Expected at least 4 charges, got', charges.length);
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 8: Error -', error.message);
    failed++;
  }

  // Test 9: Verify charge creation
  try {
    const newCharge = await store.createCharge({
      guest_id: 'guest-test',
      type: 'food',
      description: 'Test charge',
      amount: 50.0,
      date: new Date().toISOString(),
    });
    if (newCharge.id && newCharge.paid === false) {
      console.log('✅ Test 9: Charge creation');
      passed++;
    } else {
      console.log('❌ Test 9: Charge creation failed');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 9: Error -', error.message);
    failed++;
  }

  // Test 10: Verify simulated delay
  try {
    const start = Date.now();
    await store.getRooms();
    const duration = Date.now() - start;
    if (duration >= 100 && duration <= 600) {
      console.log('✅ Test 10: Simulated delay (', duration, 'ms)');
      passed++;
    } else {
      console.log('❌ Test 10: Delay out of expected range (', duration, 'ms)');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 10: Error -', error.message);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));

  if (failed === 0) {
    console.log('\n✅ All tests passed! MockDataStore is working correctly.\n');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Please review the implementation.\n');
    process.exit(1);
  }
}

verifyMockDataStore().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
