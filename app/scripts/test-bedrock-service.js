#!/usr/bin/env node

const { BedrockClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock');

async function test() {
  const accessKeyId = process.argv[2];
  const secretAccessKey = process.argv[3];
  const sessionToken = process.argv[4];

  if (!accessKeyId || !secretAccessKey || !sessionToken) {
    console.error('Usage: node scripts/test-bedrock-service.js <accessKeyId> <secretAccessKey> <sessionToken>');
    process.exit(1);
  }

  const client = new BedrockClient({
    region: 'us-west-2',
    credentials: { accessKeyId, secretAccessKey, sessionToken }
  });

  try {
    const response = await client.send(new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Say hello' }]
      })
    }));

    console.log('✅ Success with bedrock service!');
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log('Response:', responseBody.content[0].text);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('This confirms bedrock service also fails');
  }
}

test();
