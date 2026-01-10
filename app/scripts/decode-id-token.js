#!/usr/bin/env node

/**
 * Decode and display ID token claims
 */

const idToken = process.argv[2];

if (!idToken) {
  console.error('Usage: node scripts/decode-id-token.js <id-token>');
  console.log('\nTo get an ID token:');
  console.log('  1. Log in to the application');
  console.log('  2. Visit http://localhost:3000/api/debug/session-tokens');
  console.log('  3. Copy the ID token from the response');
  process.exit(1);
}

try {
  // JWT is base64url encoded, split by dots
  const parts = idToken.split('.');
  
  if (parts.length !== 3) {
    console.error('Invalid JWT format');
    process.exit(1);
  }
  
  // Decode the payload (second part)
  const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
  const claims = JSON.parse(payload);
  
  console.log('\n=== ID Token Claims ===\n');
  console.log(JSON.stringify(claims, null, 2));
  
  console.log('\n=== Key Claims ===\n');
  console.log(`Subject (sub): ${claims.sub}`);
  console.log(`Email: ${claims.email}`);
  console.log(`Custom Role: ${claims['custom:role'] || 'NOT SET'}`);
  console.log(`Cognito Groups: ${claims['cognito:groups'] || 'NOT SET'}`);
  console.log(`Issued At: ${new Date(claims.iat * 1000).toISOString()}`);
  console.log(`Expires At: ${new Date(claims.exp * 1000).toISOString()}`);
  
  if (!claims['custom:role']) {
    console.log('\n⚠️  WARNING: custom:role claim is missing!');
    console.log('This will cause Identity Pool role mapping to fail.');
  }
  
} catch (error) {
  console.error('Error decoding token:', error.message);
  process.exit(1);
}
