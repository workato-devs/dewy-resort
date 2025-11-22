/**
 * POST /api/auth/cognito/register
 * Create a new user in Amazon Cognito User Pool
 * 
 * This endpoint creates a new user account in Cognito with the provided
 * email, password, name, and role. After successful creation, the user
 * is redirected to the Cognito login flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadCognitoConfig } from '@/lib/auth/cognito/config';
import { CognitoManagementClient } from '@/lib/auth/cognito/management';
import { CognitoAuthenticationError } from '@/lib/auth/cognito/errors';
import { getAuthProvider } from '@/lib/auth/config';
import { createErrorResponse } from '@/lib/errors/api-response';
import { logUserCreated, logAuthError, logConfigError } from '@/lib/auth/cognito/logger';

/**
 * Request body interface
 */
interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: 'guest' | 'manager';
}

/**
 * Validate request body
 */
function validateRequestBody(body: any): body is RegisterRequest {
  if (!body.email || typeof body.email !== 'string') {
    throw new CognitoAuthenticationError('Email is required', 'VALIDATION_ERROR');
  }
  
  if (!body.password || typeof body.password !== 'string') {
    throw new CognitoAuthenticationError('Password is required', 'VALIDATION_ERROR');
  }
  
  if (!body.name || typeof body.name !== 'string') {
    throw new CognitoAuthenticationError('Name is required', 'VALIDATION_ERROR');
  }
  
  if (!body.role || (body.role !== 'guest' && body.role !== 'manager')) {
    throw new CognitoAuthenticationError(
      'Role must be either "guest" or "manager"',
      'VALIDATION_ERROR'
    );
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    throw new CognitoAuthenticationError('Invalid email format', 'VALIDATION_ERROR');
  }
  
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Validate AUTH_PROVIDER is "cognito"
    const authProvider = getAuthProvider();
    if (authProvider !== 'cognito') {
      throw new CognitoAuthenticationError(
        'Cognito registration is not available. Current authentication provider is: ' + authProvider,
        'PROVIDER_NOT_ENABLED'
      );
    }

    // Load Cognito configuration
    const config = loadCognitoConfig();
    if (!config) {
      throw new CognitoAuthenticationError(
        'Cognito is not configured',
        'CONFIG_ERROR'
      );
    }

    // Parse and validate request body
    const body = await request.json();
    validateRequestBody(body);

    const { email, password, name, role } = body as RegisterRequest;
    const normalizedEmail = email.toLowerCase().trim();

    // Create Cognito Management Client
    const managementClient = new CognitoManagementClient(config);

    try {
      // Create user in Cognito User Pool
      const cognitoUser = await managementClient.createUser({
        email: normalizedEmail,
        password,
        name: name.trim(),
        role,
      });

      // Log successful user creation
      logUserCreated(cognitoUser.attributes.sub, cognitoUser.attributes.email, role);

      // Check if user needs email verification
      const needsVerification = cognitoUser.userStatus === 'UNCONFIRMED';

      // Return success response with appropriate redirect
      return NextResponse.json({
        success: true,
        message: needsVerification 
          ? 'Account created successfully. Please verify your email.'
          : 'Account created successfully. Redirecting to login...',
        redirectUrl: needsVerification 
          ? `/verify-email?email=${encodeURIComponent(normalizedEmail)}`
          : '/api/auth/cognito/login',
        needsVerification,
        user: {
          username: cognitoUser.username,
          email: cognitoUser.attributes.email,
          name: cognitoUser.attributes.name,
          role: cognitoUser.attributes['custom:role'],
        },
      }, { status: 201 });

    } catch (error) {
      // Handle Cognito-specific errors
      if (error instanceof CognitoAuthenticationError) {
        // Check for specific error codes
        if (error.code === 'UsernameExistsException') {
          // User already exists - return 409 Conflict
          logAuthError('User already exists', undefined, { email: normalizedEmail });
          return NextResponse.json({
            success: false,
            error: {
              code: 'USER_EXISTS',
              message: 'An account with this email already exists',
            },
          }, { status: 409 });
        }

        if (error.code === 'InvalidPasswordException') {
          // Password policy violation - return 400 Bad Request
          logAuthError('Password policy violation', undefined, { email: normalizedEmail });
          return NextResponse.json({
            success: false,
            error: {
              code: 'INVALID_PASSWORD',
              message: error.message,
            },
          }, { status: 400 });
        }

        // Other Cognito authentication errors
        logAuthError(error.message, undefined, { code: error.code });
        throw error;
      }

      // Re-throw unexpected errors
      logAuthError(error instanceof Error ? error.message : 'Unknown registration error');
      throw error;
    }

  } catch (error) {
    // Log configuration or validation errors
    if (error instanceof CognitoAuthenticationError) {
      if (error.code === 'CONFIG_ERROR' || error.code === 'PROVIDER_NOT_ENABLED') {
        logConfigError(error.message, { code: error.code });
      } else if (error.code === 'VALIDATION_ERROR') {
        logAuthError(error.message, undefined, { code: error.code });
      }
    }
    
    // Use standard error response handler
    return createErrorResponse(error, 'POST /api/auth/cognito/register');
  }
}
