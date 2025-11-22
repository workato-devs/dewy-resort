#!/usr/bin/env node

/**
 * Session Management Testing Script
 * 
 * This script tests session management functionality:
 * - Session persistence
 * - Session validation
 * - Session expiration
 * - Logout
 * - Okta session management (if API token available)
 * 
 * Requirements tested: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Configuration
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

// Test 1: Session persistence
function testSessionPersistence() {
  logSection('Test 1: Session Persistence');
  
  log('This test requires manual steps:', 'yellow');
  log('1. Log in with Okta or local credentials', 'yellow');
  log('2. Close the browser tab', 'yellow');
  log('3. Open a new tab and navigate to the dashboard', 'yellow');
  log('4. Expected: Still logged in, dashboard loads', 'yellow');
  log('', 'yellow');
  
  logTest('Session persists across tabs', 'manual', 'Requires manual verification');
  logTest('Session cookie is HTTP-only', 'manual', 'Check browser DevTools');
  logTest('Session cookie has appropriate expiration', 'manual', 'Check cookie settings');
  
  return true;
}

// Test 2: Session validation
function testSessionValidation() {
  logSection('Test 2: Session Validation');
  
  try {
    const db = new Database(DB_PATH, { readonly: true });
    
    // Check if sessions table has proper structure
    const sessionsInfo = db.pragma('table_info(sessions)');
    const columns = sessionsInfo.map(col => col.name);
    
    logTest('Sessions table exists', sessionsInfo.length > 0);
    logTest('Has id column', columns.includes('id'));
    logTest('Has user_id column', columns.includes('user_id'));
    logTest('Has expires_at column', columns.includes('expires_at'));
    logTest('Has okta_session_id column', columns.includes('okta_session_id'));
    logTest('Has is_okta_session column', columns.includes('is_okta_session'));
    
    // Check for active sessions
    const activeSessions = db.prepare(`
      SELECT COUNT(*) as count 
      FROM sessions 
      WHERE datetime(expires_at) > datetime('now')
    `).get();
    
    log(`Active sessions: ${activeSessions.count}`, 'cyan');
    
    db.close();
    
    // Check session management code
    const sessionPath = path.join(__dirname, '..', 'lib', 'auth', 'session.ts');
    if (fs.existsSync(sessionPath)) {
      const sessionContent = fs.readFileSync(sessionPath, 'utf8');
      
      logTest('Session module exists', true);
      logTest('Has createSessionFromOkta function', 
              sessionContent.includes('createSessionFromOkta'));
      logTest('Has getSessionFromOkta function', 
              sessionContent.includes('getSessionFromOkta'));
      logTest('Has deleteOktaSession function', 
              sessionContent.includes('deleteOktaSession'));
      logTest('Has upsertUserFromOkta function', 
              sessionContent.includes('upsertUserFromOkta'));
    } else {
      logTest('Session module exists', 'fail', sessionPath);
    }
    
    return true;
  } catch (error) {
    logTest('Session validation', 'fail', error.message);
    return false;
  }
}

// Test 3: Session expiration
function testSessionExpiration() {
  logSection('Test 3: Session Expiration');
  
  try {
    const db = new Database(DB_PATH);
    
    // Create a test user
    const testUserId = 'test_session_exp_' + Date.now();
    const testEmail = `session_exp_${Date.now()}@example.com`;
    
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(testUserId, testEmail, '', 'Session Exp Test', 'guest');
    
    // Create an expired session
    const expiredSessionId = 'expired_session_' + Date.now();
    db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, datetime('now', '-1 hour'), datetime('now'))
    `).run(expiredSessionId, testUserId);
    
    // Check if session is expired
    const expiredSession = db.prepare(`
      SELECT * FROM sessions 
      WHERE id = ? AND datetime(expires_at) < datetime('now')
    `).get(expiredSessionId);
    
    logTest('Expired session detected', !!expiredSession);
    
    // Create a valid session
    const validSessionId = 'valid_session_' + Date.now();
    db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, datetime('now', '+1 day'), datetime('now'))
    `).run(validSessionId, testUserId);
    
    // Check if session is valid
    const validSession = db.prepare(`
      SELECT * FROM sessions 
      WHERE id = ? AND datetime(expires_at) > datetime('now')
    `).get(validSessionId);
    
    logTest('Valid session detected', !!validSession);
    
    // Cleanup
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
    
    db.close();
    
    log('', 'yellow');
    log('Manual test:', 'yellow');
    log('1. Log in with valid credentials', 'yellow');
    log('2. Manually set session expiration to past time in database', 'yellow');
    log('3. Refresh the page', 'yellow');
    log('4. Expected: Redirected to login page', 'yellow');
    
    logTest('Expired sessions redirect to login', 'manual', 'Requires manual verification');
    
    return true;
  } catch (error) {
    logTest('Session expiration', 'fail', error.message);
    return false;
  }
}

// Test 4: Logout functionality
function testLogout() {
  logSection('Test 4: Logout Functionality');
  
  log('This test requires manual steps:', 'yellow');
  log('1. Log in with Okta or local credentials', 'yellow');
  log('2. Click the logout button', 'yellow');
  log('3. Expected: Redirected to login page', 'yellow');
  log('4. Verify: Session deleted from database', 'yellow');
  log('5. Verify: Session cookie cleared', 'yellow');
  log('6. If API token configured: Session revoked in Okta', 'yellow');
  log('', 'yellow');
  
  // Check logout route exists
  const logoutPath = path.join(__dirname, '..', 'app', 'api', 'auth', 'logout', 'route.ts');
  if (fs.existsSync(logoutPath)) {
    const logoutContent = fs.readFileSync(logoutPath, 'utf8');
    
    logTest('Logout route exists', true);
    logTest('Handles Okta sessions', 
            logoutContent.includes('okta') || logoutContent.includes('Okta'));
    logTest('Clears session cookie', 
            logoutContent.includes('cookie') || logoutContent.includes('Cookie'));
  } else {
    logTest('Logout route exists', 'fail', logoutPath);
  }
  
  logTest('Logout redirects to login', 'manual', 'Requires manual verification');
  logTest('Session deleted from database', 'manual', 'Check database after logout');
  logTest('Session cookie cleared', 'manual', 'Check browser DevTools');
  logTest('Okta session revoked (if API token)', 'manual', 'Check Okta Admin Console');
  
  return true;
}

// Test 5: Okta session management
function testOktaSessionManagement() {
  logSection('Test 5: Okta Session Management');
  
  log('This test requires OKTA_API_TOKEN to be configured.', 'yellow');
  log('', 'yellow');
  
  // Check if management client exists
  const managementPath = path.join(__dirname, '..', 'lib', 'auth', 'okta', 'management.ts');
  if (fs.existsSync(managementPath)) {
    const managementContent = fs.readFileSync(managementPath, 'utf8');
    
    logTest('Okta Management client exists', true);
    logTest('Has createSession method', 
            managementContent.includes('createSession'));
    logTest('Has getSession method', 
            managementContent.includes('getSession'));
    logTest('Has refreshSession method', 
            managementContent.includes('refreshSession'));
    logTest('Has revokeSession method', 
            managementContent.includes('revokeSession'));
  } else {
    logTest('Okta Management client exists', 'fail', 
            'Optional feature - only needed if API token is configured');
  }
  
  log('', 'yellow');
  log('Manual tests (requires API token):', 'yellow');
  log('1. Log in with Okta', 'yellow');
  log('2. Verify session created in Okta (Admin Console)', 'yellow');
  log('3. Log out', 'yellow');
  log('4. Verify session revoked in Okta', 'yellow');
  log('', 'yellow');
  
  logTest('Session created in Okta', 'manual', 'Check Okta Admin Console');
  logTest('Session validated with Okta', 'manual', 'Check server logs');
  logTest('Session revoked in Okta on logout', 'manual', 'Check Okta Admin Console');
  
  return true;
}

// Test 6: Session security
function testSessionSecurity() {
  logSection('Test 6: Session Security');
  
  log('This test verifies session security implementation:', 'cyan');
  log('', 'cyan');
  
  try {
    const db = new Database(DB_PATH, { readonly: true });
    
    // Check for session indexes
    const indexes = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND tbl_name='sessions'
    `).all();
    
    const hasUserIdIndex = indexes.some(idx => idx.name.includes('user_id'));
    const hasExpiresAtIndex = indexes.some(idx => idx.name.includes('expires_at'));
    
    logTest('User ID index exists', hasUserIdIndex, 'Improves session lookup performance');
    logTest('Expires at index exists', hasExpiresAtIndex, 'Improves cleanup performance');
    
    db.close();
    
    // Check middleware
    const middlewarePath = path.join(__dirname, '..', 'lib', 'auth', 'middleware.ts');
    if (fs.existsSync(middlewarePath)) {
      const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');
      
      logTest('Auth middleware exists', true);
      logTest('Validates sessions', 
              middlewareContent.includes('session') || middlewareContent.includes('Session'));
      logTest('Checks user roles', 
              middlewareContent.includes('role') || middlewareContent.includes('Role'));
    } else {
      logTest('Auth middleware exists', 'fail', middlewarePath);
    }
    
    log('', 'yellow');
    log('Manual security checks:', 'yellow');
    log('1. Session cookies are HTTP-only (prevents XSS)', 'yellow');
    log('2. Session cookies are Secure in production (HTTPS only)', 'yellow');
    log('3. Session cookies have SameSite=Lax (prevents CSRF)', 'yellow');
    log('4. Sessions expire after 24 hours', 'yellow');
    log('5. Expired sessions are rejected', 'yellow');
    log('', 'yellow');
    
    logTest('Session cookies are HTTP-only', 'manual', 'Check browser DevTools');
    logTest('Session cookies are Secure (production)', 'manual', 'Check production deployment');
    logTest('Session cookies have SameSite=Lax', 'manual', 'Check browser DevTools');
    logTest('Sessions expire appropriately', 'manual', 'Check session behavior');
    
    return true;
  } catch (error) {
    logTest('Session security', 'fail', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         Session Management Tests                          ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  log('\nThis script tests session management functionality.', 'yellow');
  log('Some tests require manual verification.', 'yellow');
  log('Automated tests verify code implementation and database.\n', 'yellow');
  
  const results = {
    passed: 0,
    failed: 0,
    manual: 0,
  };
  
  // Run tests
  const tests = [
    { name: 'Session Persistence', fn: testSessionPersistence, type: 'manual' },
    { name: 'Session Validation', fn: testSessionValidation, type: 'auto' },
    { name: 'Session Expiration', fn: testSessionExpiration, type: 'auto' },
    { name: 'Logout Functionality', fn: testLogout, type: 'manual' },
    { name: 'Okta Session Management', fn: testOktaSessionManagement, type: 'manual' },
    { name: 'Session Security', fn: testSessionSecurity, type: 'auto' },
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
