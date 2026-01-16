/**
 * Manager Room Guest Details API
 * GET /api/manager/rooms/:id/guest - Fetch guest details for a room
 */

import { NextRequest, NextResponse } from 'next/server';
import { isSalesforceEnabled } from '@/lib/workato/feature-flags';
import { getSalesforceClient } from '@/lib/workato/config';
import { getDatabase } from '@/lib/db/client';
import { mapRoom, mapUser, mapCharge, mapServiceRequest } from '@/lib/db/mappers';
import { RoomRow, UserRow, ChargeRow, ServiceRequestRow } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    let room: any = null;
    let salesforceRoomFailed = false;

    if (isSalesforceEnabled()) {
      // Try to fetch room from Salesforce
      // Note: Since getRoom() is not implemented, we search all rooms and find by ID
      try {
        const client = getSalesforceClient();
        
        // Search all rooms (make separate calls for each status and combine)
        const statuses: Array<'vacant' | 'occupied' | 'cleaning' | 'maintenance'> = [
          'vacant', 'occupied', 'cleaning', 'maintenance'
        ];
        
        const roomPromises = statuses.map(status => 
          client.searchRooms({ status })
        );
        
        const roomResults = await Promise.all(roomPromises);
        const allRooms = roomResults.flat();
        
        // Find the specific room by ID
        room = allRooms.find(r => r.id === id);
        
        if (!room) {
          salesforceRoomFailed = true;
        }
      } catch (error) {
        salesforceRoomFailed = true;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Failed to fetch room from Salesforce, falling back to local data:', error);
      }

      // Fallback to local database ONLY if Salesforce API failed or room not found
      if (salesforceRoomFailed) {
        const db = getDatabase();
        const roomRow = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as RoomRow | undefined;
        
        if (!roomRow) {
          return NextResponse.json(
            { error: { code: 'NOT_FOUND', message: 'Room not found' } },
            { status: 404 }
          );
        }
        
        room = mapRoom(roomRow);
      }
    } else {
      // Use local database (legacy behavior)
      const db = getDatabase();
      const roomRow = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as RoomRow | undefined;
      
      if (!roomRow) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Room not found' } },
          { status: 404 }
        );
      }
      
      room = mapRoom(roomRow);
    }

    // If room not found
    if (!room) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Room not found' } },
        { status: 404 }
      );
    }

    // If no guest, return room only
    if (!room.currentGuestId && !room.current_guest_id) {
      return NextResponse.json({
        room: {
          id: room.id,
          roomNumber: room.room_number || room.roomNumber,
          floor: room.floor,
          type: room.type,
          status: room.status,
          currentGuestId: room.current_guest_id || room.currentGuestId || null,
        },
        guest: null,
        charges: [],
        serviceRequests: [],
      });
    }

    const guestId = room.current_guest_id || room.currentGuestId;

    // Fetch guest details from local database (guests are not in Salesforce)
    const db = getDatabase();
    const guestRow = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(guestId) as UserRow | undefined;

    if (!guestRow) {
      return NextResponse.json({
        room: {
          id: room.id,
          roomNumber: room.room_number || room.roomNumber,
          floor: room.floor,
          type: room.type,
          status: room.status,
          currentGuestId: guestId,
        },
        guest: null,
        charges: [],
        serviceRequests: [],
      });
    }

    const guest = mapUser(guestRow);

    // Fetch charges and service requests
    let charges: any[] = [];
    let serviceRequests: any[] = [];
    let salesforceChargesFailed = false;
    let salesforceRequestsFailed = false;

    if (isSalesforceEnabled()) {
      // Try to fetch charges from Salesforce
      try {
        const client = getSalesforceClient();
        charges = await client.searchCharges({ guest_id: guest.id });
      } catch (error) {
        salesforceChargesFailed = true;
        console.warn('Failed to fetch charges from Salesforce, falling back to local data:', error);
      }

      // Fallback to local database for charges
      if (salesforceChargesFailed) {
        const chargeRows = db
          .prepare('SELECT * FROM charges WHERE guest_id = ? ORDER BY date DESC')
          .all(guest.id) as ChargeRow[];
        charges = chargeRows.map(mapCharge);
      }

      // Try to fetch service requests from Salesforce
      try {
        const client = getSalesforceClient();
        serviceRequests = await client.searchServiceRequests({ guest_id: guest.id });
      } catch (error) {
        salesforceRequestsFailed = true;
        console.warn('Failed to fetch service requests from Salesforce, falling back to local data:', error);
      }

      // Fallback to local database for service requests
      if (salesforceRequestsFailed) {
        const serviceRequestRows = db
          .prepare('SELECT * FROM service_requests WHERE guest_id = ? ORDER BY created_at DESC')
          .all(guest.id) as ServiceRequestRow[];
        serviceRequests = serviceRequestRows.map(mapServiceRequest);
      }
    } else {
      // Use local database (legacy behavior)
      const chargeRows = db
        .prepare('SELECT * FROM charges WHERE guest_id = ? ORDER BY date DESC')
        .all(guest.id) as ChargeRow[];
      charges = chargeRows.map(mapCharge);

      const serviceRequestRows = db
        .prepare('SELECT * FROM service_requests WHERE guest_id = ? ORDER BY created_at DESC')
        .all(guest.id) as ServiceRequestRow[];
      serviceRequests = serviceRequestRows.map(mapServiceRequest);
    }

    return NextResponse.json({
      room: {
        id: room.id,
        roomNumber: room.room_number || room.roomNumber,
        floor: room.floor,
        type: room.type,
        status: room.status,
        currentGuestId: guestId,
      },
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
