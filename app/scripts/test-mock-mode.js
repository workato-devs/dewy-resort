/**
 * Simple verification script for Workato mock mode
 * Run with: node scripts/test-mock-mode.js
 */

// Set mock mode environment variable
process.env.WORKATO_MOCK_MODE = 'true';
process.env.SALESFORCE_API_AUTH_TOKEN = 'test-token';
process.env.SALESFORCE_API_COLLECTION_URL = 'https://test.workato.com';
process.env.WORKATO_LOGGING_ENABLED = 'false';

async function testMockMode() {
  console.log('🧪 Testing Workato Mock Mode...\n');

  try {
    // Dynamic import to ensure environment variables are set first
    const { WorkatoClient } = await import('../lib/workato/client.js');

    const client = new WorkatoClient();
    let passed = 0;
    let failed = 0;

    // Test 1: Create Case
    console.log('Test 1: createCase()');
    try {
      const caseResponse = await client.createCase({
        type: 'Housekeeping',
        guestName: 'Test Guest',
        roomNumber: '101',
        priority: 'High',
        description: 'Test request',
      });

      if (caseResponse.success && caseResponse.data?.id?.includes('MOCK-CASE')) {
        console.log('✅ PASSED - Mock case created:', caseResponse.data.id);
        passed++;
      } else {
        console.log('❌ FAILED - Invalid response:', caseResponse);
        failed++;
      }
    } catch (error) {
      console.log('❌ FAILED - Error:', error.message);
      failed++;
    }

    // Test 2: Get Case
    console.log('\nTest 2: getCase()');
    try {
      const getResponse = await client.getCase('test-case-123');

      if (getResponse.success && getResponse.data?.id === 'test-case-123') {
        console.log('✅ PASSED - Mock case retrieved:', getResponse.data.id);
        passed++;
      } else {
        console.log('❌ FAILED - Invalid response:', getResponse);
        failed++;
      }
    } catch (error) {
      console.log('❌ FAILED - Error:', error.message);
      failed++;
    }

    // Test 3: Upsert Contact
    console.log('\nTest 3: upsertContact()');
    try {
      const contactResponse = await client.upsertContact({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-1234',
      });

      if (contactResponse.success && contactResponse.data?.id?.includes('MOCK-CONTACT')) {
        console.log('✅ PASSED - Mock contact created:', contactResponse.data.id);
        passed++;
      } else {
        console.log('❌ FAILED - Invalid response:', contactResponse);
        failed++;
      }
    } catch (error) {
      console.log('❌ FAILED - Error:', error.message);
      failed++;
    }

    // Test 4: Get Contact
    console.log('\nTest 4: getContact()');
    try {
      const getContactResponse = await client.getContact('test-contact-456');

      if (getContactResponse.success && getContactResponse.data?.id === 'test-contact-456') {
        console.log('✅ PASSED - Mock contact retrieved:', getContactResponse.data.id);
        passed++;
      } else {
        console.log('❌ FAILED - Invalid response:', getContactResponse);
        failed++;
      }
    } catch (error) {
      console.log('❌ FAILED - Error:', error.message);
      failed++;
    }

    // Test 5: Search Contacts
    console.log('\nTest 5: searchContacts()');
    try {
      const searchResponse = await client.searchContacts({
        query: 'test',
        limit: 10,
      });

      if (searchResponse.success && Array.isArray(searchResponse.data) && searchResponse.data.length > 0) {
        console.log('✅ PASSED - Mock contacts found:', searchResponse.data.length, 'results');
        passed++;
      } else {
        console.log('❌ FAILED - Invalid response:', searchResponse);
        failed++;
      }
    } catch (error) {
      console.log('❌ FAILED - Error:', error.message);
      failed++;
    }

    // Test 6: Verify no real API calls (test with empty credentials)
    console.log('\nTest 6: Verify no real API calls');
    try {
      process.env.SALESFORCE_API_AUTH_TOKEN = '';
      process.env.SALESFORCE_API_COLLECTION_URL = '';
      
      const { WorkatoClient: TestClient } = await import('../lib/workato/client.js?t=' + Date.now());
      const testClient = new TestClient();
      
      const response = await testClient.createCase({
        type: 'Test',
        guestName: 'Test',
        roomNumber: '100',
        priority: 'Low',
        description: 'Test',
      });

      if (response.success) {
        console.log('✅ PASSED - Mock mode works without credentials');
        passed++;
      } else {
        console.log('❌ FAILED - Should work in mock mode without credentials');
        failed++;
      }
    } catch (error) {
      console.log('❌ FAILED - Error:', error.message);
      failed++;
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50));

    if (failed === 0) {
      console.log('✅ All tests passed! Mock mode is working correctly.');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed. Please review the implementation.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

testMockMode();
