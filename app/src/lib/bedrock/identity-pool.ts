/**
 * Identity Pool Service
 * 
 * Exchanges Cognito User Pool tokens for temporary AWS credentials
 * using Cognito Identity Pools.
 */

import {
  CognitoIdentityClient,
  GetIdCommand,
  GetCredentialsForIdentityCommand,
  Credentials as CognitoCredentials,
} from '@aws-sdk/client-cognito-identity';
import { IdentityPoolError } from './errors';
import { BedrockLogger } from './logger';

/**
 * Temporary AWS credentials with expiration
 */
export interface TemporaryCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: Date;
}

/**
 * Identity Pool configuration
 */
export interface IdentityPoolConfig {
  identityPoolId: string;
  region: string;
  userPoolId: string;
  clientId: string;
}

/**
 * Cached credentials with metadata
 */
interface CachedCredentials {
  credentials: TemporaryCredentials;
  cachedAt: Date;
  identityId: string;
}

/**
 * Identity Pool Service
 * 
 * Manages credential exchange and caching for Cognito Identity Pool.
 */
export class IdentityPoolService {
  private client: CognitoIdentityClient;
  private config: IdentityPoolConfig;
  private credentialsCache: Map<string, CachedCredentials>;
  
  // Refresh credentials 5 minutes before expiration
  private readonly REFRESH_BUFFER_MS = 5 * 60 * 1000;

  constructor(config: IdentityPoolConfig) {
    this.config = config;
    this.client = new CognitoIdentityClient({ region: config.region });
    this.credentialsCache = new Map();
  }

  /**
   * Exchange ID token for temporary AWS credentials
   * 
   * @param idToken - Cognito User Pool ID token
   * @param sessionId - Session ID for caching
   * @param userId - User ID for logging
   * @param role - User role for logging
   * @returns Temporary AWS credentials
   */
  async getCredentialsForUser(
    idToken: string,
    sessionId: string,
    userId?: string,
    role?: string
  ): Promise<TemporaryCredentials> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cached = this.credentialsCache.get(sessionId);
      if (cached && !this.needsRefresh(cached.credentials)) {
        BedrockLogger.debug(
          'bedrock.identity.cache_hit',
          'Using cached credentials',
          { userId, role, sessionId }
        );
        return cached.credentials;
      }

      // Get identity ID from ID token
      const identityId = await this.getIdentityId(idToken, cached?.identityId);

      // Get credentials for identity
      const credentials = await this.getCredentials(identityId, idToken);

      // Cache credentials
      this.credentialsCache.set(sessionId, {
        credentials,
        cachedAt: new Date(),
        identityId,
      });

      const duration = Date.now() - startTime;
      BedrockLogger.logIdentityExchange(userId || 'unknown', role || 'unknown', true, duration);

      return credentials;
    } catch (error) {
      const duration = Date.now() - startTime;
      BedrockLogger.logIdentityExchange(userId || 'unknown', role || 'unknown', false, duration);
      
      throw new IdentityPoolError(
        'Failed to exchange ID token for AWS credentials',
        {
          userId,
          role,
          originalError: error,
        }
      );
    }
  }

  /**
   * Check if credentials are expired
   * 
   * @param credentials - Credentials to check
   * @returns True if credentials are expired
   */
  isExpired(credentials: TemporaryCredentials): boolean {
    return credentials.expiration <= new Date();
  }

  /**
   * Check if credentials need refresh (expired or close to expiration)
   * 
   * @param credentials - Credentials to check
   * @returns True if credentials need refresh
   */
  needsRefresh(credentials: TemporaryCredentials): boolean {
    const now = Date.now();
    const expirationTime = credentials.expiration.getTime();
    return expirationTime - now <= this.REFRESH_BUFFER_MS;
  }

  /**
   * Refresh credentials if needed
   * 
   * @param credentials - Current credentials
   * @param idToken - ID token for refresh
   * @param sessionId - Session ID for caching
   * @returns Fresh credentials (either existing or refreshed)
   */
  async refreshIfNeeded(
    credentials: TemporaryCredentials,
    idToken: string,
    sessionId: string
  ): Promise<TemporaryCredentials> {
    if (!this.needsRefresh(credentials)) {
      return credentials;
    }

    return this.getCredentialsForUser(idToken, sessionId);
  }

  /**
   * Clear cached credentials for a session
   * 
   * @param sessionId - Session ID to clear
   */
  clearCache(sessionId: string): void {
    this.credentialsCache.delete(sessionId);
  }

  /**
   * Clear all cached credentials
   */
  clearAllCache(): void {
    this.credentialsCache.clear();
  }

  /**
   * Get identity ID from ID token
   * 
   * @param idToken - Cognito User Pool ID token
   * @param cachedIdentityId - Previously cached identity ID (optional)
   * @returns Identity ID
   */
  private async getIdentityId(
    idToken: string,
    cachedIdentityId?: string
  ): Promise<string> {
    // If we have a cached identity ID, try to reuse it
    // This reduces API calls and maintains consistency
    if (cachedIdentityId) {
      return cachedIdentityId;
    }

    try {
      const loginKey = `cognito-idp.${this.config.region}.amazonaws.com/${this.config.userPoolId}`;
      console.log('[Identity Pool] Getting Identity ID:', {
        identityPoolId: this.config.identityPoolId,
        loginKey,
        idTokenLength: idToken?.length,
        idToken: idToken, // Full token for debugging
      });

      const command = new GetIdCommand({
        IdentityPoolId: this.config.identityPoolId,
        Logins: {
          [loginKey]: idToken,
        },
      });

      const response = await this.client.send(command);

      if (!response.IdentityId) {
        throw new IdentityPoolError('No identity ID returned from Identity Pool');
      }

      console.log('[Identity Pool] Got Identity ID:', response.IdentityId);
      return response.IdentityId;
    } catch (error) {
      console.error('[Identity Pool] GetId error:', {
        error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown',
        config: {
          identityPoolId: this.config.identityPoolId,
          region: this.config.region,
          userPoolId: this.config.userPoolId,
        },
      });
      throw new IdentityPoolError(
        'Failed to get identity ID from Identity Pool',
        { originalError: error }
      );
    }
  }

  /**
   * Get credentials for identity
   * 
   * @param identityId - Cognito Identity ID
   * @param idToken - ID token for authentication
   * @returns Temporary AWS credentials
   */
  private async getCredentials(
    identityId: string,
    idToken: string
  ): Promise<TemporaryCredentials> {
    try {
      const loginKey = `cognito-idp.${this.config.region}.amazonaws.com/${this.config.userPoolId}`;
      console.log('[Identity Pool] Getting credentials for identity:', {
        identityId,
        loginKey,
      });

      const command = new GetCredentialsForIdentityCommand({
        IdentityId: identityId,
        Logins: {
          [loginKey]: idToken,
        },
      });

      const response = await this.client.send(command);

      if (!response.Credentials) {
        throw new IdentityPoolError('No credentials returned from Identity Pool');
      }

      console.log('[Identity Pool] Got credentials successfully');
      return this.mapCredentials(response.Credentials);
    } catch (error) {
      console.error('[Identity Pool] GetCredentials error:', {
        error,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown',
        identityId,
      });
      throw new IdentityPoolError(
        'Failed to get credentials from Identity Pool',
        { identityId, originalError: error }
      );
    }
  }

  /**
   * Map Cognito credentials to our interface
   * 
   * @param credentials - Cognito credentials
   * @returns Temporary credentials
   */
  private mapCredentials(credentials: CognitoCredentials): TemporaryCredentials {
    if (!credentials.AccessKeyId || !credentials.SecretKey || !credentials.SessionToken) {
      throw new IdentityPoolError('Invalid credentials received from Identity Pool');
    }

    // Default expiration to 1 hour from now if not provided
    const expiration = credentials.Expiration
      ? new Date(credentials.Expiration.getTime())
      : new Date(Date.now() + 60 * 60 * 1000);

    return {
      accessKeyId: credentials.AccessKeyId,
      secretAccessKey: credentials.SecretKey,
      sessionToken: credentials.SessionToken,
      expiration,
    };
  }
}

/**
 * Create Identity Pool service from environment variables
 * 
 * @returns Identity Pool service instance or null if not configured
 */
export function createIdentityPoolService(): IdentityPoolService | null {
  const identityPoolId = process.env.COGNITO_IDENTITY_POOL_ID;
  const region = process.env.AWS_REGION || process.env.COGNITO_REGION;
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;

  if (!identityPoolId || !region || !userPoolId || !clientId) {
    return null;
  }

  return new IdentityPoolService({
    identityPoolId,
    region,
    userPoolId,
    clientId,
  });
}
