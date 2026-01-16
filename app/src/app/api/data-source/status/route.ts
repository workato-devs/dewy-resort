/**
 * Data Source Status API
 * Returns whether the app is using external services or fallback/mock data
 * Checks all integrations: Salesforce, Home Assistant, Stripe, Twilio
 */

import { NextResponse } from 'next/server';
import { secureFetch } from '@/lib/fetch-utils';

interface IntegrationStatus {
  name: string;
  enabled: boolean;
  working: boolean;
  usingFallback: boolean;
  reason?: string;
}

interface SystemStatus {
  usingFallback: boolean;
  fallbackReason?: string;
  integrations: IntegrationStatus[];
}

// Cache the status for 30 seconds to avoid excessive checks
let cachedStatus: SystemStatus & { timestamp: number } | null = null;

const CACHE_TTL = 30000; // 30 seconds

export async function GET() {
  try {
    // Return cached status if still valid
    if (cachedStatus && Date.now() - cachedStatus.timestamp < CACHE_TTL) {
      const { timestamp, ...status } = cachedStatus;
      return NextResponse.json(status);
    }

    const integrations: IntegrationStatus[] = [];

    // Check Salesforce
    const salesforceStatus = await checkSalesforce();
    integrations.push(salesforceStatus);

    // Check Home Assistant
    const homeAssistantStatus = await checkHomeAssistant();
    integrations.push(homeAssistantStatus);

    // Check Stripe
    const stripeStatus = await checkStripe();
    integrations.push(stripeStatus);

    // Check Twilio (currently mock-only)
    const twilioStatus = checkTwilio();
    integrations.push(twilioStatus);

    // Determine overall fallback status
    const enabledIntegrations = integrations.filter(i => i.enabled);
    const fallbackIntegrations = enabledIntegrations.filter(i => i.usingFallback);
    
    const usingFallback = fallbackIntegrations.length > 0;
    const fallbackReason = usingFallback
      ? `${fallbackIntegrations.length} integration(s) using fallback: ${fallbackIntegrations.map(i => i.name).join(', ')}`
      : undefined;

    const status: SystemStatus = {
      usingFallback,
      fallbackReason,
      integrations,
    };

    cachedStatus = {
      ...status,
      timestamp: Date.now(),
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Data source status check error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check data source status',
        usingFallback: true,
        fallbackReason: 'Status check failed',
        integrations: [],
      },
      { status: 500 }
    );
  }
}

/**
 * Check Salesforce integration status
 */
async function checkSalesforce(): Promise<IntegrationStatus> {
  const enabled = process.env.SALESFORCE_ENABLED !== 'false';
  const mockMode = process.env.WORKATO_MOCK_MODE === 'true';
  
  if (!enabled) {
    return {
      name: 'Salesforce',
      enabled: false,
      working: false,
      usingFallback: false,
      reason: 'Integration disabled (SALESFORCE_ENABLED=false)',
    };
  }

  // If in mock mode, report as using fallback
  if (mockMode) {
    return {
      name: 'Salesforce',
      enabled: true,
      working: false,
      usingFallback: true,
      reason: 'Mock mode enabled (WORKATO_MOCK_MODE=true)',
    };
  }

  // Try to call the actual Workato API using SalesforceClient
  try {
    const { SalesforceClient } = await import('@/lib/workato/salesforce-client');
    const { getWorkatoSalesforceConfig } = await import('@/lib/workato/config');
    
    const config = getWorkatoSalesforceConfig();
    const salesforceClient = new SalesforceClient(config);
    
    // Try a simple search to verify connectivity (requires at least one filter)
    await salesforceClient.searchRooms({ status: 'vacant' });

    return {
      name: 'Salesforce',
      enabled: true,
      working: true,
      usingFallback: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      name: 'Salesforce',
      enabled: true,
      working: false,
      usingFallback: true,
      reason: `Salesforce API error: ${errorMessage} - using local database fallback`,
    };
  }
}

/**
 * Check Home Assistant integration status
 */
async function checkHomeAssistant(): Promise<IntegrationStatus> {
  const homeAssistantUrl = process.env.HOME_ASSISTANT_URL;
  const homeAssistantToken = process.env.HOME_ASSISTANT_TOKEN;
  const enabled = process.env.HOME_ASSISTANT_ENABLED !== 'false';

  if (!enabled) {
    return {
      name: 'Home Assistant',
      enabled: false,
      working: false,
      usingFallback: false,
      reason: 'Integration disabled (HOME_ASSISTANT_ENABLED=false)',
    };
  }

  if (!homeAssistantUrl || !homeAssistantToken) {
    return {
      name: 'Home Assistant',
      enabled: true,
      working: false,
      usingFallback: true,
      reason: 'Not configured (missing URL or token)',
    };
  }

  try {
    const response = await secureFetch(`${homeAssistantUrl}/api/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${homeAssistantToken}`,
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (response.ok) {
      return {
        name: 'Home Assistant',
        enabled: true,
        working: true,
        usingFallback: false,
      };
    } else {
      return {
        name: 'Home Assistant',
        enabled: true,
        working: false,
        usingFallback: true,
        reason: `API returned ${response.status}`,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      name: 'Home Assistant',
      enabled: true,
      working: false,
      usingFallback: true,
      reason: errorMessage,
    };
  }
}

/**
 * Check Stripe integration status
 */
async function checkStripe(): Promise<IntegrationStatus> {
  const enabled = process.env.STRIPE_ENABLED !== 'false';
  const mockMode = process.env.WORKATO_MOCK_MODE === 'true';
  
  if (!enabled) {
    return {
      name: 'Stripe',
      enabled: false,
      working: false,
      usingFallback: false,
      reason: 'Integration disabled (STRIPE_ENABLED=false)',
    };
  }

  // If in mock mode, report as using fallback
  if (mockMode) {
    return {
      name: 'Stripe',
      enabled: true,
      working: false,
      usingFallback: true,
      reason: 'Mock mode enabled (WORKATO_MOCK_MODE=true)',
    };
  }

  // Try to call the actual Workato API using StripeClient
  try {
    const { StripeClient } = await import('@/lib/stripe/stripe-client');
    const { getWorkatoStripeConfig } = await import('@/lib/workato/config');
    
    const config = getWorkatoStripeConfig();
    const stripeClient = new StripeClient(config);
    
    // Try a simple operation to verify connectivity
    await stripeClient.getPaymentStatus('pi_test_connection');

    return {
      name: 'Stripe',
      enabled: true,
      working: true,
      usingFallback: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      name: 'Stripe',
      enabled: true,
      working: false,
      usingFallback: true,
      reason: `Stripe API error: ${errorMessage} - using mock data fallback`,
    };
  }
}

/**
 * Check Twilio integration status
 * Currently mock-only implementation
 */
function checkTwilio(): IntegrationStatus {
  const enabled = process.env.TWILIO_ENABLED !== 'false';
  
  if (!enabled) {
    return {
      name: 'Twilio',
      enabled: false,
      working: false,
      usingFallback: false,
      reason: 'Integration disabled (TWILIO_ENABLED=false)',
    };
  }

  // Twilio is currently always mock/fallback when enabled
  return {
    name: 'Twilio',
    enabled: true,
    working: false,
    usingFallback: true,
    reason: 'Mock implementation only (no real Twilio integration)',
  };
}
