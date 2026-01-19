#!/usr/bin/env node

/**
 * Comprehensive Bedrock Integration Verification Script
 * 
 * This script verifies that all components of the Bedrock chat integration
 * are properly wired together and configured.
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

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

// Verification results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  sections: []
};

function recordResult(section, check, passed, message) {
  if (passed) {
    results.passed++;
    logSuccess(`${check}: ${message}`);
  } else {
    results.failed++;
    logError(`${check}: ${message}`);
  }
  
  if (!results.sections.find(s => s.name === section)) {
    results.sections.push({ name: section, checks: [] });
  }
  
  const sectionData = results.sections.find(s => s.name === section);
  sectionData.checks.push({ check, passed, message });
}

function recordWarning(section, check, message) {
  results.warnings++;
  logWarning(`${check}: ${message}`);
  
  if (!results.sections.find(s => s.name === section)) {
    results.sections.push({ name: section, checks: [] });
  }
  
  const sectionData = results.sections.find(s => s.name === section);
  sectionData.checks.push({ check, passed: null, message, warning: true });
}

// 1. Verify Core Files Exist
function verifyFileStructure() {
  logSection('1. File Structure Verification');
  
  const requiredFiles = [
    // Core Bedrock modules
    'lib/bedrock/identity-pool.ts',
    'lib/bedrock/client.ts',
    'lib/bedrock/mcp-manager.ts',
    'lib/bedrock/prompt-manager.ts',
    'lib/bedrock/conversation-manager.ts',
    'lib/bedrock/config.ts',
    'lib/bedrock/errors.ts',
    'lib/bedrock/logger.ts',
    'lib/bedrock/index.ts',
    
    // API endpoints
    'app/api/chat/stream/route.ts',
    'app/api/chat/config/route.ts',
    
    // Frontend components
    'hooks/use-bedrock-chat.ts',
    'components/shared/BedrockChatInterface.tsx',
    
    // Chat pages
    'app/guest/chat/page.tsx',
    'app/manager/chat/page.tsx',
    'app/housekeeping/chat/page.tsx',
    'app/maintenance/chat/page.tsx',
    
    // Configuration files
    'config/mcp/guest.json',
    'config/mcp/manager.json',
    'config/mcp/housekeeping.json',
    'config/mcp/maintenance.json',
    'config/prompts/guest.txt',
    'config/prompts/manager.txt',
    'config/prompts/housekeeping.txt',
    'config/prompts/maintenance.txt',
    
    // CloudFormation
    'aws/cloudformation/cognito-identity-pool.yaml',
    'aws/cloudformation/deploy-identity-pool.sh',
    
    // Documentation
    'docs/BEDROCK_CONFIGURATION.md',
    'docs/BEDROCK_TROUBLESHOOTING.md',
    'docs/BEDROCK_INTEGRATION_INDEX.md',
    'docs/MCP_SERVER_DEVELOPMENT.md',
  ];
  
  requiredFiles.forEach(file => {
    const exists = fs.existsSync(file);
    recordResult(
      'File Structure',
      file,
      exists,
      exists ? 'exists' : 'missing'
    );
  });
}

// 2. Verify Environment Configuration
function verifyEnvironmentConfig() {
  logSection('2. Environment Configuration');
  
  // Check .env.example
  const envExamplePath = '.env.example';
  if (!fs.existsSync(envExamplePath)) {
    recordResult('Environment', '.env.example', false, 'missing');
    return;
  }
  
  const envExample = fs.readFileSync(envExamplePath, 'utf-8');
  
  const requiredVars = [
    'AUTH_PROVIDER',
    'COGNITO_IDENTITY_POOL_ID',
    'BEDROCK_MODEL_ID',
    'AWS_REGION',
    'MCP_GUEST_TOKEN',
    'MCP_ROOM_CONTROLS_TOKEN',
    'MCP_ANALYTICS_TOKEN',
    'MCP_MANAGER_TOKEN',
    'MCP_HOUSEKEEPING_TOKEN',
    'MCP_MAINTENANCE_TOKEN',
  ];
  
  requiredVars.forEach(varName => {
    const exists = envExample.includes(varName);
    recordResult(
      'Environment',
      varName,
      exists,
      exists ? 'documented in .env.example' : 'missing from .env.example'
    );
  });
  
  // Check if .env exists (optional)
  if (fs.existsSync('.env')) {
    const env = fs.readFileSync('.env', 'utf-8');
    const authProvider = env.match(/AUTH_PROVIDER=(\w+)/)?.[1];
    
    if (authProvider === 'cognito') {
      logInfo('AUTH_PROVIDER is set to cognito');
      
      const identityPoolId = env.match(/COGNITO_IDENTITY_POOL_ID=(.+)/)?.[1];
      if (identityPoolId && identityPoolId !== 'your_identity_pool_id') {
        logSuccess('COGNITO_IDENTITY_POOL_ID is configured');
      } else {
        recordWarning('Environment', 'COGNITO_IDENTITY_POOL_ID', 'not configured in .env');
      }
    } else {
      recordWarning('Environment', 'AUTH_PROVIDER', `set to ${authProvider}, Bedrock requires cognito`);
    }
  } else {
    recordWarning('Environment', '.env', 'file not found (using .env.example as reference)');
  }
}

// 3. Verify MCP Configurations
function verifyMCPConfigurations() {
  logSection('3. MCP Configuration Verification');
  
  const roles = ['guest', 'manager', 'housekeeping', 'maintenance'];
  
  roles.forEach(role => {
    const configPath = `config/mcp/${role}.json`;
    
    if (!fs.existsSync(configPath)) {
      recordResult('MCP Config', `${role}.json`, false, 'missing');
      return;
    }
    
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      
      // Verify structure
      const hasRole = config.role === role;
      const hasServers = Array.isArray(config.servers);
      const hasTools = config.servers?.every(s => Array.isArray(s.tools));
      
      if (hasRole && hasServers && hasTools) {
        recordResult('MCP Config', `${role}.json`, true, `valid (${config.servers.length} servers)`);
        
        // Check each server
        config.servers.forEach(server => {
          logInfo(`  - ${server.name}: ${server.tools.length} tools`);
        });
      } else {
        recordResult('MCP Config', `${role}.json`, false, 'invalid structure');
      }
    } catch (error) {
      recordResult('MCP Config', `${role}.json`, false, `parse error: ${error.message}`);
    }
  });
}

// 4. Verify System Prompts
function verifySystemPrompts() {
  logSection('4. System Prompts Verification');
  
  const roles = ['guest', 'manager', 'housekeeping', 'maintenance'];
  
  roles.forEach(role => {
    const promptPath = `config/prompts/${role}.txt`;
    
    if (!fs.existsSync(promptPath)) {
      recordResult('System Prompts', `${role}.txt`, false, 'missing');
      return;
    }
    
    const prompt = fs.readFileSync(promptPath, 'utf-8');
    const hasContent = prompt.length > 100;
    const hasRoleReference = prompt.toLowerCase().includes(role) || 
                            prompt.toLowerCase().includes('hotel');
    
    if (hasContent && hasRoleReference) {
      recordResult('System Prompts', `${role}.txt`, true, `valid (${prompt.length} chars)`);
    } else {
      recordResult('System Prompts', `${role}.txt`, false, 'content appears incomplete');
    }
  });
}

// 5. Verify API Endpoints
function verifyAPIEndpoints() {
  logSection('5. API Endpoints Verification');
  
  // Check stream endpoint
  const streamPath = 'app/api/chat/stream/route.ts';
  if (fs.existsSync(streamPath)) {
    const content = fs.readFileSync(streamPath, 'utf-8');
    
    const checks = [
      { name: 'Session validation', pattern: /getSession|validateSession/ },
      { name: 'Identity Pool integration', pattern: /IdentityPoolService|getCredentialsForUser/ },
      { name: 'Bedrock client', pattern: /BedrockService|streamInvoke/ },
      { name: 'MCP Manager', pattern: /MCPManager|getToolsForRole/ },
      { name: 'Prompt Manager', pattern: /PromptManager|getPromptForRole/ },
      { name: 'Conversation Manager', pattern: /ConversationManager/ },
      { name: 'SSE streaming', pattern: /text\/event-stream|Server-Sent Events/ },
      { name: 'Error handling', pattern: /try.*catch|handleError/ },
    ];
    
    checks.forEach(check => {
      const passed = check.pattern.test(content);
      recordResult('API Stream', check.name, passed, passed ? 'implemented' : 'missing');
    });
  } else {
    recordResult('API Stream', 'route.ts', false, 'file missing');
  }
  
  // Check config endpoint
  const configPath = 'app/api/chat/config/route.ts';
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf-8');
    
    const hasAuthCheck = /AUTH_PROVIDER/.test(content);
    const hasIdentityPoolCheck = /COGNITO_IDENTITY_POOL_ID/.test(content);
    
    recordResult('API Config', 'AUTH_PROVIDER check', hasAuthCheck, hasAuthCheck ? 'implemented' : 'missing');
    recordResult('API Config', 'Identity Pool check', hasIdentityPoolCheck, hasIdentityPoolCheck ? 'implemented' : 'missing');
  } else {
    recordResult('API Config', 'route.ts', false, 'file missing');
  }
}

// 6. Verify Frontend Integration
function verifyFrontendIntegration() {
  logSection('6. Frontend Integration Verification');
  
  // Check hook
  const hookPath = 'hooks/use-bedrock-chat.ts';
  if (fs.existsSync(hookPath)) {
    const content = fs.readFileSync(hookPath, 'utf-8');
    
    const checks = [
      { name: 'EventSource', pattern: /EventSource|SSE/ },
      { name: 'Message state', pattern: /useState.*messages/ },
      { name: 'Loading state', pattern: /useState.*loading|isLoading/ },
      { name: 'Error handling', pattern: /useState.*error|onError/ },
      { name: 'Send message', pattern: /sendMessage/ },
      { name: 'Cleanup', pattern: /useEffect.*return|cleanup/ },
    ];
    
    checks.forEach(check => {
      const passed = check.pattern.test(content);
      recordResult('Hook', check.name, passed, passed ? 'implemented' : 'missing');
    });
  } else {
    recordResult('Hook', 'use-bedrock-chat.ts', false, 'file missing');
  }
  
  // Check component
  const componentPath = 'components/shared/BedrockChatInterface.tsx';
  if (fs.existsSync(componentPath)) {
    const content = fs.readFileSync(componentPath, 'utf-8');
    
    const checks = [
      { name: 'useBedrockChat hook', pattern: /useBedrockChat/ },
      { name: 'Message list', pattern: /messages\.map|MessageList/ },
      { name: 'Message input', pattern: /input|textarea/ },
      { name: 'Send button', pattern: /button.*send|onSend/ },
      { name: 'Typing indicator', pattern: /typing|loading|isStreaming/ },
      { name: 'Error display', pattern: /error.*display|ErrorState/ },
    ];
    
    checks.forEach(check => {
      const passed = check.pattern.test(content);
      recordResult('Component', check.name, passed, passed ? 'implemented' : 'missing');
    });
  } else {
    recordResult('Component', 'BedrockChatInterface.tsx', false, 'file missing');
  }
}

// 7. Verify Chat Pages
function verifyChatPages() {
  logSection('7. Chat Pages Verification');
  
  const roles = [
    { role: 'guest', path: 'app/guest/chat/page.tsx' },
    { role: 'manager', path: 'app/manager/chat/page.tsx' },
    { role: 'housekeeping', path: 'app/housekeeping/chat/page.tsx' },
    { role: 'maintenance', path: 'app/maintenance/chat/page.tsx' },
  ];
  
  roles.forEach(({ role, path: pagePath }) => {
    if (!fs.existsSync(pagePath)) {
      recordResult('Chat Pages', `${role} page`, false, 'missing');
      return;
    }
    
    const content = fs.readFileSync(pagePath, 'utf-8');
    
    const hasBedrockInterface = /BedrockChatInterface/.test(content);
    const hasFeatureDetection = /config.*enabled|bedrockEnabled/.test(content);
    const hasFallback = /fallback|intent-based/.test(content);
    
    if (hasBedrockInterface) {
      recordResult('Chat Pages', `${role} page`, true, 'uses BedrockChatInterface');
      
      if (hasFeatureDetection) {
        logInfo(`  - Has feature detection`);
      } else {
        recordWarning('Chat Pages', `${role} feature detection`, 'missing feature detection');
      }
      
      if (hasFallback) {
        logInfo(`  - Has fallback chat`);
      }
    } else {
      recordResult('Chat Pages', `${role} page`, false, 'missing BedrockChatInterface integration');
    }
  });
}

// 8. Verify CloudFormation Templates
function verifyCloudFormation() {
  logSection('8. CloudFormation Templates Verification');
  
  const templatePath = 'aws/cloudformation/cognito-identity-pool.yaml';
  
  if (!fs.existsSync(templatePath)) {
    recordResult('CloudFormation', 'identity-pool.yaml', false, 'missing');
    return;
  }
  
  const template = fs.readFileSync(templatePath, 'utf-8');
  
  const checks = [
    { name: 'IdentityPool resource', pattern: /AWS::Cognito::IdentityPool/ },
    { name: 'GuestRole', pattern: /GuestRole:|GuestIAMRole/ },
    { name: 'ManagerRole', pattern: /ManagerRole:|ManagerIAMRole/ },
    { name: 'HousekeepingRole', pattern: /HousekeepingRole:|HousekeepingIAMRole/ },
    { name: 'MaintenanceRole', pattern: /MaintenanceRole:|MaintenanceIAMRole/ },
    { name: 'RoleAttachment', pattern: /AWS::Cognito::IdentityPoolRoleAttachment/ },
    { name: 'Bedrock permissions', pattern: /bedrock:InvokeModel/ },
    { name: 'Role mapping', pattern: /custom:role|RoleMappings/ },
  ];
  
  checks.forEach(check => {
    const passed = check.pattern.test(template);
    recordResult('CloudFormation', check.name, passed, passed ? 'defined' : 'missing');
  });
  
  // Check deployment script
  const deployScript = 'aws/cloudformation/deploy-identity-pool.sh';
  if (fs.existsSync(deployScript)) {
    const stats = fs.statSync(deployScript);
    const isExecutable = (stats.mode & 0o111) !== 0;
    recordResult('CloudFormation', 'deploy script', true, isExecutable ? 'exists and executable' : 'exists but not executable');
  } else {
    recordResult('CloudFormation', 'deploy script', false, 'missing');
  }
}

// 9. Verify Tests
function verifyTests() {
  logSection('9. Test Coverage Verification');
  
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
    const exists = fs.existsSync(testFile);
    if (exists) {
      const content = fs.readFileSync(testFile, 'utf-8');
      const testCount = (content.match(/it\(|test\(/g) || []).length;
      recordResult('Tests', path.basename(testFile), true, `exists (${testCount} tests)`);
    } else {
      recordResult('Tests', path.basename(testFile), false, 'missing');
    }
  });
}

// 10. Verify Documentation
function verifyDocumentation() {
  logSection('10. Documentation Verification');
  
  const docs = [
    { file: 'README.md', checks: ['Bedrock', 'Identity Pool', 'MCP'] },
    { file: 'docs/BEDROCK_CONFIGURATION.md', checks: ['environment', 'configuration', 'setup'] },
    { file: 'docs/BEDROCK_TROUBLESHOOTING.md', checks: ['error', 'troubleshoot', 'debug'] },
    { file: 'docs/BEDROCK_INTEGRATION_INDEX.md', checks: ['overview', 'architecture', 'components'] },
    { file: 'docs/MCP_SERVER_DEVELOPMENT.md', checks: ['MCP', 'server', 'development'] },
    { file: 'aws/cloudformation/README-IDENTITY-POOL.md', checks: ['Identity Pool', 'deployment', 'IAM'] },
    { file: 'aws/cloudformation/QUICKSTART-IDENTITY-POOL.md', checks: ['quick', 'start', 'deploy'] },
  ];
  
  docs.forEach(({ file, checks }) => {
    if (!fs.existsSync(file)) {
      recordResult('Documentation', file, false, 'missing');
      return;
    }
    
    const content = fs.readFileSync(file, 'utf-8').toLowerCase();
    const hasAllChecks = checks.every(check => content.includes(check.toLowerCase()));
    
    if (hasAllChecks) {
      recordResult('Documentation', file, true, 'complete');
    } else {
      const missingChecks = checks.filter(check => !content.includes(check.toLowerCase()));
      recordResult('Documentation', file, false, `missing: ${missingChecks.join(', ')}`);
    }
  });
}

// 11. Verify Package Dependencies
function verifyDependencies() {
  logSection('11. Package Dependencies Verification');
  
  const packageJsonPath = 'package.json';
  
  if (!fs.existsSync(packageJsonPath)) {
    recordResult('Dependencies', 'package.json', false, 'missing');
    return;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  const requiredPackages = [
    '@aws-sdk/client-cognito-identity',
    '@aws-sdk/client-bedrock-runtime',
  ];
  
  requiredPackages.forEach(pkg => {
    const installed = allDeps[pkg];
    recordResult('Dependencies', pkg, !!installed, installed ? `v${installed}` : 'not installed');
  });
  
  // Check for MCP SDK (optional but recommended)
  const mcpSdk = allDeps['@modelcontextprotocol/sdk'];
  if (mcpSdk) {
    logSuccess(`@modelcontextprotocol/sdk: v${mcpSdk}`);
  } else {
    recordWarning('Dependencies', '@modelcontextprotocol/sdk', 'not installed (optional)');
  }
}

// 12. Verify Security Controls
function verifySecurityControls() {
  logSection('12. Security Controls Verification');
  
  // Check session validation in API
  const streamPath = 'app/api/chat/stream/route.ts';
  if (fs.existsSync(streamPath)) {
    const content = fs.readFileSync(streamPath, 'utf-8');
    
    const checks = [
      { name: 'Session validation', pattern: /getSession|validateSession/ },
      { name: 'Role validation', pattern: /role.*validation|validateRole/ },
      { name: 'Input sanitization', pattern: /sanitize|validate.*input/ },
      { name: 'Error handling', pattern: /try.*catch/ },
      { name: 'Logging', pattern: /logger|log\(/ },
    ];
    
    checks.forEach(check => {
      const passed = check.pattern.test(content);
      recordResult('Security', check.name, passed, passed ? 'implemented' : 'missing');
    });
  }
  
  // Check IAM policies in CloudFormation
  const cfPath = 'aws/cloudformation/cognito-identity-pool.yaml';
  if (fs.existsSync(cfPath)) {
    const content = fs.readFileSync(cfPath, 'utf-8');
    
    const hasLeastPrivilege = /bedrock:InvokeModel/.test(content) && 
                             !/\*/.test(content.match(/Action:[\s\S]*?bedrock/)?.[0] || '');
    const hasResourceRestriction = /Resource:.*arn:aws:bedrock/.test(content);
    
    recordResult('Security', 'Least privilege IAM', hasLeastPrivilege, hasLeastPrivilege ? 'implemented' : 'needs review');
    recordResult('Security', 'Resource restrictions', hasResourceRestriction, hasResourceRestriction ? 'implemented' : 'needs review');
  }
}

// Generate Summary Report
function generateSummary() {
  logSection('Verification Summary');
  
  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  console.log(`Total Checks: ${total}`);
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, 'red');
  log(`Warnings: ${results.warnings}`, 'yellow');
  log(`Pass Rate: ${passRate}%`, passRate >= 90 ? 'green' : passRate >= 70 ? 'yellow' : 'red');
  
  console.log('\n' + '='.repeat(80));
  
  if (results.failed === 0) {
    log('\n✓ All critical checks passed! The Bedrock integration is properly wired.', 'green');
    log('\nNext steps:', 'bright');
    log('1. Configure environment variables in .env', 'cyan');
    log('2. Deploy CloudFormation Identity Pool stack', 'cyan');
    log('3. Configure remote MCP servers', 'cyan');
    log('4. Run integration tests', 'cyan');
    log('5. Test each role\'s chat interface', 'cyan');
  } else {
    log('\n✗ Some checks failed. Please review the errors above.', 'red');
    log('\nFailed sections:', 'bright');
    results.sections.forEach(section => {
      const failedChecks = section.checks.filter(c => c.passed === false);
      if (failedChecks.length > 0) {
        log(`\n${section.name}:`, 'yellow');
        failedChecks.forEach(check => {
          log(`  - ${check.check}: ${check.message}`, 'red');
        });
      }
    });
  }
  
  if (results.warnings > 0) {
    log('\n⚠ Warnings:', 'yellow');
    results.sections.forEach(section => {
      const warnings = section.checks.filter(c => c.warning);
      if (warnings.length > 0) {
        warnings.forEach(check => {
          log(`  - ${check.check}: ${check.message}`, 'yellow');
        });
      }
    });
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  return results.failed === 0;
}

// Main execution
async function main() {
  log('\n🔍 Bedrock Integration Verification', 'bright');
  log('Verifying all components are properly wired together...\n', 'cyan');
  
  try {
    verifyFileStructure();
    verifyEnvironmentConfig();
    verifyMCPConfigurations();
    verifySystemPrompts();
    verifyAPIEndpoints();
    verifyFrontendIntegration();
    verifyChatPages();
    verifyCloudFormation();
    verifyTests();
    verifyDocumentation();
    verifyDependencies();
    verifySecurityControls();
    
    const success = generateSummary();
    process.exit(success ? 0 : 1);
  } catch (error) {
    log(`\n✗ Verification failed with error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
