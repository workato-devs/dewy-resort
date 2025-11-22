#!/usr/bin/env node

/**
 * Test what identity the Cognito credentials resolve to
 */

const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');

const accessKeyId = process.argv[2];
const secretAccessKey = process.argv[3];
const sessionToken = process.argv[4];

if (!accessKeyId || !secretAccessKey || !sessionToken) {
  console.error('Usage: node scripts/test-cognito-creds-sts.js <accessKeyId> <secretAccessKey> <sessionToken>');
  process.exit(1);
}

async function testIdentity() {
  try {
    const client = new STSClient({
      region: 'us-west-2',
      credentials: {
        accessKeyId,
        secretAccessKey,
        sessionToken,
      },
    });

    const command = new GetCallerIdentityCommand({});
    const response = await client.send(command);

    console.log('\n✅ Credentials are valid!\n');
    console.log('Identity Information:');
    console.log(`  User ID: ${response.UserId}`);
    console.log(`  Account: ${response.Account}`);
    console.log(`  ARN: ${response.Arn}\n`);

    // Parse the ARN to see what role is being used
    const arnParts = response.Arn.split('/');
    const roleName = arnParts[arnParts.length - 2];
    console.log(`  Assumed Role: ${roleName}`);

  } catch (error) {
    console.error('\n❌ Failed to get caller identity:\n');
    console.error(`Error: ${error.message}`);
    console.error(`Error Name: ${error.name}`);
    process.exit(1);
  }
}

testIdentity();
