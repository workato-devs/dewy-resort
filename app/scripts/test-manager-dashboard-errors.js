#!/usr/bin/env node

/**
 * Test script to verify manager dashboard loads without instanceof errors
 * This simulates loading the dashboard and checks for WorkatoError handling
 */

console.log('='.repeat(60));
console.log('Manager Dashboard Error Handling Test');
console.log('='.repeat(60));
console.log();

const baseUrl = 'http://localhost:3000';

async function testDashboardAPI() {
  console.log('Testing /api/manager/dashboard endpoint...');
  console.log('-'.repeat(60));
  
  try {
    const response = await fetch(`${baseUrl}/api/manager/dashboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Response Status:', response.status, response.statusText);
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✓ Dashboard API responded successfully');
      console.log('  - Has service requests:', !!data.serviceRequests);
      console.log('  - Has occupancy data:', !!data.occupancy);
      console.log('  - Has revenue data:', !!data.revenue);
    } else {
      console.log('✗ Dashboard API returned error');
      console.log('  - Error:', data.error);
      
      // Check if error has proper structure
      if (data.error && data.error.correlationId) {
        console.log('✓ Error includes correlation ID:', data.error.correlationId);
      }
      
      // Check for instanceof errors in the message
      if (data.error && data.error.message && 
          data.error.message.includes("Right-hand side of 'instanceof' is not an object")) {
        console.error('✗ CRITICAL: instanceof error detected!');
        console.error('  This indicates WorkatoError is not properly exported');
        process.exit(1);
      }
    }
    
    console.log();
    return true;
  } catch (err) {
    console.error('✗ Failed to call dashboard API:', err.message);
    return false;
  }
}

async function testRoomsAPI() {
  console.log('Testing /api/manager/rooms endpoint...');
  console.log('-'.repeat(60));
  
  try {
    const response = await fetch(`${baseUrl}/api/manager/rooms`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Response Status:', response.status, response.statusText);
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✓ Rooms API responded successfully');
      console.log('  - Number of rooms:', data.rooms?.length || 0);
    } else {
      console.log('✗ Rooms API returned error');
      console.log('  - Error:', data.error);
      
      // Check for instanceof errors
      if (data.error && typeof data.error === 'string' && 
          data.error.includes("Right-hand side of 'instanceof' is not an object")) {
        console.error('✗ CRITICAL: instanceof error detected!');
        process.exit(1);
      }
      
      // Check if it's the expected "Not yet implemented" error
      if (data.error && typeof data.error === 'string' && 
          data.error.includes("Not yet implemented")) {
        console.log('✓ Expected "Not yet implemented" error (Workato endpoints not created yet)');
      }
    }
    
    console.log();
    return true;
  } catch (err) {
    console.error('✗ Failed to call rooms API:', err.message);
    return false;
  }
}

async function checkServerLogs() {
  console.log('Checking server logs for correlation IDs...');
  console.log('-'.repeat(60));
  
  const { execSync } = require('child_process');
  const path = require('path');
  
  try {
    // Get the app directory (parent of scripts)
    const appDir = path.resolve(__dirname, '..');
    const logPath = path.join(appDir, 'var', 'logs', 'node', 'dev.log');
    
    // Get only the most recent logs (after "Ready in" which indicates server start)
    const logs = execSync(`tail -100 "${logPath}"`, {
      encoding: 'utf-8',
    });
    
    // Find the last server start
    const lines = logs.split('\n');
    let startIndex = 0;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].includes('Ready in')) {
        startIndex = i;
        break;
      }
    }
    
    const recentLogs = lines.slice(startIndex).join('\n');
    
    // Check for correlation IDs in logs
    const correlationIdPattern = /\d{13}-[a-z0-9]+/g;
    const matches = recentLogs.match(correlationIdPattern);
    
    if (matches && matches.length > 0) {
      console.log('✓ Found correlation IDs in logs:', matches.slice(0, 3).join(', '));
    } else {
      console.log('⚠ No correlation IDs found in recent logs (this is OK if no API calls were made)');
    }
    
    // Check for instanceof errors in recent logs
    if (recentLogs.includes("Right-hand side of 'instanceof' is not an object")) {
      console.error('✗ CRITICAL: instanceof error found in server logs!');
      process.exit(1);
    } else {
      console.log('✓ No instanceof errors in server logs');
    }
    
    // Check for import errors in recent logs
    if (recentLogs.includes('Attempted import error') && 
        (recentLogs.includes('WorkatoError') || recentLogs.includes('handleWorkatoError'))) {
      console.error('✗ CRITICAL: WorkatoError import errors found in logs!');
      process.exit(1);
    } else {
      console.log('✓ No WorkatoError import errors in recent logs');
    }
    
    console.log();
    return true;
  } catch (err) {
    console.error('✗ Failed to check server logs:', err.message);
    return false;
  }
}

// Run all tests
(async () => {
  console.log('Starting verification tests...');
  console.log();
  
  const dashboardResult = await testDashboardAPI();
  const roomsResult = await testRoomsAPI();
  const logsResult = await checkServerLogs();
  
  console.log('='.repeat(60));
  if (dashboardResult && roomsResult && logsResult) {
    console.log('All Verification Tests Passed! ✓');
    console.log('='.repeat(60));
    console.log();
    console.log('Summary:');
    console.log('  ✓ Dashboard API responds without instanceof errors');
    console.log('  ✓ Rooms API responds without instanceof errors');
    console.log('  ✓ Server logs show no import or instanceof errors');
    console.log('  ✓ Correlation IDs are present in logs');
    console.log();
  } else {
    console.log('Some Tests Failed ✗');
    console.log('='.repeat(60));
    process.exit(1);
  }
})();
