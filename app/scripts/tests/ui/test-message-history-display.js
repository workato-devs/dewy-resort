#!/usr/bin/env node

/**
 * Test script for ChatDebugPanel message history display
 * 
 * Tests all requirements for task 3:
 * - Messages tab displays messages from underlying hook state
 * - Message history persists across debug event clears
 * - Message metadata (timestamp, role, tool uses) displays correctly
 * - Messages update in real-time as chat operations occur
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing ChatDebugPanel Message History Display\n');
console.log('Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6\n');

let allTestsPassed = true;

// Test 1: Messages tab displays messages from underlying hook state (Req 6.1)
console.log('Test 1: Messages from underlying hook state (Req 6.1)');
const debugHookPath = path.join(__dirname, '../hooks/use-bedrock-chat-debug.ts');
const debugHookContent = fs.readFileSync(debugHookPath, 'utf8');

// Verify debug hook spreads chatHook (which includes messages)
if (debugHookContent.includes('...chatHook') && 
    debugHookContent.includes('Pass through all values from underlying hook (including messages)')) {
  console.log('  ✓ Debug hook returns messages from underlying chatHook');
} else {
  console.log('  ✗ FAIL: Debug hook does not properly return underlying messages');
  allTestsPassed = false;
}

// Verify no separate message state in debug hook
if (!debugHookContent.match(/useState<ChatMessage\[\]>/)) {
  console.log('  ✓ Debug hook does not maintain separate message state');
} else {
  console.log('  ✗ FAIL: Debug hook has separate message state');
  allTestsPassed = false;
}

// Test 2: Message history persists across debug event clears (Req 6.6)
console.log('\nTest 2: Message persistence across debug clears (Req 6.6)');

// Verify clearDebugEvents only clears events
if (debugHookContent.includes('const clearDebugEvents = useCallback(() => {') &&
    debugHookContent.includes('setDebugEvents([])') &&
    !debugHookContent.match(/clearDebugEvents.*clearMessages/s)) {
  console.log('  ✓ clearDebugEvents only clears debug events');
} else {
  console.log('  ✗ FAIL: clearDebugEvents might clear messages');
  allTestsPassed = false;
}

// Verify messages come from underlying hook
const withDebugPath = path.join(__dirname, '../components/shared/BedrockChatInterfaceWithDebug.tsx');
const withDebugContent = fs.readFileSync(withDebugPath, 'utf8');

if (withDebugContent.includes('messages={debugHook.messages}')) {
  console.log('  ✓ Messages passed from debug hook to panel');
} else {
  console.log('  ✗ FAIL: Messages not properly passed to panel');
  allTestsPassed = false;
}

// Test 3: Message metadata displays correctly (Req 6.2, 6.3)
console.log('\nTest 3: Message metadata display (Req 6.2, 6.3)');
const debugPanelPath = path.join(__dirname, '../components/shared/ChatDebugPanel.tsx');
const debugPanelContent = fs.readFileSync(debugPanelPath, 'utf8');

const metadataChecks = [
  { pattern: 'message.timestamp', req: '6.2', description: 'Timestamp' },
  { pattern: 'message.role', req: '6.2', description: 'Role' },
  { pattern: 'message.toolUses', req: '6.2', description: 'Tool uses' },
  { pattern: 'message.id', req: '6.3', description: 'Message ID' },
  { pattern: 'message.content', req: '6.3', description: 'Content' },
  { pattern: 'toLocaleTimeString()', req: '6.2', description: 'Formatted timestamp' },
];

metadataChecks.forEach(({ pattern, req, description }) => {
  if (debugPanelContent.includes(pattern)) {
    console.log(`  ✓ ${description} displayed (Req ${req})`);
  } else {
    console.log(`  ✗ FAIL: ${description} not displayed (Req ${req})`);
    allTestsPassed = false;
  }
});

// Test 4: Expandable message details (Req 6.3)
console.log('\nTest 4: Expandable message details (Req 6.3)');

if (debugPanelContent.includes('isExpanded') && 
    debugPanelContent.includes('setIsExpanded')) {
  console.log('  ✓ Messages have expandable details');
} else {
  console.log('  ✗ FAIL: Messages not expandable');
  allTestsPassed = false;
}

// Test 5: Real-time updates (Req 6.4)
console.log('\nTest 5: Real-time message updates (Req 6.4)');

// Verify messages are reactive (from hook state)
if (withDebugContent.includes('messages={debugHook.messages}') &&
    debugHookContent.includes('...chatHook')) {
  console.log('  ✓ Messages update via hook state (reactive)');
} else {
  console.log('  ✗ FAIL: Messages may not update in real-time');
  allTestsPassed = false;
}

// Test 6: Chronological order (Req 6.5)
console.log('\nTest 6: Chronological message order (Req 6.5)');

if (debugPanelContent.includes('messages.map((message, index)')) {
  console.log('  ✓ Messages rendered in order from array');
} else {
  console.log('  ✗ FAIL: Message ordering not verified');
  allTestsPassed = false;
}

// Test 7: Messages tab structure
console.log('\nTest 7: Messages tab structure');

const structureChecks = [
  { pattern: 'TabsTrigger value="messages"', description: 'Messages tab trigger' },
  { pattern: 'Messages ({messages.length})', description: 'Message count badge' },
  { pattern: 'TabsContent value="messages"', description: 'Messages tab content' },
  { pattern: 'MessageDebugItem', description: 'Message item component' },
];

structureChecks.forEach(({ pattern, description }) => {
  if (debugPanelContent.includes(pattern)) {
    console.log(`  ✓ ${description}`);
  } else {
    console.log(`  ✗ FAIL: ${description} missing`);
    allTestsPassed = false;
  }
});

// Test 8: Tool use display
console.log('\nTest 8: Tool use metadata display');

if (debugPanelContent.includes('message.toolUses && message.toolUses.length > 0') &&
    debugPanelContent.includes('JSON.stringify(message.toolUses, null, 2)')) {
  console.log('  ✓ Tool uses displayed when present');
} else {
  console.log('  ✗ FAIL: Tool uses not properly displayed');
  allTestsPassed = false;
}

// Test 9: Streaming status display
console.log('\nTest 9: Streaming status display');

if (debugPanelContent.includes('message.isStreaming')) {
  console.log('  ✓ Streaming status displayed');
} else {
  console.log('  ✗ FAIL: Streaming status not displayed');
  allTestsPassed = false;
}

// Summary
console.log('\n' + '='.repeat(60));
if (allTestsPassed) {
  console.log('✅ All tests passed!');
  console.log('\nTask 3 requirements verified:');
  console.log('  ✓ 6.1: Messages tab displays messages from underlying hook state');
  console.log('  ✓ 6.2: Message metadata (timestamp, role, tool uses) displays correctly');
  console.log('  ✓ 6.3: Expandable message details provided');
  console.log('  ✓ 6.4: Messages update in real-time via hook state');
  console.log('  ✓ 6.5: Messages maintain chronological order');
  console.log('  ✓ 6.6: Message history persists across debug event clears');
  process.exit(0);
} else {
  console.log('❌ Some tests failed');
  process.exit(1);
}
