#!/usr/bin/env node
/**
 * Verification script for useBedrockChat callback support
 * 
 * This script verifies that:
 * 1. onSSEEvent callback prop exists in UseBedrockChatOptions
 * 2. onToolExecution callback prop exists in UseBedrockChatOptions
 * 3. Callbacks are properly invoked in handleSSEEvent
 */

const fs = require('fs');
const path = require('path');

const hookPath = path.join(__dirname, '../hooks/use-bedrock-chat.ts');
const hookContent = fs.readFileSync(hookPath, 'utf-8');

console.log('Verifying useBedrockChat callback support...\n');

// Check 1: onSSEEvent callback in interface
const hasOnSSEEvent = /onSSEEvent\?\s*:\s*\(eventType:\s*string,\s*data:\s*any\)\s*=>\s*void/.test(hookContent);
console.log(`✓ onSSEEvent callback in UseBedrockChatOptions: ${hasOnSSEEvent ? 'PASS' : 'FAIL'}`);

// Check 2: onToolExecution callback in interface
const hasOnToolExecution = /onToolExecution\?\s*:\s*\(toolName:\s*string,\s*phase:\s*'start'\s*\|\s*'complete'\s*\|\s*'error',\s*data:\s*any\)\s*=>\s*void/.test(hookContent);
console.log(`✓ onToolExecution callback in UseBedrockChatOptions: ${hasOnToolExecution ? 'PASS' : 'FAIL'}`);

// Check 3: onSSEEvent is called (excluding tokens)
const callsOnSSEEvent = /if\s*\(\s*onSSEEvent\s*&&\s*data\.type\s*!==\s*'token'\s*\)/.test(hookContent);
console.log(`✓ onSSEEvent callback invoked (excluding tokens): ${callsOnSSEEvent ? 'PASS' : 'FAIL'}`);

// Check 4: onToolExecution is called for 'start'
const callsOnToolStart = /if\s*\(\s*onToolExecution\s*\)[\s\S]*?onToolExecution\(data\.toolName,\s*'start'/.test(hookContent);
console.log(`✓ onToolExecution callback invoked for 'start': ${callsOnToolStart ? 'PASS' : 'FAIL'}`);

// Check 5: onToolExecution is called for 'complete'
const callsOnToolComplete = /if\s*\(\s*onToolExecution\s*\)[\s\S]*?onToolExecution\(data\.toolName,\s*'complete'/.test(hookContent);
console.log(`✓ onToolExecution callback invoked for 'complete': ${callsOnToolComplete ? 'PASS' : 'FAIL'}`);

// Check 6: onToolExecution is called for 'error'
const callsOnToolError = /if\s*\(\s*onToolExecution\s*\)[\s\S]*?onToolExecution\(data\.toolName,\s*'error'/.test(hookContent);
console.log(`✓ onToolExecution callback invoked for 'error': ${callsOnToolError ? 'PASS' : 'FAIL'}`);

// Check 7: Callbacks are optional (don't break existing functionality)
const callbacksAreOptional = /onSSEEvent\?/.test(hookContent) && /onToolExecution\?/.test(hookContent);
console.log(`✓ Callbacks are optional: ${callbacksAreOptional ? 'PASS' : 'FAIL'}`);

// Check 8: Callbacks are in dependency array
const hasCallbacksInDeps = /\[closeConnection,\s*onError,\s*showErrorToast,\s*onSSEEvent,\s*onToolExecution\]/.test(hookContent);
console.log(`✓ Callbacks in useCallback dependency array: ${hasCallbacksInDeps ? 'PASS' : 'FAIL'}`);

const allPassed = hasOnSSEEvent && hasOnToolExecution && callsOnSSEEvent && 
                  callsOnToolStart && callsOnToolComplete && callsOnToolError &&
                  callbacksAreOptional && hasCallbacksInDeps;

console.log('\n' + '='.repeat(50));
console.log(allPassed ? '✓ All checks PASSED' : '✗ Some checks FAILED');
console.log('='.repeat(50));

process.exit(allPassed ? 0 : 1);
