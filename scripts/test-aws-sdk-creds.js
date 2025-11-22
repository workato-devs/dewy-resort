#!/usr/bin/env node

/**
 * Test AWS SDK Credential Resolution
 * This script tests if the AWS SDK can resolve credentials correctly
 */

const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');

async function testCredentials() {
  console.log('Testing AWS SDK credential resolution...\n');
  
  console.log('Environment variables:');
  console.log(`  AWS_PROFILE: ${process.env.AWS_PROFILE || '(not set)'}`);
  console.log(`  AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '(set)' : '(not set)'}`);
  console.log(`  AWS_REGION: ${process.env.AWS_REGION || '(not set)'}`);
  console.log('');

  const client = new STSClient({
    region: process.env.AWS_REGION || 'us-west-2'
  });

  try {
    const response = await client.send(new GetCallerIdentityCommand({}));
    console.log('✅ Credentials resolved successfully!');
    console.log(`  Account: ${response.Account}`);
    console.log(`  ARN: ${response.Arn}`);
    console.log(`  UserId: ${response.UserId}`);
  } catch (error) {
    console.error('❌ Failed to resolve credentials:');
    console.error(`  Error: ${error.message}`);
    console.error(`  Name: ${error.name}`);
    process.exit(1);
  }
}

testCredentials();
