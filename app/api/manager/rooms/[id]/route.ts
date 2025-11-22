/**
 * Manager Room Update API
 * PATCH /api/manager/rooms/:id - Update room status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/client';
import { mapRoom } from '@/lib/db/mappers';
import { RoomRow, RoomStatus } from '@/types';

interface UpdateRoomRequest {
  status?: RoomStatus;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body: UpdateRoomRequest = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Status is required' } },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses: RoomStatus[] = ['vacant', 'occupied', 'cleaning', 'maintenance'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid status value' } },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Check if room exists
    const existingRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as RoomRow | undefined;
    
    if (!existingRoom) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Room not found' } },
        { status: 404 }
      );
    }

    // Update room status
    db.prepare('UPDATE rooms SET status = ? WHERE id = ?').run(status, id);

    // Fetch updated room
    const updatedRoom = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as RoomRow;

    return NextResponse.json({
      success: true,
      room: mapRoom(updatedRoom),
    });
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update room' } },
      { status: 500 }
    );
  }
}
