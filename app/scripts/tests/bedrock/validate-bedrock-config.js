#!/usr/bin/env node

/**
 * Bedrock Configuration Validation Script
 * 
 * Validates Bedrock integration configuration including:
 * - Authentication provider settings
 * - Identity Pool configuration
 * - Bedrock model settings
 * - MCP server configuration
 * 
 * Usage: node scripts/validate-bedrock-config.js
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
  console.log();
  log(`${'='.repeat(60)}`, 'cyan');
  log(title, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
  console.log();
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
  log(`ℹ ${message}`, 'blue');
}

/**
 * Validate Identity Pool ID format
 */
function isValidIdentityPoolId(identityPoolId) {
  const pattern = /^[a-z]{2}-[a-z]+-\d:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return pattern.test(identityPoolId);
}

/**
 * Validate AWS region format
 */
function isValidAwsRegion(region) {
  const pattern = /^[a-z]{2}-[a-z]+-\d$/;
  return pattern.test(region);
}

/**
 * Validate Bedrock model ID format
 */
function isValidBedrockModelId(modelId) {
  const pattern = /^[a-z0-9]+\.[a-z0-9-]+/i;
  return pattern.test(modelId);
}

/**
 * Check if Bedrock is enabled
 */
function isBedrockEnabled() {
  const authProvider = process.env.AUTH_PROVIDER;
  const identityPoolId = process.env.COGNITO_IDENTITY_POOL_ID;
  
  return authProvider === 'cognito' && !!identityPoolId;
}

/**
 * Validate authentication provider configuration
 */
function validateAuthProvider() {
  logSection('Authentication Provider Configuration');
  
  const authProvider = process.env.AUTH_PROVIDER;
  
  if (!authProvider) {
    logWarning('AUTH_PROVIDER not set (defaults to "mock")');
    logInfo('Set AUTH_PROVIDER=cognito to enable Bedrock integration');
    return false;
  }
  
  logSuccess(`AUTH_PROVIDER: ${authProvider}`);
  
  if (authProvider !== 'cognito') {
    logWarning('Bedrock integration requires AUTH_PROVIDER=cognito');
    logInfo('Current provider does not support Bedrock features');
    return false;
  }
  
  return true;
}

/**
 * Validate Identity Pool configuration
 */
function validateIdentityPool() {
  logSection('Identity Pool Configuration');
  
  const identityPoolId = process.env.COGNITO_IDENTITY_POOL_ID;
  const region = process.env.AWS_REGION || process.env.COGNITO_REGION;
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;
  
  let hasErrors = false;
  
  // Check Identity Pool ID
  if (!identityPoolId) {
    logError('COGNITO_IDENTITY_POOL_ID is not set');
    logInfo('Deploy Identity Pool: cd aws/cloudformation && ./deploy-identity-pool.sh dev <user-pool-id> <client-id>');
    hasErrors = true;
  } else if (!isValidIdentityPoolId(identityPoolId)) {
    logError(`Invalid COGNITO_IDENTITY_POOL_ID format: ${identityPoolId}`);
    logInfo('Expected format: region:uuid (e.g., us-west-2:12345678-1234-1234-1234-123456789012)');
    hasErrors = true;
  } else {
    logSuccess(`COGNITO_IDENTITY_POOL_ID: ${identityPoolId}`);
  }
  
  // Check region
  if (!region) {
    logError('AWS_REGION or COGNITO_REGION is not set');
    hasErrors = true;
  } else if (!isValidAwsRegion(region)) {
    logError(`Invalid AWS region format: ${region}`);
    logInfo('Expected format: us-east-1, eu-west-1, ap-southeast-1, etc.');
    hasErrors = true;
  } else {
    logSuccess(`AWS_REGION: ${region}`);
  }
  
  // Check User Pool ID
  if (!userPoolId) {
    logError('COGNITO_USER_POOL_ID is not set');
    hasErrors = true;
  } else {
    logSuccess(`COGNITO_USER_POOL_ID: ${userPoolId}`);
  }
  
  // Check Client ID
  if (!clientId) {
    logError('COGNITO_CLIENT_ID is not set');
    hasErrors = true;
  } else {
    logSuccess(`COGNITO_CLIENT_ID: ${clientId}`);
  }
  
  return !hasErrors;
}

/**
 * Validate Bedrock configuration
 */
function validateBedrock() {
  logSection('Bedrock Model Configuration');
  
  const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
  const maxTokens = parseInt(process.env.BEDROCK_MAX_TOKENS || '4096', 10);
  const temperature = parseFloat(process.env.BEDROCK_TEMPERATURE || '0.7');
  const region = process.env.AWS_REGION || process.env.COGNITO_REGION;
  
  let hasErrors = false;
  
  // Check model ID
  if (!isValidBedrockModelId(modelId)) {
    logError(`Invalid BEDROCK_MODEL_ID format: ${modelId}`);
    logInfo('Expected format: provider.model-name-version (e.g., anthropic.claude-3-sonnet-20240229-v1:0)');
    hasErrors = true;
  } else {
    logSuccess(`BEDROCK_MODEL_ID: ${modelId}`);
    if (!process.env.BEDROCK_MODEL_ID) {
      logInfo('Using default model (not explicitly set)');
    }
  }
  
  // Check max tokens
  if (isNaN(maxTokens) || maxTokens <= 0) {
    logError(`Invalid BEDROCK_MAX_TOKENS: ${process.env.BEDROCK_MAX_TOKENS}`);
    logInfo('Must be a positive number');
    hasErrors = true;
  } else if (maxTokens > 200000) {
    logError(`BEDROCK_MAX_TOKENS too large: ${maxTokens}`);
    logInfo('Maximum allowed: 200000');
    hasErrors = true;
  } else {
    logSuccess(`BEDROCK_MAX_TOKENS: ${maxTokens}`);
    if (!process.env.BEDROCK_MAX_TOKENS) {
      logInfo('Using default value (not explicitly set)');
    }
  }
  
  // Check temperature
  if (isNaN(temperature) || temperature < 0 || temperature > 1) {
    logError(`Invalid BEDROCK_TEMPERATURE: ${process.env.BEDROCK_TEMPERATURE}`);
    logInfo('Must be between 0.0 and 1.0');
    hasErrors = true;
  } else {
    logSuccess(`BEDROCK_TEMPERATURE: ${temperature}`);
    if (!process.env.BEDROCK_TEMPERATURE) {
      logInfo('Using default value (not explicitly set)');
    }
  }
  
  // Check region
  if (!region) {
    logError('AWS_REGION or COGNITO_REGION is not set');
    hasErrors = true;
  } else {
    logSuccess(`Bedrock Region: ${region}`);
  }
  
  return !hasErrors;
}

/**
 * Validate MCP configuration files
 */
function validateMCPConfig() {
  logSection('MCP Configuration');
  
  const mcpConfigPath = process.env.MCP_CONFIG_PATH || 'config/mcp';
  const roles = ['guest', 'manager', 'housekeeping', 'maintenance'];
  
  let hasErrors = false;
  
  logInfo(`MCP Config Path: ${mcpConfigPath}`);
  
  // Check if config directory exists
  if (!fs.existsSync(mcpConfigPath)) {
    logError(`MCP config directory not found: ${mcpConfigPath}`);
    return false;
  }
  
  logSuccess(`MCP config directory exists: ${mcpConfigPath}`);
  
  // Check each role configuration
  for (const role of roles) {
    const configFile = path.join(mcpConfigPath, `${role}.json`);
    
    if (!fs.existsSync(configFile)) {
      logError(`Missing MCP config for role: ${role}`);
      logInfo(`Expected file: ${configFile}`);
      hasErrors = true;
      continue;
    }
    
    try {
      const configContent = fs.readFileSync(configFile, 'utf8');
      const config = JSON.parse(configContent);
      
      // Validate config structure
      if (!config.role) {
        logError(`${role}.json: Missing 'role' field`);
        hasErrors = true;
      } else if (config.role !== role) {
        logError(`${role}.json: Role mismatch (expected: ${role}, got: ${config.role})`);
        hasErrors = true;
      }
      
      if (!config.servers || !Array.isArray(config.servers)) {
        logError(`${role}.json: Missing or invalid 'servers' array`);
        hasErrors = true;
      } else {
        logSuccess(`${role}.json: Valid (${config.servers.length} server(s) configured)`);
        
        // Check each server configuration
        config.servers.forEach((server, index) => {
          if (!server.name) {
            logWarning(`  Server ${index + 1}: Missing 'name' field`);
          }
          if (!server.type) {
            logWarning(`  Server ${index + 1}: Missing 'type' field`);
          }
          if (!server.tools || !Array.isArray(server.tools)) {
            logWarning(`  Server ${index + 1}: Missing or invalid 'tools' array`);
          } else {
            logInfo(`  Server ${index + 1} (${server.name}): ${server.tools.length} tool(s)`);
          }
        });
      }
    } catch (error) {
      logError(`${role}.json: Failed to parse JSON`);
      logInfo(`Error: ${error.message}`);
      hasErrors = true;
    }
  }
  
  return !hasErrors;
}

/**
 * Provide setup recommendations
 */
function provideRecommendations() {
  logSection('Setup Recommendations');
  
  if (!isBedrockEnabled()) {
    log('To enable Bedrock integration:', 'bright');
    console.log();
    log('1. Set authentication provider:', 'yellow');
    console.log('   AUTH_PROVIDER=cognito');
    console.log();
    log('2. Deploy Cognito Identity Pool:', 'yellow');
    console.log('   cd aws/cloudformation');
    console.log('   ./deploy-identity-pool.sh dev <user-pool-id> <client-id>');
    console.log();
    log('3. Enable Bedrock model access:', 'yellow');
    console.log('   https://console.aws.amazon.com/bedrock/home#/modelaccess');
    console.log();
    log('4. Update .env with Identity Pool ID:', 'yellow');
    console.log('   COGNITO_IDENTITY_POOL_ID=us-west-2:...');
    console.log();
    log('5. Restart the development server:', 'yellow');
    console.log('   npm run dev');
    console.log();
  } else {
    logSuccess('Bedrock integration is enabled and configured!');
    console.log();
    logInfo('Next steps:');
    console.log('  - Test chat functionality at /guest/chat or /manager/chat');
    console.log('  - Configure MCP servers for role-specific tools');
    console.log('  - Customize system prompts in config/prompts/');
    console.log();
  }
}

/**
 * Main validation function
 */
function main() {
  console.log();
  log('Bedrock Configuration Validator', 'bright');
  log('Validating Amazon Bedrock integration configuration...', 'cyan');
  
  const authValid = validateAuthProvider();
  
  if (!authValid) {
    provideRecommendations();
    process.exit(0);
  }
  
  const identityPoolValid = validateIdentityPool();
  const bedrockValid = validateBedrock();
  const mcpValid = validateMCPConfig();
  
  logSection('Validation Summary');
  
  if (identityPoolValid && bedrockValid && mcpValid) {
    logSuccess('All configuration checks passed!');
    log('Bedrock integration is ready to use.', 'green');
  } else {
    logError('Configuration validation failed!');
    log('Please fix the errors above and try again.', 'red');
    console.log();
    process.exit(1);
  }
  
  provideRecommendations();
}

// Run validation
main();
