#!/usr/bin/env node

/**
 * Test script for authentication provider configuration
 * 
 * This script verifies that the authentication provider abstraction layer
 * works correctly with different environment variable configurations.
 */

// Test scenarios
const testScenarios = [
  {
    name: 'AUTH_PROVIDER set to "mock"',
    env: { AUTH_PROVIDER: 'mock' },
    expected: { provider: 'mock', isMockMode: true, isOktaEnabled: false, isCognitoEnabled: false }
  },
  {
    name: 'AUTH_PROVIDER set to "okta"',
    env: { AUTH_PROVIDER: 'okta' },
    expected: { provider: 'okta', isMockMode: false, isOktaEnabled: true, isCognitoEnabled: false }
  },
  {
    name: 'AUTH_PROVIDER set to "cognito"',
    env: { AUTH_PROVIDER: 'cognito' },
    expected: { provider: 'cognito', isMockMode: false, isOktaEnabled: false, isCognitoEnabled: true }
  },
  {
    name: 'WORKATO_MOCK_MODE set to "true" (backward compatibility)',
    env: { WORKATO_MOCK_MODE: 'true' },
    expected: { provider: 'mock', isMockMode: true, isOktaEnabled: false, isCognitoEnabled: false }
  },
  {
    name: 'No variables set (default to okta)',
    env: {},
    expected: { provider: 'okta', isMockMode: false, isOktaEnabled: true, isCognitoEnabled: false }
  },
  {
    name: 'AUTH_PROVIDER overrides WORKATO_MOCK_MODE',
    env: { AUTH_PROVIDER: 'cognito', WORKATO_MOCK_MODE: 'true' },
    expected: { provider: 'cognito', isMockMode: false, isOktaEnabled: false, isCognitoEnabled: true }
  },
  {
    name: 'Invalid AUTH_PROVIDER value',
    env: { AUTH_PROVIDER: 'invalid' },
    shouldThrow: true,
    expectedError: "Invalid AUTH_PROVIDER value. Must be 'mock', 'okta', or 'cognito'"
  }
];

let passed = 0;
let failed = 0;

console.log('Testing Authentication Provider Configuration\n');
console.log('='.repeat(60));

for (const scenario of testScenarios) {
  console.log(`\nTest: ${scenario.name}`);
  
  // Save original env
  const originalEnv = { ...process.env };
  
  // Clear relevant env vars
  delete process.env.AUTH_PROVIDER;
  delete process.env.WORKATO_MOCK_MODE;
  
  // Set test env vars
  Object.assign(process.env, scenario.env);
  
  // Clear module cache to reload with new env
  delete require.cache[require.resolve('../lib/auth/config.ts')];
  
  try {
    const { getAuthProvider, getAuthConfig, isAuthProviderEnabled } = require('../lib/auth/config.ts');
    
    if (scenario.shouldThrow) {
      // Should have thrown an error
      console.log('  ❌ FAILED: Expected error to be thrown');
      failed++;
    } else {
      const provider = getAuthProvider();
      const config = getAuthConfig();
      
      // Verify provider
      if (provider !== scenario.expected.provider) {
        console.log(`  ❌ FAILED: Expected provider "${scenario.expected.provider}", got "${provider}"`);
        failed++;
      } else {
        console.log(`  ✓ Provider: ${provider}`);
      }
      
      // Verify config
      const configMatches = 
        config.provider === scenario.expected.provider &&
        config.isMockMode === scenario.expected.isMockMode &&
        config.isOktaEnabled === scenario.expected.isOktaEnabled &&
        config.isCognitoEnabled === scenario.expected.isCognitoEnabled;
      
      if (!configMatches) {
        console.log('  ❌ FAILED: Config mismatch');
        console.log('    Expected:', scenario.expected);
        console.log('    Got:', config);
        failed++;
      } else {
        console.log('  ✓ Config flags correct');
      }
      
      // Verify isAuthProviderEnabled
      const mockEnabled = isAuthProviderEnabled('mock');
      const oktaEnabled = isAuthProviderEnabled('okta');
      const cognitoEnabled = isAuthProviderEnabled('cognito');
      
      if (mockEnabled !== scenario.expected.isMockMode ||
          oktaEnabled !== scenario.expected.isOktaEnabled ||
          cognitoEnabled !== scenario.expected.isCognitoEnabled) {
        console.log('  ❌ FAILED: isAuthProviderEnabled mismatch');
        failed++;
      } else {
        console.log('  ✓ isAuthProviderEnabled correct');
      }
      
      if (configMatches && 
          mockEnabled === scenario.expected.isMockMode &&
          oktaEnabled === scenario.expected.isOktaEnabled &&
          cognitoEnabled === scenario.expected.isCognitoEnabled) {
        console.log('  ✅ PASSED');
        passed++;
      }
    }
  } catch (error) {
    if (scenario.shouldThrow) {
      if (error.message === scenario.expectedError) {
        console.log(`  ✓ Threw expected error: ${error.message}`);
        console.log('  ✅ PASSED');
        passed++;
      } else {
        console.log(`  ❌ FAILED: Wrong error message`);
        console.log(`    Expected: ${scenario.expectedError}`);
        console.log(`    Got: ${error.message}`);
        failed++;
      }
    } else {
      console.log(`  ❌ FAILED: Unexpected error: ${error.message}`);
      failed++;
    }
  }
  
  // Restore original env
  process.env = originalEnv;
}

console.log('\n' + '='.repeat(60));
console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

console.log('\n✅ All tests passed!\n');
