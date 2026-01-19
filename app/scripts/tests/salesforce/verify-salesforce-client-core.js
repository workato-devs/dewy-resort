#!/usr/bin/env node

/**
 * Verification script for Salesforce Client core infrastructure (Task 5)
 * 
 * This script verifies:
 * 1. SalesforceClient class can be instantiated
 * 2. HTTP client is properly initialized
 * 3. Cache storage is working
 * 4. Cache key generation works
 * 5. Cache get/set/invalidate operations work
 * 6. clearCache() method works
 */

const { SalesforceClient } = require('../lib/workato/salesforce-client');

console.log('🔍 Verifying Salesforce Client Core Infrastructure...\n');

// Test configuration
const testConfig = {
  baseUrl: 'https://test.workato.com/api',
  apiToken: 'test-token-12345',
  timeout: 5000,
  retryAttempts: 3,
  mockMode: false,
  cacheEnabled: true,
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

// Test 1: Instantiate SalesforceClient
test('SalesforceClient can be instantiated', () => {
  const client = new SalesforceClient(testConfig);
  if (!client) {
    throw new Error('Client is null or undefined');
  }
  if (typeof client.clearCache !== 'function') {
    throw new Error('clearCache method not found');
  }
});

// Test 2: Verify cache is initialized
test('Cache storage is initialized', () => {
  const client = new SalesforceClient(testConfig);
  // Access private cache through reflection for testing
  const cache = client['cache'];
  if (!(cache instanceof Map)) {
    throw new Error('Cache is not a Map instance');
  }
  if (cache.size !== 0) {
    throw new Error('Cache should be empty on initialization');
  }
});

// Test 3: Verify getCacheKey generates consistent keys
test('getCacheKey generates consistent keys', () => {
  const client = new SalesforceClient(testConfig);
  const getCacheKey = client['getCacheKey'].bind(client);
  
  const key1 = getCacheKey('getRoom', { id: '123' });
  const key2 = getCacheKey('getRoom', { id: '123' });
  const key3 = getCacheKey('getRoom', { id: '456' });
  
  if (key1 !== key2) {
    throw new Error('Same params should generate same key');
  }
  if (key1 === key3) {
    throw new Error('Different params should generate different keys');
  }
  if (!key1.startsWith('getRoom:')) {
    throw new Error('Key should start with method name');
  }
});

// Test 4: Verify setCachedResponse stores data
test('setCachedResponse stores data in cache', () => {
  const client = new SalesforceClient(testConfig);
  const setCachedResponse = client['setCachedResponse'].bind(client);
  const cache = client['cache'];
  
  const testData = { id: '123', name: 'Test Room' };
  setCachedResponse('test:key', testData, 5000);
  
  if (cache.size !== 1) {
    throw new Error('Cache should have 1 entry');
  }
  
  const entry = cache.get('test:key');
  if (!entry) {
    throw new Error('Cache entry not found');
  }
  if (entry.data.id !== '123') {
    throw new Error('Cached data does not match');
  }
});

// Test 5: Verify getCachedResponse retrieves data
test('getCachedResponse retrieves valid cached data', () => {
  const client = new SalesforceClient(testConfig);
  const setCachedResponse = client['setCachedResponse'].bind(client);
  const getCachedResponse = client['getCachedResponse'].bind(client);
  
  const testData = { id: '123', name: 'Test Room' };
  setCachedResponse('test:key', testData, 5000);
  
  const retrieved = getCachedResponse('test:key');
  if (!retrieved) {
    throw new Error('Should retrieve cached data');
  }
  if (retrieved.id !== '123') {
    throw new Error('Retrieved data does not match');
  }
});

// Test 6: Verify getCachedResponse returns null for expired data
test('getCachedResponse returns null for expired data', () => {
  const client = new SalesforceClient(testConfig);
  const setCachedResponse = client['setCachedResponse'].bind(client);
  const getCachedResponse = client['getCachedResponse'].bind(client);
  
  const testData = { id: '123', name: 'Test Room' };
  // Set with 0ms TTL (already expired)
  setCachedResponse('test:key', testData, 0);
  
  const retrieved = getCachedResponse('test:key');
  if (retrieved !== null) {
    throw new Error('Should return null for expired data');
  }
});

// Test 7: Verify getCachedResponse returns null for non-existent key
test('getCachedResponse returns null for non-existent key', () => {
  const client = new SalesforceClient(testConfig);
  const getCachedResponse = client['getCachedResponse'].bind(client);
  
  const retrieved = getCachedResponse('non:existent:key');
  if (retrieved !== null) {
    throw new Error('Should return null for non-existent key');
  }
});

// Test 8: Verify invalidateCacheByPrefix removes matching entries
test('invalidateCacheByPrefix removes matching entries', () => {
  const client = new SalesforceClient(testConfig);
  const setCachedResponse = client['setCachedResponse'].bind(client);
  const invalidateCacheByPrefix = client['invalidateCacheByPrefix'].bind(client);
  const cache = client['cache'];
  
  // Add multiple cache entries
  setCachedResponse('room:get:123', { id: '123' }, 5000);
  setCachedResponse('room:search:floor=1', { items: [] }, 5000);
  setCachedResponse('service:get:456', { id: '456' }, 5000);
  
  if (cache.size !== 3) {
    throw new Error('Should have 3 cache entries');
  }
  
  // Invalidate all room entries
  invalidateCacheByPrefix('room:');
  
  if (cache.size !== 1) {
    throw new Error('Should have 1 cache entry remaining');
  }
  if (!cache.has('service:get:456')) {
    throw new Error('Service entry should still exist');
  }
});

// Test 9: Verify clearCache removes all entries
test('clearCache removes all cache entries', () => {
  const client = new SalesforceClient(testConfig);
  const setCachedResponse = client['setCachedResponse'].bind(client);
  const cache = client['cache'];
  
  // Add multiple cache entries
  setCachedResponse('room:get:123', { id: '123' }, 5000);
  setCachedResponse('service:get:456', { id: '456' }, 5000);
  setCachedResponse('maintenance:get:789', { id: '789' }, 5000);
  
  if (cache.size !== 3) {
    throw new Error('Should have 3 cache entries');
  }
  
  // Clear all cache
  client.clearCache();
  
  if (cache.size !== 0) {
    throw new Error('Cache should be empty after clearCache()');
  }
});

// Test 10: Verify cache respects cacheEnabled flag
test('Cache operations respect cacheEnabled flag', () => {
  const configNoCaching = { ...testConfig, cacheEnabled: false };
  const client = new SalesforceClient(configNoCaching);
  const setCachedResponse = client['setCachedResponse'].bind(client);
  const getCachedResponse = client['getCachedResponse'].bind(client);
  const cache = client['cache'];
  
  // Try to cache data
  setCachedResponse('test:key', { id: '123' }, 5000);
  
  if (cache.size !== 0) {
    throw new Error('Cache should remain empty when caching is disabled');
  }
  
  const retrieved = getCachedResponse('test:key');
  if (retrieved !== null) {
    throw new Error('Should return null when caching is disabled');
  }
});

// Test 11: Verify mock mode initialization
test('Mock mode initializes MockDataStore when enabled', () => {
  const configMockMode = { ...testConfig, mockMode: true };
  const client = new SalesforceClient(configMockMode);
  const mockDataStore = client['mockDataStore'];
  
  if (!mockDataStore) {
    throw new Error('MockDataStore should be initialized in mock mode');
  }
});

// Test 12: Verify mock mode is null when disabled
test('Mock mode is null when disabled', () => {
  const client = new SalesforceClient(testConfig);
  const mockDataStore = client['mockDataStore'];
  
  if (mockDataStore !== null) {
    throw new Error('MockDataStore should be null when mock mode is disabled');
  }
});

// Test 13: Verify HTTP client is initialized
test('HTTP client is initialized with correct config', () => {
  const client = new SalesforceClient(testConfig);
  const httpClient = client['httpClient'];
  
  if (!httpClient) {
    throw new Error('HTTP client should be initialized');
  }
  
  // Check defaults
  if (httpClient.defaults.baseURL !== testConfig.baseUrl) {
    throw new Error('Base URL not set correctly');
  }
  if (httpClient.defaults.timeout !== testConfig.timeout) {
    throw new Error('Timeout not set correctly');
  }
  if (httpClient.defaults.headers['Content-Type'] !== 'application/json') {
    throw new Error('Content-Type header not set correctly');
  }
  if (httpClient.defaults.headers['API-TOKEN'] !== testConfig.apiToken) {
    throw new Error('API-TOKEN header not set correctly');
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log('='.repeat(50));

if (failed > 0) {
  console.log('\n❌ Some tests failed. Please review the errors above.');
  process.exit(1);
} else {
  console.log('\n✅ All core infrastructure tests passed!');
  console.log('\nCore infrastructure verified:');
  console.log('  ✓ SalesforceClient class instantiation');
  console.log('  ✓ HTTP client initialization with axios');
  console.log('  ✓ Cache storage using Map<string, CacheEntry>');
  console.log('  ✓ getCacheKey() method');
  console.log('  ✓ getCachedResponse() method');
  console.log('  ✓ setCachedResponse() method');
  console.log('  ✓ invalidateCacheByPrefix() method');
  console.log('  ✓ clearCache() public method');
  console.log('  ✓ Mock mode support');
  console.log('  ✓ Cache enabled/disabled flag');
  process.exit(0);
}
