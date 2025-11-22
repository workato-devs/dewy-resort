/**
 * GET /api/auth/okta/register
 * Redirect to Okta self-service registration (real mode only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadOktaConfig } from '@/lib/auth/okta/config';
import { ValidationError, AuthenticationError } from '@/lib/errors';
import { createErrorResponse } from '@/lib/errors/api-response';

export async function GET(request: NextRequest) {
  try {
    // Validate WORKATO_MOCK_MODE is "false"
    if (process.env.WORKATO_MOCK_MODE === 'true') {
      throw new AuthenticationError('Okta registration is not available in mock mode. Please use local registration.');
    }

    // Load Okta configuration
    const config = loadOktaConfig();
    if (!config) {
      throw new AuthenticationError('Okta is not configured');
    }

    // Redirect to Okta's self-service registration page
    // This will redirect back to the OAuth login flow after registration
    const registrationUrl = `https://${config.domain}/signin/register`;
    
    return NextResponse.redirect(registrationUrl);
  } catch (error) {
    return createErrorResponse(error, 'GET /api/auth/okta/register');
  }
}

/**
 * POST /api/auth/okta/register
 * Okta user registration via Management API (requires API token)
 */

import { OktaManagementClient } from '@/lib/auth/okta/management';

export async function POST(request: NextRequest) {
  try {
    // Validate WORKATO_MOCK_MODE is "false"
    if (process.env.WORKATO_MOCK_MODE === 'true') {
      throw new AuthenticationError('Okta registration is not available in mock mode. Please use local registration.');
    }

    // Load Okta configuration
    const config = loadOktaConfig();
    if (!config) {
      throw new AuthenticationError('Okta is not configured');
    }

    // Check if OKTA_API_TOKEN is available
    // If not available, suggest using self-service registration
    if (!config.apiToken) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'API_TOKEN_REQUIRED',
          message: 'Direct user registration requires OKTA_API_TOKEN. Please use Okta self-service registration instead.',
        },
        redirectUrl: `/api/auth/okta/register`, // GET endpoint that redirects to Okta
      }, { status: 400 });
    }

    const body = await request.json();
    const { email, password, name, role } = body;

    // Validate input fields
    if (!email || typeof email !== 'string') {
      throw new ValidationError('Email is required');
    }
    if (!password || typeof password !== 'string') {
      throw new ValidationError('Password is required');
    }
    if (!name || typeof name !== 'string') {
      throw new ValidationError('Name is required');
    }
    if (!role || (role !== 'guest' && role !== 'manager')) {
      throw new ValidationError('Role must be either "guest" or "manager"');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password requirements (Okta default policy)
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    const normalizedEmail = email.toLowerCase();

    // Parse name into first and last name
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || name;
    const lastName = nameParts.slice(1).join(' ') || firstName;

    // Create Okta Management client
    const managementClient = new OktaManagementClient(config.domain, config.apiToken);

    try {
      // Create user in Okta
      const oktaUser = await managementClient.createUser({
        email: normalizedEmail,
        firstName,
        lastName,
        password,
        role,
      });

      // Add user to appropriate group based on role
      try {
        const groupName = role === 'manager' ? 'Hotel-Managers' : 'Hotel-Guests';
        console.log(`Looking for group: ${groupName}`);
        const groupId = await managementClient.getGroupByName(groupName);
        console.log(`Found group ID: ${groupId}`);
        
        if (groupId) {
          await managementClient.addUserToGroup(oktaUser.id, groupId);
          console.log(`Successfully added user ${oktaUser.id} to group ${groupName}`);
        } else {
          console.warn(`Group "${groupName}" not found. User created but not added to group.`);
        }
      } catch (groupError) {
        console.error('Failed to add user to group:', groupError);
        // Continue even if group assignment fails
      }

      // Return success message with redirect to login
      return NextResponse.json({
        success: true,
        message: 'Account created successfully. Redirecting to login...',
        redirectUrl: '/api/auth/okta/login',
        user: {
          id: oktaUser.id,
          email: oktaUser.profile.email,
          name: `${oktaUser.profile.firstName} ${oktaUser.profile.lastName}`,
          role: oktaUser.profile.role,
        },
      });

    } catch (error) {
      // Handle Okta-specific errors
      if (error instanceof Error) {
        // Check for specific error messages
        if (error.message.includes('already exists')) {
          throw new ValidationError('An account with this email already exists');
        }
        if (error.message.includes('Password requirements')) {
          // Extract password requirements from error message
          throw new ValidationError(error.message);
        }
        // Re-throw other errors
        throw new AuthenticationError(`Failed to create account: ${error.message}`);
      }
      throw error;
    }

  } catch (error) {
    return createErrorResponse(error, 'POST /api/auth/okta/register');
  }
}
