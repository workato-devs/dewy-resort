/**
 * POST /api/auth/register
 * Local user registration (mock mode only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQueryOne, executeUpdate, generateId, formatDate } from '@/lib/db/client';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { UserRow } from '@/types';
import { ValidationError, AuthenticationError } from '@/lib/errors';
import { createErrorResponse } from '@/lib/errors/api-response';

export async function POST(request: NextRequest) {
  try {
    // Validate WORKATO_MOCK_MODE is "true"
    if (process.env.WORKATO_MOCK_MODE !== 'true') {
      throw new AuthenticationError('Local registration is only available in mock mode. Please use Okta registration.');
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

    // Validate password requirements (basic validation for local mode)
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    const normalizedEmail = email.toLowerCase();

    // Check if email already exists
    const existingUser = executeQueryOne<UserRow>(
      `SELECT id FROM users WHERE email = ?`,
      [normalizedEmail]
    );

    if (existingUser) {
      throw new ValidationError('An account with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user record
    const userId = generateId();
    const now = new Date();

    executeUpdate(
      `INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, normalizedEmail, passwordHash, name, role, formatDate(now), formatDate(now)]
    );

    // Create session
    const session = await createSession(userId, role as 'guest' | 'manager');

    // Return user data and session
    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: normalizedEmail,
        name,
        role,
      },
      session: {
        expiresAt: session.expiresAt.toISOString(),
      },
    });

  } catch (error) {
    return createErrorResponse(error, 'POST /api/auth/register');
  }
}
