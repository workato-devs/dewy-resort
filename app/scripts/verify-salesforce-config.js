#!/usr/bin/env node

/**
 * Verification script for Salesforce configuration module
 * Tests the getWorkatoSalesforceConfig function with various scenarios
 */

const { getWorkatoSalesforceConfig, resetSalesforceClient } = require('../lib/workato/config');

console.log('🔍 Verifying Salesforce Configuration Module\n');

// Test 1: Load configuration with current environment variables
console.log('Test 1: Loading configuration from environment...');
try {
  const config = getWorkatoSalesforceConfig();
  console.log('✅ Configuration loaded successfully:');
  console.log('   - Base URL:', config.baseUrl);
  console.log('   - API Token:', config.apiToken.substring(0, 10) + '...');
  console.log('   - Timeout:', config.timeout, 'ms');
  console.log('   - Retry Attempts:', config.retryAttempts);
  console.log('   - Mock Mode:', config.mockMode);
  console.log('   - Cache Enabled:', config.cacheEnabled);
  console.log('');
} catch (error) {
  console.error('❌ Failed to load configuration:', error.message);
  console.log('');
}

// Test 2: Verify required field validation
console.log('Test 2: Testing required field validation...');
const originalBaseUrl = process.env.WORKATO_API_COLLECTION_URL;
const originalToken = process.env.WORKATO_API_AUTH_TOKEN;

try {
  delete process.env.WORKATO_API_COLLECTION_URL;
  resetSalesforceClient();
  getWorkatoSalesforceConfig();
  console.error('❌ Should have thrown error for missing baseUrl');
} catch (error) {
  if (error.message.includes('WORKATO_API_COLLECTION_URL is required')) {
    console.log('✅ Correctly validates missing baseUrl');
  } else {
    console.error('❌ Wrong error message:', error.message);
  }
}

// Restore and test token validation
process.env.WORKATO_API_COLLECTION_URL = originalBaseUrl;
try {
  delete process.env.WORKATO_API_AUTH_TOKEN;
  resetSalesforceClient();
  getWorkatoSalesforceConfig();
  console.error('❌ Should have thrown error for missing apiToken');
} catch (error) {
  if (error.message.includes('WORKATO_API_AUTH_TOKEN is required')) {
    console.log('✅ Correctly validates missing apiToken');
  } else {
    console.error('❌ Wrong error message:', error.message);
  }
}
console.log('');

// Restore environment
process.env.WORKATO_API_AUTH_TOKEN = originalToken;

// Test 3: Verify default values
console.log('Test 3: Testing default values...');
const originalTimeout = process.env.WORKATO_TIMEOUT;
const originalRetry = process.env.WORKATO_RETRY_ATTEMPTS;
const originalMock = process.env.WORKATO_MOCK_MODE;
const originalCache = process.env.WORKATO_CACHE_ENABLED;

delete process.env.WORKATO_TIMEOUT;
delete process.env.WORKATO_RETRY_ATTEMPTS;
delete process.env.WORKATO_MOCK_MODE;
delete process.env.WORKATO_CACHE_ENABLED;

try {
  resetSalesforceClient();
  const config = getWorkatoSalesforceConfig();
  
  const checks = [
    { name: 'timeout default (30000)', pass: config.timeout === 30000 },
    { name: 'retryAttempts default (3)', pass: config.retryAttempts === 3 },
    { name: 'mockMode default (false)', pass: config.mockMode === false },
    { name: 'cacheEnabled default (true)', pass: config.cacheEnabled === true },
  ];

  checks.forEach(check => {
    if (check.pass) {
      console.log(`✅ ${check.name}`);
    } else {
      console.error(`❌ ${check.name}`);
    }
  });
  console.log('');
} catch (error) {
  console.error('❌ Failed to test defaults:', error.message);
  console.log('');
}

// Restore environment
if (originalTimeout) process.env.WORKATO_TIMEOUT = originalTimeout;
if (originalRetry) process.env.WORKATO_RETRY_ATTEMPTS = originalRetry;
if (originalMock) process.env.WORKATO_MOCK_MODE = originalMock;
if (originalCache) process.env.WORKATO_CACHE_ENABLED = originalCache;

// Test 4: Verify numeric validation
console.log('Test 4: Testing numeric validation...');
process.env.WORKATO_TIMEOUT = '0';
try {
  resetSalesforceClient();
  getWorkatoSalesforceConfig();
  console.error('❌ Should have thrown error for invalid timeout');
} catch (error) {
  if (error.message.includes('WORKATO_TIMEOUT must be a positive number')) {
    console.log('✅ Correctly validates timeout > 0');
  } else {
    console.error('❌ Wrong error message:', error.message);
  }
}

process.env.WORKATO_TIMEOUT = originalTimeout || '30000';
process.env.WORKATO_RETRY_ATTEMPTS = '-1';
try {
  resetSalesforceClient();
  getWorkatoSalesforceConfig();
  console.error('❌ Should have thrown error for negative retry attempts');
} catch (error) {
  if (error.message.includes('WORKATO_RETRY_ATTEMPTS must be a non-negative number')) {
    console.log('✅ Correctly validates retryAttempts >= 0');
  } else {
    console.error('❌ Wrong error message:', error.message);
  }
}

// Restore environment
if (originalRetry) process.env.WORKATO_RETRY_ATTEMPTS = originalRetry;
console.log('');

// Test 5: Verify boolean parsing
console.log('Test 5: Testing boolean parsing...');
const booleanTests = [
  { env: 'WORKATO_MOCK_MODE', value: 'true', expected: true, field: 'mockMode' },
  { env: 'WORKATO_MOCK_MODE', value: 'false', expected: false, field: 'mockMode' },
  { env: 'WORKATO_CACHE_ENABLED', value: 'false', expected: false, field: 'cacheEnabled' },
  { env: 'WORKATO_CACHE_ENABLED', value: 'true', expected: true, field: 'cacheEnabled' },
];

booleanTests.forEach(test => {
  process.env[test.env] = test.value;
  resetSalesforceClient();
  const config = getWorkatoSalesforceConfig();
  if (config[test.field] === test.expected) {
    console.log(`✅ ${test.env}=${test.value} → ${test.field}=${test.expected}`);
  } else {
    console.error(`❌ ${test.env}=${test.value} → ${test.field}=${config[test.field]} (expected ${test.expected})`);
  }
});
console.log('');

// Restore environment
if (originalMock) process.env.WORKATO_MOCK_MODE = originalMock;
if (originalCache) process.env.WORKATO_CACHE_ENABLED = originalCache;

console.log('✨ Verification complete!\n');
