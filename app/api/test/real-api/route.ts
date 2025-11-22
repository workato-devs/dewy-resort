/**
 * Real API Integration Test Endpoint
 * Tests actual integration with Workato API (NOT mock mode)
 * 
 * ⚠️ WARNING: This makes REAL API calls to Workato/Salesforce
 * ⚠️ Requires valid credentials and will create real data
 * 
 * Access via: GET /api/test/real-api
 */

import { NextResponse } from 'next/server';
import { WorkatoClient } from '@/lib/workato/client';
import { loadWorkatoConfig } from '@/lib/workato/config';

interface TestResult {
  test: string;
  passed: boolean;
  duration: number;
  details?: any;
  error?: string;
  warning?: string;
}

export async function GET() {
  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const startTime = Date.now();

  try {
    // Load configuration (should have mock mode DISABLED)
    const config = loadWorkatoConfig();

    // Safety check: Verify mock mode is disabled
    if (config.mockMode) {
      return NextResponse.json({
        success: false,
        error: 'Mock mode is enabled. Real API tests require mock mode to be disabled.',
        instructions: 'Set WORKATO_MOCK_MODE=false in .env and restart the server.',
      }, { status: 400 });
    }

    // Safety check: Verify credentials are present
    if (!config.salesforce.apiToken || !config.salesforce.baseUrl) {
      return NextResponse.json({
        success: false,
        error: 'Workato credentials not configured.',
        instructions: 'Set WORKATO_API_AUTH_TOKEN and WORKATO_API_COLLECTION_URL in .env',
      }, { status: 400 });
    }

    const client = new WorkatoClient(config);

    // Test 1: Authentication & Connection
    console.log('🧪 Running Test 1: Authentication & Connection...');
    console.log('Config check:', {
      mockMode: config.mockMode,
      hasToken: !!config.salesforce.apiToken,
      baseUrl: config.salesforce.baseUrl,
    });
    
    const test1Start = Date.now();
    try {
      // Try to search for contacts (lightweight operation)
      console.log('Making API call to search contacts...');
      const response = await client.searchContacts({
        query: 'test',
        limit: 1,
      });

      console.log('Response received:', {
        success: response.success,
        hasData: !!response.data,
        dataLength: response.data?.length,
        error: response.error,
      });

      const testPassed = response.success;

      results.push({
        test: 'Authentication & Connection',
        passed: testPassed,
        duration: Date.now() - test1Start,
        details: {
          authenticated: response.success,
          hasData: !!response.data,
          dataCount: response.data?.length || 0,
          correlationId: response.correlationId,
          error: response.error,
          configMockMode: config.mockMode,
        },
      });

      if (testPassed) passed++;
      else failed++;
    } catch (error: any) {
      console.error('Test 1 error:', error);
      results.push({
        test: 'Authentication & Connection',
        passed: false,
        duration: Date.now() - test1Start,
        error: `${error.message}\n${error.stack || ''}`,
      });
      failed++;
    }

    // Test 2: Create Real Case (with cleanup warning)
    console.log('🧪 Running Test 2: Create Real Salesforce Case...');
    const test2Start = Date.now();
    try {
      const timestamp = Date.now();
      const response = await client.createCase({
        type: 'Test',
        guestName: `API Test User ${timestamp}`,
        roomNumber: '999',
        priority: 'Low',
        description: `Automated API integration test - ${new Date().toISOString()} - Safe to delete`,
      });

      const testPassed = Boolean(
        response.success &&
        response.data?.id &&
        !response.data.id.includes('MOCK') // Verify it's NOT a mock ID
      );

      results.push({
        test: 'Create Real Salesforce Case',
        passed: testPassed,
        duration: Date.now() - test2Start,
        details: {
          caseId: response.data?.id,
          caseNumber: response.data?.caseNumber,
          isRealData: Boolean(response.data?.id && !response.data.id.includes('MOCK')),
          correlationId: response.correlationId,
        },
        warning: '⚠️ This created real data in Salesforce. Manual cleanup may be required.',
      });

      if (testPassed) passed++;
      else failed++;
    } catch (error: any) {
      results.push({
        test: 'Create Real Salesforce Case',
        passed: false,
        duration: Date.now() - test2Start,
        error: error.message,
      });
      failed++;
    }

    // Test 3: Search Contacts (Read-only, safe)
    console.log('🧪 Running Test 3: Search Real Contacts...');
    const test3Start = Date.now();
    try {
      const response = await client.searchContacts({
        query: 'test',
        limit: 5,
      });

      const testPassed = 
        response.success &&
        Array.isArray(response.data);

      results.push({
        test: 'Search Real Contacts',
        passed: testPassed,
        duration: Date.now() - test3Start,
        details: {
          resultCount: response.data?.length || 0,
          hasResults: (response.data?.length || 0) > 0,
          isRealData: response.data?.[0]?.id ? !response.data[0].id.includes('MOCK') : null,
          correlationId: response.correlationId,
        },
      });

      if (testPassed) passed++;
      else failed++;
    } catch (error: any) {
      results.push({
        test: 'Search Real Contacts',
        passed: false,
        duration: Date.now() - test3Start,
        error: error.message,
      });
      failed++;
    }

    // Test 4: Error Handling (Invalid Request)
    console.log('🧪 Running Test 4: Error Handling...');
    const test4Start = Date.now();
    try {
      // Try to get a case with invalid ID
      const response = await client.getCase('INVALID-ID-12345');

      // This should either fail gracefully or return an error
      const testPassed = Boolean(
        !response.success || // Expected to fail
        (response.success && response.error) // Or return with error
      );

      results.push({
        test: 'Error Handling',
        passed: testPassed,
        duration: Date.now() - test4Start,
        details: {
          handledGracefully: Boolean(!response.success || !!response.error),
          errorMessage: response.error,
          correlationId: response.correlationId,
        },
      });

      if (testPassed) passed++;
      else failed++;
    } catch (error: any) {
      // Catching an error is also acceptable for error handling test
      results.push({
        test: 'Error Handling',
        passed: true,
        duration: Date.now() - test4Start,
        details: {
          handledGracefully: true,
          errorCaught: error.message,
        },
      });
      passed++;
    }

    // Test 5: Response Time (Performance)
    console.log('🧪 Running Test 5: Response Time...');
    const test5Start = Date.now();
    try {
      const response = await client.searchContacts({
        query: 'test',
        limit: 1,
      });

      const duration = Date.now() - test5Start;
      const testPassed = 
        response.success &&
        duration < 5000; // Should respond within 5 seconds

      results.push({
        test: 'Response Time',
        passed: testPassed,
        duration,
        details: {
          responseTime: duration,
          acceptable: duration < 5000,
          fast: duration < 2000,
        },
      });

      if (testPassed) passed++;
      else failed++;
    } catch (error: any) {
      results.push({
        test: 'Response Time',
        passed: false,
        duration: Date.now() - test5Start,
        error: error.message,
      });
      failed++;
    }

    const totalDuration = Date.now() - startTime;

    return NextResponse.json({
      success: failed === 0,
      summary: {
        total: passed + failed + skipped,
        passed,
        failed,
        skipped,
        duration: totalDuration,
        averageDuration: Math.round(totalDuration / (passed + failed)),
      },
      results,
      message: failed === 0 
        ? `✅ All ${passed} real API integration tests passed in ${totalDuration}ms!` 
        : `❌ ${failed} test(s) failed out of ${passed + failed}`,
      warnings: [
        '⚠️ These tests make REAL API calls to Workato/Salesforce',
        '⚠️ Test data may have been created in Salesforce',
        '⚠️ Manual cleanup of test data may be required',
        '⚠️ API rate limits may apply',
      ],
      timestamp: new Date().toISOString(),
      environment: {
        mockMode: config.mockMode,
        baseUrl: config.salesforce.baseUrl,
        hasCredentials: !!config.salesforce.apiToken,
      },
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
