/**
 * Diagnostics Endpoint
 * Shows current configuration and environment state
 * Access via: GET /api/test/diagnostics
 */

import { NextResponse } from 'next/server';
import { loadWorkatoConfig } from '@/lib/workato/config';

export async function GET() {
  try {
    const config = loadWorkatoConfig();

    return NextResponse.json({
      environment: {
        WORKATO_MOCK_MODE: process.env.WORKATO_MOCK_MODE,
        SALESFORCE_API_AUTH_TOKEN: process.env.SALESFORCE_API_AUTH_TOKEN ? '***' + process.env.SALESFORCE_API_AUTH_TOKEN.slice(-4) : 'NOT SET',
        SALESFORCE_API_COLLECTION_URL: process.env.SALESFORCE_API_COLLECTION_URL || 'NOT SET',
        STRIPE_API_AUTH_TOKEN: process.env.STRIPE_API_AUTH_TOKEN ? '***' + process.env.STRIPE_API_AUTH_TOKEN.slice(-4) : 'NOT SET',
        STRIPE_API_COLLECTION_URL: process.env.STRIPE_API_COLLECTION_URL || 'NOT SET',
        NODE_ENV: process.env.NODE_ENV,
      },
      loadedConfig: {
        mockMode: config.mockMode,
        mockModeType: typeof config.mockMode,
        salesforce: {
          hasToken: !!config.salesforce.apiToken,
          tokenLength: config.salesforce.apiToken?.length || 0,
          baseUrl: config.salesforce.baseUrl,
          enabled: config.salesforce.enabled,
        },
        timeout: config.timeout,
        logging: config.logging,
        cache: config.cache,
        retry: config.retry,
      },
      checks: {
        mockModeDisabled: config.mockMode === false,
        hasCredentials: !!(config.salesforce.apiToken && config.salesforce.baseUrl),
        readyForRealAPI: config.mockMode === false && !!(config.salesforce.apiToken && config.salesforce.baseUrl),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
