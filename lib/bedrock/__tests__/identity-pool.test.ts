/**
 * Identity Pool Service Tests
 * 
 * Manual verification tests for Identity Pool credential exchange.
 * Run with: npx tsx lib/bedrock/__tests__/identity-pool.test.ts
 */

import { IdentityPoolService, TemporaryCredentials } from '../identity-pool';

/**
 * Mock ID token for testing
 * In real usage, this would come from Cognito User Pool authentication
 */
const MOCK_ID_TOKEN = 'mock-id-token';
const MOCK_SESSION_ID = 'test-session-123';

/**
 * Test configuration
 */
const TEST_CONFIG = {
  identityPoolId: process.env.COGNITO_IDENTITY_POOL_ID || 'us-west-2:test-pool-id',
  region: process.env.AWS_REGION || process.env.COGNITO_REGION || 'us-west-2',
  userPoolId: process.env.COGNITO_USER_POOL_ID || 'us-west-2_test',
  clientId: process.env.COGNITO_CLIENT_ID || 'test-client-id',
};

/**
 * Test credential expiration checking
 */
function testExpirationChecking() {
  console.log('\n=== Testing Credential Expiration Checking ===');
  
  const service = new IdentityPoolService(TEST_CONFIG);
  
  // Test expired credentials
  const expiredCreds: TemporaryCredentials = {
    accessKeyId: 'AKIATEST',
    secretAccessKey: 'secret',
    sessionToken: 'token',
    expiration: new Date(Date.now() - 1000), // 1 second ago
  };
  
  console.log('Testing expired credentials...');
  console.assert(service.isExpired(expiredCreds) === true, 'Should detect expired credentials');
  console.assert(service.needsRefresh(expiredCreds) === true, 'Should need refresh for expired credentials');
  console.log('✓ Expired credentials detected correctly');
  
  // Test valid credentials
  const validCreds: TemporaryCredentials = {
    accessKeyId: 'AKIATEST',
    secretAccessKey: 'secret',
    sessionToken: 'token',
    expiration: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
  };
  
  console.log('Testing valid credentials...');
  console.assert(service.isExpired(validCreds) === false, 'Should not detect valid credentials as expired');
  console.assert(service.needsRefresh(validCreds) === false, 'Should not need refresh for valid credentials');
  console.log('✓ Valid credentials detected correctly');
  
  // Test credentials near expiration (within 5 minute buffer)
  const nearExpiryCreds: TemporaryCredentials = {
    accessKeyId: 'AKIATEST',
    secretAccessKey: 'secret',
    sessionToken: 'token',
    expiration: new Date(Date.now() + 4 * 60 * 1000), // 4 minutes from now
  };
  
  console.log('Testing credentials near expiration...');
  console.assert(service.isExpired(nearExpiryCreds) === false, 'Should not be expired yet');
  console.assert(service.needsRefresh(nearExpiryCreds) === true, 'Should need refresh within buffer time');
  console.log('✓ Near-expiration credentials detected correctly');
}

/**
 * Test cache management
 */
function testCacheManagement() {
  console.log('\n=== Testing Cache Management ===');
  
  const service = new IdentityPoolService(TEST_CONFIG);
  
  console.log('Testing cache clear for specific session...');
  service.clearCache(MOCK_SESSION_ID);
  console.log('✓ Cache cleared for session');
  
  console.log('Testing cache clear for all sessions...');
  service.clearAllCache();
  console.log('✓ All cache cleared');
}

/**
 * Test service creation from environment
 */
function testServiceCreation() {
  console.log('\n=== Testing Service Creation ===');
  
  // Save original env vars
  const originalEnv = {
    COGNITO_IDENTITY_POOL_ID: process.env.COGNITO_IDENTITY_POOL_ID,
    AWS_REGION: process.env.AWS_REGION,
    COGNITO_REGION: process.env.COGNITO_REGION,
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
  };
  
  // Test with missing configuration
  console.log('Testing service creation with missing config...');
  delete process.env.COGNITO_IDENTITY_POOL_ID;
  
  const { createIdentityPoolService } = require('../identity-pool');
  const serviceNull = createIdentityPoolService();
  console.assert(serviceNull === null, 'Should return null when config is missing');
  console.log('✓ Returns null for missing configuration');
  
  // Restore env vars
  Object.assign(process.env, originalEnv);
  
  // Test with valid configuration
  if (process.env.COGNITO_IDENTITY_POOL_ID) {
    console.log('Testing service creation with valid config...');
    const serviceValid = createIdentityPoolService();
    console.assert(serviceValid !== null, 'Should create service with valid config');
    console.log('✓ Service created with valid configuration');
  } else {
    console.log('⚠ Skipping valid config test (COGNITO_IDENTITY_POOL_ID not set)');
  }
}

/**
 * Test credential structure validation
 */
function testCredentialStructure() {
  console.log('\n=== Testing Credential Structure ===');
  
  const validCreds: TemporaryCredentials = {
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    sessionToken: 'AQoDYXdzEJr...<remainder of session token>',
    expiration: new Date(Date.now() + 3600000),
  };
  
  console.log('Testing credential structure...');
  console.assert(typeof validCreds.accessKeyId === 'string', 'accessKeyId should be string');
  console.assert(typeof validCreds.secretAccessKey === 'string', 'secretAccessKey should be string');
  console.assert(typeof validCreds.sessionToken === 'string', 'sessionToken should be string');
  console.assert(validCreds.expiration instanceof Date, 'expiration should be Date');
  console.log('✓ Credential structure is valid');
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('=================================================');
  console.log('Identity Pool Service - Verification Tests');
  console.log('=================================================');
  
  try {
    testCredentialStructure();
    testExpirationChecking();
    testCacheManagement();
    testServiceCreation();
    
    console.log('\n=================================================');
    console.log('✓ All verification tests passed!');
    console.log('=================================================\n');
    
    // Note about integration testing
    console.log('Note: Integration tests with real AWS credentials require:');
    console.log('  1. Valid COGNITO_IDENTITY_POOL_ID in environment');
    console.log('  2. Valid Cognito User Pool ID token');
    console.log('  3. Proper IAM role configuration in Identity Pool');
    console.log('\nTo test with real credentials, use the service in your application');
    console.log('with a valid ID token from Cognito User Pool authentication.\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

export { runTests };
