/**
 * Cognito User Management Client
 * 
 * Provides methods for managing users in Amazon Cognito User Pool using AWS SDK.
 * Handles user creation, lookup, and attribute updates.
 */

import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
  ListUsersCommand,
  SignUpCommand,
  UsernameExistsException,
  InvalidPasswordException,
  UserNotFoundException,
  InvalidParameterException,
  AttributeType,
} from '@aws-sdk/client-cognito-identity-provider';
import { createHmac } from 'crypto';
import { CognitoConfig } from './config';
import { CognitoAuthenticationError } from './errors';

/**
 * Request interface for creating a new user
 */
export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: 'guest' | 'manager';
}

/**
 * Cognito user interface representing a user in the User Pool
 */
export interface CognitoUser {
  username: string;
  attributes: {
    sub: string;
    email: string;
    name: string;
    'custom:role': string;
  };
  userStatus: string;
}

/**
 * Cognito User Management Client
 * 
 * Provides methods for managing users in Cognito User Pool
 */
export class CognitoManagementClient {
  private client: CognitoIdentityProviderClient;
  private userPoolId: string;
  private clientId: string;
  private clientSecret?: string;

  /**
   * Create a new Cognito Management Client
   * 
   * @param config - Cognito configuration
   */
  constructor(config: CognitoConfig) {
    this.userPoolId = config.userPoolId;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    
    // Initialize AWS SDK client
    // For public SignUp API, we don't need AWS credentials
    this.client = new CognitoIdentityProviderClient({
      region: config.region,
      credentials: undefined, // Don't use CLI credentials
    });
  }

  /**
   * Calculate SECRET_HASH for Cognito API calls
   * Required when the app client has a client secret configured
   * Returns undefined for public clients (no secret)
   * 
   * @param username - Username to hash
   * @returns Base64-encoded HMAC-SHA256 hash or undefined for public clients
   */
  private calculateSecretHash(username: string): string | undefined {
    if (!this.clientSecret) {
      return undefined; // Public client - no secret hash needed
    }
    const message = username + this.clientId;
    const hmac = createHmac('sha256', this.clientSecret);
    hmac.update(message);
    return hmac.digest('base64');
  }

  /**
   * Create a new user in Cognito User Pool using public SignUp API
   * 
   * This uses the public SignUp API which doesn't require AWS credentials.
   * The user will be created in CONFIRMED status if auto-confirm is enabled,
   * otherwise they'll need to verify their email.
   * 
   * @param request - User creation request
   * @returns Created user information
   * @throws CognitoAuthenticationError if user creation fails
   */
  async createUser(request: CreateUserRequest): Promise<CognitoUser> {
    try {
      // Prepare user attributes
      const userAttributes: AttributeType[] = [
        {
          Name: 'email',
          Value: request.email,
        },
        {
          Name: 'name',
          Value: request.name,
        },
        {
          Name: 'custom:role',
          Value: request.role,
        },
      ];

      // Calculate SECRET_HASH (required when client has a secret, omit for public clients)
      const secretHash = this.calculateSecretHash(request.email);

      // Create user using public SignUp command (no AWS credentials needed)
      const commandInput: any = {
        ClientId: this.clientId,
        Username: request.email, // Use email as username
        Password: request.password,
        UserAttributes: userAttributes,
      };

      // Only include SecretHash if client has a secret (confidential client)
      if (secretHash) {
        commandInput.SecretHash = secretHash;
      }

      const command = new SignUpCommand(commandInput);

      const response = await this.client.send(command);

      // Return user information
      // Note: SignUp doesn't return full user details, so we construct them
      return {
        username: request.email,
        attributes: {
          sub: response.UserSub || '', // Cognito assigns this
          email: request.email,
          name: request.name,
          'custom:role': request.role,
        },
        userStatus: response.UserConfirmed ? 'CONFIRMED' : 'UNCONFIRMED',
      };
    } catch (error) {
      // Handle specific Cognito errors
      if (error instanceof UsernameExistsException) {
        throw new CognitoAuthenticationError(
          'An account with this email already exists',
          'UsernameExistsException'
        );
      }

      if (error instanceof InvalidPasswordException) {
        throw new CognitoAuthenticationError(
          'Password does not meet the required security policy. Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.',
          'InvalidPasswordException'
        );
      }

      if (error instanceof InvalidParameterException) {
        throw new CognitoAuthenticationError(
          `Invalid parameter: ${error.message}`,
          'InvalidParameterException'
        );
      }

      // Re-throw if already a CognitoAuthenticationError
      if (error instanceof CognitoAuthenticationError) {
        throw error;
      }

      // Generic error
      throw new CognitoAuthenticationError(
        `Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CreateUserError'
      );
    }
  }

  /**
   * Get user by email address
   * 
   * @param email - User's email address
   * @returns User information or null if not found
   * @throws CognitoAuthenticationError if lookup fails
   */
  async getUserByEmail(email: string): Promise<CognitoUser | null> {
    try {
      // List users with email filter
      const command = new ListUsersCommand({
        UserPoolId: this.userPoolId,
        Filter: `email = "${email}"`,
        Limit: 1,
      });

      const response = await this.client.send(command);

      // Check if user was found
      if (!response.Users || response.Users.length === 0) {
        return null;
      }

      const user = response.Users[0];
      const attributes = this.parseUserAttributes(user.Attributes || []);

      return {
        username: user.Username || email,
        attributes: {
          sub: attributes.sub || '',
          email: attributes.email || email,
          name: attributes.name || '',
          'custom:role': attributes['custom:role'] || '',
        },
        userStatus: user.UserStatus || 'UNKNOWN',
      };
    } catch (error) {
      // Handle specific Cognito errors
      if (error instanceof UserNotFoundException) {
        return null;
      }

      // Generic error
      throw new CognitoAuthenticationError(
        `Failed to lookup user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GetUserError'
      );
    }
  }

  /**
   * Update user attributes
   * 
   * @param username - Username (email) of the user
   * @param attributes - Attributes to update (key-value pairs)
   * @throws CognitoAuthenticationError if update fails
   */
  async updateUserAttributes(
    username: string,
    attributes: Record<string, string>
  ): Promise<void> {
    try {
      // Convert attributes object to AttributeType array
      const userAttributes: AttributeType[] = Object.entries(attributes).map(
        ([name, value]) => ({
          Name: name,
          Value: value,
        })
      );

      // Update user attributes using AdminUpdateUserAttributes command
      const command = new AdminUpdateUserAttributesCommand({
        UserPoolId: this.userPoolId,
        Username: username,
        UserAttributes: userAttributes,
      });

      await this.client.send(command);
    } catch (error) {
      // Handle specific Cognito errors
      if (error instanceof UserNotFoundException) {
        throw new CognitoAuthenticationError(
          'User not found',
          'UserNotFoundException'
        );
      }

      if (error instanceof InvalidParameterException) {
        throw new CognitoAuthenticationError(
          `Invalid parameter: ${error.message}`,
          'InvalidParameterException'
        );
      }

      // Generic error
      throw new CognitoAuthenticationError(
        `Failed to update user attributes: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UpdateUserError'
      );
    }
  }

  /**
   * Parse user attributes from Cognito format to object
   * 
   * @param attributes - Array of Cognito attributes
   * @returns Object with attribute name-value pairs
   */
  private parseUserAttributes(attributes: AttributeType[]): Record<string, string> {
    const result: Record<string, string> = {};
    
    for (const attr of attributes) {
      if (attr.Name && attr.Value) {
        result[attr.Name] = attr.Value;
      }
    }
    
    return result;
  }
}
