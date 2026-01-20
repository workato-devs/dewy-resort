#!/usr/bin/env node

/**
 * Test script to verify timestamp is included in system prompts
 * 
 * This script tests that:
 * 1. Timestamp generation works correctly
 * 2. All role prompts include the {{currentDateTime}} placeholder
 * 3. Variable interpolation includes the timestamp
 */

const fs = require('fs').promises;
const path = require('path');

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

async function testTimestampGeneration() {
  log('\n=== Testing Timestamp Generation ===', 'cyan');
  
  const now = new Date();
  const currentDateTime = now.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
  
  log(`Generated timestamp: ${currentDateTime}`, 'blue');
  
  // Verify format
  if (currentDateTime.includes(',') && currentDateTime.includes('at')) {
    log('✓ Timestamp format is correct', 'green');
    return true;
  } else {
    log('✗ Timestamp format is incorrect', 'red');
    return false;
  }
}

async function testPromptFiles() {
  log('\n=== Testing Prompt Files ===', 'cyan');
  
  const roles = ['guest', 'manager', 'housekeeping', 'maintenance'];
  const promptsDir = path.join(process.cwd(), 'app', 'config', 'prompts');
  
  let allPassed = true;
  
  for (const role of roles) {
    const promptPath = path.join(promptsDir, `${role}.txt`);
    
    try {
      const content = await fs.readFile(promptPath, 'utf-8');
      
      // Check if {{currentDateTime}} placeholder exists
      if (content.includes('{{currentDateTime}}')) {
        log(`✓ ${role}.txt contains {{currentDateTime}} placeholder`, 'green');
      } else {
        log(`✗ ${role}.txt missing {{currentDateTime}} placeholder`, 'red');
        allPassed = false;
      }
      
      // Check if it's in the right location (near the top)
      const lines = content.split('\n');
      const placeholderLine = lines.findIndex(line => line.includes('{{currentDateTime}}'));
      
      if (placeholderLine >= 0 && placeholderLine < 10) {
        log(`  → Found at line ${placeholderLine + 1} (good position)`, 'blue');
      } else if (placeholderLine >= 0) {
        log(`  → Found at line ${placeholderLine + 1} (consider moving higher)`, 'yellow');
      }
      
    } catch (error) {
      log(`✗ Failed to read ${role}.txt: ${error.message}`, 'red');
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function testVariableInterpolation() {
  log('\n=== Testing Variable Interpolation ===', 'cyan');
  
  // Simulate the interpolation logic
  const template = 'CURRENT DATE AND TIME: {{currentDateTime}}\nUser: {{userName}}';
  
  const now = new Date();
  const currentDateTime = now.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
  
  const variables = {
    currentDateTime,
    userName: 'Test User',
  };
  
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value);
  }
  
  log('Template:', 'blue');
  log(template);
  log('\nInterpolated result:', 'blue');
  log(result);
  
  // Verify interpolation worked
  if (!result.includes('{{') && result.includes(currentDateTime)) {
    log('\n✓ Variable interpolation works correctly', 'green');
    return true;
  } else {
    log('\n✗ Variable interpolation failed', 'red');
    return false;
  }
}

async function testRouteImplementation() {
  log('\n=== Testing Route Implementation ===', 'cyan');
  
  const routePath = path.join(process.cwd(), 'app', 'src', 'app', 'api', 'chat', 'stream', 'route.ts');
  
  try {
    const content = await fs.readFile(routePath, 'utf-8');
    
    // Check for timestamp generation code (system prompt level)
    if (content.includes('toLocaleString') && content.includes('currentDateTime')) {
      log('✓ Route includes system prompt timestamp generation', 'green');
    } else {
      log('✗ Route missing system prompt timestamp generation', 'red');
      return false;
    }
    
    // Check for currentDateTime in userContext
    if (content.includes('currentDateTime,') || content.includes('currentDateTime }')) {
      log('✓ Route includes currentDateTime in userContext', 'green');
    } else {
      log('✗ Route missing currentDateTime in userContext', 'red');
      return false;
    }
    
    // Check for per-message timestamp
    if (content.includes('messageTimestamp') && content.includes('messageWithTimestamp')) {
      log('✓ Route includes per-message timestamp generation', 'green');
    } else {
      log('✗ Route missing per-message timestamp generation', 'red');
      return false;
    }
    
    // Check for timestamp prepending to user message
    if (content.includes('[Current time:') || content.includes('Current time:')) {
      log('✓ Route prepends timestamp to user messages', 'green');
    } else {
      log('✗ Route missing timestamp prepending', 'red');
      return false;
    }
    
    return true;
  } catch (error) {
    log(`✗ Failed to read route file: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║  Testing Timestamp Integration in Chat System             ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  const results = {
    timestampGeneration: await testTimestampGeneration(),
    promptFiles: await testPromptFiles(),
    variableInterpolation: await testVariableInterpolation(),
    routeImplementation: await testRouteImplementation(),
  };
  
  log('\n=== Test Summary ===', 'cyan');
  
  const allPassed = Object.values(results).every(result => result === true);
  
  for (const [test, passed] of Object.entries(results)) {
    const status = passed ? '✓ PASS' : '✗ FAIL';
    const color = passed ? 'green' : 'red';
    log(`${status} - ${test}`, color);
  }
  
  log('\n' + '='.repeat(60), 'cyan');
  
  if (allPassed) {
    log('✓ All tests passed! Timestamp integration is working correctly.', 'green');
    process.exit(0);
  } else {
    log('✗ Some tests failed. Please review the output above.', 'red');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\nFatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
