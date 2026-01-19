#!/usr/bin/env node

/**
 * Verification script for useBedrockChatDebug refactoring
 * 
 * Verifies that:
 * 1. Debug hook wraps underlying useBedrockChat correctly
 * 2. Callbacks are properly passed to underlying hook
 * 3. Circular buffer is set to 200 events
 * 4. Messages come from underlying hook state
 * 5. clearDebugEvents doesn't clear messages
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying useBedrockChatDebug refactoring...\n');

const hookPath = path.join(__dirname, '../hooks/use-bedrock-chat-debug.ts');
const hookContent = fs.readFileSync(hookPath, 'utf-8');

let passed = 0;
let failed = 0;

function test(name, condition, details = '') {
  if (condition) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
    failed++;
  }
}

// Test 1: Check circular buffer size is 200
test(
  'Circular buffer set to 200 events',
  hookContent.includes('const MAX_DEBUG_EVENTS = 200'),
  'Expected MAX_DEBUG_EVENTS = 200'
);

// Test 2: Check that hook calls useBedrockChat
test(
  'Hook calls underlying useBedrockChat',
  hookContent.includes('const chatHook = useBedrockChat({'),
  'Expected to find useBedrockChat call'
);

// Test 3: Check that callbacks are passed to underlying hook
test(
  'onSSEEvent callback passed to underlying hook',
  hookContent.includes('onSSEEvent: handleSSEEvent'),
  'Expected onSSEEvent callback to be passed'
);

test(
  'onToolExecution callback passed to underlying hook',
  hookContent.includes('onToolExecution: handleToolExecution'),
  'Expected onToolExecution callback to be passed'
);

// Test 4: Check that sendMessage is wrapped
test(
  'sendMessage is wrapped for API call tracking',
  hookContent.includes('const wrappedSendMessage = useCallback(async (content: string)') &&
  hookContent.includes('await chatHook.sendMessage(content)'),
  'Expected wrapped sendMessage that delegates to underlying hook'
);

// Test 5: Check that duplicate fetch logic is removed
test(
  'No duplicate fetch logic in debug hook',
  !hookContent.includes('const response = await fetch(\'/api/chat/stream\'') ||
  hookContent.split('await fetch(\'/api/chat/stream\'').length === 1,
  'Expected no fetch calls in debug hook (should delegate to underlying hook)'
);

// Test 6: Check that duplicate stream processing is removed
test(
  'No duplicate stream processing logic',
  !hookContent.includes('const reader = response.body?.getReader()') &&
  !hookContent.includes('while (true) {') &&
  !hookContent.includes('const { done, value } = await reader.read()'),
  'Expected no stream processing in debug hook (should use callbacks)'
);

// Test 7: Check that messages come from underlying hook
test(
  'Messages come from underlying hook state',
  hookContent.includes('...chatHook,') &&
  hookContent.includes('sendMessage: wrappedSendMessage,'),
  'Expected to spread chatHook and override sendMessage'
);

// Test 8: Check clearDebugEvents implementation
test(
  'clearDebugEvents only clears debug events',
  hookContent.includes('const clearDebugEvents = useCallback(() => {') &&
  hookContent.includes('setDebugEvents([])') &&
  !hookContent.includes('chatHook.clearMessages()') ||
  hookContent.split('chatHook.clearMessages()').length === 1,
  'Expected clearDebugEvents to not call clearMessages'
);

// Test 9: Check SSE event tracking via callback
test(
  'SSE event tracking via handleSSEEvent callback',
  hookContent.includes('const handleSSEEvent = useCallback((eventType: string, data: any)') &&
  hookContent.includes('if (eventType === \'tool_use_start\')') &&
  hookContent.includes('if (eventType === \'tool_result\')') &&
  hookContent.includes('if (eventType === \'error\')'),
  'Expected handleSSEEvent callback to track SSE events'
);

// Test 10: Check tool execution tracking via callback
test(
  'Tool execution tracking via handleToolExecution callback',
  hookContent.includes('const handleToolExecution = useCallback(') &&
  hookContent.includes('if (phase === \'start\')') &&
  hookContent.includes('if (phase === \'complete\')') &&
  hookContent.includes('if (phase === \'error\')'),
  'Expected handleToolExecution callback to track tool executions'
);

// Test 11: Check that API call tracking logs start, success, and error
test(
  'API call tracking logs start, success, and error',
  hookContent.includes('addDebugEvent(\'api_call\'') &&
  hookContent.includes('}, \'pending\')') &&
  hookContent.includes('}, \'success\')') &&
  hookContent.includes('}, \'error\')'),
  'Expected API call tracking with pending, success, and error states'
);

// Test 12: Check error tracking via wrapped error handler
test(
  'Error tracking via wrappedOnError',
  hookContent.includes('const wrappedOnError = useCallback((error: Error)') &&
  hookContent.includes('addDebugEvent(\'error\'') &&
  hookContent.includes('onError: wrappedOnError'),
  'Expected wrappedOnError to track errors'
);

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed > 0) {
  console.log('\n❌ Verification failed. Please review the implementation.');
  process.exit(1);
} else {
  console.log('\n✅ All verifications passed!');
  console.log('\nThe useBedrockChatDebug hook has been successfully refactored to:');
  console.log('  • Wrap the underlying useBedrockChat hook');
  console.log('  • Use callbacks for SSE and tool execution tracking');
  console.log('  • Maintain a circular buffer of 200 events');
  console.log('  • Use underlying hook\'s message state directly');
  console.log('  • Separate debug event clearing from message clearing');
  process.exit(0);
}
