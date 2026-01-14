/**
 * Okta Management API Client
 * 
 * Handles interactions with Okta Management API for user and session management.
 * Requires OKTA_API_TOKEN to be configured.
 */

/**
 * Request to create a new user in Okta
 */
export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: 'guest' | 'manager';
}

/**
 * Okta user information
 */
export interface OktaUser {
  id: string;
  status: string;
  profile: {
    email: string;
    firstName: string;
    lastName: string;
    role?: string;
  };
}

/**
 * Okta session information
 */
export interface OktaSession {
  id: string;
  userId: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * Okta Management API Client
 */
export class OktaManagementClient {
  private domain: string;
  private apiToken: string;
  private baseUrl: string;

  /**
   * Create a new OktaManagementClient instance
   * @param domain - Okta domain (e.g., dev-12345.okta.com)
   * @param apiToken - Okta Management API token
   */
  constructor(domain: string, apiToken: string) {
    this.domain = domain;
    this.apiToken = apiToken;
    this.baseUrl = `https://${domain}/api/v1`;
  }

  /**
   * Create a new user in Okta
   * 
   * @param request - User creation request
   * @returns Created user information
   * @throws Error if user creation fails
   */
  async createUser(request: CreateUserRequest): Promise<OktaUser> {
    try {
      // Build profile object
      // Note: We use userRole instead of role because "role" is reserved in Okta
      const profile: any = {
        email: request.email,
        login: request.email,
        firstName: request.firstName,
        lastName: request.lastName,
        userRole: request.role, // Set userRole for application profile
      };
      
      const response = await fetch(`${this.baseUrl}/users?activate=true`, {
        method: 'POST',
        headers: {
          'Authorization': `SSWS ${this.apiToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile,
          credentials: {
            password: {
              value: request.password,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.errorSummary || errorData.error || 'User creation failed';
        
        // Handle specific error cases
        if (response.status === 400) {
          // Check for specific error causes
          if (errorData.errorCauses && errorData.errorCauses.length > 0) {
            const cause = errorData.errorCauses[0];
            const causeMessage = cause.errorSummary || '';
            
            if (causeMessage.includes('already exists')) {
              throw new Error('An account with this email already exists');
            }
            if (causeMessage.includes('Password requirements') || causeMessage.includes('password')) {
              throw new Error(causeMessage);
            }
            // Check for custom attribute errors
            if (causeMessage.includes('userRole') || causeMessage.includes('does not exist') || errorMessage.includes('Api validation failed')) {
              throw new Error('The "userRole" custom attribute is not configured in your Okta user profile. Please add it in Okta Admin Console under Directory > Profile Editor > User (default) > Add Attribute. Name: "userRole", Type: "string".');
            }
          }
          throw new Error(errorMessage);
        }
        
        if (response.status === 409) {
          throw new Error('An account with this email already exists');
        }
        
        throw new Error(`Failed to create Okta user: ${errorMessage} (${response.status})`);
      }

      const user = await response.json();
      
      return {
        id: user.id,
        status: user.status,
        profile: {
          email: user.profile.email,
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          role: user.profile.role,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create Okta user: Unknown error');
    }
  }

  /**
   * Add user to a group
   * 
   * @param userId - Okta user ID
   * @param groupId - Okta group ID
   */
  async addUserToGroup(userId: string, groupId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/groups/${groupId}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `SSWS ${this.apiToken}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.errorSummary || errorData.error || 'Failed to add user to group';
        throw new Error(`Failed to add user to group: ${errorMessage} (${response.status})`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to add user to group: Unknown error');
    }
  }

  /**
   * Get group by name
   * 
   * @param groupName - Group name to search for
   * @returns Group ID or null if not found
   */
  async getGroupByName(groupName: string): Promise<string | null> {
    try {
      // Use the search parameter to find groups by name
      const response = await fetch(`${this.baseUrl}/groups?q=${encodeURIComponent(groupName)}`, {
        method: 'GET',
        headers: {
          'Authorization': `SSWS ${this.apiToken}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.errorSummary || errorData.error || 'Group search failed';
        throw new Error(`Failed to search groups: ${errorMessage} (${response.status})`);
      }

      const groups = await response.json();
      
      if (!groups || groups.length === 0) {
        return null;
      }
      
      return groups[0].id;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get group: Unknown error');
    }
  }

  /**
   * Get user by email from Okta
   * 
   * @param email - User email address
   * @returns User information or null if not found
   */
  async getUserByEmail(email: string): Promise<OktaUser | null> {
    try {
      const searchQuery = encodeURIComponent(`profile.email eq "${email}"`);
      const response = await fetch(`${this.baseUrl}/users?search=${searchQuery}`, {
        method: 'GET',
        headers: {
          'Authorization': `SSWS ${this.apiToken}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.errorSummary || errorData.error || 'User search failed';
        throw new Error(`Failed to search Okta users: ${errorMessage} (${response.status})`);
      }

      const users = await response.json();
      
      if (!users || users.length === 0) {
        return null;
      }
      
      const user = users[0];
      return {
        id: user.id,
        status: user.status,
        profile: {
          email: user.profile.email,
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          role: user.profile.role,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get Okta user: Unknown error');
    }
  }

  /**
   * Create a session for a user in Okta
   * 
   * @param userId - Okta user ID
   * @returns Session information
   * @throws Error if session creation fails
   */
  async createSession(userId: string): Promise<OktaSession> {
    // Note: In OAuth 2.0 flows, Okta automatically creates and manages sessions
    // The Sessions API is for session-based authentication, not OAuth
    // We cannot create sessions via Management API without a sessionToken
    // For OAuth flows, we should use local sessions and validate against Okta as needed
    throw new Error('Session creation via Management API is not supported for OAuth flows. Okta manages sessions automatically during OAuth authentication.');
  }

  /**
   * Get session information from Okta
   * 
   * @param sessionId - Okta session ID
   * @returns Session information or null if not found
   */
  async getSession(sessionId: string): Promise<OktaSession | null> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `SSWS ${this.apiToken}`,
          'Accept': 'application/json',
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.errorSummary || errorData.error || 'Session retrieval failed';
        throw new Error(`Failed to get Okta session: ${errorMessage} (${response.status})`);
      }

      const session = await response.json();
      
      return {
        id: session.id,
        userId: session.userId,
        status: session.status,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get Okta session: Unknown error');
    }
  }

  /**
   * Revoke a session in Okta
   * 
   * @param sessionId - Okta session ID
   */
  async revokeSession(sessionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `SSWS ${this.apiToken}`,
          'Accept': 'application/json',
        },
      });

      // 404 is acceptable - session already doesn't exist
      if (response.status === 404) {
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.errorSummary || errorData.error || 'Session revocation failed';
        throw new Error(`Failed to revoke Okta session: ${errorMessage} (${response.status})`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to revoke Okta session: Unknown error');
    }
  }
}
