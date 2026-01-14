#!/usr/bin/env node

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');

async function testWithDebug() {
  const accessKeyId = process.argv[2];
  const secretAccessKey = process.argv[3];
  const sessionToken = process.argv[4];
  const modelId = 'anthropic.claude-3-haiku-20240307-v1:0';
  const region = 'us-west-2';

  if (!accessKeyId || !secretAccessKey || !sessionToken) {
    console.error('Usage: node scripts/test-bedrock-debug.js <accessKeyId> <secretAccessKey> <sessionToken>');
    process.exit(1);
  }

  const credentials = {
    accessKeyId,
    secretAccessKey,
    sessionToken
  };

  console.log('=== Testing Bedrock Access with Debug Info ===\n');
  
  // Step 1: Verify credentials with STS
  console.log('Step 1: Verifying credentials with STS...');
  const stsClient = new STSClient({ region, credentials });
  
  try {
    const identity = await stsClient.send(new GetCallerIdentityCommand({}));
    console.log('✅ STS GetCallerIdentity succeeded');
    console.log(`   ARN: ${identity.Arn}`);
    console.log(`   Account: ${identity.Account}`);
    console.log(`   UserId: ${identity.UserId}`);
    console.log('');
  } catch (error) {
    console.error('❌ STS GetCallerIdentity failed:', error.message);
    process.exit(1);
  }

  // Step 2: Try Bedrock with detailed logging
  console.log('Step 2: Testing Bedrock InvokeModel...');
  console.log(`   Model: ${modelId}`);
  console.log(`   Region: ${region}`);
  console.log('');

  const bedrockClient = new BedrockRuntimeClient({
    region,
    credentials,
    logger: console, // Enable SDK logging
  });

  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: 'Say hello'
      }
    ]
  };

  console.log('Request body:', JSON.stringify(requestBody, null, 2));
  console.log('');

  try {
    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody)
    });

    console.log('Sending request...');
    const response = await bedrockClient.send(command);

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log('\n✅ Success!');
    console.log('Response:', responseBody.content[0].text);
    
  } catch (error) {
    console.error('\n❌ Bedrock InvokeModel failed');
    console.error(`   Error: ${error.name}`);
    console.error(`   Message: ${error.message}`);
    console.error(`   Status: ${error.$metadata?.httpStatusCode}`);
    console.error(`   Request ID: ${error.$metadata?.requestId}`);
    
    if (error.$response) {
      console.error(`   Response headers:`, error.$response.headers);
    }
    
    console.error('\nThis suggests the IAM role lacks Bedrock model access permissions.');
    console.error('Even with correct IAM policies, Bedrock requires explicit model access grants.');
    process.exit(1);
  }
}

testWithDebug();
