#!/usr/bin/env node

/**
 * Verify Mock Mode Configuration
 * 
 * This script checks if WORKATO_MOCK_MODE is properly configured
 * and provides guidance on how to use it.
 */

// Load environment variables from .env file
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  // Script is now in scripts/tests/integration/, so go up 3 levels to app root
  const envPath = path.join(__dirname, '../../../.env');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found!');
    console.log('   Create a .env file based on .env.example');
    process.exit(1);
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

console.log('\n🔍 Mock Mode Configuration Check\n');
console.log('='.repeat(50));

// Check WORKATO_MOCK_MODE
const mockMode = env.WORKATO_MOCK_MODE;

if (!mockMode) {
  console.log('\n⚠️  WORKATO_MOCK_MODE is not set in .env');
  console.log('   Add: WORKATO_MOCK_MODE=true (for local development)');
  console.log('   Or:  WORKATO_MOCK_MODE=false (for Okta authentication)');
  process.exit(1);
}

console.log(`\nWORKATO_MOCK_MODE: ${mockMode}`);

if (mockMode === 'true') {
  console.log('\n✅ Mock Mode is ENABLED');
  console.log('\n   Authentication: Local SQLite (email/password)');
  console.log('   API Calls: Mocked responses');
  console.log('   Okta: Disabled');
  console.log('\n   Demo Credentials:');
  console.log('   - Guest: guest1@hotel.com / Hotel2026!');
  console.log('   - Manager: manager1@hotel.com / Hotel2026!');
  
  // Check if Okta vars are set (they're optional in mock mode)
  const hasOktaVars = env.OKTA_DOMAIN && env.OKTA_CLIENT_ID && env.OKTA_CLIENT_SECRET;
  if (hasOktaVars) {
    console.log('\n   ℹ️  Okta credentials are configured but will be ignored in mock mode');
  }
  
} else if (mockMode === 'false') {
  console.log('\n✅ Mock Mode is DISABLED');
  console.log('\n   Authentication: Okta OAuth 2.0');
  console.log('   API Calls: Real API requests');
  console.log('   Okta: Enabled');
  
  // Check required Okta variables
  const requiredVars = ['OKTA_DOMAIN', 'OKTA_CLIENT_ID', 'OKTA_CLIENT_SECRET', 'APP_URL'];
  const missing = requiredVars.filter(v => !env[v]);
  
  if (missing.length > 0) {
    console.log('\n   ❌ Missing required Okta configuration:');
    missing.forEach(v => console.log(`      - ${v}`));
    console.log('\n   Add these variables to your .env file');
    process.exit(1);
  }
  
  console.log('\n   Okta Configuration:');
  console.log(`   - Domain: ${env.OKTA_DOMAIN}`);
  console.log(`   - Client ID: ${env.OKTA_CLIENT_ID}`);
  console.log(`   - App URL: ${env.APP_URL}`);
  
} else {
  console.log(`\n❌ Invalid WORKATO_MOCK_MODE value: "${mockMode}"`);
  console.log('   Must be either "true" or "false"');
  process.exit(1);
}

console.log('\n' + '='.repeat(50));
console.log('\n⚠️  IMPORTANT: Restart the Next.js dev server after');
console.log('   changing WORKATO_MOCK_MODE for changes to take effect!\n');
console.log('   Run: npm run dev\n');
