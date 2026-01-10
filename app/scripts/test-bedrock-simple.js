#!/usr/bin/env node

/**
 * Simple test script to verify Bedrock access with simplified IAM role
 * Tests that any authenticated user can invoke Bedrock models
 */

const { CognitoIdentityClient, GetIdCommand, GetCredentialsForIdentityCommand } = require('@aws-sdk/client-cognito-identity');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

async function testBedrockAccess() {
  console.log('🧪 Testing Bedrock Access with Simplified IAM Role\n');

  // Test user credentials (you'll need to provide valid tokens)
  const idToken = process.env.TEST_ID_TOKEN || process.argv[2];
  
  if (!idToken) {
    console.error('❌ Error: TEST_ID_TOKEN environment variable not set');
    console.log('\nTo test, set TEST_ID_TOKEN to a valid Cognito ID token:');
    console.log('export TEST_ID_TOKEN="your-id-token-here"');
    console.log('Or pass it as an argument: node scripts/test-bedrock-simple.js <id-token>');
    process.exit(1);
  }

  const identityPoolId = process.env.COGNITO_IDENTITY_POOL_ID || 'us-west-2:88c48483-b39d-41e0-a8ba-cdc9ac6bfb9b';
  const userPoolId = process.env.COGNITO_USER_POOL_ID || 'us-west-2_l1yPytMyD';
  const region = process.env.AWS_REGION || 'us-west-2';
  const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';

  console.log('Configuration:');
  console.log(`  Identity Pool: ${identityPoolId}`);
  console.log(`  User Pool: ${userPoolId}`);
  console.log(`  Region: ${region}`);
  console.log(`  Model: ${modelId}\n`);

  try {
    // Step 1: Get Identity ID
    console.log('Step 1: Getting Identity ID...');
    const cognitoClient = new CognitoIdentityClient({ region });
    
    const getIdResponse = await cognitoClient.send(new GetIdCommand({
      IdentityPoolId: identityPoolId,
      Logins: {
        [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: idToken
      }
    }));
    
    console.log(`✅ Identity ID: ${getIdResponse.IdentityId}\n`);

    // Step 2: Get AWS Credentials
    console.log('Step 2: Getting AWS credentials...');
    const credsResponse = await cognitoClient.send(new GetCredentialsForIdentityCommand({
      IdentityId: getIdResponse.IdentityId,
      Logins: {
        [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: idToken
      }
    }));

    console.log('✅ Received temporary AWS credentials');
    console.log(`  Access Key: ${credsResponse.Credentials.AccessKeyId}`);
    console.log(`  Expiration: ${credsResponse.Credentials.Expiration}\n`);

    // Step 2.5: Test credentials with STS GetCallerIdentity
    console.log('Step 2.5: Verifying credentials with STS...');
    const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
    const stsClient = new STSClient({
      region,
      credentials: {
        accessKeyId: credsResponse.Credentials.AccessKeyId,
        secretAccessKey: credsResponse.Credentials.SecretKey,
        sessionToken: credsResponse.Credentials.SessionToken
      }
    });
    
    const identity = await stsClient.send(new GetCallerIdentityCommand({}));
    console.log('✅ Assumed Role ARN:', identity.Arn);
    console.log(`  Account: ${identity.Account}\n`);

    // Step 3: Test Bedrock Invocation
    console.log('Step 3: Testing Bedrock model invocation...');
    const bedrockClient = new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId: credsResponse.Credentials.AccessKeyId,
        secretAccessKey: credsResponse.Credentials.SecretKey,
        sessionToken: credsResponse.Credentials.SessionToken
      }
    });

    const prompt = 'Say "Hello from Bedrock!" in one sentence.';
    const response = await bedrockClient.send(new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    }));

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log('✅ Bedrock Response:');
    console.log(`  ${responseBody.content[0].text}\n`);

    console.log('🎉 Success! All authenticated users can access Bedrock.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.$metadata) {
      console.error('   Status:', error.$metadata.httpStatusCode);
    }
    if (error.name) {
      console.error('   Error Type:', error.name);
    }
    console.error('\nFull error:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

testBedrockAccess();
