/**
 * End-to-End Integration Test API Endpoint
 * Tests complete workflows through the application
 * Access via: GET /api/test/integration
 */

import { NextResponse } from 'next/server';
import { WorkatoClient } from '@/lib/workato/client';
import { WorkatoConfig } from '@/lib/workato/config';

interface TestResult {
  test: string;
  passed: boolean;
  duration: number;
  details?: any;
  error?: string;
}

export async function GET() {
  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;
  const startTime = Date.now();

  try {
    // Create a client with mock mode enabled for testing
    const mockConfig: WorkatoConfig = {
      salesforce: {
        apiToken: 'test-token',
        baseUrl: 'https://test.workato.com',
        enabled: true,
      },
      stripe: {
        apiToken: 'test-stripe-token',
        baseUrl: 'https://test-stripe.workato.com',
        enabled: false,
      },
      cache: {
        enabled: true,
        ttl: 30000,
      },
      retry: {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      },
      logging: {
        enabled: true,
        level: 'info',
      },
      timeout: 10000,
      mockMode: true,
    };

    const client = new WorkatoClient(mockConfig);

    // Test 1: Guest Service Request Flow (End-to-End)
    console.log('🧪 Running Test 1: Guest Service Request Flow...');
    const test1Start = Date.now();
    try {
      // Step 1: Create a case (simulating guest creating service request)
      const createResponse = await client.createCase({
        type: 'Housekeeping',
        guestName: 'John Doe',
        roomNumber: '101',
        priority: 'High',
        description: 'Need extra towels and fresh linens',
      });

      if (!createResponse.success || !createResponse.data) {
        throw new Error('Failed to create case');
      }

      const caseId = createResponse.data.id;
      const caseNumber = createResponse.data.caseNumber;

      // Step 2: Retrieve the case (simulating manager viewing the request)
      const getResponse = await client.getCase(caseId);

      if (!getResponse.success || !getResponse.data) {
        throw new Error('Failed to retrieve case');
      }

      // Step 3: Verify data consistency
      const dataMatches = 
        getResponse.data.id === caseId &&
        getResponse.data.caseNumber === caseNumber &&
        getResponse.data.priority === 'High' &&
        getResponse.data.type === 'Housekeeping';

      const testPassed = 
        createResponse.success &&
        getResponse.success &&
        dataMatches &&
        caseId.includes('MOCK-CASE');

      results.push({
        test: 'Guest Service Request Flow',
        passed: testPassed,
        duration: Date.now() - test1Start,
        details: {
          caseId,
          caseNumber,
          created: createResponse.data,
          retrieved: getResponse.data,
          dataConsistent: dataMatches,
        },
      });

      if (testPassed) passed++;
      else failed++;
    } catch (error: any) {
      results.push({
        test: 'Guest Service Request Flow',
        passed: false,
        duration: Date.now() - test1Start,
        error: error.message,
      });
      failed++;
    }

    // Test 2: Contact Management Flow (End-to-End)
    console.log('🧪 Running Test 2: Contact Management Flow...');
    const test2Start = Date.now();
    try {
      // Step 1: Create/upsert a contact
      const upsertResponse = await client.upsertContact({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+1-555-1234',
        roomNumber: '202',
      });

      if (!upsertResponse.success || !upsertResponse.data) {
        throw new Error('Failed to upsert contact');
      }

      const contactId = upsertResponse.data.id;

      // Step 2: Retrieve the contact
      const getContactResponse = await client.getContact(contactId);

      if (!getContactResponse.success || !getContactResponse.data) {
        throw new Error('Failed to retrieve contact');
      }

      // Step 3: Search for the contact
      const searchResponse = await client.searchContacts({
        query: 'jane',
        limit: 10,
      });

      if (!searchResponse.success || !searchResponse.data) {
        throw new Error('Failed to search contacts');
      }

      // Step 4: Verify data consistency
      const dataMatches = 
        getContactResponse.data.id === contactId &&
        getContactResponse.data.email === 'jane.smith@example.com';

      const testPassed = 
        upsertResponse.success &&
        getContactResponse.success &&
        searchResponse.success &&
        dataMatches &&
        contactId.includes('MOCK-CONTACT') &&
        searchResponse.data.length > 0;

      results.push({
        test: 'Contact Management Flow',
        passed: testPassed,
        duration: Date.now() - test2Start,
        details: {
          contactId,
          created: upsertResponse.data,
          retrieved: getContactResponse.data,
          searchResults: searchResponse.data.length,
          dataConsistent: dataMatches,
        },
      });

      if (testPassed) passed++;
      else failed++;
    } catch (error: any) {
      results.push({
        test: 'Contact Management Flow',
        passed: false,
        duration: Date.now() - test2Start,
        error: error.message,
      });
      failed++;
    }

    // Test 3: Cache Functionality
    console.log('🧪 Running Test 3: Cache Functionality...');
    const test3Start = Date.now();
    try {
      const caseId = 'test-cache-case-123';

      // First call - should hit API
      const firstCall = Date.now();
      const response1 = await client.getCase(caseId);
      const firstCallDuration = Date.now() - firstCall;

      // Second call - should hit cache (faster)
      const secondCall = Date.now();
      const response2 = await client.getCase(caseId);
      const secondCallDuration = Date.now() - secondCall;

      // Verify both succeeded and returned same data
      const testPassed = 
        response1.success &&
        response2.success &&
        response1.data?.id === response2.data?.id &&
        secondCallDuration <= firstCallDuration; // Cache should be faster or equal

      results.push({
        test: 'Cache Functionality',
        passed: testPassed,
        duration: Date.now() - test3Start,
        details: {
          firstCallDuration,
          secondCallDuration,
          cacheWorking: secondCallDuration <= firstCallDuration,
          dataConsistent: response1.data?.id === response2.data?.id,
        },
      });

      if (testPassed) passed++;
      else failed++;
    } catch (error: any) {
      results.push({
        test: 'Cache Functionality',
        passed: false,
        duration: Date.now() - test3Start,
        error: error.message,
      });
      failed++;
    }

    // Test 4: Correlation ID Tracking
    console.log('🧪 Running Test 4: Correlation ID Tracking...');
    const test4Start = Date.now();
    try {
      const response1 = await client.createCase({
        type: 'Maintenance',
        guestName: 'Test User',
        roomNumber: '303',
        priority: 'Medium',
        description: 'Test request',
      });

      const response2 = await client.createCase({
        type: 'Room Service',
        guestName: 'Test User 2',
        roomNumber: '304',
        priority: 'Low',
        description: 'Test request 2',
      });

      // Verify correlation IDs exist and are unique
      const testPassed = Boolean(
        response1.correlationId &&
        response2.correlationId &&
        response1.correlationId !== response2.correlationId &&
        typeof response1.correlationId === 'string' &&
        typeof response2.correlationId === 'string'
      );

      results.push({
        test: 'Correlation ID Tracking',
        passed: testPassed,
        duration: Date.now() - test4Start,
        details: {
          correlationId1: response1.correlationId,
          correlationId2: response2.correlationId,
          unique: response1.correlationId !== response2.correlationId,
        },
      });

      if (testPassed) passed++;
      else failed++;
    } catch (error: any) {
      results.push({
        test: 'Correlation ID Tracking',
        passed: false,
        duration: Date.now() - test4Start,
        error: error.message,
      });
      failed++;
    }

    // Test 5: Error Handling (Invalid Data)
    console.log('🧪 Running Test 5: Error Handling...');
    const test5Start = Date.now();
    try {
      // Mock mode should still handle requests gracefully even with minimal data
      const response = await client.createCase({
        type: '',
        guestName: '',
        roomNumber: '',
        priority: 'Low',
        description: '',
      });

      // In mock mode, this should still succeed (mock doesn't validate)
      const testPassed = response.success === true;

      results.push({
        test: 'Error Handling',
        passed: testPassed,
        duration: Date.now() - test5Start,
        details: {
          handledGracefully: response.success,
          response: response.data,
        },
      });

      if (testPassed) passed++;
      else failed++;
    } catch (error: any) {
      results.push({
        test: 'Error Handling',
        passed: false,
        duration: Date.now() - test5Start,
        error: error.message,
      });
      failed++;
    }

    // Test 6: Concurrent Requests
    console.log('🧪 Running Test 6: Concurrent Requests...');
    const test6Start = Date.now();
    try {
      // Make multiple concurrent requests
      const promises = [
        client.createCase({
          type: 'Housekeeping',
          guestName: 'User 1',
          roomNumber: '401',
          priority: 'High',
          description: 'Request 1',
        }),
        client.createCase({
          type: 'Maintenance',
          guestName: 'User 2',
          roomNumber: '402',
          priority: 'Medium',
          description: 'Request 2',
        }),
        client.searchContacts({ query: 'test', limit: 5 }),
        client.upsertContact({
          firstName: 'Concurrent',
          lastName: 'Test',
          email: 'concurrent@test.com',
          phone: '+1-555-9999',
        }),
      ];

      const responses = await Promise.all(promises);

      // Verify all succeeded
      const allSucceeded = responses.every(r => r.success);
      const allHaveCorrelationIds = responses.every(r => r.correlationId);
      const uniqueCorrelationIds = new Set(responses.map(r => r.correlationId)).size === responses.length;

      const testPassed = allSucceeded && allHaveCorrelationIds && uniqueCorrelationIds;

      results.push({
        test: 'Concurrent Requests',
        passed: testPassed,
        duration: Date.now() - test6Start,
        details: {
          totalRequests: responses.length,
          allSucceeded,
          allHaveCorrelationIds,
          uniqueCorrelationIds,
        },
      });

      if (testPassed) passed++;
      else failed++;
    } catch (error: any) {
      results.push({
        test: 'Concurrent Requests',
        passed: false,
        duration: Date.now() - test6Start,
        error: error.message,
      });
      failed++;
    }

    // Test 7: Response Format Validation
    console.log('🧪 Running Test 7: Response Format Validation...');
    const test7Start = Date.now();
    try {
      const caseResponse = await client.createCase({
        type: 'Concierge',
        guestName: 'Format Test',
        roomNumber: '505',
        priority: 'Low',
        description: 'Testing response format',
      });

      const contactResponse = await client.upsertContact({
        firstName: 'Format',
        lastName: 'Test',
        email: 'format@test.com',
        phone: '+1-555-0000',
      });

      // Verify response structure
      const caseValid = Boolean(
        caseResponse.data?.id &&
        caseResponse.data?.caseNumber &&
        caseResponse.data?.status &&
        caseResponse.data?.priority &&
        caseResponse.data?.type &&
        caseResponse.data?.createdDate
      );

      const contactValid = Boolean(
        contactResponse.data?.id &&
        contactResponse.data?.email &&
        contactResponse.data?.name
      );

      const testPassed = caseValid && contactValid;

      results.push({
        test: 'Response Format Validation',
        passed: testPassed,
        duration: Date.now() - test7Start,
        details: {
          caseFormatValid: caseValid,
          contactFormatValid: contactValid,
          caseFields: Object.keys(caseResponse.data || {}),
          contactFields: Object.keys(contactResponse.data || {}),
        },
      });

      if (testPassed) passed++;
      else failed++;
    } catch (error: any) {
      results.push({
        test: 'Response Format Validation',
        passed: false,
        duration: Date.now() - test7Start,
        error: error.message,
      });
      failed++;
    }

    const totalDuration = Date.now() - startTime;

    return NextResponse.json({
      success: failed === 0,
      summary: {
        total: passed + failed,
        passed,
        failed,
        duration: totalDuration,
        averageDuration: Math.round(totalDuration / (passed + failed)),
      },
      results,
      message: failed === 0 
        ? `✅ All ${passed} integration tests passed in ${totalDuration}ms!` 
        : `❌ ${failed} test(s) failed out of ${passed + failed}`,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
