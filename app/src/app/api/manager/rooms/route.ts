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
    const { searchParams } = new URL(request.url);
    let rooms: any[] = [];
    let salesforceRoomsFailed = false;
    
    if (isSalesforceEnabled()) {
      // Try to fetch from Salesforce via SalesforceClient
      try {
        const client = getSalesforceClient();
        
        // Build search criteria from query parameters
        const statusParam = searchParams.get('status');
        const floorParam = searchParams.get('floor');
        const typeParam = searchParams.get('type');
        
        // MIGRATION: The API requires at least one filter parameter
        // If no filters provided, fetch all rooms by making separate calls for each status
        if (!statusParam && !floorParam && !typeParam) {
          // Make multiple calls and combine results (API doesn't support OR queries)
          const statuses: Array<'vacant' | 'occupied' | 'cleaning' | 'maintenance'> = [
            'vacant',
            'occupied', 
            'cleaning',
            'maintenance'
          ];
          
          const roomPromises = statuses.map(status => 
            client.searchRooms({ status })
          );
          
          const roomResults = await Promise.all(roomPromises);
          rooms = roomResults.flat();
        } else {
          // Use provided filters
          const criteria: any = {};
          if (statusParam) criteria.status = statusParam;
          if (floorParam) criteria.floor = parseInt(floorParam);
          if (typeParam) criteria.type = typeParam;
          
          rooms = await client.searchRooms(criteria);
        }
      } catch (error) {
        salesforceRoomsFailed = true;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Failed to fetch rooms from Salesforce, falling back to local data:', error);
      }
      
      // Fallback to local database ONLY if Salesforce API failed (not if it returned empty results)
      if (salesforceRoomsFailed) {
        const db = getDatabase();
        const roomRows = db.prepare('SELECT * FROM rooms ORDER BY room_number').all() as RoomRow[];
        rooms = roomRows.map(mapRoom);
        
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
        
        // Add guest information to rooms
        rooms = rooms.map(room => ({
          ...room,
          guest: room.currentGuestId ? guestsMap.get(room.currentGuestId) : null,
        }));
      }
      
      // Note: Devices are always fetched from local database (managed via Home Assistant)
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
