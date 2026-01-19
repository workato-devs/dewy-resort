#!/usr/bin/env node
/**
 * Debug script to check what's happening with Cognito config
 */

console.log('\n=== Environment Variables ===');
console.log('COGNITO_USER_POOL_ID:', process.env.COGNITO_USER_POOL_ID || '(not set)');
console.log('COGNITO_CLIENT_ID:', process.env.COGNITO_CLIENT_ID || '(not set)');
console.log('COGNITO_CLIENT_SECRET:', process.env.COGNITO_CLIENT_SECRET ? `"${process.env.COGNITO_CLIENT_SECRET}"` : '(not set)');
console.log('COGNITO_REGION:', process.env.COGNITO_REGION || '(not set)');
console.log('AUTH_PROVIDER:', process.env.AUTH_PROVIDER || '(not set)');

console.log('\n=== Checking clientSecret value ===');
const clientSecret = process.env.COGNITO_CLIENT_SECRET;
console.log('Raw value:', JSON.stringify(clientSecret));
console.log('Type:', typeof clientSecret);
console.log('Is undefined:', clientSecret === undefined);
console.log('Is empty string:', clientSecret === '');
console.log('Is falsy:', !clientSecret);
console.log('After || undefined:', clientSecret || undefined);

console.log('\n=== Git commit ===');
const { execSync } = require('child_process');
try {
  const commit = execSync('git log -1 --oneline', { encoding: 'utf8' });
  console.log('Current commit:', commit.trim());
} catch (e) {
  console.log('Could not get git commit');
}

console.log('\n');
