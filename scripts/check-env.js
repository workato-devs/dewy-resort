#!/usr/bin/env node

/**
 * Environment Check Script
 * Displays current configuration on server startup
 */

const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  }
  
  return env;
}

const env = loadEnvFile();
const authProvider = env.AUTH_PROVIDER?.toLowerCase();
const mockMode = env.WORKATO_MOCK_MODE;

// Determine effective auth provider
let effectiveProvider = authProvider;
if (!effectiveProvider) {
  effectiveProvider = mockMode === 'true' ? 'mock' : 'okta';
}

console.log('\n' + '='.repeat(60));
console.log('  Hotel Management System - Configuration');
console.log('='.repeat(60));

if (effectiveProvider === 'mock') {
  console.log('\n  🔧 MOCK MODE: Enabled');
  console.log('  📝 Authentication: Local SQLite (email/password)');
  console.log('  🔌 API Calls: Mocked responses');
  console.log('\n  Demo Credentials:');
  console.log('    Guest:   guest1@hotel.com / password123');
  console.log('    Manager: manager1@hotel.com / password123');
} else if (effectiveProvider === 'okta') {
  console.log('\n  🌐 REAL MODE: Enabled');
  console.log('  🔐 Authentication: Okta OAuth 2.0');
  console.log('  🔌 API Calls: Real API requests');
  if (env.OKTA_DOMAIN) {
    console.log(`  🏢 Okta Domain: ${env.OKTA_DOMAIN}`);
  }
} else if (effectiveProvider === 'cognito') {
  console.log('\n  🌐 REAL MODE: Enabled');
  console.log('  🔐 Authentication: AWS Cognito OAuth 2.0');
  console.log('  🔌 API Calls: Real API requests');
  if (env.COGNITO_USER_POOL_ID) {
    console.log(`  ☁️  Cognito User Pool: ${env.COGNITO_USER_POOL_ID}`);
  }
  if (env.COGNITO_REGION) {
    console.log(`  🌍 AWS Region: ${env.COGNITO_REGION}`);
  }
} else {
  console.log('\n  ⚠️  WARNING: AUTH_PROVIDER not set or invalid');
  console.log('  Set to "mock", "okta", or "cognito" in .env file');
}

console.log('\n  💡 Tip: Run "npm run verify:mock" to check configuration');
console.log('='.repeat(60) + '\n');
