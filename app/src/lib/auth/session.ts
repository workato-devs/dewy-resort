/**
 * Session management utilities
 */

import { cookies } from 'next/headers';
import { executeQueryOne, executeUpdate, generateId, formatDate } from '@/lib/db/client';
import { SessionRow, UserRow } from '@/types';
import { User } from '@/types';
import { loadOktaConfig } from './okta/config';
import { OktaManagementClient } from './okta/management';
import { OktaUserClaims } from './okta/validator';

const SESSION_COOKIE_NAME = 'hotel_session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface SessionData {
  sessionId: string;
  userId: string;
  role: 'guest' | 'manager';
  expiresAt: Date;
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: string, role: 'guest' | 'manager'): Promise<SessionData> {
  const sessionId = generateId();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  
  executeUpdate(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`,
    [sessionId, userId, formatDate(expiresAt)]
  );
  
  // Set session cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
  
  return {
    sessionId,
    userId,
    role,
    expiresAt,
  };
}

/**
 * Get session data from cookie
 * 
 * This function now handles both local and Okta sessions.
 * For Okta sessions, it validates with Okta Management API if configured.
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  
  if (!sessionId) {
    return null;
  }
  
  // Use getSessionFromOkta which handles both local and Okta sessions
  return getSessionFromOkta(sessionId);
}

/**
 * Delete a session
 * 
 * This function now handles both local and Okta sessions.
 * For Okta sessions, it revokes the session in Okta before deleting locally.
 */
export async function deleteSession(sessionId: string): Promise<void> {
  // Use deleteOktaSession which handles both local and Okta sessions
  return deleteOktaSession(sessionId);
}

/**
 * Delete all sessions for a user
 */
export function deleteUserSessions(userId: string): void {
  executeUpdate(`DELETE FROM sessions WHERE user_id = ?`, [userId]);
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions(): void {
  executeUpdate(`DELETE FROM sessions WHERE expires_at <= datetime('now')`);
}

/**
 * Get current user from session
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  
  if (!session) {
    return null;
  }
  
  const userRow = executeQueryOne<UserRow>(
    `SELECT * FROM users WHERE id = ?`,
    [session.userId]
  );
  
  if (!userRow) {
    return null;
  }
  
  return {
    id: userRow.id,
    email: userRow.email,
    name: userRow.name,
    role: userRow.role as 'guest' | 'manager',
    roomNumber: userRow.room_number || undefined,
    createdAt: new Date(userRow.created_at),
  };
}

/**
 * Create a session from Okta authentication
 * 
 * When WORKATO_MOCK_MODE is "false" and OKTA_API_TOKEN is available:
 *   - Creates session in Okta via Management API
 *   - Stores Okta session ID in local DB and cookie
 * 
 * When WORKATO_MOCK_MODE is "false" but OKTA_API_TOKEN is not available:
 *   - Creates local session with user ID from Okta
 * 
 * When WORKATO_MOCK_MODE is "true":
 *   - Creates local session (existing behavior)
 * 
 * @param oktaUserId - Okta user ID (sub claim)
 * @param role - User role
 * @param oktaSessionId - Optional Okta session ID if already created
 * @returns Session data
 */
export async function createSessionFromOkta(
  oktaUserId: string,
  role: 'guest' | 'manager',
  oktaSessionId?: string
): Promise<SessionData> {
  const config = loadOktaConfig();
  const isMockMode = process.env.WORKATO_MOCK_MODE === 'true';
  
  // If mock mode or no Okta config, create local session
  if (isMockMode || !config) {
    return createSession(oktaUserId, role);
  }
  
  // Check if API token is available for Okta session management
  const hasApiToken = config.apiToken && config.apiToken.length > 0;
  
  let finalOktaSessionId = oktaSessionId;
  let expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  
  // If API token available and no session ID provided, create session in Okta
  if (hasApiToken && !oktaSessionId) {
    try {
      const managementClient = new OktaManagementClient(config.domain, config.apiToken!);
      const oktaSession = await managementClient.createSession(oktaUserId);
      finalOktaSessionId = oktaSession.id;
      expiresAt = new Date(oktaSession.expiresAt);
    } catch (error) {
      console.error('Failed to create Okta session, falling back to local session:', error);
      // Fall back to local session if Okta session creation fails
      return createSession(oktaUserId, role);
    }
  }
  
  // Create local session record
  const sessionId = generateId();
  const isOktaSession = hasApiToken && finalOktaSessionId ? 1 : 0;
  
  executeUpdate(
    `INSERT INTO sessions (id, user_id, expires_at, okta_session_id, is_okta_session) VALUES (?, ?, ?, ?, ?)`,
    [sessionId, oktaUserId, formatDate(expiresAt), finalOktaSessionId || null, isOktaSession]
  );
  
  // Set session cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
  
  return {
    sessionId,
    userId: oktaUserId,
    role,
    expiresAt,
  };
}

/**
 * Get session from Okta or local database
 * 
 * When is_okta_session is true:
 *   - Validates session with Okta Management API
 * 
 * When is_okta_session is false:
 *   - Validates session locally
 * 
 * @param sessionId - Optional session ID to validate (if not provided, reads from cookie)
 * @returns Session data or null if invalid
 */
export async function getSessionFromOkta(sessionId?: string): Promise<SessionData | null> {
  // Get session ID from cookie if not provided
  let finalSessionId = sessionId;
  if (!finalSessionId) {
    const cookieStore = await cookies();
    finalSessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  }
  
  if (!finalSessionId) {
    return null;
  }
  
  // Get session from local database
  const session = executeQueryOne<SessionRow>(
    `SELECT * FROM sessions WHERE id = ?`,
    [finalSessionId]
  );
  
  if (!session) {
    return null;
  }
  
  // Check if session is expired
  const expiresAt = new Date(session.expires_at);
  if (expiresAt <= new Date()) {
    return null;
  }
  
  // If this is an Okta session, validate with Okta Management API
  if (session.is_okta_session === 1 && session.okta_session_id) {
    const config = loadOktaConfig();
    
    // If no config or mock mode, treat as invalid
    if (!config || process.env.WORKATO_MOCK_MODE === 'true') {
      return null;
    }
    
    // If no API token, can't validate Okta session
    if (!config.apiToken) {
      console.warn('Okta session found but no API token configured for validation');
      // Fall back to local validation
    } else {
      try {
        const managementClient = new OktaManagementClient(config.domain, config.apiToken);
        const oktaSession = await managementClient.getSession(session.okta_session_id);
        
        // If session not found or inactive in Okta, invalidate
        if (!oktaSession || oktaSession.status !== 'ACTIVE') {
          // Delete invalid session
          executeUpdate(`DELETE FROM sessions WHERE id = ?`, [finalSessionId]);
          return null;
        }
        
        // Update expiration if Okta session has different expiration
        const oktaExpiresAt = new Date(oktaSession.expiresAt);
        if (oktaExpiresAt.getTime() !== expiresAt.getTime()) {
          executeUpdate(
            `UPDATE sessions SET expires_at = ? WHERE id = ?`,
            [formatDate(oktaExpiresAt), finalSessionId]
          );
          expiresAt.setTime(oktaExpiresAt.getTime());
        }
      } catch (error) {
        console.error('Failed to validate Okta session:', error);
        // On error, fall back to local validation
      }
    }
  }
  
  // Get user to include role
  const user = executeQueryOne<UserRow>(
    `SELECT * FROM users WHERE id = ?`,
    [session.user_id]
  );
  
  if (!user) {
    return null;
  }
  
  return {
    sessionId: session.id,
    userId: session.user_id,
    role: user.role as 'guest' | 'manager',
    expiresAt,
  };
}

/**
 * Delete Okta session
 * 
 * When is_okta_session is true:
 *   - Revokes session in Okta via Management API
 * 
 * When is_okta_session is false:
 *   - Deletes local session
 * 
 * Always clears session cookie
 * 
 * @param sessionId - Session ID to delete
 */
export async function deleteOktaSession(sessionId: string): Promise<void> {
  // Get session from database
  const session = executeQueryOne<SessionRow>(
    `SELECT * FROM sessions WHERE id = ?`,
    [sessionId]
  );
  
  if (!session) {
    // Session doesn't exist, just clear cookie
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    return;
  }
  
  // If this is an Okta session, revoke it in Okta
  if (session.is_okta_session === 1 && session.okta_session_id) {
    const config = loadOktaConfig();
    
    if (config && config.apiToken && process.env.WORKATO_MOCK_MODE !== 'true') {
      try {
        const managementClient = new OktaManagementClient(config.domain, config.apiToken);
        await managementClient.revokeSession(session.okta_session_id);
      } catch (error) {
        console.error('Failed to revoke Okta session:', error);
        // Continue to delete local session even if Okta revocation fails
      }
    }
  }
  
  // Delete local session record
  executeUpdate(`DELETE FROM sessions WHERE id = ?`, [sessionId]);
  
  // Clear session cookie
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Upsert user from Okta claims
 * 
 * Uses Okta sub claim as user ID.
 * Inserts or updates user record with email, name, role from claims.
 * Sets password_hash to NULL for Okta users.
 * Sets created_at only on insert, updates updated_at on update.
 * 
 * @param claims - Okta user claims from ID token
 * @returns Object indicating whether this was a new user
 */
export async function upsertUserFromOkta(claims: OktaUserClaims): Promise<{ isNewUser: boolean }> {
  const now = new Date();
  
  // Check if user exists
  const existingUser = executeQueryOne<UserRow>(
    `SELECT * FROM users WHERE id = ?`,
    [claims.sub]
  );
  
  if (existingUser) {
    // Update existing user
    executeUpdate(
      `UPDATE users SET email = ?, name = ?, role = ?, updated_at = ? WHERE id = ?`,
      [claims.email, claims.name, claims.role, formatDate(now), claims.sub]
    );
    return { isNewUser: false };
  } else {
    // Insert new user
    // Note: password_hash will be empty string for Okta users (database requires NOT NULL)
    // The application logic checks for Okta users by checking if password_hash is empty
    executeUpdate(
      `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) 
       VALUES (?, ?, '', ?, ?, ?, ?)`,
      [claims.sub, claims.email, claims.name, claims.role, formatDate(now), formatDate(now)]
    );
    return { isNewUser: true };
  }
}

/**
 * Create a session from Cognito authentication
 * 
 * Creates a local session with Cognito user ID from sub claim.
 * Stores Cognito tokens (ID token, access token, refresh token) for later use.
 * 
 * @param cognitoUserId - Cognito user ID (sub claim)
 * @param role - User role
 * @param tokens - Optional Cognito tokens to store
 * @returns Session data
 */
export async function createSessionFromCognito(
  cognitoUserId: string,
  role: 'guest' | 'manager',
  tokens?: {
    idToken?: string;
    accessToken?: string;
    refreshToken?: string;
  }
): Promise<SessionData> {
  // For Cognito, we create local sessions with token storage
  const sessionId = generateId();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  
  executeUpdate(
    `INSERT INTO sessions (id, user_id, expires_at, cognito_id_token, cognito_access_token, cognito_refresh_token) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      sessionId, 
      cognitoUserId, 
      formatDate(expiresAt),
      tokens?.idToken || null,
      tokens?.accessToken || null,
      tokens?.refreshToken || null
    ]
  );
  
  // Set session cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
  
  return {
    sessionId,
    userId: cognitoUserId,
    role,
    expiresAt,
  };
}

/**
 * Check if a JWT token is expired or close to expiring
 * 
 * @param token - JWT token to check
 * @param bufferSeconds - Number of seconds before expiration to consider token expired (default: 300 = 5 minutes)
 * @returns True if token is expired or close to expiring
 */
function isTokenExpired(token: string, bufferSeconds: number = 300): boolean {
  try {
    // Decode JWT to get expiration claim
    const { decodeJwt } = require('jose');
    const claims = decodeJwt(token) as { exp?: number };
    
    if (!claims.exp) {
      // No expiration claim, consider it expired
      return true;
    }
    
    // Check if token is expired or will expire within buffer time
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = claims.exp - now;
    
    return expiresIn <= bufferSeconds;
  } catch (error) {
    console.error('[Token Check] Failed to decode token:', error);
    // If we can't decode it, consider it expired
    return true;
  }
}

/**
 * Get Cognito ID token from session
 * 
 * Retrieves the stored Cognito ID token for a session.
 * Automatically refreshes the token if it's expired or close to expiring.
 * Used for exchanging with Identity Pool for temporary AWS credentials.
 * 
 * @param sessionId - Session ID
 * @param autoRefresh - Whether to automatically refresh expired tokens (default: true)
 * @returns ID token or null if not found or refresh failed
 */
export async function getCognitoIdToken(sessionId: string, autoRefresh: boolean = true): Promise<string | null> {
  const session = executeQueryOne<SessionRow>(
    `SELECT cognito_id_token FROM sessions WHERE id = ?`,
    [sessionId]
  );
  
  if (!session || !session.cognito_id_token) {
    return null;
  }
  
  // Check if token is expired or close to expiring
  if (autoRefresh && isTokenExpired(session.cognito_id_token)) {
    console.log('[Token Check] ID token is expired or close to expiring, refreshing...');
    
    // Attempt to refresh the token
    const refreshed = await refreshCognitoTokens(sessionId);
    
    if (refreshed) {
      console.log('[Token Check] Successfully refreshed ID token');
      return refreshed.idToken;
    } else {
      // Refresh failed (likely refresh token expired) - invalidate session
      console.error('[Token Check] Failed to refresh token, invalidating session');
      await deleteSession(sessionId);
      return null; // Return null instead of expired token
    }
  }
  
  return session.cognito_id_token;
}

/**
 * Get Cognito refresh token from session
 * 
 * Retrieves the stored Cognito refresh token for a session.
 * Used for refreshing expired ID and access tokens.
 * 
 * @param sessionId - Session ID
 * @returns Refresh token or null if not found
 */
export async function getCognitoRefreshToken(sessionId: string): Promise<string | null> {
  const session = executeQueryOne<SessionRow>(
    `SELECT cognito_refresh_token FROM sessions WHERE id = ?`,
    [sessionId]
  );
  
  if (!session || !session.cognito_refresh_token) {
    return null;
  }
  
  return session.cognito_refresh_token;
}

/**
 * Update session tokens after refresh
 * 
 * Updates the stored Cognito tokens in a session.
 * Used after refreshing tokens to keep session up to date.
 * 
 * @param sessionId - Session ID
 * @param tokens - New tokens to store
 */
export async function updateSessionTokens(
  sessionId: string,
  tokens: {
    idToken: string;
    accessToken: string;
    refreshToken?: string;
  }
): Promise<void> {
  executeUpdate(
    `UPDATE sessions 
     SET cognito_id_token = ?, 
         cognito_access_token = ?, 
         cognito_refresh_token = COALESCE(?, cognito_refresh_token)
     WHERE id = ?`,
    [tokens.idToken, tokens.accessToken, tokens.refreshToken || null, sessionId]
  );
}

/**
 * Refresh Cognito tokens using refresh token
 * 
 * Exchanges the refresh token for new ID and access tokens.
 * Updates the session with the new tokens.
 * 
 * @param sessionId - Session ID
 * @returns New tokens or null if refresh failed
 */
export async function refreshCognitoTokens(
  sessionId: string
): Promise<{ idToken: string; accessToken: string } | null> {
  // Get current session with refresh token
  const session = executeQueryOne<SessionRow>(
    `SELECT cognito_refresh_token FROM sessions WHERE id = ?`,
    [sessionId]
  );

  if (!session || !session.cognito_refresh_token) {
    console.warn('[Token Refresh] No refresh token found for session:', sessionId);
    return null;
  }

  try {
    // Load Cognito config and create client
    const { loadCognitoConfig } = await import('./cognito/config');
    const { CognitoClient } = await import('./cognito/client');
    
    const config = loadCognitoConfig();
    if (!config) {
      console.warn('[Token Refresh] Cognito config not available');
      return null;
    }

    const client = new CognitoClient(config);
    
    console.log('[Token Refresh] Refreshing tokens for session:', sessionId);
    
    // Refresh tokens
    const tokenResponse = await client.refreshTokens(session.cognito_refresh_token);
    
    console.log('[Token Refresh] Successfully refreshed tokens');
    
    // Update session with new tokens
    await updateSessionTokens(sessionId, {
      idToken: tokenResponse.id_token,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
    });

    return {
      idToken: tokenResponse.id_token,
      accessToken: tokenResponse.access_token,
    };
  } catch (error) {
    console.error('[Token Refresh] Failed to refresh Cognito tokens:', error);
    return null;
  }
}

/**
 * Upsert user from Cognito claims
 * 
 * Uses Cognito sub claim as user ID.
 * Inserts or updates user record with email, name, role from claims.
 * Sets password_hash to empty string for Cognito users.
 * Sets created_at only on insert, updates updated_at on update.
 * 
 * @param claims - Cognito user claims from ID token
 * @returns Object indicating whether this was a new user
 */
export async function upsertUserFromCognito(claims: {
  sub: string;
  email: string;
  name: string;
  'custom:role': string;
}): Promise<{ isNewUser: boolean }> {
  const now = new Date();
  const role = claims['custom:role'];
  
  // Check if user exists
  const existingUser = executeQueryOne<UserRow>(
    `SELECT * FROM users WHERE id = ?`,
    [claims.sub]
  );
  
  if (existingUser) {
    // Update existing user
    executeUpdate(
      `UPDATE users SET email = ?, name = ?, role = ?, updated_at = ? WHERE id = ?`,
      [claims.email, claims.name, role, formatDate(now), claims.sub]
    );
    return { isNewUser: false };
  } else {
    // Insert new user
    // Note: password_hash will be empty string for Cognito users (database requires NOT NULL)
    // The application logic checks for Cognito users by checking if password_hash is empty
    executeUpdate(
      `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) 
       VALUES (?, ?, '', ?, ?, ?, ?)`,
      [claims.sub, claims.email, claims.name, role, formatDate(now), formatDate(now)]
    );
    return { isNewUser: true };
  }
}
