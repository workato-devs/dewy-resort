import { NextResponse } from 'next/server';
import { getAuthConfig } from '@/lib/auth/config';

/**
 * Chat Configuration Response
 */
interface ChatConfigResponse {
  enabled: boolean;
  reason?: string;
  features: {
    streaming: boolean;
    tools: boolean;
  };
}

/**
 * GET /api/chat/config
 * 
 * Returns the Bedrock chat feature availability status
 * 
 * Requirements:
 * - AUTH_PROVIDER must be "cognito"
 * - COGNITO_IDENTITY_POOL_ID must be configured
 * 
 * @returns Chat configuration with feature availability
 */
export async function GET() {
  try {
    const authConfig = getAuthConfig();
    
    // Check if AUTH_PROVIDER is "cognito"
    if (!authConfig.isCognitoEnabled) {
      return NextResponse.json<ChatConfigResponse>({
        enabled: false,
        reason: 'AI chat requires Cognito authentication',
        features: {
          streaming: false,
          tools: false,
        },
      });
    }
    
    // Validate Identity Pool configuration
    const identityPoolId = process.env.COGNITO_IDENTITY_POOL_ID;
    
    if (!identityPoolId) {
      return NextResponse.json<ChatConfigResponse>({
        enabled: false,
        reason: 'AI chat service not configured',
        features: {
          streaming: false,
          tools: false,
        },
      });
    }
    
    // Validate Identity Pool ID format
    // Format: region:uuid (e.g., us-east-1:12345678-1234-1234-1234-123456789012)
    const identityPoolIdPattern = /^[a-z]{2}-[a-z]+-\d+:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
    
    if (!identityPoolIdPattern.test(identityPoolId)) {
      console.error('Invalid COGNITO_IDENTITY_POOL_ID format:', identityPoolId);
      return NextResponse.json<ChatConfigResponse>({
        enabled: false,
        reason: 'AI chat service not configured',
        features: {
          streaming: false,
          tools: false,
        },
      });
    }
    
    // All checks passed - Bedrock chat is enabled
    return NextResponse.json<ChatConfigResponse>({
      enabled: true,
      features: {
        streaming: true,
        tools: true,
      },
    });
    
  } catch (error) {
    console.error('Error getting chat config:', error);
    
    // Return disabled state on error
    return NextResponse.json<ChatConfigResponse>({
      enabled: false,
      reason: 'AI chat service temporarily unavailable',
      features: {
        streaming: false,
        tools: false,
      },
    });
  }
}
