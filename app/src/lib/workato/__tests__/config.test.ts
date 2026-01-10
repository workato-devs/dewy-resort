/**
 * Tests for Workato Salesforce Configuration Module
 */

import { getWorkatoSalesforceConfig, resetSalesforceClient } from '../config';

describe('getWorkatoSalesforceConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    resetSalesforceClient();
  });

  it('should load configuration from environment variables', () => {
    process.env.WORKATO_API_COLLECTION_URL = 'https://test.workato.com';
    process.env.WORKATO_API_AUTH_TOKEN = 'test-token-123';
    process.env.WORKATO_TIMEOUT = '5000';
    process.env.WORKATO_RETRY_ATTEMPTS = '5';
    process.env.WORKATO_MOCK_MODE = 'true';
    process.env.WORKATO_CACHE_ENABLED = 'false';

    const config = getWorkatoSalesforceConfig();

    expect(config.baseUrl).toBe('https://test.workato.com');
    expect(config.apiToken).toBe('test-token-123');
    expect(config.timeout).toBe(5000);
    expect(config.retryAttempts).toBe(5);
    expect(config.mockMode).toBe(true);
    expect(config.cacheEnabled).toBe(false);
  });

  it('should use default values for optional configuration', () => {
    process.env.WORKATO_API_COLLECTION_URL = 'https://test.workato.com';
    process.env.WORKATO_API_AUTH_TOKEN = 'test-token-123';
    // Don't set optional values

    const config = getWorkatoSalesforceConfig();

    expect(config.timeout).toBe(30000); // Default
    expect(config.retryAttempts).toBe(3); // Default
    expect(config.mockMode).toBe(false); // Default
    expect(config.cacheEnabled).toBe(true); // Default
  });

  it('should throw error when baseUrl is missing', () => {
    process.env.WORKATO_API_AUTH_TOKEN = 'test-token-123';
    delete process.env.WORKATO_API_COLLECTION_URL;

    expect(() => getWorkatoSalesforceConfig()).toThrow(
      'Missing required Salesforce configuration'
    );
    expect(() => getWorkatoSalesforceConfig()).toThrow(
      'WORKATO_API_COLLECTION_URL is required'
    );
  });

  it('should throw error when apiToken is missing', () => {
    process.env.WORKATO_API_COLLECTION_URL = 'https://test.workato.com';
    delete process.env.WORKATO_API_AUTH_TOKEN;

    expect(() => getWorkatoSalesforceConfig()).toThrow(
      'Missing required Salesforce configuration'
    );
    expect(() => getWorkatoSalesforceConfig()).toThrow(
      'WORKATO_API_AUTH_TOKEN is required'
    );
  });

  it('should throw error when both required values are missing', () => {
    delete process.env.WORKATO_API_COLLECTION_URL;
    delete process.env.WORKATO_API_AUTH_TOKEN;

    expect(() => getWorkatoSalesforceConfig()).toThrow(
      'Missing required Salesforce configuration'
    );
  });

  it('should throw error when timeout is invalid', () => {
    process.env.WORKATO_API_COLLECTION_URL = 'https://test.workato.com';
    process.env.WORKATO_API_AUTH_TOKEN = 'test-token-123';
    process.env.WORKATO_TIMEOUT = '0';

    expect(() => getWorkatoSalesforceConfig()).toThrow(
      'WORKATO_TIMEOUT must be a positive number'
    );
  });

  it('should throw error when retryAttempts is invalid', () => {
    process.env.WORKATO_API_COLLECTION_URL = 'https://test.workato.com';
    process.env.WORKATO_API_AUTH_TOKEN = 'test-token-123';
    process.env.WORKATO_RETRY_ATTEMPTS = '-1';

    expect(() => getWorkatoSalesforceConfig()).toThrow(
      'WORKATO_RETRY_ATTEMPTS must be a non-negative number'
    );
  });

  it('should handle empty string values as missing', () => {
    process.env.WORKATO_API_COLLECTION_URL = '   ';
    process.env.WORKATO_API_AUTH_TOKEN = '   ';

    expect(() => getWorkatoSalesforceConfig()).toThrow(
      'Missing required Salesforce configuration'
    );
  });

  it('should parse mockMode correctly', () => {
    process.env.WORKATO_API_COLLECTION_URL = 'https://test.workato.com';
    process.env.WORKATO_API_AUTH_TOKEN = 'test-token-123';

    // Test true
    process.env.WORKATO_MOCK_MODE = 'true';
    let config = getWorkatoSalesforceConfig();
    expect(config.mockMode).toBe(true);

    // Test false
    process.env.WORKATO_MOCK_MODE = 'false';
    config = getWorkatoSalesforceConfig();
    expect(config.mockMode).toBe(false);

    // Test undefined (should default to false)
    delete process.env.WORKATO_MOCK_MODE;
    config = getWorkatoSalesforceConfig();
    expect(config.mockMode).toBe(false);
  });

  it('should parse cacheEnabled correctly', () => {
    process.env.WORKATO_API_COLLECTION_URL = 'https://test.workato.com';
    process.env.WORKATO_API_AUTH_TOKEN = 'test-token-123';

    // Test false
    process.env.WORKATO_CACHE_ENABLED = 'false';
    let config = getWorkatoSalesforceConfig();
    expect(config.cacheEnabled).toBe(false);

    // Test true
    process.env.WORKATO_CACHE_ENABLED = 'true';
    config = getWorkatoSalesforceConfig();
    expect(config.cacheEnabled).toBe(true);

    // Test undefined (should default to true)
    delete process.env.WORKATO_CACHE_ENABLED;
    config = getWorkatoSalesforceConfig();
    expect(config.cacheEnabled).toBe(true);
  });
});
