/**
 * Quick Mock Mode Verification
 * 
 * This file demonstrates how to use mock mode programmatically.
 * It's not meant to be run directly, but shows the expected behavior.
 */

// @todo: Fix deprecated API - createCase, searchContacts, and upsertContact methods
// were removed from WorkatoClient when the legacy Salesforce API collection was
// deprecated in Dec 2025. This needs to be reimplemented using the new SalesforceClient.
// import { WorkatoClient } from './client';
// import { WorkatoConfig } from './config';

/**
 * Example: Using mock mode in tests or development
 */
export async function verifyMockMode() {
  // @todo: Restore this implementation once the deprecated methods are available in new API
  throw new Error('Mock mode verification is temporarily unavailable. This needs to be reimplemented with the new Salesforce API.');

  /* ORIGINAL CODE - COMMENTED OUT DUE TO DEPRECATED API
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
      enabled: false,
      ttl: 30000,
    },
    retry: {
      maxAttempts: 1,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
    },
    logging: {
      enabled: true,
      level: 'info',
    },
    timeout: 10000,
    mockMode: true, // Enable mock mode
  };

  const client = new WorkatoClient(mockConfig);

  // All these calls will return mock data without making real API calls
  
  // Create a case
  const caseResponse = await client.createCase({
    type: 'Housekeeping',
    guestName: 'John Doe',
    roomNumber: '101',
    priority: 'High',
    description: 'Need extra towels',
  });
  
  console.log('Case created:', caseResponse.data?.id);
  // Expected: MOCK-CASE-{timestamp}

  // Search contacts
  const searchResponse = await client.searchContacts({
    query: 'john',
    limit: 10,
  });
  
  console.log('Contacts found:', searchResponse.data?.length);
  // Expected: 3-5 mock contacts

  // Upsert contact
  const contactResponse = await client.upsertContact({
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '+1-555-9999',
  });
  
  console.log('Contact created:', contactResponse.data?.id);
  // Expected: MOCK-CONTACT-{timestamp}

  return {
    caseId: caseResponse.data?.id,
    contactCount: searchResponse.data?.length,
    contactId: contactResponse.data?.id,
  };
  */
}

/**
 * Example: Toggling between mock and real mode
 */
export function createClient(useMockMode: boolean) {
  // @todo: Restore this implementation once the deprecated methods are available in new API
  throw new Error('Mock mode client creation is temporarily unavailable. This needs to be reimplemented with the new Salesforce API.');

  /* ORIGINAL CODE - COMMENTED OUT DUE TO DEPRECATED API
  if (useMockMode) {
    // Use mock mode for development/testing
    const mockConfig: WorkatoConfig = {
      salesforce: {
        apiToken: 'mock-token',
        baseUrl: 'https://mock.workato.com',
        enabled: true,
      },
      stripe: {
        apiToken: 'mock-stripe-token',
        baseUrl: 'https://mock-stripe.workato.com',
        enabled: false,
      },
      cache: { enabled: false, ttl: 30000 },
      retry: { maxAttempts: 1, initialDelay: 1000, maxDelay: 10000, backoffMultiplier: 2 },
      logging: { enabled: true, level: 'info' },
      timeout: 10000,
      mockMode: true,
    };
    return new WorkatoClient(mockConfig);
  } else {
    // Use real API (loads from environment variables)
    return new WorkatoClient();
  }
  */
}

/**
 * Example usage in tests:
 * 
 * describe('Service Requests', () => {
 *   it('should create a case', async () => {
 *     const client = createClient(true); // Use mock mode
 *     const response = await client.createCase({...});
 *     expect(response.success).toBe(true);
 *     expect(response.data?.id).toContain('MOCK-CASE');
 *   });
 * });
 */
