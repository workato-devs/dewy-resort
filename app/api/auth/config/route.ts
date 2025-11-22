import { NextResponse } from 'next/server';
import { getAuthConfig } from '@/lib/auth/config';

/**
 * GET /api/auth/config
 * 
 * Returns the current authentication provider configuration
 * Used by the login page to determine which authentication UI to display
 */
export async function GET() {
  try {
    const config = getAuthConfig();
    
    return NextResponse.json({
      provider: config.provider,
      isMockMode: config.isMockMode,
      isOktaEnabled: config.isOktaEnabled,
      isCognitoEnabled: config.isCognitoEnabled,
    });
  } catch (error) {
    console.error('Error getting auth config:', error);
    
    // Default to mock mode on error
    return NextResponse.json({
      provider: 'mock',
      isMockMode: true,
      isOktaEnabled: false,
      isCognitoEnabled: false,
    });
  }
}
