#!/usr/bin/env node

/**
 * Simple manual test for Cognito configuration module
 * 
 * Run this script with different environment variables to test the configuration.
 * 
 * Examples:
 *   AUTH_PROVIDER=cognito COGNITO_USER_POOL_ID=us-east-1_ABC123 COGNITO_CLIENT_ID=test COGNITO_CLIENT_SECRET=secret COGNITO_REGION=us-east-1 APP_URL=http://localhost:3000 node scripts/test-cognito-config-simple.js
 *   AUTH_PROVIDER=mock node scripts/test-cognito-config-simple.js
 *   AUTH_PROVIDER=cognito node scripts/test-cognito-config-simple.js (should error)
 */

console.log('Testing Cognito Configuration Module\n');
console.log('Environment Variables:');
console.log('  AUTH_PROVIDER:', process.env.AUTH_PROVIDER || '(not set)');
console.log('  COGNITO_USER_POOL_ID:', process.env.COGNITO_USER_POOL_ID || '(not set)');
console.log('  COGNITO_CLIENT_ID:', process.env.COGNITO_CLIENT_ID || '(not set)');
console.log('  COGNITO_CLIENT_SECRET:', process.env.COGNITO_CLIENT_SECRET ? '***' : '(not set)');
console.log('  COGNITO_REGION:', process.env.COGNITO_REGION || '(not set)');
console.log('  COGNITO_REDIRECT_URI:', process.env.COGNITO_REDIRECT_URI || '(not set)');
console.log('  COGNITO_DOMAIN:', process.env.COGNITO_DOMAIN || '(not set)');
console.log('  APP_URL:', process.env.APP_URL || '(not set)');
console.log('');

try {
  const { loadCognitoConfig, isCognitoEnabled } = require('../lib/auth/cognito/config.ts');
  
  console.log('isCognitoEnabled():', isCognitoEnabled());
  console.log('');
  
  const config = loadCognitoConfig();
  
  if (config === null) {
    console.log('✓ loadCognitoConfig() returned null (Cognito not enabled)');
  } else {
    console.log('✓ loadCognitoConfig() returned configuration:');
    console.log('');
    console.log('  userPoolId:', config.userPoolId);
    console.log('  clientId:', config.clientId);
    console.log('  clientSecret:', '***');
    console.log('  region:', config.region);
    console.log('  redirectUri:', config.redirectUri);
    console.log('  domain:', config.domain);
    console.log('  issuer:', config.issuer);
    console.log('  authorizationEndpoint:', config.authorizationEndpoint);
    console.log('  tokenEndpoint:', config.tokenEndpoint);
    console.log('  userInfoEndpoint:', config.userInfoEndpoint);
    console.log('  jwksUri:', config.jwksUri);
  }
  
  console.log('');
  console.log('✅ Test completed successfully');
} catch (error) {
  console.log('❌ Error:', error.message);
  console.log('');
  console.log('Stack:', error.stack);
  process.exit(1);
}
