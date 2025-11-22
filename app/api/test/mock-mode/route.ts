/**
 * Mock Mode Test API Endpoint
 * Test endpoint to verify Workato mock mode functionality
 * Access via: GET /api/test/mock-mode
 */

import { NextResponse } from 'next/server';
import { WorkatoClient } from '@/lib/workato/client';
import { WorkatoConfig } from '@/lib/workato/config';

export async function GET() {
  const results: any[] = [];
  let passed = 0;
  let failed = 0;

  try {
    // Create a client with mock mode enabled
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
        enabled: false, // Disable cache for testing
        ttl: 30000,
      },
      retry: {
        maxAttempts: 1,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      },
      logging: {
        enabled: false,
        level: 'error',
      },
      timeout: 10000,
      mockMode: true,
    };

    const client = new WorkatoClient(mockConfig);

    // Test 1: Create Case
    try {
      const caseResponse = await client.createCase({
        type: 'Housekeeping',
        guestName: 'Test Guest',
        roomNumber: '101',
        priority: 'High',
        description: 'Test request',
      });

      const testPassed = caseResponse.success && 
                        caseResponse.data?.id?.includes('MOCK-CASE') &&
                        caseResponse.data?.priority === 'High';

      results.push({
        test: 'createCase',
        passed: testPassed,
        data: caseResponse.data,
      });

      if (testPassed) passed++;
      else failed++;
    } catch (error: any) {
      results.push({
        test: 'createCase',
        passed: false,
        error: error.message,
      });
      failed++;
    }

    // Test 2: Get Case
    try {
      const getResponse = await client.getCase('test-case-123');

      const testPassed = getResponse.success && 
                        getResponse.data?.id === 'test-case-123';

      results.push({
        test: 'getCase',
        passed: testPassed,
        data: getResponse.data,
      });

      if (testPassed) passed++;
      else failed++;
    } catch (error: any) {
      results.push({
        test: 'getCase',
        passed: false,
        error: error.message,
      });
      failed++;
    }

    // Test 3: Upsert Contact
    try {
      const contactResponse = await client.upsertContact({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1-555-1234',
      });

      const testPassed = contactResponse.success && 
                        contactResponse.data?.id?.includes('MOCK-CONTACT') &&
                        contactResponse.data?.email === 'john.doe@example.com';

      results.push({
        test: 'upsertContact',
        passed: testPassed,
        data: contactResponse.data,
      });

      if (testPassed) passed++;
      else failed++;
    } catch (error: any) {
      results.push({
        test: 'upsertContact',
        passed: false,
        error: error.message,
      });
      failed++;
    }

    // Test 4: Get Contact
    try {
      const getContactResponse = await client.getContact('test-contact-456');

      const testPassed = getContactResponse.success && 
                        getContactResponse.data?.id === 'test-contact-456';

      results.push({
        test: 'getContact',
        passed: testPassed,
        data: getContactResponse.data,
      });

      if (testPassed) passed++;
      else failed++;
    } catch (error: any) {
      results.push({
        test: 'getContact',
        passed: false,
        error: error.message,
      });
      failed++;
    }

    // Test 5: Search Contacts
    try {
      const searchResponse = await client.searchContacts({
        query: 'test',
        limit: 10,
      });

      const testPassed = searchResponse.success && 
                        Array.isArray(searchResponse.data) && 
                        searchResponse.data.length > 0 &&
                        searchResponse.data.length <= 10;

      results.push({
        test: 'searchContacts',
        passed: testPassed,
        resultCount: searchResponse.data?.length,
        data: searchResponse.data?.[0],
      });

      if (testPassed) passed++;
      else failed++;
    } catch (error: any) {
      results.push({
        test: 'searchContacts',
        passed: false,
        error: error.message,
      });
      failed++;
    }

    // Test 6: Verify correlation IDs
    try {
      const response = await client.createCase({
        type: 'Test',
        guestName: 'Test',
        roomNumber: '100',
        priority: 'Low',
        description: 'Test',
      });

      const testPassed = response.correlationId && 
                        typeof response.correlationId === 'string' &&
                        response.correlationId.length > 0;

      results.push({
        test: 'correlationId',
        passed: testPassed,
        correlationId: response.correlationId,
      });

      if (testPassed) passed++;
      else failed++;
    } catch (error: any) {
      results.push({
        test: 'correlationId',
        passed: false,
        error: error.message,
      });
      failed++;
    }

    return NextResponse.json({
      success: failed === 0,
      summary: {
        total: passed + failed,
        passed,
        failed,
      },
      results,
      message: failed === 0 
        ? '✅ All mock mode tests passed!' 
        : `❌ ${failed} test(s) failed`,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
