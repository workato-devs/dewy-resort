#!/usr/bin/env node

/**
 * Test Identity Pool Configuration
 * 
 * This script tests if the Cognito Identity Pool is properly configured
 * and can exchange ID tokens for AWS credentials.
 */

const {
  CognitoIdentityClient,
  GetIdCommand,
  GetCredentialsForIdentityCommand,
} = require('@aws-sdk/client-cognito-identity');

// Load environment variables (optional - can use process.env directly)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not available, use environment variables directly
}

const IDENTITY_POOL_ID = process.env.COGNITO_IDENTITY_POOL_ID;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const REGION = process.env.AWS_REGION || process.env.COGNITO_REGION || 'us-west-2';

async function testIdentityPool(idToken) {
  console.log('\n=== Testing Identity Pool Configuration ===\n');
  
  console.log('Configuration:');
  console.log(`  Identity Pool ID: ${IDENTITY_POOL_ID}`);
  console.log(`  User Pool ID: ${USER_POOL_ID}`);
  console.log(`  Region: ${REGION}`);
  console.log(`  ID Token length: ${idToken?.length || 0} characters\n`);

  if (!IDENTITY_POOL_ID) {
    console.error('❌ COGNITO_IDENTITY_POOL_ID not set in .env');
    process.exit(1);
  }

  if (!USER_POOL_ID) {
    console.error('❌ COGNITO_USER_POOL_ID not set in .env');
    process.exit(1);
  }

  if (!idToken) {
    console.error('❌ No ID token provided');
    console.log('\nUsage: node scripts/test-identity-pool.js <id-token>');
    console.log('\nTo get an ID token:');
    console.log('  1. Log in to the application');
    console.log('  2. Visit http://localhost:3000/api/debug/session-tokens');
    console.log('  3. Copy the ID token from the response');
    process.exit(1);
  }

  const client = new CognitoIdentityClient({ region: REGION });
  const loginKey = `cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;

  try {
    // Step 1: Get Identity ID
    console.log('Step 1: Getting Identity ID...');
    const getIdCommand = new GetIdCommand({
      IdentityPoolId: IDENTITY_POOL_ID,
      Logins: {
        [loginKey]: idToken,
      },
    });

    const idResponse = await client.send(getIdCommand);
    
    if (!idResponse.IdentityId) {
      console.error('❌ No Identity ID returned');
      process.exit(1);
    }

    console.log(`✅ Identity ID: ${idResponse.IdentityId}\n`);

    // Step 2: Get Credentials
    console.log('Step 2: Getting AWS Credentials...');
    const getCredsCommand = new GetCredentialsForIdentityCommand({
      IdentityId: idResponse.IdentityId,
      Logins: {
        [loginKey]: idToken,
      },
    });

    const credsResponse = await client.send(getCredsCommand);

    if (!credsResponse.Credentials) {
      console.error('❌ No credentials returned');
      process.exit(1);
    }

    console.log('✅ Credentials obtained successfully!');
    console.log(`  Access Key ID: ${credsResponse.Credentials.AccessKeyId?.substring(0, 20)}...`);
    console.log(`  Expiration: ${credsResponse.Credentials.Expiration}`);
    console.log('\n✅ Identity Pool is configured correctly!\n');

  } catch (error) {
    console.error('\n❌ Identity Pool test failed:\n');
    console.error(`Error: ${error.message}`);
    console.error(`Code: ${error.name}`);
    
    if (error.$metadata) {
      console.error(`HTTP Status: ${error.$metadata.httpStatusCode}`);
    }

    console.error('\nCommon issues:');
    console.error('  1. Identity Pool not created or wrong ID');
    console.error('  2. User Pool not linked to Identity Pool');
    console.error('  3. IAM roles not configured for authenticated users');
    console.error('  4. ID token expired or invalid');
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Get ID token from command line argument
const idToken = process.argv[2];
testIdentityPool(idToken);
