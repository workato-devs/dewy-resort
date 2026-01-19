#!/usr/bin/env node

const { CognitoIdentityClient, GetIdCommand, GetCredentialsForIdentityCommand } = require('@aws-sdk/client-cognito-identity');

async function getCreds() {
  const idToken = process.argv[2];
  if (!idToken) {
    console.error('Usage: node scripts/get-temp-creds.js <id-token>');
    process.exit(1);
  }

  const identityPoolId = 'us-west-2:88c48483-b39d-41e0-a8ba-cdc9ac6bfb9b';
  const userPoolId = 'us-west-2_l1yPytMyD';
  const region = 'us-west-2';

  const client = new CognitoIdentityClient({ region });
  
  const getIdResponse = await client.send(new GetIdCommand({
    IdentityPoolId: identityPoolId,
    Logins: {
      [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: idToken
    }
  }));

  const credsResponse = await client.send(new GetCredentialsForIdentityCommand({
    IdentityId: getIdResponse.IdentityId,
    Logins: {
      [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: idToken
    }
  }));

  console.log(credsResponse.Credentials.AccessKeyId);
  console.log(credsResponse.Credentials.SecretKey);
  console.log(credsResponse.Credentials.SessionToken);
}

getCreds().catch(console.error);
