/**
 * Manager Room Management API
 * GET /api/manager/rooms - List all rooms with guest and device information
 */

import { NextRequest, NextResponse } from 'next/server';
import { isSalesforceEnabled } from '@/lib/workato/feature-flags';
import { getSalesforceClient } from '@/lib/workato/config';
import { getDatabase } from '@/lib/db/client';
import { mapRoom, mapUser, mapRoomDevice } from '@/lib/db/mappers';
import { RoomRow, UserRow, RoomDeviceRow } from '@/types';

export async function GET(request: NextRequest) {
  try {
    if (isSalesforceEnabled()) {
      // Use Salesforce via Workato
      const client = getSalesforceClient();
      const { searchParams } = new URL(request.url);
      
      // Build search criteria from query parameters
      const criteria: any = {};
      if (searchParams.get('status')) criteria.status = searchParams.get('status');
      if (searchParams.get('floor')) criteria.floor = parseInt(searchParams.get('floor')!);
      if (searchParams.get('type')) criteria.type = searchParams.get('type');
      
      const rooms = await client.searchRooms(criteria);
      
      // Note: Salesforce rooms don't include device information
      // Devices are still managed locally via Home Assistant
      const db = getDatabase();
      const deviceRows = db.prepare('SELECT * FROM room_devices').all() as RoomDeviceRow[];
      const devicesMap = new Map<string, any[]>();
      
      deviceRows.forEach(row => {
        const device = mapRoomDevice(row);
        if (!devicesMap.has(device.roomId)) {
          devicesMap.set(device.roomId, []);
        }
        devicesMap.get(device.roomId)!.push(device);
      });
      
      const roomsWithDetails = rooms.map((room: any) => ({
        ...room,
        devices: devicesMap.get(room.id) || [],
      }));
      
      return NextResponse.json({ rooms: roomsWithDetails });
    } else {
      // Use local database (legacy behavior)
      const db = getDatabase();

      // Fetch all rooms
      const roomRows = db.prepare('SELECT * FROM rooms ORDER BY room_number').all() as RoomRow[];
      const rooms = roomRows.map(mapRoom);

      // Fetch all guests for occupied rooms
      const guestIds = rooms
        .filter(room => room.currentGuestId)
        .map(room => room.currentGuestId);

      let guestsMap = new Map();
      if (guestIds.length > 0) {
        const placeholders = guestIds.map(() => '?').join(',');
        const guestRows = db
          .prepare(`SELECT * FROM users WHERE id IN (${placeholders})`)
          .all(...guestIds) as UserRow[];
        
        guestRows.forEach(row => {
          guestsMap.set(row.id, mapUser(row));
        });
      }

      // Fetch all room devices
      const deviceRows = db.prepare('SELECT * FROM room_devices').all() as RoomDeviceRow[];
      const devicesMap = new Map<string, any[]>();
      
      deviceRows.forEach(row => {
        const device = mapRoomDevice(row);
        if (!devicesMap.has(device.roomId)) {
          devicesMap.set(device.roomId, []);
        }
        devicesMap.get(device.roomId)!.push(device);
      });

      // Combine data
      const roomsWithDetails = rooms.map(room => ({
        ...room,
        guest: room.currentGuestId ? guestsMap.get(room.currentGuestId) : null,
        devices: devicesMap.get(room.id) || [],
      }));

      return NextResponse.json({ rooms: roomsWithDetails });
    }
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch rooms' } },
      { status: 500 }
    );
  }
}
