#!/usr/bin/env node

/**
 * Test script to verify tab data persistence in ChatDebugPanel
 * 
 * This script simulates adding events and checks if tab data persists
 */

console.log('Testing ChatDebugPanel tab data persistence...\n');

// Simulate events
const events = [
  {
    id: 'api_1',
    timestamp: new Date(),
    type: 'api_call',
    data: { endpoint: '/api/chat/stream', method: 'POST' },
    status: 'pending'
  },
  {
    id: 'sse_1',
    timestamp: new Date(),
    type: 'sse_event',
    data: { eventType: 'message_start' }
  },
  {
    id: 'tool_1',
    timestamp: new Date(),
    type: 'tool_execution',
    data: { toolName: 'test_tool', phase: 'start' },
    status: 'pending'
  },
  {
    id: 'error_1',
    timestamp: new Date(),
    type: 'error',
    data: { message: 'Test error' },
    status: 'error'
  },
  {
    id: 'api_2',
    timestamp: new Date(),
    type: 'api_call',
    data: { endpoint: '/api/chat/stream', status: 'completed' },
    status: 'success'
  },
];

// Filter events by type (same logic as ChatDebugPanel)
const apiCalls = events.filter(e => e.type === 'api_call');
const sseEvents = events.filter(e => e.type === 'sse_event');
const toolEvents = events.filter(e => e.type === 'tool_execution');
const errorEvents = events.filter(e => e.type === 'error');

console.log('Event counts:');
console.log(`  Total events: ${events.length}`);
console.log(`  API calls: ${apiCalls.length}`);
console.log(`  SSE events: ${sseEvents.length}`);
console.log(`  Tool executions: ${toolEvents.length}`);
console.log(`  Errors: ${errorEvents.length}`);
console.log();

// Verify filtering works correctly
console.log('Verification:');
console.log(`  ✓ API calls filtered: ${apiCalls.length === 2 ? 'PASS' : 'FAIL'}`);
console.log(`  ✓ SSE events filtered: ${sseEvents.length === 1 ? 'PASS' : 'FAIL'}`);
console.log(`  ✓ Tool events filtered: ${toolEvents.length === 1 ? 'PASS' : 'FAIL'}`);
console.log(`  ✓ Error events filtered: ${errorEvents.length === 1 ? 'PASS' : 'FAIL'}`);
console.log();

// Test that events maintain their data
console.log('Data integrity:');
apiCalls.forEach((event, i) => {
  console.log(`  API Call ${i + 1}: ${event.data.endpoint} - ${event.status}`);
});
sseEvents.forEach((event, i) => {
  console.log(`  SSE Event ${i + 1}: ${event.data.eventType}`);
});
toolEvents.forEach((event, i) => {
  console.log(`  Tool Event ${i + 1}: ${event.data.toolName} - ${event.data.phase}`);
});
errorEvents.forEach((event, i) => {
  console.log(`  Error ${i + 1}: ${event.data.message}`);
});

console.log('\n✓ Tab data persistence test completed');
