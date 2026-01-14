/**
 * Manager Room Guest Details API
 * GET /api/manager/rooms/:id/guest - Fetch guest details for a room
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/client';
import { mapRoom, mapUser, mapCharge, mapServiceRequest } from '@/lib/db/mappers';
import { RoomRow, UserRow, ChargeRow, ServiceRequestRow } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const db = getDatabase();

    // Fetch room
    const roomRow = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as RoomRow | undefined;
    
    if (!roomRow) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Room not found' } },
        { status: 404 }
      );
    }

    const room = mapRoom(roomRow);

    // If no guest, return room only
    if (!room.currentGuestId) {
      return NextResponse.json({
        room,
        guest: null,
        charges: [],
        serviceRequests: [],
      });
    }

    // Fetch guest details
    const guestRow = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(room.currentGuestId) as UserRow | undefined;

    if (!guestRow) {
      return NextResponse.json({
        room,
        guest: null,
        charges: [],
        serviceRequests: [],
      });
    }

    const guest = mapUser(guestRow);

    // Fetch guest charges
    const chargeRows = db
      .prepare('SELECT * FROM charges WHERE guest_id = ? ORDER BY date DESC')
      .all(guest.id) as ChargeRow[];
    const charges = chargeRows.map(mapCharge);

    // Fetch guest service requests
    const serviceRequestRows = db
      .prepare('SELECT * FROM service_requests WHERE guest_id = ? ORDER BY created_at DESC')
      .all(guest.id) as ServiceRequestRow[];
    const serviceRequests = serviceRequestRows.map(mapServiceRequest);

    return NextResponse.json({
      room,
      guest,
      charges,
      serviceRequests,
    });
  } catch (error) {
    console.error('Error fetching guest details:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch guest details' } },
      { status: 500 }
    );
  }
}
