/**
 * GET /api/guest/dashboard
 * Get dashboard data for the current guest
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { executeQueryOne, executeQuery } from '@/lib/db/client';
import { RoomRow, ChargeRow, ServiceRequestRow } from '@/types';
import { AuthenticationError, NotFoundError } from '@/lib/errors';
import { createErrorResponse } from '@/lib/errors/api-response';

export async function GET() {
  try {
    // Get current user
    const user = await getCurrentUser();
    
    if (!user) {
      throw new AuthenticationError('Not authenticated');
    }
    
    if (user.role !== 'guest') {
      throw new AuthenticationError('Access denied. Guest access required.');
    }
    
    // Get room information if guest has a room assigned
    let room: RoomRow | undefined = undefined;
    if (user.roomNumber) {
      room = executeQueryOne<RoomRow>(
        `SELECT * FROM rooms WHERE room_number = ?`,
        [user.roomNumber]
      );
    }
    
    // Get charges for the guest
    const charges = executeQuery<ChargeRow>(
      `SELECT * FROM charges WHERE guest_id = ? ORDER BY date DESC`,
      [user.id]
    );
    
    // Calculate totals
    const total = charges.reduce((sum, charge) => sum + charge.amount, 0);
    const unpaidTotal = charges
      .filter(charge => !charge.paid)
      .reduce((sum, charge) => sum + charge.amount, 0);
    
    // Get active service requests
    const activeRequests = executeQuery<ServiceRequestRow>(
      `SELECT * FROM service_requests 
       WHERE guest_id = ? AND status != 'completed' AND status != 'cancelled'
       ORDER BY created_at DESC`,
      [user.id]
    );
    
    // Return dashboard data
    return NextResponse.json({
      guest: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        roomNumber: user.roomNumber,
        createdAt: user.createdAt.toISOString(),
      },
      room: room ? {
        id: room.id,
        roomNumber: room.room_number,
        floor: room.floor,
        type: room.type,
        status: room.status,
        currentGuestId: room.current_guest_id || undefined,
      } : null,
      charges: {
        items: charges.map(charge => ({
          id: charge.id,
          guestId: charge.guest_id,
          type: charge.type,
          description: charge.description,
          amount: charge.amount,
          date: charge.date,
          paid: charge.paid === 1,
        })),
        total,
        unpaidTotal,
      },
      activeRequests: activeRequests.map(request => ({
        id: request.id,
        guestId: request.guest_id,
        roomNumber: request.room_number,
        type: request.type,
        priority: request.priority,
        description: request.description,
        status: request.status,
        salesforceTicketId: request.salesforce_ticket_id || undefined,
        createdAt: request.created_at,
        completedAt: request.completed_at || undefined,
      })),
    });
    
  } catch (error) {
    return createErrorResponse(error, 'GET /api/guest/dashboard');
  }
}
