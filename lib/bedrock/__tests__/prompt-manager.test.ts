/**
 * Prompt Manager Tests
 * 
 * Manual verification tests for Prompt Manager.
 * Run with: npx tsx lib/bedrock/__tests__/prompt-manager.test.ts
 */

import { PromptManager, getPromptManager, resetPromptManager, UserRole } from '../prompt-manager';

/**
 * Test helper to assert conditions
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Test helper to check if string contains substring
 */
function assertContains(str: string, substring: string, message: string): void {
  if (!str.includes(substring)) {
    throw new Error(`Assertion failed: ${message}. Expected "${str}" to contain "${substring}"`);
  }
}

/**
 * Test helper to check equality
 */
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected ${expected}, got ${actual}`);
  }
}

/**
 * Test: Load prompts for all roles
 */
async function testLoadAllRoles(): Promise<void> {
  console.log('\n=== Test: Load prompts for all roles ===');
  
  const promptManager = new PromptManager();
  const roles: UserRole[] = ['guest', 'manager', 'housekeeping', 'maintenance'];
  
  for (const role of roles) {
    const prompt = await promptManager.getPromptForRole(role);
    assert(prompt.length > 0, `Prompt for ${role} should not be empty`);
    console.log(`✓ Loaded ${role} prompt (${prompt.length} characters)`);
  }
  
  console.log('✓ All role prompts loaded successfully');
}

/**
 * Test: Verify prompt content
 */
async function testPromptContent(): Promise<void> {
  console.log('\n=== Test: Verify prompt content ===');
  
  const promptManager = new PromptManager();
  
  const guestPrompt = await promptManager.getPromptForRole('guest');
  assertContains(guestPrompt, 'hotel guests', 'Guest prompt should mention hotel guests');
  assertContains(guestPrompt, 'Dewy Hotel', 'Guest prompt should mention Dewy Hotel');
  console.log('✓ Guest prompt content verified');
  
  const managerPrompt = await promptManager.getPromptForRole('manager');
  assertContains(managerPrompt, 'hotel managers', 'Manager prompt should mention hotel managers');
  assertContains(managerPrompt, 'operational data', 'Manager prompt should mention operational data');
  console.log('✓ Manager prompt content verified');
  
  const housekeepingPrompt = await promptManager.getPromptForRole('housekeeping');
  assertContains(housekeepingPrompt, 'housekeeping staff', 'Housekeeping prompt should mention housekeeping staff');
  assertContains(housekeepingPrompt, 'cleaning tasks', 'Housekeeping prompt should mention cleaning tasks');
  console.log('✓ Housekeeping prompt content verified');
  
  const maintenancePrompt = await promptManager.getPromptForRole('maintenance');
  assertContains(maintenancePrompt, 'maintenance staff', 'Maintenance prompt should mention maintenance staff');
  assertContains(maintenancePrompt, 'work orders', 'Maintenance prompt should mention work orders');
  console.log('✓ Maintenance prompt content verified');
}

/**
 * Test: Variable interpolation
 */
async function testVariableInterpolation(): Promise<void> {
  console.log('\n=== Test: Variable interpolation ===');
  
  const promptManager = new PromptManager();
  
  const prompt = await promptManager.getPromptWithVariables('guest', {
    tools: 'create_service_request, view_charges, control_lights',
  });
  
  assertContains(prompt, 'create_service_request', 'Prompt should contain interpolated tools');
  assertContains(prompt, 'view_charges', 'Prompt should contain interpolated tools');
  assertContains(prompt, 'control_lights', 'Prompt should contain interpolated tools');
  assert(!prompt.includes('{{tools}}'), 'Prompt should not contain placeholder after interpolation');
  
  console.log('✓ Variable interpolation works correctly');
}

/**
 * Test: Prompt caching
 */
async function testPromptCaching(): Promise<void> {
  console.log('\n=== Test: Prompt caching ===');
  
  const promptManager = new PromptManager();
  
  const prompt1 = await promptManager.getPromptForRole('guest');
  assertEqual(promptManager.getCacheSize(), 1, 'Cache should contain 1 prompt');
  
  const prompt2 = await promptManager.getPromptForRole('guest');
  assert(prompt1 === prompt2, 'Cached prompts should be the same instance');
  assertEqual(promptManager.getCacheSize(), 1, 'Cache size should remain 1');
  
  console.log('✓ Prompt caching works correctly');
}

/**
 * Test: Cache reload
 */
async function testCacheReload(): Promise<void> {
  console.log('\n=== Test: Cache reload ===');
  
  const promptManager = new PromptManager();
  
  await promptManager.getPromptForRole('guest');
  assertEqual(promptManager.getCacheSize(), 1, 'Cache should contain 1 prompt');
  
  await promptManager.reloadPrompts();
  assertEqual(promptManager.getCacheSize(), 0, 'Cache should be empty after reload');
  
  await promptManager.getPromptForRole('guest');
  assertEqual(promptManager.getCacheSize(), 1, 'Cache should contain 1 prompt after reload');
  
  console.log('✓ Cache reload works correctly');
}

/**
 * Test: Validate prompts
 */
async function testValidatePrompts(): Promise<void> {
  console.log('\n=== Test: Validate prompts ===');
  
  const promptManager = new PromptManager();
  const missing = await promptManager.validatePrompts();
  
  assertEqual(missing.length, 0, 'All prompts should exist');
  console.log('✓ All prompt files validated successfully');
}

/**
 * Test: Preload prompts
 */
async function testPreloadPrompts(): Promise<void> {
  console.log('\n=== Test: Preload prompts ===');
  
  const promptManager = new PromptManager();
  await promptManager.preloadPrompts();
  
  assertEqual(promptManager.getCacheSize(), 4, 'Cache should contain all 4 prompts');
  console.log('✓ All prompts preloaded successfully');
}

/**
 * Test: Fallback prompts
 */
async function testFallbackPrompts(): Promise<void> {
  console.log('\n=== Test: Fallback prompts ===');
  
  const invalidManager = new PromptManager('nonexistent/directory');
  const prompt = await invalidManager.getPromptForRole('guest');
  
  assert(prompt.length > 0, 'Fallback prompt should not be empty');
  assertContains(prompt, 'helpful AI assistant', 'Fallback prompt should contain default text');
  console.log('✓ Fallback prompts work correctly');
}

/**
 * Test: Supported roles
 */
function testSupportedRoles(): void {
  console.log('\n=== Test: Supported roles ===');
  
  const promptManager = new PromptManager();
  
  assert(promptManager.isSupportedRole('guest'), 'guest should be supported');
  assert(promptManager.isSupportedRole('manager'), 'manager should be supported');
  assert(promptManager.isSupportedRole('housekeeping'), 'housekeeping should be supported');
  assert(promptManager.isSupportedRole('maintenance'), 'maintenance should be supported');
  
  assert(!promptManager.isSupportedRole('admin'), 'admin should not be supported');
  assert(!promptManager.isSupportedRole('invalid'), 'invalid should not be supported');
  
  console.log('✓ Role validation works correctly');
}

/**
 * Test: Singleton pattern
 */
function testSingletonPattern(): void {
  console.log('\n=== Test: Singleton pattern ===');
  
  const instance1 = getPromptManager();
  const instance2 = getPromptManager();
  
  assert(instance1 === instance2, 'Singleton should return same instance');
  console.log('✓ Singleton pattern works correctly');
  
  resetPromptManager();
  const instance3 = getPromptManager();
  assert(instance1 !== instance3, 'Reset should create new instance');
  console.log('✓ Singleton reset works correctly');
}

/**
 * Run all tests
 */
async function runTests(): Promise<void> {
  console.log('Starting Prompt Manager tests...');
  
  try {
    await testLoadAllRoles();
    await testPromptContent();
    await testVariableInterpolation();
    await testPromptCaching();
    await testCacheReload();
    await testValidatePrompts();
    await testPreloadPrompts();
    await testFallbackPrompts();
    testSupportedRoles();
    testSingletonPattern();
    
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}
