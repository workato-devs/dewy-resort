/**
 * POST /api/auth/login
 * Authenticate user and create session
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQueryOne } from '@/lib/db/client';
import { verifyPassword, createSession } from '@/lib/auth';
import { UserRow } from '@/types';
import { ValidationError, AuthenticationError } from '@/lib/errors';
import { createErrorResponse } from '@/lib/errors/api-response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    // Validate input
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }
    
    // Find user by email
    const user = executeQueryOne<UserRow>(
      `SELECT * FROM users WHERE email = ?`,
      [email.toLowerCase()]
    );
    
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }
    
    // Check if user has a password hash (Okta users don't have local passwords)
    if (!user.password_hash) {
      throw new AuthenticationError('This account uses Okta authentication. Please sign in with Okta.');
    }
    
    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    
    if (!isValid) {
      throw new AuthenticationError('Invalid email or password');
    }
    
    // Create session
    const session = await createSession(user.id, user.role as 'guest' | 'manager');
    
    // Determine redirect URL based on role
    const redirectUrl = user.role === 'manager' ? '/manager/dashboard' : '/guest/dashboard';
    
    // Return user data (without password hash)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        roomNumber: user.room_number || undefined,
      },
      session: {
        expiresAt: session.expiresAt.toISOString(),
      },
      redirectUrl,
    });
    
  } catch (error) {
    return createErrorResponse(error, 'POST /api/auth/login');
  }
}
