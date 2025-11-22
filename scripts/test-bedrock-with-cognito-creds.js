#!/usr/bin/env node

const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const [accessKeyId, secretAccessKey, sessionToken, modelId, region] = process.argv.slice(2);

if (!accessKeyId || !secretAccessKey || !sessionToken || !modelId || !region) {
  console.error('Usage: node test-bedrock-with-cognito-creds.js <accessKeyId> <secretAccessKey> <sessionToken> <modelId> <region>');
  process.exit(1);
}

async function test() {
  console.log('Testing Bedrock with Cognito credentials...');
  console.log('Model:', modelId);
  console.log('Region:', region);
  console.log('Access Key:', accessKeyId);
  
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
        messages: [{ role: 'user', content: 'Say hello in one sentence' }]
      })
    }));

    const result = JSON.parse(new TextDecoder().decode(response.body));
    console.log('\n✅ SUCCESS!');
    console.log('Response:', result.content[0].text);
  } catch (error) {
    console.error('\n❌ FAILED!');
    console.error('Error:', error.message);
    console.error('Status:', error.$metadata?.httpStatusCode);
    console.error('Request ID:', error.$metadata?.requestId);
  }
}

test();
