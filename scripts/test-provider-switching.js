#!/usr/bin/env node

/**
 * Provider Switching Test Script
 * 
 * This script tests switching between mock, okta, and cognito authentication providers
 * by verifying the AUTH_PROVIDER configuration logic.
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

// Track results
const results = {
  passed: 0,
  failed: 0,
};

function test(description, condition, details = '') {
  const icon = condition ? '✓' : '✗';
  const color = condition ? 'green' : 'red';
  log(`${icon} ${description}`, color);
  if (details) {
    console.log(`  ${details}`);
  }
  
  if (condition) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  return condition;
}

// Mock environment variables
function setEnv(vars) {
  // Clear relevant env vars
  delete process.env.AUTH_PROVIDER;
  delete process.env.WORKATO_MOCK_MODE;
  
  // Set new vars
  Object.keys(vars).forEach(key => {
    process.env[key] = vars[key];
  });
}

// Clear module cache to reload with new env vars
function clearModuleCache() {
  const modulePath = require.resolve('../lib/auth/config');
  delete require.cache[modulePath];
}

// Test scenarios
function testAuthProviderSelection() {
  logSection('1. Testing AUTH_PROVIDER Selection');
  
  // Test 1: AUTH_PROVIDER=mock
  setEnv({ AUTH_PROVIDER: 'mock' });
  clearModuleCache();
  const config1 = require('../lib/auth/config');
  test(
    'AUTH_PROVIDER=mock selects mock provider',
    config1.getAuthProvider() === 'mock',
    `Result: ${config1.getAuthProvider()}`
  );
  test(
    'isMockMode is true when AUTH_PROVIDER=mock',
    config1.getAuthConfig().isMockMode === true,
    `isMockMode: ${config1.getAuthConfig().isMockMode}`
  );
  
  // Test 2: AUTH_PROVIDER=okta
  setEnv({ AUTH_PROVIDER: 'okta' });
  clearModuleCache();
  const config2 = require('../lib/auth/config');
  test(
    'AUTH_PROVIDER=okta selects okta provider',
    config2.getAuthProvider() === 'okta',
    `Result: ${config2.getAuthProvider()}`
  );
  test(
    'isOktaEnabled is true when AUTH_PROVIDER=okta',
    config2.getAuthConfig().isOktaEnabled === true,
    `isOktaEnabled: ${config2.getAuthConfig().isOktaEnabled}`
  );
  
  // Test 3: AUTH_PROVIDER=cognito
  setEnv({ AUTH_PROVIDER: 'cognito' });
  clearModuleCache();
  const config3 = require('../lib/auth/config');
  test(
    'AUTH_PROVIDER=cognito selects cognito provider',
    config3.getAuthProvider() === 'cognito',
    `Result: ${config3.getAuthProvider()}`
  );
  test(
    'isCognitoEnabled is true when AUTH_PROVIDER=cognito',
    config3.getAuthConfig().isCognitoEnabled === true,
    `isCognitoEnabled: ${config3.getAuthConfig().isCognitoEnabled}`
  );
}

function testBackwardCompatibility() {
  logSection('2. Testing Backward Compatibility');
  
  // Test 4: WORKATO_MOCK_MODE=true (no AUTH_PROVIDER)
  setEnv({ WORKATO_MOCK_MODE: 'true' });
  clearModuleCache();
  const config4 = require('../lib/auth/config');
  test(
    'WORKATO_MOCK_MODE=true selects mock provider',
    config4.getAuthProvider() === 'mock',
    `Result: ${config4.getAuthProvider()}`
  );
  
  // Test 5: WORKATO_MOCK_MODE=false (no AUTH_PROVIDER)
  setEnv({ WORKATO_MOCK_MODE: 'false' });
  clearModuleCache();
  const config5 = require('../lib/auth/config');
  test(
    'WORKATO_MOCK_MODE=false defaults to okta',
    config5.getAuthProvider() === 'okta',
    `Result: ${config5.getAuthProvider()}`
  );
  
  // Test 6: No environment variables set
  setEnv({});
  clearModuleCache();
  const config6 = require('../lib/auth/config');
  test(
    'No env vars defaults to okta',
    config6.getAuthProvider() === 'okta',
    `Result: ${config6.getAuthProvider()}`
  );
  
  // Test 7: AUTH_PROVIDER overrides WORKATO_MOCK_MODE
  setEnv({ AUTH_PROVIDER: 'cognito', WORKATO_MOCK_MODE: 'true' });
  clearModuleCache();
  const config7 = require('../lib/auth/config');
  test(
    'AUTH_PROVIDER=cognito overrides WORKATO_MOCK_MODE=true',
    config7.getAuthProvider() === 'cognito',
    `Result: ${config7.getAuthProvider()}`
  );
}

function testValidation() {
  logSection('3. Testing Validation');
  
  // Test 8: Invalid AUTH_PROVIDER value
  setEnv({ AUTH_PROVIDER: 'invalid' });
  clearModuleCache();
  try {
    const config8 = require('../lib/auth/config');
    config8.getAuthProvider();
    test(
      'Invalid AUTH_PROVIDER throws error',
      false,
      'Expected error but none was thrown'
    );
  } catch (error) {
    test(
      'Invalid AUTH_PROVIDER throws error',
      error.message.includes('Invalid AUTH_PROVIDER'),
      `Error: ${error.message}`
    );
  }
  
  // Test 9: Case insensitive AUTH_PROVIDER
  setEnv({ AUTH_PROVIDER: 'COGNITO' });
  clearModuleCache();
  const config9 = require('../lib/auth/config');
  test(
    'AUTH_PROVIDER is case insensitive',
    config9.getAuthProvider() === 'cognito',
    `Result: ${config9.getAuthProvider()}`
  );
  
  setEnv({ AUTH_PROVIDER: 'Mock' });
  clearModuleCache();
  const config10 = require('../lib/auth/config');
  test(
    'AUTH_PROVIDER=Mock works (case insensitive)',
    config10.getAuthProvider() === 'mock',
    `Result: ${config10.getAuthProvider()}`
  );
}

function testHelperFunctions() {
  logSection('4. Testing Helper Functions');
  
  // Test isAuthProviderEnabled
  setEnv({ AUTH_PROVIDER: 'cognito' });
  clearModuleCache();
  const config = require('../lib/auth/config');
  
  test(
    'isAuthProviderEnabled(cognito) returns true',
    config.isAuthProviderEnabled('cognito') === true,
    `Result: ${config.isAuthProviderEnabled('cognito')}`
  );
  
  test(
    'isAuthProviderEnabled(okta) returns false',
    config.isAuthProviderEnabled('okta') === false,
    `Result: ${config.isAuthProviderEnabled('okta')}`
  );
  
  test(
    'isAuthProviderEnabled(mock) returns false',
    config.isAuthProviderEnabled('mock') === false,
    `Result: ${config.isAuthProviderEnabled('mock')}`
  );
  
  // Test getAuthConfig
  const authConfig = config.getAuthConfig();
  test(
    'getAuthConfig returns correct provider',
    authConfig.provider === 'cognito',
    `provider: ${authConfig.provider}`
  );
  
  test(
    'getAuthConfig returns correct flags',
    authConfig.isCognitoEnabled === true &&
    authConfig.isOktaEnabled === false &&
    authConfig.isMockMode === false,
    `isCognitoEnabled: ${authConfig.isCognitoEnabled}, isOktaEnabled: ${authConfig.isOktaEnabled}, isMockMode: ${authConfig.isMockMode}`
  );
}

// Run all tests
function runTests() {
  log('\n🧪 Provider Switching Test Suite', 'blue');
  log('Testing authentication provider selection and switching logic.\n', 'blue');
  
  testAuthProviderSelection();
  testBackwardCompatibility();
  testValidation();
  testHelperFunctions();
  
  // Print summary
  logSection('Test Summary');
  
  log(`✓ Passed: ${results.passed}`, 'green');
  log(`✗ Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'reset');
  
  const total = results.passed + results.failed;
  const percentage = total > 0 ? Math.round((results.passed / total) * 100) : 0;
  
  console.log('\n' + '='.repeat(60));
  log(`Overall: ${percentage}% (${results.passed}/${total} tests passed)`, 
      percentage === 100 ? 'green' : percentage >= 80 ? 'yellow' : 'red');
  console.log('='.repeat(60) + '\n');
  
  if (results.failed === 0) {
    log('🎉 All tests passed! Provider switching works correctly.', 'green');
  } else {
    log('❌ Some tests failed. Please review the issues above.', 'red');
  }
  
  // Clean up
  setEnv({});
  clearModuleCache();
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the tests
runTests();
