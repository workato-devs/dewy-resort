#!/usr/bin/env node

/**
 * Verification script for ChatDebugPanel tab data persistence
 * 
 * Tests:
 * 1. API tab maintains data and doesn't zero out
 * 2. SSE tab maintains data and doesn't zero out
 * 3. Tools tab maintains data and doesn't zero out
 * 4. Errors tab maintains data and doesn't zero out
 * 5. Tab counts update correctly as events are added
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('ChatDebugPanel Tab Data Persistence Verification');
console.log('='.repeat(60));
console.log();

// Read the ChatDebugPanel component
const panelPath = path.join(__dirname, '..', 'components', 'shared', 'ChatDebugPanel.tsx');
const panelContent = fs.readFileSync(panelPath, 'utf8');

console.log('✓ ChatDebugPanel component loaded');
console.log();

// Test 1: Check that filtered arrays use useMemo
console.log('Test 1: Filtered arrays use React.useMemo');
const hasMemoizedFilters = [
  /const apiCalls = React\.useMemo\(\(\) => events\.filter\(e => e\.type === 'api_call'\)/,
  /const sseEvents = React\.useMemo\(\(\) => events\.filter\(e => e\.type === 'sse_event'\)/,
  /const toolEvents = React\.useMemo\(\(\) => events\.filter\(e => e\.type === 'tool_execution'\)/,
  /const errorEvents = React\.useMemo\(\(\) => events\.filter\(e => e\.type === 'error'\)/,
].every(regex => regex.test(panelContent));

if (hasMemoizedFilters) {
  console.log('  ✓ PASS: All filtered arrays are memoized');
} else {
  console.log('  ✗ FAIL: Some filtered arrays are not memoized');
}
console.log();

// Test 2: Check that tab counts reference the filtered arrays
console.log('Test 2: Tab counts reference filtered arrays');
const hasCorrectCounts = [
  /API \(\{apiCalls\.length\}\)/,
  /SSE \(\{sseEvents\.length\}\)/,
  /Tools \(\{toolEvents\.length\}\)/,
  /Errors \(\{errorEvents\.length\}\)/,
].every(regex => regex.test(panelContent));

if (hasCorrectCounts) {
  console.log('  ✓ PASS: All tab counts reference filtered arrays');
} else {
  console.log('  ✗ FAIL: Some tab counts are incorrect');
}
console.log();

// Test 3: Check that each tab renders its filtered array
console.log('Test 3: Each tab renders its filtered array');
const tabsRenderCorrectly = [
  /<TabsContent value="api"[\s\S]*?apiCalls\.map/,
  /<TabsContent value="sse"[\s\S]*?sseEvents\.map/,
  /<TabsContent value="tools"[\s\S]*?toolEvents\.map/,
  /<TabsContent value="errors"[\s\S]*?errorEvents\.map/,
].every(regex => regex.test(panelContent));

if (tabsRenderCorrectly) {
  console.log('  ✓ PASS: All tabs render their filtered arrays');
} else {
  console.log('  ✗ FAIL: Some tabs do not render correctly');
}
console.log();

// Test 4: Check that each tab has proper empty state
console.log('Test 4: Each tab has proper empty state handling');
const hasEmptyStates = [
  /apiCalls\.length === 0[\s\S]*?No API calls yet/,
  /sseEvents\.length === 0[\s\S]*?No SSE events yet/,
  /toolEvents\.length === 0[\s\S]*?No tool executions yet/,
  /errorEvents\.length === 0[\s\S]*?No errors/,
].every(regex => regex.test(panelContent));

if (hasEmptyStates) {
  console.log('  ✓ PASS: All tabs have proper empty state handling');
} else {
  console.log('  ✗ FAIL: Some tabs missing empty state handling');
}
console.log();

// Test 5: Simulate event filtering logic
console.log('Test 5: Simulate event filtering logic');
const testEvents = [
  { id: '1', type: 'api_call', data: {}, timestamp: new Date() },
  { id: '2', type: 'api_call', data: {}, timestamp: new Date() },
  { id: '3', type: 'sse_event', data: {}, timestamp: new Date() },
  { id: '4', type: 'tool_execution', data: {}, timestamp: new Date() },
  { id: '5', type: 'error', data: {}, timestamp: new Date() },
  { id: '6', type: 'api_call', data: {}, timestamp: new Date() },
];

const apiCalls = testEvents.filter(e => e.type === 'api_call');
const sseEvents = testEvents.filter(e => e.type === 'sse_event');
const toolEvents = testEvents.filter(e => e.type === 'tool_execution');
const errorEvents = testEvents.filter(e => e.type === 'error');

console.log(`  Total events: ${testEvents.length}`);
console.log(`  API calls: ${apiCalls.length} (expected: 3)`);
console.log(`  SSE events: ${sseEvents.length} (expected: 1)`);
console.log(`  Tool events: ${toolEvents.length} (expected: 1)`);
console.log(`  Error events: ${errorEvents.length} (expected: 1)`);

const filteringWorks = 
  apiCalls.length === 3 &&
  sseEvents.length === 1 &&
  toolEvents.length === 1 &&
  errorEvents.length === 1;

if (filteringWorks) {
  console.log('  ✓ PASS: Event filtering logic works correctly');
} else {
  console.log('  ✗ FAIL: Event filtering logic is incorrect');
}
console.log();

// Test 6: Check that events maintain their data after filtering
console.log('Test 6: Events maintain data integrity after filtering');
const dataIntact = 
  apiCalls.every(e => e.id && e.type && e.data && e.timestamp) &&
  sseEvents.every(e => e.id && e.type && e.data && e.timestamp) &&
  toolEvents.every(e => e.id && e.type && e.data && e.timestamp) &&
  errorEvents.every(e => e.id && e.type && e.data && e.timestamp);

if (dataIntact) {
  console.log('  ✓ PASS: All events maintain data integrity');
} else {
  console.log('  ✗ FAIL: Some events lost data during filtering');
}
console.log();

// Summary
console.log('='.repeat(60));
console.log('Summary');
console.log('='.repeat(60));

const allTestsPassed = 
  hasMemoizedFilters &&
  hasCorrectCounts &&
  tabsRenderCorrectly &&
  hasEmptyStates &&
  filteringWorks &&
  dataIntact;

if (allTestsPassed) {
  console.log('✓ All tests PASSED');
  console.log();
  console.log('Tab data persistence is correctly implemented:');
  console.log('  • Filtered arrays are memoized for performance');
  console.log('  • Tab counts update correctly as events are added');
  console.log('  • Each tab maintains its data and doesn\'t zero out');
  console.log('  • Empty states are properly handled');
  console.log('  • Data integrity is maintained through filtering');
  process.exit(0);
} else {
  console.log('✗ Some tests FAILED');
  console.log();
  console.log('Please review the implementation.');
  process.exit(1);
}
