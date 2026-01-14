/**
 * Amazon Cognito Configuration Module
 * 
 * Loads and validates Cognito configuration from environment variables.
 * Returns null when AUTH_PROVIDER is not "cognito" to disable Cognito integration.
 */

import { getAuthProvider } from '../config';

/**
 * Cognito configuration interface containing all OAuth 2.0 settings
 */
export interface CognitoConfig {
  userPoolId: string;               // e.g., "us-east-1_ABC123"
  clientId: string;                 // OAuth 2.0 App Client ID
  clientSecret?: string;            // OAuth 2.0 App Client Secret (optional for public clients)
  region: string;                   // AWS region (e.g., "us-east-1")
  redirectUri: string;              // OAuth callback URL
  domain: string;                   // Cognito domain
  issuer: string;                   // Computed: https://cognito-idp.{region}.amazonaws.com/{userPoolId}
  authorizationEndpoint: string;    // Computed: https://{domain}/oauth2/authorize
  tokenEndpoint: string;            // Computed: https://{domain}/oauth2/token
  userInfoEndpoint: string;         // Computed: https://{domain}/oauth2/userInfo
  jwksUri: string;                  // Computed: {issuer}/.well-known/jwks.json
}

/**
 * Cognito configuration error class
 */
export class CognitoConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CognitoConfigurationError';
    Object.setPrototypeOf(this, CognitoConfigurationError.prototype);
  }
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
    throw new CognitoConfigurationError(
      'APP_URL or NEXT_PUBLIC_APP_URL environment variable is required'
    );
  }
  
  return appUrl;
}

/**
 * Check if Cognito authentication is enabled
 * 
 * @returns true if Cognito is enabled (AUTH_PROVIDER is "cognito"), false otherwise
 */
export function isCognitoEnabled(): boolean {
  return getAuthProvider() === 'cognito';
}

/**
 * Validate AWS region format
 * 
 * @param region - The AWS region to validate
 * @throws CognitoConfigurationError if region format is invalid
 */
export function validateAwsRegion(region: string): void {
  // AWS region format: lowercase letters, numbers, and hyphens
  // Examples: us-east-1, eu-west-2, ap-southeast-1
  const regionPattern = /^[a-z]{2}-[a-z]+-\d+$/;
  
  if (!regionPattern.test(region)) {
    throw new CognitoConfigurationError(
      `Invalid AWS region format: ${region}. Expected format like 'us-east-1', 'eu-west-1', etc.`
    );
  }
}

/**
 * Validate Cognito configuration
 * 
 * @param config - The Cognito configuration to validate
 * @throws CognitoConfigurationError if configuration is invalid
 */
export function validateCognitoConfig(config: CognitoConfig): void {
  // Validate required fields
  if (!config.userPoolId) {
    throw new CognitoConfigurationError('COGNITO_USER_POOL_ID is required');
  }
  
  if (!config.clientId) {
    throw new CognitoConfigurationError('COGNITO_CLIENT_ID is required');
  }
  
  // clientSecret is now optional (for public clients)
  
  if (!config.region) {
    throw new CognitoConfigurationError('COGNITO_REGION is required');
  }
  
  // Validate region format
  validateAwsRegion(config.region);
  
  // Validate User Pool ID format (should contain region)
  if (!config.userPoolId.startsWith(config.region)) {
    throw new CognitoConfigurationError(
      `User Pool ID ${config.userPoolId} does not match region ${config.region}`
    );
  }
}

/**
 * Load Cognito configuration from environment variables
 * 
 * @returns CognitoConfig object or null if Cognito is not enabled
 * @throws CognitoConfigurationError if required variables are missing when Cognito is enabled
 */
export function loadCognitoConfig(): CognitoConfig | null {
  // Return null when Cognito is not enabled
  if (!isCognitoEnabled()) {
    return null;
  }
  
  // Read environment variables
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;
  const clientSecret = process.env.COGNITO_CLIENT_SECRET;
  const region = process.env.COGNITO_REGION;
  
  // DEBUG: Log what we're actually reading
  console.log('Loading Cognito config from env:', {
    userPoolId,
    clientId: clientId?.substring(0, 10) + '...',
    region,
    allCognitoEnvVars: Object.keys(process.env).filter(k => k.startsWith('COGNITO_'))
  });
  
  // Validate required fields (clientSecret is now optional)
  const missingVars: string[] = [];
  if (!userPoolId) missingVars.push('COGNITO_USER_POOL_ID');
  if (!clientId) missingVars.push('COGNITO_CLIENT_ID');
  if (!region) missingVars.push('COGNITO_REGION');
  
  if (missingVars.length > 0) {
    throw new CognitoConfigurationError(
      `Missing required Cognito environment variables: ${missingVars.join(', ')}`
    );
  }
  
  // Compute redirect URI
  let redirectUri = process.env.COGNITO_REDIRECT_URI;
  if (!redirectUri) {
    const appUrl = getAppUrl();
    redirectUri = `${appUrl}/api/auth/cognito/callback`;
  }
  
  // Compute Cognito domain
  let domain = process.env.COGNITO_DOMAIN;
  if (!domain) {
    // Default format: {userPoolId}.auth.{region}.amazoncognito.com
    domain = `https://${userPoolId}.auth.${region}.amazoncognito.com`;
  } else if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
    // Add https:// if not present
    domain = `https://${domain}`;
  }
  
  // Compute issuer (used for token validation)
  const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  
  // Compute OAuth endpoints
  const authorizationEndpoint = `${domain}/oauth2/authorize`;
  const tokenEndpoint = `${domain}/oauth2/token`;
  const userInfoEndpoint = `${domain}/oauth2/userInfo`;
  
  // Compute JWKS URI (for token signature verification)
  const jwksUri = `${issuer}/.well-known/jwks.json`;
  
  const config: CognitoConfig = {
    userPoolId: userPoolId!,
    clientId: clientId!,
    clientSecret: clientSecret || undefined,  // Optional for public clients
    region: region!,
    redirectUri,
    domain,
    issuer,
    authorizationEndpoint,
    tokenEndpoint,
    userInfoEndpoint,
    jwksUri,
  };
  
  // Validate the configuration
  validateCognitoConfig(config);
  
  return config;
}
