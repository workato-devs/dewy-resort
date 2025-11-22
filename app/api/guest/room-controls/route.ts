/**
 * Guest Room Controls API
 * Handles fetching device states and sending control commands
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQueryOne, executeQuery } from '@/lib/db/client';
import { mapRoomDevice } from '@/lib/db/mappers';
import { RoomDeviceRow } from '@/types';
import { AuthenticationError, AuthorizationError, NotFoundError } from '@/lib/errors';
import { createErrorResponse } from '@/lib/errors/api-response';

/**
 * GET /api/guest/room-controls
 * Fetch all device states for the guest's room
 */
export async function GET(request: NextRequest) {
  try {
    // Get session from cookie
    const sessionId = request.cookies.get('hotel_session')?.value;
    
    if (!sessionId) {
      throw new AuthenticationError('Not authenticated');
    }

    // Get user from session
    const session = executeQueryOne<{ user_id: string }>(
      "SELECT user_id FROM sessions WHERE id = ? AND expires_at > datetime('now')",
      [sessionId]
    );
    
    if (!session) {
      throw new AuthenticationError('Invalid or expired session');
    }

    // Get user and verify role
    const user = executeQueryOne<{ id: string; role: string; room_number: string | null }>(
      'SELECT id, role, room_number FROM users WHERE id = ?',
      [session.user_id]
    );
    
    if (!user || user.role !== 'guest') {
      throw new AuthorizationError('Access denied');
    }

    if (!user.room_number) {
      throw new NotFoundError('No room assigned to guest');
    }

    // Get room ID from room number
    const room = executeQueryOne<{ id: string }>(
      'SELECT id FROM rooms WHERE room_number = ?',
      [user.room_number]
    );
    
    if (!room) {
      throw new NotFoundError('Room not found');
    }

    // Get all devices for the room
    const deviceRows = executeQuery<RoomDeviceRow>(
      'SELECT * FROM room_devices WHERE room_id = ?',
      [room.id]
    );
    
    const devices = deviceRows.map(mapRoomDevice);

    // Check if Home Assistant is available globally
    const homeAssistantAvailable = process.env.HOME_ASSISTANT_URL && process.env.ENABLE_HOME_ASSISTANT !== 'false';
    
    // Overall demo mode is true if HA is unavailable OR if all devices are set to mock
    const allDevicesMock = devices.every(d => d.useMock);
    const demoMode = !homeAssistantAvailable || allDevicesMock;

    return NextResponse.json({
      devices,
      demoMode,
      homeAssistantAvailable,
      roomNumber: user.room_number,
    });
  } catch (error) {
    return createErrorResponse(error, 'GET /api/guest/room-controls');
  }
}

/**
 * POST /api/guest/room-controls
 * Send control command to a device
 */
export async function POST(request: NextRequest) {
  try {
    // Get session from cookie
    const sessionId = request.cookies.get('hotel_session')?.value;
    
    if (!sessionId) {
      throw new AuthenticationError('Not authenticated');
    }

    // Get user from session
    const session = executeQueryOne<{ user_id: string }>(
      "SELECT user_id FROM sessions WHERE id = ? AND expires_at > datetime('now')",
      [sessionId]
    );
    
    if (!session) {
      throw new AuthenticationError('Invalid or expired session');
    }

    // Get user and verify role
    const user = executeQueryOne<{ id: string; role: string; room_number: string | null }>(
      'SELECT id, role, room_number FROM users WHERE id = ?',
      [session.user_id]
    );
    
    if (!user || user.role !== 'guest') {
      throw new AuthorizationError('Access denied');
    }

    if (!user.room_number) {
      throw new NotFoundError('No room assigned to guest');
    }

    // Parse request body
    const body = await request.json();
    const { deviceId, command, value } = body;

    if (!deviceId || !command) {
      throw new AuthenticationError('Device ID and command are required');
    }

    // Get room ID from room number
    const room = executeQueryOne<{ id: string }>(
      'SELECT id FROM rooms WHERE room_number = ?',
      [user.room_number]
    );
    
    if (!room) {
      throw new NotFoundError('Room not found');
    }

    // Verify device belongs to user's room
    const deviceRow = executeQueryOne<RoomDeviceRow>(
      'SELECT * FROM room_devices WHERE id = ? AND room_id = ?',
      [deviceId, room.id]
    );
    
    if (!deviceRow) {
      throw new NotFoundError('Device not found in your room');
    }

    const device = mapRoomDevice(deviceRow);

    // Check if Home Assistant is available globally
    const homeAssistantAvailable = process.env.HOME_ASSISTANT_URL && process.env.ENABLE_HOME_ASSISTANT !== 'false';
    
    // Determine if this specific device should use mock mode
    const shouldUseMock = device.useMock || !homeAssistantAvailable;

    let newState: any;

    if (shouldUseMock) {
      // Mock mode: simulate device control
      newState = simulateDeviceControl(device, command, value);
    } else {
      // Real mode: call Home Assistant API
      try {
        const haResponse = await fetch(`${process.env.HOME_ASSISTANT_URL}/api/home-assistant/control`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            entityId: device.homeAssistantEntityId,
            service: command,
            data: value ? { value } : undefined,
          }),
        });

        if (!haResponse.ok) {
          throw new Error('Home Assistant API error');
        }

        const haData = await haResponse.json();
        newState = haData.state;
      } catch (error) {
        console.error('Home Assistant API error, falling back to mock mode:', error);
        newState = simulateDeviceControl(device, command, value);
      }
    }

    // Update device state in database
    const { executeUpdate } = require('@/lib/db/client');
    const stateString = typeof newState === 'string' ? newState : JSON.stringify(newState);
    executeUpdate('UPDATE room_devices SET state = ? WHERE id = ?', [stateString, deviceId]);

    // Fetch updated device
    const updatedDeviceRow = executeQueryOne<RoomDeviceRow>(
      'SELECT * FROM room_devices WHERE id = ?',
      [deviceId]
    );
    
    if (!updatedDeviceRow) {
      throw new NotFoundError('Device not found after update');
    }

    const updatedDevice = mapRoomDevice(updatedDeviceRow);

    return NextResponse.json({
      success: true,
      device: updatedDevice,
      demoMode: shouldUseMock,
    });
  } catch (error) {
    return createErrorResponse(error, 'POST /api/guest/room-controls');
  }
}

/**
 * Simulate device control in demo mode
 */
function simulateDeviceControl(device: any, command: string, value?: any): any {
  const currentState = typeof device.state === 'string' ? JSON.parse(device.state) : device.state;

  switch (device.type) {
    case 'light':
      if (command === 'turn_on') {
        return { 
          state: 'on', 
          on: true,
          brightness: value?.brightness || currentState.brightness || 100 
        };
      } else if (command === 'turn_off') {
        return { 
          state: 'off',
          on: false,
          brightness: currentState.brightness || 100
        };
      } else if (command === 'set_brightness') {
        return { 
          ...currentState,
          state: 'on',
          on: true,
          brightness: value || 100 
        };
      }
      break;

    case 'thermostat':
      if (command === 'set_temperature') {
        return { 
          ...currentState, 
          temperature: value || currentState.temperature,
          target: value || currentState.temperature,
          current_temperature: (value || currentState.temperature) - 1
        };
      } else if (command === 'set_mode') {
        return { ...currentState, mode: value || currentState.mode };
      }
      break;

    case 'blinds':
      if (command === 'open') {
        return { ...currentState, position: 100 };
      } else if (command === 'close') {
        return { ...currentState, position: 0 };
      } else if (command === 'set_position') {
        return { ...currentState, position: value || 50 };
      }
      break;
  }

  return currentState;
}
