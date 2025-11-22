/**
 * GET /api/auth/session
 * Validate session and return current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { AuthenticationError } from '@/lib/errors';
import { createErrorResponse } from '@/lib/errors/api-response';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new AuthenticationError('No active session');
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        roomNumber: user.roomNumber,
      },
    });
    
  } catch (error) {
    return createErrorResponse(error, 'GET /api/auth/session');
  }
}
