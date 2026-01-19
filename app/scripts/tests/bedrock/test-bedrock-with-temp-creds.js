#!/usr/bin/env node

/**
 * Test Bedrock access with temporary credentials
 * This helps debug the exact error when using Cognito Identity Pool credentials
 */

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

async function testWithTempCreds() {
  const accessKeyId = process.argv[2];
  const secretAccessKey = process.argv[3];
  const sessionToken = process.argv[4];
  const modelId = process.argv[5] || 'anthropic.claude-3-haiku-20240307-v1:0';
  const region = process.argv[6] || 'us-west-2';

  if (!accessKeyId || !secretAccessKey || !sessionToken) {
    console.error('Usage: node scripts/test-bedrock-with-temp-creds.js <accessKeyId> <secretAccessKey> <sessionToken> [modelId] [region]');
    process.exit(1);
  }

  console.log('Testing Bedrock with temporary credentials...');
  console.log(`Model: ${modelId}`);
  console.log(`Region: ${region}`);
  console.log(`Access Key: ${accessKeyId.substring(0, 20)}...`);
  console.log('');

  const client = new BedrockRuntimeClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
      sessionToken
    }
  });

  try {
    const response = await client.send(new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Say hello in one sentence.'
          }
        ]
      })
    }));

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log('✅ Success!');
    console.log('Response:', responseBody.content[0].text);
    console.log('');
    console.log('Bedrock access is working correctly with these credentials.');
    
  } catch (error) {
    console.error('❌ Error invoking Bedrock:');
    console.error('Message:', error.message);
    console.error('Name:', error.name);
    console.error('Status:', error.$metadata?.httpStatusCode);
    console.error('');
    console.error('Full error:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

testWithTempCreds();
