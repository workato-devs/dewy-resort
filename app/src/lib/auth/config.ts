/**
 * Authentication Provider Configuration
 * 
 * This module provides centralized authentication provider selection and configuration.
 * It supports three authentication providers: mock, okta, and cognito.
 * 
 * Provider selection logic:
 * 1. If AUTH_PROVIDER is set, use that value (must be 'mock', 'okta', or 'cognito')
 * 2. If WORKATO_MOCK_MODE is 'true', use 'mock' (backward compatibility)
 * 3. Otherwise, default to 'mock'
 */

export type AuthProvider = 'mock' | 'okta' | 'cognito';

export interface AuthConfig {
  provider: AuthProvider;
  isMockMode: boolean;
  isOktaEnabled: boolean;
  isCognitoEnabled: boolean;
}

/**
 * Get the current authentication provider
 * 
 * @returns The authentication provider to use
 * @throws Error if AUTH_PROVIDER is set to an invalid value
 */
export function getAuthProvider(): AuthProvider {
  const authProvider = process.env.AUTH_PROVIDER?.toLowerCase();
  
  // If AUTH_PROVIDER is explicitly set, use it
  if (authProvider) {
    if (!['mock', 'okta', 'cognito'].includes(authProvider)) {
      throw new Error(
        "Invalid AUTH_PROVIDER value. Must be 'mock', 'okta', or 'cognito'"
      );
    }
    return authProvider as AuthProvider;
  }
  
  // Backward compatibility: check WORKATO_MOCK_MODE
  if (process.env.WORKATO_MOCK_MODE === 'true') {
    return 'mock';
  }
  
  // Default to mock
  return 'mock';
}

/**
 * Get authentication configuration with provider flags
 * 
 * @returns Authentication configuration object
 */
export function getAuthConfig(): AuthConfig {
  const provider = getAuthProvider();
  
  return {
    provider,
    isMockMode: provider === 'mock',
    isOktaEnabled: provider === 'okta',
    isCognitoEnabled: provider === 'cognito',
  };
}

/**
 * Check if a specific authentication provider is enabled
 * 
 * @param provider - The provider to check
 * @returns True if the provider is enabled
 */
export function isAuthProviderEnabled(provider: AuthProvider): boolean {
  return getAuthProvider() === provider;
}
