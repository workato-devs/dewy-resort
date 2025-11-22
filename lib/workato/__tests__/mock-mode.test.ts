/**
 * Mock Mode Tests
 * Verify that mock mode returns valid responses without making API calls
 */

import { WorkatoClient } from '../client';
import { WorkatoConfig } from '../config';

describe('Mock Mode', () => {
  let mockConfig: WorkatoConfig;

  beforeEach(() => {
    mockConfig = {
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
        enabled: false,
        level: 'error',
      },
      timeout: 10000,
      mockMode: true,
    };
  });

  test('createCase returns mock response in mock mode', async () => {
    const client = new WorkatoClient(mockConfig);

    const response = await client.createCase({
      type: 'Housekeeping',
      guestName: 'Test Guest',
      roomNumber: '101',
      priority: 'High',
      description: 'Test request',
    });

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(response.data?.id).toContain('MOCK-CASE');
    expect(response.data?.caseNumber).toMatch(/^CASE-\d{5}$/);
    expect(response.data?.status).toBe('New');
    expect(response.data?.priority).toBe('High');
  });

  test('getCase returns mock response in mock mode', async () => {
    const client = new WorkatoClient(mockConfig);

    const response = await client.getCase('test-case-id');

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(response.data?.id).toBe('test-case-id');
    expect(response.data?.caseNumber).toMatch(/^CASE-\d{5}$/);
  });

  test('upsertContact returns mock response in mock mode', async () => {
    const client = new WorkatoClient(mockConfig);

    const response = await client.upsertContact({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-1234',
    });

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(response.data?.id).toContain('MOCK-CONTACT');
    expect(response.data?.email).toBe('john.doe@example.com');
    expect(response.data?.name).toBe('John Doe');
    expect(response.data?.phone).toBe('+1-555-1234');
  });

  test('getContact returns mock response in mock mode', async () => {
    const client = new WorkatoClient(mockConfig);

    const response = await client.getContact('test-contact-id');

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(response.data?.id).toBe('test-contact-id');
    expect(response.data?.name).toContain('Mock');
  });

  test('searchContacts returns mock response array in mock mode', async () => {
    const client = new WorkatoClient(mockConfig);

    const response = await client.searchContacts({
      query: 'test',
      limit: 10,
    });

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data!.length).toBeGreaterThan(0);
    expect(response.data!.length).toBeLessThanOrEqual(10);
    
    const firstContact = response.data![0];
    expect(firstContact.id).toContain('MOCK-CONTACT');
    expect(firstContact.email).toContain('@example.com');
    expect(firstContact.name).toContain('Mock User');
  });

  test('mock mode does not make real API calls', async () => {
    // Use invalid credentials to ensure no real API call is made
    const invalidConfig = {
      ...mockConfig,
      salesforce: {
        apiToken: '',
        baseUrl: '',
        enabled: true,
      },
    };

    const client = new WorkatoClient(invalidConfig);

    // This should succeed even with invalid credentials because mock mode is enabled
    const response = await client.createCase({
      type: 'Test',
      guestName: 'Test',
      roomNumber: '100',
      priority: 'Low',
      description: 'Test',
    });

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
  });

  test('mock mode can be toggled via configuration', async () => {
    // Test with mock mode enabled
    const mockClient = new WorkatoClient({ ...mockConfig, mockMode: true });
    const mockResponse = await mockClient.createCase({
      type: 'Test',
      guestName: 'Test',
      roomNumber: '100',
      priority: 'Low',
      description: 'Test',
    });

    expect(mockResponse.success).toBe(true);
    expect(mockResponse.data?.id).toContain('MOCK-CASE');

    // Note: We can't test with mockMode: false here because it would make a real API call
    // In a real test environment, you would mock the fetch function
  });

  test('mock responses include correlation IDs', async () => {
    const client = new WorkatoClient(mockConfig);

    const response = await client.createCase({
      type: 'Test',
      guestName: 'Test',
      roomNumber: '100',
      priority: 'Low',
      description: 'Test',
    });

    expect(response.correlationId).toBeDefined();
    expect(typeof response.correlationId).toBe('string');
    expect(response.correlationId.length).toBeGreaterThan(0);
  });

  test('mock mode simulates network delay', async () => {
    const client = new WorkatoClient(mockConfig);

    const startTime = Date.now();
    await client.createCase({
      type: 'Test',
      guestName: 'Test',
      roomNumber: '100',
      priority: 'Low',
      description: 'Test',
    });
    const duration = Date.now() - startTime;

    // Mock mode should simulate 100-300ms delay
    expect(duration).toBeGreaterThanOrEqual(100);
    expect(duration).toBeLessThan(500);
  });
});
