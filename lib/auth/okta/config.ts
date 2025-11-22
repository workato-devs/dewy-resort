/**
 * Okta Configuration Module
 * 
 * Loads and validates Okta configuration from environment variables.
 * Returns null when WORKATO_MOCK_MODE is "true" to disable Okta integration.
 */

import { OktaConfigurationError, ERROR_MESSAGES } from './errors';

/**
 * Okta configuration interface containing all OAuth 2.0 and Management API settings
 */
export interface OktaConfig {
  domain: string;                    // e.g., "dev-12345.okta.com"
  clientId: string;                  // OAuth 2.0 client ID
  clientSecret: string;              // OAuth 2.0 client secret
  redirectUri: string;               // OAuth callback URL
  apiToken?: string;                 // Optional: Okta Management API token
  issuer: string;                    // Computed: https://{domain}/oauth2/default
  authorizationEndpoint: string;     // Computed: {issuer}/v1/authorize
  tokenEndpoint: string;             // Computed: {issuer}/v1/token
  userInfoEndpoint: string;          // Computed: {issuer}/v1/userinfo
  managementApiUrl: string;          // Computed: https://{domain}/api/v1
}

/**
 * Get the application base URL from environment variables
 * 
 * @returns The base URL of the application
 */
export function getAppUrl(): string {
  // Check APP_URL first, then fall back to NEXT_PUBLIC_APP_URL
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  
  if (!appUrl) {
    throw new OktaConfigurationError(
      'APP_URL or NEXT_PUBLIC_APP_URL environment variable is required'
    );
  }
  
  return appUrl;
}

/**
 * Check if Okta authentication is enabled
 * 
 * @returns true if Okta is enabled (mock mode is disabled), false otherwise
 */
export function isOktaEnabled(): boolean {
  return process.env.WORKATO_MOCK_MODE !== 'true';
}

/**
 * Validate Okta configuration
 * 
 * @param config - The Okta configuration to validate
 * @throws OktaConfigurationError if configuration is invalid
 */
export function validateOktaConfig(config: OktaConfig): void {
  // Validate required fields
  if (!config.domain) {
    throw new OktaConfigurationError('OKTA_DOMAIN is required');
  }
  
  if (!config.clientId) {
    throw new OktaConfigurationError('OKTA_CLIENT_ID is required');
  }
  
  if (!config.clientSecret) {
    throw new OktaConfigurationError('OKTA_CLIENT_SECRET is required');
  }
  
  // Validate domain format (must match *.okta.com or *.oktapreview.com)
  const domainPattern = /^[a-zA-Z0-9-]+\.(okta\.com|oktapreview\.com)$/;
  if (!domainPattern.test(config.domain)) {
    throw new OktaConfigurationError(ERROR_MESSAGES.CONFIG_INVALID_DOMAIN);
  }
}

/**
 * Load Okta configuration from environment variables
 * 
 * @returns OktaConfig object or null if mock mode is enabled
 * @throws OktaConfigurationError if required variables are missing when mock mode is disabled
 */
export function loadOktaConfig(): OktaConfig | null {
  // Return null when mock mode is enabled
  if (!isOktaEnabled()) {
    return null;
  }
  
  // Read environment variables
  const domain = process.env.OKTA_DOMAIN;
  const clientId = process.env.OKTA_CLIENT_ID;
  const clientSecret = process.env.OKTA_CLIENT_SECRET;
  const apiToken = process.env.OKTA_API_TOKEN;
  
  // Validate required fields
  const missingVars: string[] = [];
  if (!domain) missingVars.push('OKTA_DOMAIN');
  if (!clientId) missingVars.push('OKTA_CLIENT_ID');
  if (!clientSecret) missingVars.push('OKTA_CLIENT_SECRET');
  
  if (missingVars.length > 0) {
    throw new OktaConfigurationError(
      `Missing required Okta environment variables: ${missingVars.join(', ')}`
    );
  }
  
  // Compute redirect URI
  let redirectUri = process.env.OKTA_REDIRECT_URI;
  if (!redirectUri) {
    const appUrl = getAppUrl();
    redirectUri = `${appUrl}/api/auth/okta/callback`;
  }
  
  // Compute OAuth endpoints
  // Use custom authorization server if specified, otherwise use org authorization server
  const authServer = process.env.OKTA_AUTH_SERVER || 'default';
  const issuer = authServer === 'org' 
    ? `https://${domain}` 
    : `https://${domain}/oauth2/${authServer}`;
  const authorizationEndpoint = `${issuer}/v1/authorize`;
  const tokenEndpoint = `${issuer}/v1/token`;
  const userInfoEndpoint = `${issuer}/v1/userinfo`;
  
  // Compute Management API URL
  const managementApiUrl = `https://${domain}/api/v1`;
  
  const config: OktaConfig = {
    domain: domain!,
    clientId: clientId!,
    clientSecret: clientSecret!,
    redirectUri,
    apiToken,
    issuer,
    authorizationEndpoint,
    tokenEndpoint,
    userInfoEndpoint,
    managementApiUrl,
  };
  
  // Validate the configuration
  validateOktaConfig(config);
  
  return config;
}
