/**
 * Prompt Manager Usage Examples
 * 
 * This file demonstrates how to use the Prompt Manager to load and manage
 * role-specific system prompts for Bedrock chat agents.
 */

import { getPromptManager, PromptManager, UserRole } from '../prompt-manager';

/**
 * Example 1: Basic prompt loading
 */
async function example1_BasicLoading(): Promise<void> {
  console.log('\n=== Example 1: Basic Prompt Loading ===\n');
  
  const promptManager = getPromptManager();
  
  // Load prompt for guest role
  const guestPrompt = await promptManager.getPromptForRole('guest');
  console.log('Guest prompt loaded:');
  console.log(guestPrompt.substring(0, 200) + '...\n');
  
  // Load prompt for manager role
  const managerPrompt = await promptManager.getPromptForRole('manager');
  console.log('Manager prompt loaded:');
  console.log(managerPrompt.substring(0, 200) + '...\n');
}

/**
 * Example 2: Prompt with variable interpolation
 */
async function example2_VariableInterpolation(): Promise<void> {
  console.log('\n=== Example 2: Variable Interpolation ===\n');
  
  const promptManager = getPromptManager();
  
  // Define available tools for the guest role
  const guestTools = [
    'create_service_request',
    'view_my_charges',
    'control_lights',
    'control_thermostat',
    'request_amenity',
  ];
  
  // Load prompt with tools interpolated
  const prompt = await promptManager.getPromptWithVariables('guest', {
    tools: guestTools.join(', '),
  });
  
  console.log('Guest prompt with tools:');
  console.log(prompt);
}

/**
 * Example 3: Preloading prompts for performance
 */
async function example3_PreloadingPrompts(): Promise<void> {
  console.log('\n=== Example 3: Preloading Prompts ===\n');
  
  const promptManager = getPromptManager();
  
  console.log('Cache size before preload:', promptManager.getCacheSize());
  
  // Preload all prompts on application startup
  await promptManager.preloadPrompts();
  
  console.log('Cache size after preload:', promptManager.getCacheSize());
  
  // Subsequent calls will be instant (from cache)
  const start = Date.now();
  await promptManager.getPromptForRole('guest');
  const duration = Date.now() - start;
  
  console.log(`Cached prompt loaded in ${duration}ms`);
}

/**
 * Example 4: Validating prompt files
 */
async function example4_ValidatingPrompts(): Promise<void> {
  console.log('\n=== Example 4: Validating Prompts ===\n');
  
  const promptManager = getPromptManager();
  
  // Check if all prompt files exist
  const missing = await promptManager.validatePrompts();
  
  if (missing.length === 0) {
    console.log('✓ All prompt files are present');
  } else {
    console.log('✗ Missing prompt files for roles:', missing);
  }
}

/**
 * Example 5: Hot reloading prompts
 */
async function example5_HotReloading(): Promise<void> {
  console.log('\n=== Example 5: Hot Reloading Prompts ===\n');
  
  const promptManager = getPromptManager();
  
  // Load a prompt
  await promptManager.getPromptForRole('guest');
  console.log('Initial cache size:', promptManager.getCacheSize());
  
  // Simulate prompt file update (in development)
  console.log('Reloading prompts...');
  await promptManager.reloadPrompts();
  console.log('Cache size after reload:', promptManager.getCacheSize());
  
  // Next access will reload from disk
  await promptManager.getPromptForRole('guest');
  console.log('Cache size after re-access:', promptManager.getCacheSize());
}

/**
 * Example 6: Role validation
 */
function example6_RoleValidation(): void {
  console.log('\n=== Example 6: Role Validation ===\n');
  
  const promptManager = getPromptManager();
  
  const testRoles = ['guest', 'manager', 'admin', 'user', 'housekeeping'];
  
  for (const role of testRoles) {
    const isSupported = promptManager.isSupportedRole(role);
    console.log(`Role "${role}": ${isSupported ? '✓ Supported' : '✗ Not supported'}`);
  }
}

/**
 * Example 7: Using in a chat API endpoint
 */
async function example7_ChatAPIUsage(): Promise<void> {
  console.log('\n=== Example 7: Chat API Usage ===\n');
  
  // Simulate a chat API request
  const userRole: UserRole = 'guest';
  const availableTools = ['create_service_request', 'view_my_charges'];
  
  // Get prompt manager
  const promptManager = getPromptManager();
  
  // Generate current timestamp with timezone
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
  
  // Load system prompt with tools and timestamp
  const systemPrompt = await promptManager.getPromptWithVariables(userRole, {
    userName: 'John Doe',
    userEmail: 'john.doe@example.com',
    roomNumber: '305',
    tools: availableTools.join(', '),
    currentDateTime,
  });
  
  console.log('System prompt for Bedrock invocation:');
  console.log('---');
  console.log(systemPrompt);
  console.log('---');
  
  // This prompt would be passed to Bedrock along with the conversation
  console.log('\nThis prompt is now ready to be sent to Bedrock with the user message.');
}

/**
 * Example 8: Custom prompt manager instance
 */
async function example8_CustomInstance(): Promise<void> {
  console.log('\n=== Example 8: Custom Prompt Manager Instance ===\n');
  
  // Create a custom instance with caching disabled (for development)
  const devPromptManager = new PromptManager('config/prompts', false);
  
  console.log('Loading prompt with caching disabled...');
  await devPromptManager.getPromptForRole('guest');
  console.log('Cache size:', devPromptManager.getCacheSize());
  console.log('(Cache is disabled, so size is 0)');
  
  // Create a custom instance with different directory
  const customPromptManager = new PromptManager('custom/prompts', true);
  
  console.log('\nAttempting to load from custom directory...');
  const prompt = await customPromptManager.getPromptForRole('guest');
  console.log('Loaded prompt (fallback):', prompt.substring(0, 100) + '...');
}

/**
 * Run all examples
 */
async function runExamples(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Prompt Manager Usage Examples');
  console.log('='.repeat(60));
  
  try {
    await example1_BasicLoading();
    await example2_VariableInterpolation();
    await example3_PreloadingPrompts();
    await example4_ValidatingPrompts();
    await example5_HotReloading();
    example6_RoleValidation();
    await example7_ChatAPIUsage();
    await example8_CustomInstance();
    
    console.log('\n' + '='.repeat(60));
    console.log('All examples completed successfully!');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\nError running examples:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples();
}
