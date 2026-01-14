/**
 * Configuration Check Endpoint
 * Verifies configuration is loaded correctly
 * Access via: GET /api/test/config-check
 */

import { NextResponse } from 'next/server';
// @todo: Fix deprecated API - searchContacts method was removed from WorkatoClient
// when the legacy Salesforce API collection was deprecated in Dec 2025.
// This needs to be reimplemented using the new SalesforceClient.
// import { WorkatoClient } from '@/lib/workato/client';
// import { loadWorkatoConfig } from '@/lib/workato/config';

export async function GET() {
  // @todo: Restore this implementation once searchContacts is available in new API
  return NextResponse.json(
    {
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Configuration check is temporarily unavailable. This test endpoint needs to be reimplemented with the new Salesforce API.',
      },
    },
    { status: 501 }
  );

  /* ORIGINAL CODE - COMMENTED OUT DUE TO DEPRECATED API
  try {
    // Load config
    const config = loadWorkatoConfig();
    
    // Create client
    const client = new WorkatoClient(config);
    
    // Try a simple operation
    console.log('=== Configuration Check ===');
    console.log('Mock Mode:', config.mockMode);
    console.log('Has Token:', !!config.salesforce.apiToken);
    console.log('Base URL:', config.salesforce.baseUrl);
    console.log('========================');
    
    // Make a test call
    const startTime = Date.now();
    const response = await client.searchContacts({
      query: 'test',
      limit: 1,
    });
    const duration = Date.now() - startTime;
    
    console.log('Response:', {
      success: response.success,
      hasData: !!response.data,
      dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
      dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
      firstId: Array.isArray(response.data) && response.data[0] ? response.data[0].id : 'N/A',
      error: response.error,
    });
    
    // Check if it's mock data
    const isMockData = Array.isArray(response.data) && 
                       response.data[0]?.id?.includes('MOCK');
    
    return NextResponse.json({
      configuration: {
        mockMode: config.mockMode,
        mockModeType: typeof config.mockMode,
        hasCredentials: !!(config.salesforce.apiToken && config.salesforce.baseUrl),
        baseUrl: config.salesforce.baseUrl,
        tokenPresent: !!config.salesforce.apiToken,
        tokenLength: config.salesforce.apiToken?.length || 0,
      },
      testCall: {
        duration,
        success: response.success,
        hasData: !!response.data,
        dataCount: Array.isArray(response.data) ? response.data.length : 0,
        isMockData,
        firstId: Array.isArray(response.data) && response.data[0] ? response.data[0].id : null,
        error: response.error,
        correlationId: response.correlationId,
      },
      analysis: {
        mockModeEnabled: config.mockMode === true,
        mockModeDisabled: config.mockMode === false,
        shouldUseMockData: config.mockMode === true,
        shouldUseRealAPI: config.mockMode === false,
        actuallyUsingMockData: isMockData,
        actuallyUsingRealAPI: !isMockData && response.success,
        configurationCorrect: (config.mockMode === false && !isMockData) || (config.mockMode === true && isMockData),
      },
      recommendation: config.mockMode === false && isMockData 
        ? '⚠️ Mock mode is disabled but mock data was returned. Check if client is using correct config.'
        : config.mockMode === true && !isMockData
        ? '⚠️ Mock mode is enabled but real data was returned. This should not happen.'
        : '✅ Configuration is working as expected.',
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
  */
}
