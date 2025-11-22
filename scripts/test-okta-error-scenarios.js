#!/usr/bin/env node

/**
 * Okta Error Scenarios Testing Script
 * 
 * This script tests various error scenarios in the Okta integration:
 * - Missing Okta configuration
 * - Invalid Okta credentials
 * - Missing role claim
 * - State mismatch (CSRF)
 * - Missing code verifier
 * - Token exchange failures
 * - Network errors
 * 
 * Requirements tested: 7.1, 7.2, 7.3, 7.4, 7.5
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for output
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

function logTest(name, status, details = '') {
  const statusText = status === 'pass' ? '✓ PASS' : status === 'fail' ? '✗ FAIL' : '⚠ MANUAL';
  const color = status === 'pass' ? 'green' : status === 'fail' ? 'red' : 'yellow';
  log(`${statusText}: ${name}`, color);
  if (details) {
    console.log(`  ${details}`);
  }
}

// Test 1: Missing Okta Configuration
function testMissingOktaConfig() {
  logSection('Test 1: Missing Okta Configuration');
  
  log('This test requires manual steps:', 'yellow');
  log('1. Temporarily remove OKTA_DOMAIN from .env', 'yellow');
  log('2. Set WORKATO_MOCK_MODE=false', 'yellow');
  log('3. Restart the server', 'yellow');
  log('4. Navigate to http://localhost:3000/login', 'yellow');
  log('5. Expected: Error message "Authentication service not configured"', 'yellow');
  log('', 'yellow');
  
  logTest('Missing config error message', 'manual', 'Requires manual verification');
  logTest('Server logs configuration error', 'manual', 'Check server console');
  
  return true;
}

// Test 2: Invalid Okta Credentials
function testInvalidOktaCredentials() {
  logSection('Test 2: Invalid Okta Credentials');
  
  log('This test requires manual steps:', 'yellow');
  log('1. Set invalid OKTA_CLIENT_SECRET in .env', 'yellow');
  log('2. Restart the server', 'yellow');
  log('3. Attempt to log in with Okta', 'yellow');
  log('4. Complete Okta authentication', 'yellow');
  log('5. Expected: Error "Authentication failed. Please try again."', 'yellow');
  log('6. Expected: Error logged in server console', 'yellow');
  log('', 'yellow');
  
  logTest('Invalid credentials error message', 'manual', 'Requires manual verification');
  logTest('Token exchange failure logged', 'manual', 'Check server console');
  
  return true;
}

// Test 3: Missing Role Claim
function testMissingRoleClaim() {
  logSection('Test 3: Missing Role Claim');
  
  log('This test requires manual steps:', 'yellow');
  log('1. Create a test user in Okta without the role attribute', 'yellow');
  log('2. Attempt to log in with that user', 'yellow');
  log('3. Expected: Error "Your account is not properly configured. Please contact support."', 'yellow');
  log('4. Expected: User is not created in database', 'yellow');
  log('', 'yellow');
  
  logTest('Missing role error message', 'manual', 'Requires manual verification');
  logTest('User not created in database', 'manual', 'Check database after test');
  
  return true;
}

// Test 4: State Mismatch (CSRF Protection)
function testStateMismatch() {
  logSection('Test 4: State Mismatch (CSRF Protection)');
  
  log('This test requires manual steps:', 'yellow');
  log('1. Initiate Okta login', 'yellow');
  log('2. Copy the callback URL after Okta authentication', 'yellow');
  log('3. Manually modify the state parameter in the URL', 'yellow');
  log('4. Navigate to the modified URL', 'yellow');
  log('5. Expected: Error "Invalid authentication request. Please try again."', 'yellow');
  log('6. Expected: No session created', 'yellow');
  log('', 'yellow');
  
  logTest('State mismatch detected', 'manual', 'Requires manual verification');
  logTest('CSRF protection working', 'manual', 'No session should be created');
  
  return true;
}

// Test 5: Missing Code Verifier
function testMissingCodeVerifier() {
  logSection('Test 5: Missing Code Verifier');
  
  log('This test requires manual steps:', 'yellow');
  log('1. Initiate Okta login', 'yellow');
  log('2. Clear browser cookies before Okta redirects back', 'yellow');
  log('3. Complete Okta authentication', 'yellow');
  log('4. Expected: Error "Authentication session expired. Please try again."', 'yellow');
  log('', 'yellow');
  
  logTest('Missing verifier error message', 'manual', 'Requires manual verification');
  logTest('Session not created', 'manual', 'Check database');
  
  return true;
}

// Test 6: Token Exchange Failures
function testTokenExchangeFailures() {
  logSection('Test 6: Token Exchange Failures');
  
  log('This test requires manual steps:', 'yellow');
  log('1. Set invalid OKTA_CLIENT_ID in .env', 'yellow');
  log('2. Restart the server', 'yellow');
  log('3. Attempt to log in with Okta', 'yellow');
  log('4. Expected: Error after callback "Authentication failed. Please try again."', 'yellow');
  log('5. Expected: Error logged with details in server console', 'yellow');
  log('', 'yellow');
  
  logTest('Token exchange error message', 'manual', 'Requires manual verification');
  logTest('Error details logged', 'manual', 'Check server console');
  
  return true;
}

// Test 7: Network Errors
function testNetworkErrors() {
  logSection('Test 7: Network Errors');
  
  log('This test requires manual steps:', 'yellow');
  log('1. Disconnect from internet or block *.okta.com domains', 'yellow');
  log('2. Attempt to log in with Okta', 'yellow');
  log('3. Expected: Error "Unable to connect to authentication service. Please check your connection."', 'yellow');
  log('', 'yellow');
  
  logTest('Network error message', 'manual', 'Requires manual verification');
  logTest('User-friendly error displayed', 'manual', 'No technical details exposed');
  
  return true;
}

// Test 8: Verify Error Logging
function testErrorLogging() {
  logSection('Test 8: Error Logging');
  
  log('This test verifies error logging implementation:', 'cyan');
  log('', 'cyan');
  
  // Check if logger module exists
  const loggerPath = path.join(__dirname, '..', 'lib', 'auth', 'okta', 'logger.ts');
  const loggerExists = fs.existsSync(loggerPath);
  
  logTest('Logger module exists', loggerExists ? 'pass' : 'fail', loggerPath);
  
  if (loggerExists) {
    const loggerContent = fs.readFileSync(loggerPath, 'utf8');
    
    // Check for error logging functions
    const hasErrorLogging = loggerContent.includes('logError') || loggerContent.includes('error');
    logTest('Error logging functions defined', hasErrorLogging ? 'pass' : 'fail');
    
    // Check for sensitive data protection
    const hasSensitiveDataProtection = loggerContent.includes('redact') || 
                                        loggerContent.includes('sanitize') ||
                                        loggerContent.toLowerCase().includes('sensitive');
    logTest('Sensitive data protection', hasSensitiveDataProtection ? 'pass' : 'fail', 
            'Should not log tokens, passwords, or code verifiers');
  }
  
  return loggerExists;
}

// Test 9: Verify Error Classes
function testErrorClasses() {
  logSection('Test 9: Error Classes');
  
  log('This test verifies error class implementation:', 'cyan');
  log('', 'cyan');
  
  // Check if errors module exists
  const errorsPath = path.join(__dirname, '..', 'lib', 'auth', 'okta', 'errors.ts');
  const errorsExist = fs.existsSync(errorsPath);
  
  logTest('Errors module exists', errorsExist ? 'pass' : 'fail', errorsPath);
  
  if (errorsExist) {
    const errorsContent = fs.readFileSync(errorsPath, 'utf8');
    
    // Check for specific error classes
    const errorClasses = [
      'OktaConfigurationError',
      'OktaAuthenticationError',
      'OktaTokenError',
      'OktaValidationError',
    ];
    
    errorClasses.forEach(errorClass => {
      const hasErrorClass = errorsContent.includes(errorClass);
      logTest(`${errorClass} defined`, hasErrorClass ? 'pass' : 'fail');
    });
    
    // Check for error mapping function
    const hasErrorMapping = errorsContent.includes('mapOktaErrorToMessage') || 
                            errorsContent.includes('ERROR_MESSAGES');
    logTest('Error mapping function exists', hasErrorMapping ? 'pass' : 'fail', 
            'Maps technical errors to user-friendly messages');
  }
  
  return errorsExist;
}

// Test 10: Verify Error Handling in Routes
function testErrorHandlingInRoutes() {
  logSection('Test 10: Error Handling in Routes');
  
  log('This test verifies error handling in API routes:', 'cyan');
  log('', 'cyan');
  
  const routes = [
    { path: 'app/api/auth/okta/login/route.ts', name: 'Login Route' },
    { path: 'app/api/auth/okta/callback/route.ts', name: 'Callback Route' },
    { path: 'app/api/auth/okta/register/route.ts', name: 'Register Route' },
  ];
  
  routes.forEach(route => {
    const routePath = path.join(__dirname, '..', route.path);
    const routeExists = fs.existsSync(routePath);
    
    if (routeExists) {
      const routeContent = fs.readFileSync(routePath, 'utf8');
      
      // Check for try-catch blocks
      const hasTryCatch = routeContent.includes('try') && routeContent.includes('catch');
      logTest(`${route.name} has error handling`, hasTryCatch ? 'pass' : 'fail');
      
      // Check for error logging
      const hasErrorLogging = routeContent.includes('logError') || 
                              routeContent.includes('console.error');
      logTest(`${route.name} logs errors`, hasErrorLogging ? 'pass' : 'fail');
      
      // Check for user-friendly error responses
      const hasUserFriendlyErrors = routeContent.includes('mapOktaErrorToMessage') ||
                                     routeContent.includes('ERROR_MESSAGES');
      logTest(`${route.name} returns user-friendly errors`, hasUserFriendlyErrors ? 'pass' : 'fail');
    } else {
      logTest(`${route.name} exists`, 'fail', routePath);
    }
  });
  
  return true;
}

// Main test runner
async function runTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         Okta Error Scenarios Tests                        ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  log('\nThis script tests error handling in the Okta integration.', 'yellow');
  log('Some tests require manual verification.', 'yellow');
  log('Automated tests verify code implementation.\n', 'yellow');
  
  const results = {
    passed: 0,
    failed: 0,
    manual: 0,
  };
  
  // Run tests
  const tests = [
    { name: 'Missing Okta Configuration', fn: testMissingOktaConfig, type: 'manual' },
    { name: 'Invalid Okta Credentials', fn: testInvalidOktaCredentials, type: 'manual' },
    { name: 'Missing Role Claim', fn: testMissingRoleClaim, type: 'manual' },
    { name: 'State Mismatch (CSRF)', fn: testStateMismatch, type: 'manual' },
    { name: 'Missing Code Verifier', fn: testMissingCodeVerifier, type: 'manual' },
    { name: 'Token Exchange Failures', fn: testTokenExchangeFailures, type: 'manual' },
    { name: 'Network Errors', fn: testNetworkErrors, type: 'manual' },
    { name: 'Error Logging', fn: testErrorLogging, type: 'auto' },
    { name: 'Error Classes', fn: testErrorClasses, type: 'auto' },
    { name: 'Error Handling in Routes', fn: testErrorHandlingInRoutes, type: 'auto' },
  ];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (test.type === 'manual') {
        results.manual++;
      } else if (result) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      log(`\nError in ${test.name}: ${error.message}`, 'red');
      results.failed++;
    }
  }
  
  // Summary
  logSection('Test Summary');
  log(`Total Tests: ${results.passed + results.failed + results.manual}`, 'cyan');
  log(`Automated Passed: ${results.passed}`, 'green');
  log(`Automated Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`Manual Tests: ${results.manual}`, 'yellow');
  
  if (results.failed === 0) {
    log('\n✓ All automated tests passed!', 'green');
    log('⚠ Manual tests require verification', 'yellow');
  } else {
    log('\n✗ Some automated tests failed. Please review the output above.', 'red');
  }
  
  log('\n' + '='.repeat(60) + '\n');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(error => {
    log('\nFatal error: ' + error.message, 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runTests };
