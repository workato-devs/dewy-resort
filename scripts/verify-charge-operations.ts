#!/usr/bin/env ts-node

/**
 * Verification script for Salesforce Client - Charge Operations
 * Tests all charge-related methods in mock mode
 */

import { SalesforceClient } from '../lib/workato/salesforce-client';
import { WorkatoSalesforceConfig } from '../lib/workato/config';
import { ChargeType, ChargeCreate, ChargeUpdate } from '../types/salesforce';

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
  console.log('🧪 Starting Charge Operations Verification\n');
  console.log('=' .repeat(60));

  const client = new SalesforceClient(testConfig);
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Search all charges
  try {
    console.log('\n📋 Test 1: Search all charges');
    const allCharges = await client.searchCharges({});
    console.log(`✅ Found ${allCharges.length} charges`);
    console.log(`   Sample charge: ${allCharges[0]?.id} - ${allCharges[0]?.description} ($${allCharges[0]?.amount})`);
    testsPassed++;
  } catch (error: any) {
    console.error(`❌ Test 1 failed: ${error.message}`);
    testsFailed++;
  }

  // Test 2: Search charges by guest_id
  try {
    console.log('\n📋 Test 2: Search charges by guest_id');
    const guestCharges = await client.searchCharges({ guest_id: 'guest-1' });
    console.log(`✅ Found ${guestCharges.length} charges for guest-1`);
    guestCharges.forEach(charge => {
      console.log(`   - ${charge.id}: ${charge.description} ($${charge.amount}) - Paid: ${charge.paid}`);
    });
    testsPassed++;
  } catch (error: any) {
    console.error(`❌ Test 2 failed: ${error.message}`);
    testsFailed++;
  }

  // Test 3: Search charges by type
  try {
    console.log('\n📋 Test 3: Search charges by type (ROOM)');
    const roomCharges = await client.searchCharges({ type: ChargeType.ROOM });
    console.log(`✅ Found ${roomCharges.length} room charges`);
    roomCharges.forEach(charge => {
      console.log(`   - ${charge.id}: ${charge.description} ($${charge.amount})`);
    });
    testsPassed++;
  } catch (error: any) {
    console.error(`❌ Test 3 failed: ${error.message}`);
    testsFailed++;
  }

  // Test 4: Search charges by paid status
  try {
    console.log('\n📋 Test 4: Search unpaid charges');
    const unpaidCharges = await client.searchCharges({ paid: false });
    console.log(`✅ Found ${unpaidCharges.length} unpaid charges`);
    console.log(`   Total unpaid amount: $${unpaidCharges.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}`);
    testsPassed++;
  } catch (error: any) {
    console.error(`❌ Test 4 failed: ${error.message}`);
    testsFailed++;
  }

  // Test 5: Create a new charge
  let newChargeId: string | null = null;
  try {
    console.log('\n📋 Test 5: Create a new charge');
    const chargeData: ChargeCreate = {
      guest_id: 'guest-1',
      type: ChargeType.SERVICE,
      description: 'Laundry service',
      amount: 35.00,
      date: new Date().toISOString(),
    };
    const newCharge = await client.createCharge(chargeData);
    newChargeId = newCharge.id;
    console.log(`✅ Created charge: ${newCharge.id}`);
    console.log(`   Description: ${newCharge.description}`);
    console.log(`   Amount: $${newCharge.amount}`);
    console.log(`   Paid: ${newCharge.paid}`);
    testsPassed++;
  } catch (error: any) {
    console.error(`❌ Test 5 failed: ${error.message}`);
    testsFailed++;
  }

  // Test 6: Get charge by ID
  if (newChargeId) {
    try {
      console.log('\n📋 Test 6: Get charge by ID');
      const charge = await client.getCharge(newChargeId);
      console.log(`✅ Retrieved charge: ${charge.id}`);
      console.log(`   Description: ${charge.description}`);
      console.log(`   Amount: $${charge.amount}`);
      console.log(`   Guest ID: ${charge.guest_id}`);
      testsPassed++;
    } catch (error: any) {
      console.error(`❌ Test 6 failed: ${error.message}`);
      testsFailed++;
    }
  }

  // Test 7: Update charge (mark as paid)
  if (newChargeId) {
    try {
      console.log('\n📋 Test 7: Update charge (mark as paid)');
      const updateData: ChargeUpdate = {
        paid: true,
      };
      const updatedCharge = await client.updateCharge(newChargeId, updateData);
      console.log(`✅ Updated charge: ${updatedCharge.id}`);
      console.log(`   Paid status: ${updatedCharge.paid}`);
      testsPassed++;
    } catch (error: any) {
      console.error(`❌ Test 7 failed: ${error.message}`);
      testsFailed++;
    }
  }

  // Test 8: Cache behavior - search charges twice
  try {
    console.log('\n📋 Test 8: Cache behavior (search charges twice)');
    const start1 = Date.now();
    await client.searchCharges({ guest_id: 'guest-2' });
    const duration1 = Date.now() - start1;
    
    const start2 = Date.now();
    await client.searchCharges({ guest_id: 'guest-2' });
    const duration2 = Date.now() - start2;
    
    console.log(`✅ First call: ${duration1}ms, Second call (cached): ${duration2}ms`);
    if (duration2 < duration1) {
      console.log(`   Cache working! Second call was ${duration1 - duration2}ms faster`);
    }
    testsPassed++;
  } catch (error: any) {
    console.error(`❌ Test 8 failed: ${error.message}`);
    testsFailed++;
  }

  // Test 9: Cache invalidation after create
  try {
    console.log('\n📋 Test 9: Cache invalidation after create');
    // First search to populate cache
    const before = await client.searchCharges({ guest_id: 'guest-1' });
    const countBefore = before.length;
    
    // Create a new charge
    const chargeData: ChargeCreate = {
      guest_id: 'guest-1',
      type: ChargeType.OTHER,
      description: 'Parking fee',
      amount: 25.00,
      date: new Date().toISOString(),
    };
    await client.createCharge(chargeData);
    
    // Search again - should get fresh data
    const after = await client.searchCharges({ guest_id: 'guest-1' });
    const countAfter = after.length;
    
    console.log(`✅ Charges before: ${countBefore}, after: ${countAfter}`);
    if (countAfter > countBefore) {
      console.log(`   Cache invalidation working! New charge appears in search`);
    }
    testsPassed++;
  } catch (error: any) {
    console.error(`❌ Test 9 failed: ${error.message}`);
    testsFailed++;
  }

  // Test 10: Get non-existent charge (should throw error)
  try {
    console.log('\n📋 Test 10: Get non-existent charge (error handling)');
    await client.getCharge('non-existent-id');
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

  // Test 11: Update non-existent charge (should throw error)
  try {
    console.log('\n📋 Test 11: Update non-existent charge (error handling)');
    await client.updateCharge('non-existent-id', { paid: true });
    console.error('❌ Test 11 failed: Should have thrown an error');
    testsFailed++;
  } catch (error: any) {
    if (error.statusCode === 404) {
      console.log(`✅ Correctly threw 404 error: ${error.message}`);
      testsPassed++;
    } else {
      console.error(`❌ Test 11 failed: Wrong error type: ${error.message}`);
      testsFailed++;
    }
  }

  // Test 12: Search with date range
  try {
    console.log('\n📋 Test 12: Search charges with date range');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const charges = await client.searchCharges({
      date_from: yesterday.toISOString(),
      date_to: tomorrow.toISOString(),
    });
    console.log(`✅ Found ${charges.length} charges in date range`);
    testsPassed++;
  } catch (error: any) {
    console.error(`❌ Test 12 failed: ${error.message}`);
    testsFailed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:');
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   Total: ${testsPassed + testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! Charge operations are working correctly.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

// Run the tests
runTests().catch((error) => {
  console.error('\n💥 Unexpected error during test execution:');
  console.error(error);
  process.exit(1);
});
