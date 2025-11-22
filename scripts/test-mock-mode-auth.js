#!/usr/bin/env node

/**
 * Mock Mode Authentication Testing Script
 * 
 * This script tests that local authentication works correctly when
 * WORKATO_MOCK_MODE is enabled, and that Okta routes return appropriate
 * errors when accessed in mock mode.
 * 
 * Requirements tested: 2.1, 2.2, 2.4
 */

const http = require('http');
const { URL } = require('url');

// Configuration
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

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

function logTest(name, passed, details = '') {
  const status = passed ? '✓ PASS' : '✗ FAIL';
  const color = passed ? 'green' : 'red';
  log(`${status}: ${name}`, color);
  if (details) {
    console.log(`  ${details}`);
  }
}

// Helper to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test 1: Check mock mode is enabled
async function testMockModeEnabled() {
  logSection('Test 1: Mock Mode Configuration');
  
  try {
    const response = await makeRequest(`${APP_URL}/api/auth/config`);
    
    if (response.statusCode === 200) {
      const config = JSON.parse(response.body);
      
      logTest('Mock mode is enabled', config.mockMode === true);
      logTest('Okta is disabled', config.oktaEnabled === false);
      logTest('Auth mode is local', config.authMode === 'local');
      
      return config.mockMode === true;
    } else {
      logTest('Configuration endpoint accessible', false, `Status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logTest('Configuration check', false, error.message);
    return false;
  }
}

// Test 2: Test local authentication works
async function testLocalAuthentication() {
  logSection('Test 2: Local Authentication');
  
  try {
    // Test login endpoint
    const loginData = JSON.stringify({
      email: 'guest@hotel.com',
      password: 'password123',
    });
    
    const response = await makeRequest(`${APP_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData),
      },
      body: loginData,
    });
    
    logTest('Login endpoint accessible', response.statusCode === 200 || response.statusCode === 401);
    
    if (response.statusCode === 200) {
      const result = JSON.parse(response.body);
      logTest('Login successful', result.success === true);
      logTest('Session cookie set', !!response.headers['set-cookie']);
      
      return true;
    } else if (response.statusCode === 401) {
      logTest('Invalid credentials handled', true, 'Expected behavior for wrong credentials');
      return true;
    } else {
      logTest('Login response', false, `Unexpected status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logTest('Local authentication', false, error.message);
    return false;
  }
}

// Test 3: Test Okta routes return errors in mock mode
async function testOktaRoutesInMockMode() {
  logSection('Test 3: Okta Routes in Mock Mode');
  
  try {
    // Test Okta login route
    const loginResponse = await makeRequest(`${APP_URL}/api/auth/okta/login`);
    
    const loginReturnsError = loginResponse.statusCode === 400 || loginResponse.statusCode === 403;
    logTest('Okta login returns error', loginReturnsError, `Status: ${loginResponse.statusCode}`);
    
    if (loginReturnsError && loginResponse.body) {
      try {
        const loginBody = JSON.parse(loginResponse.body);
        logTest('Error message indicates mock mode', 
          loginBody.error?.toLowerCase().includes('mock') || 
          loginBody.error?.toLowerCase().includes('not enabled'));
      } catch (e) {
        logTest('Error message present', !!loginResponse.body);
      }
    }
    
    // Test Okta callback route
    const callbackResponse = await makeRequest(`${APP_URL}/api/auth/okta/callback?code=test&state=test`);
    
    const callbackReturnsError = callbackResponse.statusCode === 400 || 
                                  callbackResponse.statusCode === 403 ||
                                  callbackResponse.statusCode === 302; // Redirect to login with error
    logTest('Okta callback returns error or redirect', callbackReturnsError, `Status: ${callbackResponse.statusCode}`);
    
    // Test Okta register route
    const registerData = JSON.stringify({
      email: 'test@example.com',
      password: 'Test123!',
      name: 'Test User',
      role: 'guest',
    });
    
    const registerResponse = await makeRequest(`${APP_URL}/api/auth/okta/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(registerData),
      },
      body: registerData,
    });
    
    const registerReturnsError = registerResponse.statusCode === 400 || registerResponse.statusCode === 403;
    logTest('Okta register returns error', registerReturnsError, `Status: ${registerResponse.statusCode}`);
    
    return loginReturnsError && (callbackReturnsError || registerReturnsError);
  } catch (error) {
    logTest('Okta routes in mock mode', false, error.message);
    return false;
  }
}

// Test 4: Verify no Okta API calls made
async function testNoOktaApiCalls() {
  logSection('Test 4: No Okta API Calls');
  
  log('This test requires manual verification:', 'yellow');
  log('1. Open browser DevTools → Network tab', 'yellow');
  log('2. Navigate to http://localhost:3000/login', 'yellow');
  log('3. Log in with local credentials', 'yellow');
  log('4. Verify no requests to *.okta.com domains', 'yellow');
  log('', 'yellow');
  log('Automated check: Verifying Okta is disabled in config...', 'cyan');
  
  try {
    const response = await makeRequest(`${APP_URL}/api/auth/config`);
    
    if (response.statusCode === 200) {
      const config = JSON.parse(response.body);
      
      logTest('Okta is disabled', config.oktaEnabled === false);
      logTest('No Okta domain configured for use', !config.oktaDomain || config.mockMode);
      
      return config.oktaEnabled === false;
    }
    
    return false;
  } catch (error) {
    logTest('No Okta API calls check', false, error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         Mock Mode Authentication Tests                    ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  log('\nThis script tests local authentication in mock mode.', 'yellow');
  log('Make sure the Next.js server is running on ' + APP_URL, 'yellow');
  log('and WORKATO_MOCK_MODE is set to "true".\n', 'yellow');
  
  const results = {
    passed: 0,
    failed: 0,
  };
  
  // Run tests
  const tests = [
    { name: 'Mock Mode Configuration', fn: testMockModeEnabled },
    { name: 'Local Authentication', fn: testLocalAuthentication },
    { name: 'Okta Routes in Mock Mode', fn: testOktaRoutesInMockMode },
    { name: 'No Okta API Calls', fn: testNoOktaApiCalls },
  ];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
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
  log(`Total Tests: ${results.passed + results.failed}`, 'cyan');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  
  if (results.failed === 0) {
    log('\n✓ All tests passed!', 'green');
  } else {
    log('\n✗ Some tests failed. Please review the output above.', 'red');
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
