#!/usr/bin/env node

/**
 * Test script for Cognito configuration module
 * 
 * This script verifies that the Cognito configuration loading and validation
 * works correctly with different environment variable configurations.
 */

// Test scenarios
const testScenarios = [
  {
    name: 'Cognito disabled (AUTH_PROVIDER not set to cognito)',
    env: { AUTH_PROVIDER: 'mock' },
    expected: null,
    description: 'Should return null when Cognito is not enabled'
  },
  {
    name: 'Cognito disabled (AUTH_PROVIDER set to okta)',
    env: { AUTH_PROVIDER: 'okta' },
    expected: null,
    description: 'Should return null when AUTH_PROVIDER is okta'
  },
  {
    name: 'Valid Cognito configuration',
    env: {
      AUTH_PROVIDER: 'cognito',
      COGNITO_USER_POOL_ID: 'us-east-1_ABC123',
      COGNITO_CLIENT_ID: 'test_client_id',
      COGNITO_CLIENT_SECRET: 'test_client_secret',
      COGNITO_REGION: 'us-east-1',
      APP_URL: 'http://localhost:3000'
    },
    expected: {
      userPoolId: 'us-east-1_ABC123',
      clientId: 'test_client_id',
      clientSecret: 'test_client_secret',
      region: 'us-east-1',
      redirectUri: 'http://localhost:3000/api/auth/cognito/callback',
      domain: 'https://us-east-1_ABC123.auth.us-east-1.amazoncognito.com',
      issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123',
      authorizationEndpoint: 'https://us-east-1_ABC123.auth.us-east-1.amazoncognito.com/oauth2/authorize',
      tokenEndpoint: 'https://us-east-1_ABC123.auth.us-east-1.amazoncognito.com/oauth2/token',
      userInfoEndpoint: 'https://us-east-1_ABC123.auth.us-east-1.amazoncognito.com/oauth2/userInfo',
      jwksUri: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123/.well-known/jwks.json'
    },
    description: 'Should load valid configuration with computed values'
  },
  {
    name: 'Custom redirect URI',
    env: {
      AUTH_PROVIDER: 'cognito',
      COGNITO_USER_POOL_ID: 'us-west-2_XYZ789',
      COGNITO_CLIENT_ID: 'test_client_id',
      COGNITO_CLIENT_SECRET: 'test_client_secret',
      COGNITO_REGION: 'us-west-2',
      COGNITO_REDIRECT_URI: 'https://example.com/auth/callback',
      APP_URL: 'http://localhost:3000'
    },
    expected: {
      redirectUri: 'https://example.com/auth/callback'
    },
    description: 'Should use custom redirect URI when provided',
    partialMatch: true
  },
  {
    name: 'Custom domain',
    env: {
      AUTH_PROVIDER: 'cognito',
      COGNITO_USER_POOL_ID: 'eu-west-1_DEF456',
      COGNITO_CLIENT_ID: 'test_client_id',
      COGNITO_CLIENT_SECRET: 'test_client_secret',
      COGNITO_REGION: 'eu-west-1',
      COGNITO_DOMAIN: 'my-custom-domain.auth.eu-west-1.amazoncognito.com',
      APP_URL: 'http://localhost:3000'
    },
    expected: {
      domain: 'https://my-custom-domain.auth.eu-west-1.amazoncognito.com',
      authorizationEndpoint: 'https://my-custom-domain.auth.eu-west-1.amazoncognito.com/oauth2/authorize'
    },
    description: 'Should use custom domain when provided',
    partialMatch: true
  },
  {
    name: 'Missing USER_POOL_ID',
    env: {
      AUTH_PROVIDER: 'cognito',
      COGNITO_CLIENT_ID: 'test_client_id',
      COGNITO_CLIENT_SECRET: 'test_client_secret',
      COGNITO_REGION: 'us-east-1',
      APP_URL: 'http://localhost:3000'
    },
    shouldThrow: true,
    expectedError: 'Missing required Cognito environment variables: COGNITO_USER_POOL_ID',
    description: 'Should throw error when USER_POOL_ID is missing'
  },
  {
    name: 'Missing CLIENT_ID',
    env: {
      AUTH_PROVIDER: 'cognito',
      COGNITO_USER_POOL_ID: 'us-east-1_ABC123',
      COGNITO_CLIENT_SECRET: 'test_client_secret',
      COGNITO_REGION: 'us-east-1',
      APP_URL: 'http://localhost:3000'
    },
    shouldThrow: true,
    expectedError: 'Missing required Cognito environment variables: COGNITO_CLIENT_ID',
    description: 'Should throw error when CLIENT_ID is missing'
  },
  {
    name: 'Missing CLIENT_SECRET',
    env: {
      AUTH_PROVIDER: 'cognito',
      COGNITO_USER_POOL_ID: 'us-east-1_ABC123',
      COGNITO_CLIENT_ID: 'test_client_id',
      COGNITO_REGION: 'us-east-1',
      APP_URL: 'http://localhost:3000'
    },
    shouldThrow: true,
    expectedError: 'Missing required Cognito environment variables: COGNITO_CLIENT_SECRET',
    description: 'Should throw error when CLIENT_SECRET is missing'
  },
  {
    name: 'Missing REGION',
    env: {
      AUTH_PROVIDER: 'cognito',
      COGNITO_USER_POOL_ID: 'us-east-1_ABC123',
      COGNITO_CLIENT_ID: 'test_client_id',
      COGNITO_CLIENT_SECRET: 'test_client_secret',
      APP_URL: 'http://localhost:3000'
    },
    shouldThrow: true,
    expectedError: 'Missing required Cognito environment variables: COGNITO_REGION',
    description: 'Should throw error when REGION is missing'
  },
  {
    name: 'Invalid region format',
    env: {
      AUTH_PROVIDER: 'cognito',
      COGNITO_USER_POOL_ID: 'us-east-1_ABC123',
      COGNITO_CLIENT_ID: 'test_client_id',
      COGNITO_CLIENT_SECRET: 'test_client_secret',
      COGNITO_REGION: 'invalid-region',
      APP_URL: 'http://localhost:3000'
    },
    shouldThrow: true,
    expectedError: "Invalid AWS region format: invalid-region",
    description: 'Should throw error for invalid region format'
  },
  {
    name: 'User Pool ID region mismatch',
    env: {
      AUTH_PROVIDER: 'cognito',
      COGNITO_USER_POOL_ID: 'us-west-2_ABC123',
      COGNITO_CLIENT_ID: 'test_client_id',
      COGNITO_CLIENT_SECRET: 'test_client_secret',
      COGNITO_REGION: 'us-east-1',
      APP_URL: 'http://localhost:3000'
    },
    shouldThrow: true,
    expectedError: 'User Pool ID us-west-2_ABC123 does not match region us-east-1',
    description: 'Should throw error when User Pool ID region does not match REGION'
  }
];

let passed = 0;
let failed = 0;

console.log('Testing Cognito Configuration Module\n');
console.log('='.repeat(60));

for (const scenario of testScenarios) {
  console.log(`\nTest: ${scenario.name}`);
  console.log(`  ${scenario.description}`);
  
  // Save original env
  const originalEnv = { ...process.env };
  
  // Clear relevant env vars
  delete process.env.AUTH_PROVIDER;
  delete process.env.COGNITO_USER_POOL_ID;
  delete process.env.COGNITO_CLIENT_ID;
  delete process.env.COGNITO_CLIENT_SECRET;
  delete process.env.COGNITO_REGION;
  delete process.env.COGNITO_REDIRECT_URI;
  delete process.env.COGNITO_DOMAIN;
  delete process.env.APP_URL;
  
  // Set test env vars
  Object.assign(process.env, scenario.env);
  
  // Clear module cache to reload with new env
  // Note: In ESM/tsx, we need to use dynamic import to get fresh modules
  
  try {
    // Use dynamic import to bypass cache
    const configModule = await import(`../lib/auth/cognito/config.ts?t=${Date.now()}`);
    const { loadCognitoConfig, isCognitoEnabled } = configModule;
    
    if (scenario.shouldThrow) {
      // Should have thrown an error
      console.log('  ❌ FAILED: Expected error to be thrown');
      failed++;
    } else {
      const config = loadCognitoConfig();
      
      // Check if Cognito is enabled
      const enabled = isCognitoEnabled();
      console.log(`  ✓ isCognitoEnabled: ${enabled}`);
      
      if (scenario.expected === null) {
        if (config === null) {
          console.log('  ✓ Returned null as expected');
          console.log('  ✅ PASSED');
          passed++;
        } else {
          console.log('  ❌ FAILED: Expected null, got config object');
          failed++;
        }
      } else {
        if (config === null) {
          console.log('  ❌ FAILED: Expected config object, got null');
          failed++;
        } else {
          let matches = true;
          
          if (scenario.partialMatch) {
            // Check only specified fields
            for (const [key, value] of Object.entries(scenario.expected)) {
              if (config[key] !== value) {
                console.log(`  ❌ FAILED: ${key} mismatch`);
                console.log(`    Expected: ${value}`);
                console.log(`    Got: ${config[key]}`);
                matches = false;
              } else {
                console.log(`  ✓ ${key}: ${config[key]}`);
              }
            }
          } else {
            // Check all fields
            for (const [key, value] of Object.entries(scenario.expected)) {
              if (config[key] !== value) {
                console.log(`  ❌ FAILED: ${key} mismatch`);
                console.log(`    Expected: ${value}`);
                console.log(`    Got: ${config[key]}`);
                matches = false;
              }
            }
            
            if (matches) {
              console.log('  ✓ All configuration values correct');
            }
          }
          
          if (matches) {
            console.log('  ✅ PASSED');
            passed++;
          } else {
            failed++;
          }
        }
      }
    }
  } catch (error) {
    if (scenario.shouldThrow) {
      if (error.message.includes(scenario.expectedError)) {
        console.log(`  ✓ Threw expected error: ${error.message}`);
        console.log('  ✅ PASSED');
        passed++;
      } else {
        console.log(`  ❌ FAILED: Wrong error message`);
        console.log(`    Expected to include: ${scenario.expectedError}`);
        console.log(`    Got: ${error.message}`);
        failed++;
      }
    } else {
      console.log(`  ❌ FAILED: Unexpected error: ${error.message}`);
      console.log(`    Stack: ${error.stack}`);
      failed++;
    }
  }
  
  // Restore original env
  process.env = originalEnv;
}

console.log('\n' + '='.repeat(60));
console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}

console.log('\n✅ All tests passed!\n');
