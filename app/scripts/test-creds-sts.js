#!/usr/bin/env node

const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');

const [accessKeyId, secretAccessKey, sessionToken] = process.argv.slice(2);

async function test() {
  const client = new STSClient({
    region: 'us-west-2',
    credentials: { accessKeyId, secretAccessKey, sessionToken }
  });

  try {
    const result = await client.send(new GetCallerIdentityCommand({}));
    console.log('✅ Credentials are valid!');
    console.log('ARN:', result.Arn);
    console.log('Account:', result.Account);
    console.log('UserId:', result.UserId);
  } catch (error) {
    console.error('❌ Credentials are invalid!');
    console.error('Error:', error.message);
  }
}

test();
