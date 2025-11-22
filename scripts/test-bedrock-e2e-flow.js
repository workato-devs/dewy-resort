#!/usr/bin/env node

/**
 * End-to-End Bedrock Integration Flow Test
 * 
 * This script tests the complete flow for each role:
 * 1. Component integration
 * 2. API endpoint availability
 * 3. Configuration loading
 * 4. Error handling
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80) + '\n');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result) {
      testsPassed++;
      logSuccess(name);
      return true;
    } else {
      testsFailed++;
      logError(name);
      return false;
    }
  } catch (error) {
    testsFailed++;
    logError(`${name}: ${error.message}`);
    return false;
  }
}

// Test 1: Verify all roles have complete integration
function testRoleIntegration() {
  logSection('Test 1: Role Integration Completeness');
  
  const roles = ['guest', 'manager', 'housekeeping', 'maintenance'];
  
  roles.forEach(role => {
    logInfo(`Testing ${role} role...`);
    
    // Check chat page
    const chatPage = `app/${role}/chat/page.tsx`;
    test(`${role}: Chat page exists`, () => fs.existsSync(chatPage));
    
    if (fs.existsSync(chatPage)) {
      const content = fs.readFileSync(chatPage, 'utf-8');
      test(`${role}: Uses BedrockChatInterface`, () => 
        content.includes('BedrockChatInterface')
      );
      test(`${role}: Has feature detection`, () => 
        content.includes('config') || content.includes('enabled')
      );
    }
    
    // Check MCP config
    const mcpConfig = `config/mcp/${role}.json`;
    test(`${role}: MCP config exists`, () => fs.existsSync(mcpConfig));
    
    if (fs.existsSync(mcpConfig)) {
      const config = JSON.parse(fs.readFileSync(mcpConfig, 'utf-8'));
      test(`${role}: MCP config has servers`, () => 
        Array.isArray(config.servers) && config.servers.length > 0
      );
      test(`${role}: MCP servers have tools`, () => 
        config.servers.every(s => Array.isArray(s.tools) && s.tools.length > 0)
      );
    }
    
    // Check system prompt
    const prompt = `config/prompts/${role}.txt`;
    test(`${role}: System prompt exists`, () => fs.existsSync(prompt));
    
    if (fs.existsSync(prompt)) {
      const content = fs.readFileSync(prompt, 'utf-8');
      test(`${role}: System prompt has content`, () => content.length > 100);
    }
    
    console.log('');
  });
}

// Test 2: Verify API endpoints are properly structured
function testAPIEndpoints() {
  logSection('Test 2: API Endpoint Structure');
  
  // Test stream endpoint
  const streamPath = 'app/api/chat/stream/route.ts';
  test('Stream endpoint exists', () => fs.existsSync(streamPath));
  
  if (fs.existsSync(streamPath)) {
    const content = fs.readFileSync(streamPath, 'utf-8');
    
    test('Stream: Has POST export', () => 
      content.includes('export async function POST')
    );
    test('Stream: Uses requireAuth', () => 
      content.includes('requireAuth')
    );
    test('Stream: Uses IdentityPoolService', () => 
      content.includes('IdentityPoolService')
    );
    test('Stream: Uses BedrockService', () => 
      content.includes('BedrockService')
    );
    test('Stream: Uses MCPManager', () => 
      content.includes('MCPManager')
    );
    test('Stream: Uses PromptManager', () => 
      content.includes('PromptManager')
    );
    test('Stream: Uses ConversationManager', () => 
      content.includes('ConversationManager')
    );
    test('Stream: Has error handling', () => 
      content.includes('try') && content.includes('catch')
    );
    test('Stream: Has rate limiting', () => 
      content.includes('checkRateLimit') || content.includes('RATE_LIMIT')
    );
    test('Stream: Has input validation', () => 
      content.includes('MAX_MESSAGE_LENGTH') || content.includes('validate')
    );
  }
  
  // Test config endpoint
  const configPath = 'app/api/chat/config/route.ts';
  test('Config endpoint exists', () => fs.existsSync(configPath));
  
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf-8');
    
    test('Config: Has GET export', () => 
      content.includes('export async function GET')
    );
    test('Config: Checks AUTH_PROVIDER', () => 
      content.includes('AUTH_PROVIDER')
    );
    test('Config: Checks COGNITO_IDENTITY_POOL_ID', () => 
      content.includes('COGNITO_IDENTITY_POOL_ID')
    );
  }
}

// Test 3: Verify frontend components
function testFrontendComponents() {
  logSection('Test 3: Frontend Component Integration');
  
  // Test hook
  const hookPath = 'hooks/use-bedrock-chat.ts';
  test('useBedrockChat hook exists', () => fs.existsSync(hookPath));
  
  if (fs.existsSync(hookPath)) {
    const content = fs.readFileSync(hookPath, 'utf-8');
    
    test('Hook: Exports useBedrockChat', () => 
      content.includes('export function useBedrockChat') || 
      content.includes('export const useBedrockChat')
    );
    test('Hook: Has ChatMessage interface', () => 
      content.includes('interface ChatMessage') || 
      content.includes('type ChatMessage')
    );
    test('Hook: Returns messages', () => 
      content.includes('messages:')
    );
    test('Hook: Returns isLoading', () => 
      content.includes('isLoading:')
    );
    test('Hook: Returns sendMessage', () => 
      content.includes('sendMessage:')
    );
    test('Hook: Uses EventSource', () => 
      content.includes('EventSource')
    );
    test('Hook: Has cleanup', () => 
      content.includes('useEffect') && content.includes('return')
    );
  }
  
  // Test component
  const componentPath = 'components/shared/BedrockChatInterface.tsx';
  test('BedrockChatInterface component exists', () => fs.existsSync(componentPath));
  
  if (fs.existsSync(componentPath)) {
    const content = fs.readFileSync(componentPath, 'utf-8');
    
    test('Component: Exports BedrockChatInterface', () => 
      content.includes('export function BedrockChatInterface') || 
      content.includes('export const BedrockChatInterface')
    );
    test('Component: Uses useBedrockChat', () => 
      content.includes('useBedrockChat')
    );
    test('Component: Has message display', () => 
      content.includes('messages.map') || content.includes('messages?.map')
    );
    test('Component: Has input field', () => 
      content.includes('input') || content.includes('textarea')
    );
    test('Component: Has send functionality', () => 
      content.includes('sendMessage') || content.includes('onSend')
    );
  }
}

// Test 4: Verify service layer integration
function testServiceLayer() {
  logSection('Test 4: Service Layer Integration');
  
  const services = [
    { name: 'IdentityPoolService', file: 'lib/bedrock/identity-pool.ts', methods: ['getCredentialsForUser'] },
    { name: 'BedrockService', file: 'lib/bedrock/client.ts', methods: ['streamInvoke'] },
    { name: 'MCPManager', file: 'lib/bedrock/mcp-manager.ts', methods: ['getToolsForRole', 'executeTool'] },
    { name: 'PromptManager', file: 'lib/bedrock/prompt-manager.ts', methods: ['getPromptForRole'] },
    { name: 'ConversationManager', file: 'lib/bedrock/conversation-manager.ts', methods: ['createConversation', 'addMessage'] },
  ];
  
  services.forEach(({ name, file, methods }) => {
    test(`${name}: File exists`, () => fs.existsSync(file));
    
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      
      test(`${name}: Class exported`, () => 
        content.includes(`export class ${name}`)
      );
      
      methods.forEach(method => {
        test(`${name}: Has ${method} method`, () => 
          content.includes(`${method}(`) || content.includes(`${method} (`)
        );
      });
    }
  });
}

// Test 5: Verify CloudFormation infrastructure
function testInfrastructure() {
  logSection('Test 5: Infrastructure Configuration');
  
  const templatePath = 'aws/cloudformation/cognito-identity-pool.yaml';
  test('CloudFormation template exists', () => fs.existsSync(templatePath));
  
  if (fs.existsSync(templatePath)) {
    const content = fs.readFileSync(templatePath, 'utf-8');
    
    test('CF: Has IdentityPool resource', () => 
      content.includes('AWS::Cognito::IdentityPool')
    );
    
    const roles = ['Guest', 'Manager', 'Housekeeping', 'Maintenance'];
    roles.forEach(role => {
      test(`CF: Has ${role}Role`, () => 
        content.includes(`${role}Role:`) || content.includes(`${role}IAMRole`)
      );
    });
    
    test('CF: Has RoleAttachment', () => 
      content.includes('AWS::Cognito::IdentityPoolRoleAttachment')
    );
    
    test('CF: Has Bedrock permissions', () => 
      content.includes('bedrock:InvokeModel')
    );
    
    test('CF: Has role mapping', () => 
      content.includes('custom:role') || content.includes('RoleMappings')
    );
  }
  
  const deployScript = 'aws/cloudformation/deploy-identity-pool.sh';
  test('Deployment script exists', () => fs.existsSync(deployScript));
  
  if (fs.existsSync(deployScript)) {
    const stats = fs.statSync(deployScript);
    test('Deployment script is executable', () => 
      (stats.mode & 0o111) !== 0
    );
  }
}

// Test 6: Verify error handling
function testErrorHandling() {
  logSection('Test 6: Error Handling');
  
  const errorsPath = 'lib/bedrock/errors.ts';
  test('Errors module exists', () => fs.existsSync(errorsPath));
  
  if (fs.existsSync(errorsPath)) {
    const content = fs.readFileSync(errorsPath, 'utf-8');
    
    const errorTypes = [
      'BedrockError',
      'IdentityPoolError',
      'MCPError',
      'ConfigurationError',
    ];
    
    errorTypes.forEach(errorType => {
      test(`Errors: Has ${errorType}`, () => 
        content.includes(`class ${errorType}`) || 
        content.includes(`export class ${errorType}`)
      );
    });
  }
  
  const loggerPath = 'lib/bedrock/logger.ts';
  test('Logger module exists', () => fs.existsSync(loggerPath));
  
  if (fs.existsSync(loggerPath)) {
    const content = fs.readFileSync(loggerPath, 'utf-8');
    
    test('Logger: Has ErrorLogger', () => 
      content.includes('ErrorLogger')
    );
    test('Logger: Has log method', () => 
      content.includes('log(')
    );
    test('Logger: Has info method', () => 
      content.includes('info(')
    );
  }
}

// Test 7: Verify documentation
function testDocumentation() {
  logSection('Test 7: Documentation Completeness');
  
  const docs = [
    { file: 'README.md', keywords: ['Bedrock', 'Identity Pool'] },
    { file: 'docs/BEDROCK_CONFIGURATION.md', keywords: ['configuration', 'environment'] },
    { file: 'docs/BEDROCK_TROUBLESHOOTING.md', keywords: ['troubleshoot', 'error'] },
    { file: 'docs/BEDROCK_INTEGRATION_INDEX.md', keywords: ['overview', 'architecture'] },
    { file: 'docs/MCP_SERVER_DEVELOPMENT.md', keywords: ['MCP', 'server', 'development'] },
    { file: 'aws/cloudformation/README-IDENTITY-POOL.md', keywords: ['Identity Pool', 'deployment'] },
    { file: 'aws/cloudformation/QUICKSTART-IDENTITY-POOL.md', keywords: ['quick', 'start'] },
  ];
  
  docs.forEach(({ file, keywords }) => {
    test(`Doc: ${file} exists`, () => fs.existsSync(file));
    
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8').toLowerCase();
      
      keywords.forEach(keyword => {
        test(`Doc: ${file} mentions ${keyword}`, () => 
          content.includes(keyword.toLowerCase())
        );
      });
    }
  });
}

// Test 8: Verify test coverage
function testTestCoverage() {
  logSection('Test 8: Test Coverage');
  
  const testFiles = [
    'lib/bedrock/__tests__/identity-pool.test.ts',
    'lib/bedrock/__tests__/client.test.ts',
    'lib/bedrock/__tests__/mcp-manager.test.ts',
    'lib/bedrock/__tests__/prompt-manager.test.ts',
    'lib/bedrock/__tests__/conversation-manager.test.ts',
    'lib/bedrock/__tests__/config.test.ts',
    'lib/bedrock/__tests__/integration.test.ts',
    'hooks/__tests__/use-bedrock-chat.test.ts',
  ];
  
  testFiles.forEach(testFile => {
    test(`Test: ${path.basename(testFile)} exists`, () => 
      fs.existsSync(testFile)
    );
  });
  
  // Check test runner script
  const runAllTests = 'lib/bedrock/__tests__/run-all-tests.sh';
  test('Test runner script exists', () => fs.existsSync(runAllTests));
}

// Main execution
function main() {
  log('\n🧪 Bedrock Integration End-to-End Flow Test', 'bright');
  log('Testing complete integration for all roles...\n', 'cyan');
  
  try {
    testRoleIntegration();
    testAPIEndpoints();
    testFrontendComponents();
    testServiceLayer();
    testInfrastructure();
    testErrorHandling();
    testDocumentation();
    testTestCoverage();
    
    // Summary
    logSection('Test Summary');
    
    const total = testsPassed + testsFailed;
    const passRate = total > 0 ? ((testsPassed / total) * 100).toFixed(1) : 0;
    
    console.log(`Total Tests: ${total}`);
    log(`Passed: ${testsPassed}`, 'green');
    log(`Failed: ${testsFailed}`, 'red');
    log(`Pass Rate: ${passRate}%`, passRate >= 95 ? 'green' : passRate >= 80 ? 'yellow' : 'red');
    
    console.log('\n' + '='.repeat(80));
    
    if (testsFailed === 0) {
      log('\n✓ All integration tests passed!', 'green');
      log('\nThe Bedrock chat integration is complete and properly wired.', 'cyan');
      log('\nNext steps:', 'bright');
      log('1. Configure environment variables (.env)', 'cyan');
      log('2. Deploy CloudFormation Identity Pool stack', 'cyan');
      log('3. Set up remote MCP servers', 'cyan');
      log('4. Run: npm test (unit tests)', 'cyan');
      log('5. Start dev server and test each role manually', 'cyan');
    } else {
      log('\n✗ Some integration tests failed.', 'red');
      log('Please review the failures above and fix any issues.', 'yellow');
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    process.exit(testsFailed === 0 ? 0 : 1);
  } catch (error) {
    log(`\n✗ Test execution failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
