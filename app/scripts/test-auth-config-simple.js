#!/usr/bin/env node

/**
 * Simple test script for authentication provider configuration
 */

const { getAuthProvider, getAuthConfig, isAuthProviderEnabled } = require('../.test-build/config.js');

console.log('Testing Authentication Provider Configuration\n');

// Test 1: Default behavior (should be mock)
console.log('Test 1: Default behavior');
delete process.env.AUTH_PROVIDER;
delete process.env.WORKATO_MOCK_MODE;
const config1 = getAuthConfig();
console.log('  Provider:', config1.provider);
console.log('  Expected: mock');
console.log('  Result:', config1.provider === 'mock' ? '✅ PASS' : '❌ FAIL');

// Test 2: AUTH_PROVIDER=mock
console.log('\nTest 2: AUTH_PROVIDER=mock');
process.env.AUTH_PROVIDER = 'mock';
delete require.cache[require.resolve('../.test-build/config.js')];
const { getAuthConfig: getAuthConfig2 } = require('../.test-build/config.js');
const config2 = getAuthConfig2();
console.log('  Provider:', config2.provider);
console.log('  isMockMode:', config2.isMockMode);
console.log('  Expected: mock, true');
console.log('  Result:', config2.provider === 'mock' && config2.isMockMode ? '✅ PASS' : '❌ FAIL');

// Test 3: AUTH_PROVIDER=cognito
console.log('\nTest 3: AUTH_PROVIDER=cognito');
process.env.AUTH_PROVIDER = 'cognito';
delete require.cache[require.resolve('../.test-build/config.js')];
const { getAuthConfig: getAuthConfig3 } = require('../.test-build/config.js');
const config3 = getAuthConfig3();
console.log('  Provider:', config3.provider);
console.log('  isCognitoEnabled:', config3.isCognitoEnabled);
console.log('  Expected: cognito, true');
console.log('  Result:', config3.provider === 'cognito' && config3.isCognitoEnabled ? '✅ PASS' : '❌ FAIL');

// Test 4: WORKATO_MOCK_MODE backward compatibility
console.log('\nTest 4: WORKATO_MOCK_MODE=true (backward compatibility)');
delete process.env.AUTH_PROVIDER;
process.env.WORKATO_MOCK_MODE = 'true';
delete require.cache[require.resolve('../.test-build/config.js')];
const { getAuthConfig: getAuthConfig4 } = require('../.test-build/config.js');
const config4 = getAuthConfig4();
console.log('  Provider:', config4.provider);
console.log('  Expected: mock');
console.log('  Result:', config4.provider === 'mock' ? '✅ PASS' : '❌ FAIL');

// Test 5: Invalid AUTH_PROVIDER
console.log('\nTest 5: Invalid AUTH_PROVIDER');
process.env.AUTH_PROVIDER = 'invalid';
delete require.cache[require.resolve('../.test-build/config.js')];
try {
  const { getAuthProvider: getAuthProvider5 } = require('../.test-build/config.js');
  getAuthProvider5();
  console.log('  Result: ❌ FAIL (should have thrown error)');
} catch (error) {
  console.log('  Error:', error.message);
  console.log('  Result:', error.message.includes('Invalid AUTH_PROVIDER') ? '✅ PASS' : '❌ FAIL');
}

console.log('\n✅ Manual verification complete!\n');
