/**
 * Identity Pool Service Usage Examples
 * 
 * This file demonstrates how to use the Identity Pool Service
 * to exchange Cognito User Pool tokens for temporary AWS credentials.
 */

import { createIdentityPoolService } from '../identity-pool';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

/**
 * Example 1: Basic credential exchange
 * 
 * Get temporary AWS credentials for a user session.
 */
export async function basicCredentialExchange(idToken: string, sessionId: string) {
  // Create service from environment variables
  const service = createIdentityPoolService();
  
  if (!service) {
    throw new Error('Identity Pool not configured. Set COGNITO_IDENTITY_POOL_ID in environment.');
  }
  
  // Exchange ID token for temporary credentials
  const credentials = await service.getCredentialsForUser(idToken, sessionId);
  
  console.log('Credentials obtained:');
  console.log('- Access Key ID:', credentials.accessKeyId);
  console.log('- Expiration:', credentials.expiration);
  
  return credentials;
}

/**
 * Example 2: Using credentials with Bedrock
 * 
 * Use temporary credentials to invoke a Bedrock model.
 */
export async function invokeBedrockWithCredentials(idToken: string, sessionId: string) {
  const service = createIdentityPoolService();
  
  if (!service) {
    throw new Error('Identity Pool not configured');
  }
  
  // Get credentials
  const credentials = await service.getCredentialsForUser(idToken, sessionId);
  
  // Create Bedrock client with temporary credentials
  const bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-west-2',
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });
  
  // Invoke model
  const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
  const command = new InvokeModelCommand({
    modelId,
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: 'Hello! Can you help me with hotel services?',
        },
      ],
    }),
  });
  
  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  return responseBody;
}

/**
 * Example 3: Credential refresh pattern
 * 
 * Check and refresh credentials before making API calls.
 */
export async function credentialRefreshPattern(
  idToken: string,
  sessionId: string,
  existingCredentials?: any
) {
  const service = createIdentityPoolService();
  
  if (!service) {
    throw new Error('Identity Pool not configured');
  }
  
  let credentials = existingCredentials;
  
  // If no existing credentials or they need refresh, get new ones
  if (!credentials || service.needsRefresh(credentials)) {
    console.log('Refreshing credentials...');
    credentials = await service.getCredentialsForUser(idToken, sessionId);
  } else {
    console.log('Using cached credentials');
  }
  
  return credentials;
}

/**
 * Example 4: API route integration
 * 
 * Use Identity Pool service in a Next.js API route.
 */
export async function apiRouteExample(request: Request) {
  // Get session from cookie (implementation depends on your auth setup)
  const sessionId = 'session-from-cookie';
  const idToken = 'id-token-from-session';
  
  const service = createIdentityPoolService();
  
  if (!service) {
    return new Response(
      JSON.stringify({ error: 'Bedrock integration not configured' }),
      { status: 503 }
    );
  }
  
  try {
    // Get credentials for user
    const credentials = await service.getCredentialsForUser(idToken, sessionId);
    
    // Check if credentials are valid
    if (service.isExpired(credentials)) {
      return new Response(
        JSON.stringify({ error: 'Credentials expired' }),
        { status: 401 }
      );
    }
    
    // Use credentials to call Bedrock
    const bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-west-2',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });
    
    // ... make Bedrock API calls
    
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in API route:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500 }
    );
  }
}

/**
 * Example 5: Session cleanup
 * 
 * Clear cached credentials when user logs out.
 */
export function sessionCleanupExample(sessionId: string) {
  const service = createIdentityPoolService();
  
  if (!service) {
    return;
  }
  
  // Clear credentials for this session
  service.clearCache(sessionId);
  
  console.log('Credentials cleared for session:', sessionId);
}

/**
 * Example 6: Multiple concurrent requests
 * 
 * Handle multiple requests with the same credentials.
 */
export async function concurrentRequestsExample(idToken: string, sessionId: string) {
  const service = createIdentityPoolService();
  
  if (!service) {
    throw new Error('Identity Pool not configured');
  }
  
  // Get credentials once
  const credentials = await service.getCredentialsForUser(idToken, sessionId);
  
  // Create Bedrock client
  const bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-west-2',
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });
  
  // Make multiple concurrent requests with same credentials
  const requests = [
    'What are the hotel amenities?',
    'What time is checkout?',
    'How do I request housekeeping?',
  ].map(async (question) => {
    const command = new InvokeModelCommand({
      modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 512,
        messages: [{ role: 'user', content: question }],
      }),
    });
    
    return bedrockClient.send(command);
  });
  
  // Wait for all requests to complete
  const responses = await Promise.all(requests);
  
  return responses;
}

/**
 * Example 7: Error handling
 * 
 * Proper error handling for credential exchange.
 */
export async function errorHandlingExample(idToken: string, sessionId: string) {
  const service = createIdentityPoolService();
  
  if (!service) {
    throw new Error('Identity Pool not configured');
  }
  
  try {
    const credentials = await service.getCredentialsForUser(idToken, sessionId);
    return { success: true, credentials };
  } catch (error: any) {
    // Handle specific error types
    if (error.name === 'NotAuthorizedException') {
      console.error('User not authorized for Identity Pool');
      return { success: false, error: 'Not authorized' };
    }
    
    if (error.name === 'ResourceNotFoundException') {
      console.error('Identity Pool not found');
      return { success: false, error: 'Configuration error' };
    }
    
    if (error.message.includes('Identity Pool')) {
      console.error('Identity Pool error:', error.message);
      return { success: false, error: 'Authentication failed' };
    }
    
    // Generic error
    console.error('Unexpected error:', error);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Example 8: Integration with session management
 * 
 * Store ID token in session for credential exchange.
 */
export interface SessionWithIdToken {
  sessionId: string;
  userId: string;
  idToken: string;
  role: 'guest' | 'manager';
}

export async function sessionIntegrationExample(session: SessionWithIdToken) {
  const service = createIdentityPoolService();
  
  if (!service) {
    return null;
  }
  
  // Get credentials using session data
  const credentials = await service.getCredentialsForUser(
    session.idToken,
    session.sessionId
  );
  
  // Refresh if needed before returning
  const freshCredentials = await service.refreshIfNeeded(
    credentials,
    session.idToken,
    session.sessionId
  );
  
  return freshCredentials;
}
