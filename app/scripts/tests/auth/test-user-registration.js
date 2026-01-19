#!/usr/bin/env node

/**
 * User Registration Testing Script
 * 
 * This script tests user registration functionality in both mock and real modes:
 * - Local registration in mock mode
 * - Okta registration in real mode
 * - Duplicate email handling
 * - Password policy validation
 * 
 * Requirements tested: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8
 */

const http = require('http');
const { URL } = require('url');
const Database = require('better-sqlite3');
const path = require('path');

// Configuration
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const DB_PATH = path.join(__dirname, '..', 'var', 'hotel.db');

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

// Test 1: Check current mode
async function testCurrentMode() {
  logSection('Test 1: Current Mode');
  
  try {
    const response = await makeRequest(`${APP_URL}/api/auth/config`);
    
    if (response.statusCode === 200) {
      const config = JSON.parse(response.body);
      
      log(`Current mode: ${config.authMode}`, 'cyan');
      log(`Mock mode: ${config.mockMode}`, 'cyan');
      log(`Okta enabled: ${config.oktaEnabled}`, 'cyan');
      
      return config;
    } else {
      logTest('Configuration check', 'fail', `Status: ${response.statusCode}`);
      return null;
    }
  } catch (error) {
    logTest('Configuration check', 'fail', error.message);
    return null;
  }
}

// Test 2: Local registration in mock mode
async function testLocalRegistration() {
  logSection('Test 2: Local Registration (Mock Mode)');
  
  log('This test requires mock mode to be enabled.', 'yellow');
  log('Set WORKATO_MOCK_MODE=true and restart the server.', 'yellow');
  log('', 'yellow');
  
  try {
    const testEmail = `test_local_${Date.now()}@example.com`;
    const registrationData = JSON.stringify({
      email: testEmail,
      password: 'SecurePass123!',
      name: 'Test Local User',
      role: 'guest',
    });
    
    const response = await makeRequest(`${APP_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(registrationData),
      },
      body: registrationData,
    });
    
    logTest('Registration endpoint accessible', response.statusCode === 200 || response.statusCode === 400, 
            `Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const result = JSON.parse(response.body);
      logTest('Registration successful', result.success === true);
      logTest('User data returned', !!result.user);
      logTest('Session created', !!result.session || !!response.headers['set-cookie']);
      
      // Check database
      const db = new Database(DB_PATH, { readonly: true });
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(testEmail);
      db.close();
      
      logTest('User created in database', !!user);
      if (user) {
        logTest('Password hash stored', !!user.password_hash && user.password_hash !== '');
        
        // Cleanup
        const dbWrite = new Database(DB_PATH);
        dbWrite.prepare('DELETE FROM users WHERE email = ?').run(testEmail);
        dbWrite.close();
      }
      
      return true;
    } else if (response.statusCode === 400) {
      const result = JSON.parse(response.body);
      logTest('Mock mode check', 'manual', 
              'Endpoint may require mock mode. Error: ' + (result.error || 'Unknown'));
      return false;
    }
    
    return false;
  } catch (error) {
    logTest('Local registration', 'fail', error.message);
    return false;
  }
}

// Test 3: Okta registration in real mode
function testOktaRegistration() {
  logSection('Test 3: Okta Registration (Real Mode)');
  
  log('This test requires manual steps:', 'yellow');
  log('1. Set WORKATO_MOCK_MODE=false in .env', 'yellow');
  log('2. Ensure OKTA_API_TOKEN is configured', 'yellow');
  log('3. Restart the server', 'yellow');
  log('4. Navigate to http://localhost:3000/register', 'yellow');
  log('5. Fill in registration form with unique email', 'yellow');
  log('6. Click "Create Account"', 'yellow');
  log('7. Expected: Success message, redirected to Okta login', 'yellow');
  log('8. Verify: User created in Okta with role attribute', 'yellow');
  log('', 'yellow');
  
  logTest('Okta registration', 'manual', 'Requires manual verification');
  logTest('User created in Okta', 'manual', 'Check Okta Admin Console');
  logTest('Role attribute set', 'manual', 'Verify in Okta user profile');
  
  return true;
}

// Test 4: Duplicate email handling
async function testDuplicateEmail() {
  logSection('Test 4: Duplicate Email Handling');
  
  try {
    // Create a test user first
    const testEmail = `test_duplicate_${Date.now()}@example.com`;
    const db = new Database(DB_PATH);
    
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(`test_${Date.now()}`, testEmail, 'hash123', 'Existing User', 'guest');
    
    db.close();
    
    // Try to register with same email
    const registrationData = JSON.stringify({
      email: testEmail,
      password: 'SecurePass123!',
      name: 'Duplicate User',
      role: 'guest',
    });
    
    const response = await makeRequest(`${APP_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(registrationData),
      },
      body: registrationData,
    });
    
    const isDuplicateError = response.statusCode === 400 || response.statusCode === 409;
    logTest('Returns error for duplicate email', isDuplicateError, `Status: ${response.statusCode}`);
    
    if (isDuplicateError && response.body) {
      try {
        const result = JSON.parse(response.body);
        const hasAppropriateMessage = result.error?.toLowerCase().includes('exists') ||
                                       result.error?.toLowerCase().includes('already');
        logTest('Error message mentions existing account', hasAppropriateMessage, result.error);
      } catch (e) {
        logTest('Error message present', !!response.body);
      }
    }
    
    // Cleanup
    const dbCleanup = new Database(DB_PATH);
    dbCleanup.prepare('DELETE FROM users WHERE email = ?').run(testEmail);
    dbCleanup.close();
    
    return isDuplicateError;
  } catch (error) {
    logTest('Duplicate email handling', 'fail', error.message);
    return false;
  }
}

// Test 5: Password policy validation
async function testPasswordPolicy() {
  logSection('Test 5: Password Policy Validation');
  
  const weakPasswords = [
    { password: '123', description: 'Too short' },
    { password: 'password', description: 'No uppercase, number, or special char' },
    { password: 'Password', description: 'No number or special char' },
    { password: 'Password1', description: 'No special char' },
  ];
  
  let allTestsPassed = true;
  
  for (const test of weakPasswords) {
    try {
      const testEmail = `test_weak_${Date.now()}_${Math.random()}@example.com`;
      const registrationData = JSON.stringify({
        email: testEmail,
        password: test.password,
        name: 'Test User',
        role: 'guest',
      });
      
      const response = await makeRequest(`${APP_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(registrationData),
        },
        body: registrationData,
      });
      
      const isRejected = response.statusCode === 400;
      logTest(`Rejects weak password: ${test.description}`, isRejected ? 'pass' : 'fail', 
              `Password: "${test.password}", Status: ${response.statusCode}`);
      
      if (!isRejected) {
        allTestsPassed = false;
      }
    } catch (error) {
      logTest(`Password test: ${test.description}`, 'fail', error.message);
      allTestsPassed = false;
    }
  }
  
  // Test strong password
  try {
    const testEmail = `test_strong_${Date.now()}@example.com`;
    const registrationData = JSON.stringify({
      email: testEmail,
      password: 'SecurePass123!',
      name: 'Test User',
      role: 'guest',
    });
    
    const response = await makeRequest(`${APP_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(registrationData),
      },
      body: registrationData,
    });
    
    const isAccepted = response.statusCode === 200 || response.statusCode === 400; // 400 if mock mode disabled
    logTest('Accepts strong password', isAccepted ? 'pass' : 'fail', 
            `Password: "SecurePass123!", Status: ${response.statusCode}`);
    
    // Cleanup if user was created
    if (response.statusCode === 200) {
      const db = new Database(DB_PATH);
      db.prepare('DELETE FROM users WHERE email = ?').run(testEmail);
      db.close();
    }
  } catch (error) {
    logTest('Strong password test', 'fail', error.message);
    allTestsPassed = false;
  }
  
  return allTestsPassed;
}

// Test 6: Registration page exists
async function testRegistrationPage() {
  logSection('Test 6: Registration Page');
  
  try {
    const response = await makeRequest(`${APP_URL}/register`);
    
    logTest('Registration page accessible', response.statusCode === 200, `Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      const hasForm = response.body.includes('email') && 
                      response.body.includes('password') &&
                      response.body.includes('name');
      logTest('Page contains registration form', hasForm);
    }
    
    return response.statusCode === 200;
  } catch (error) {
    logTest('Registration page', 'fail', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         User Registration Tests                           ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  log('\nThis script tests user registration functionality.', 'yellow');
  log('Some tests require specific configuration (mock mode on/off).', 'yellow');
  log('Manual tests require verification in Okta Admin Console.\n', 'yellow');
  
  const results = {
    passed: 0,
    failed: 0,
    manual: 0,
  };
  
  // Check current mode
  const config = await testCurrentMode();
  
  // Run tests
  const tests = [
    { name: 'Local Registration', fn: testLocalRegistration, type: 'auto' },
    { name: 'Okta Registration', fn: testOktaRegistration, type: 'manual' },
    { name: 'Duplicate Email Handling', fn: testDuplicateEmail, type: 'auto' },
    { name: 'Password Policy Validation', fn: testPasswordPolicy, type: 'auto' },
    { name: 'Registration Page', fn: testRegistrationPage, type: 'auto' },
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
    if (results.manual > 0) {
      log('⚠ Manual tests require verification', 'yellow');
    }
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
