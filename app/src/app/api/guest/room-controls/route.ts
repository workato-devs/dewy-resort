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
import { secureFetch } from '@/lib/fetch-utils';

/**
 * Create headers for Home Assistant API calls with guest context
 * These custom headers are used by Workato API wrappers but ignored by Home Assistant
 */
function createHomeAssistantHeaders(token: string, guestContext?: { name: string; email: string; roomNumber: string }) {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  // Add custom headers for Workato (ignored by Home Assistant)
  if (guestContext) {
    headers['X-Guest-Name'] = guestContext.name;
    headers['X-Guest-Email'] = guestContext.email;
    headers['X-Guest-Room'] = guestContext.roomNumber;
  }
  
  return headers;
}

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
    
    let devices = deviceRows.map(mapRoomDevice);
    
    // If Home Assistant is available, fetch current effect states for Govee devices
    const homeAssistantUrl = process.env.HOME_ASSISTANT_URL;
    const homeAssistantToken = process.env.HOME_ASSISTANT_TOKEN;
    const homeAssistantAvailable = homeAssistantUrl && homeAssistantToken && process.env.ENABLE_HOME_ASSISTANT !== 'false';
    
    if (homeAssistantAvailable) {
      // Fetch effect states for Govee devices
      devices = await Promise.all(devices.map(async (device) => {
        if (device.type === 'light' && device.homeAssistantEntityId) {
          try {
            const selectEntityId = device.homeAssistantEntityId.replace('light.', 'select.') + '_music';
            const effectResponse = await secureFetch(`${homeAssistantUrl}/api/states/${selectEntityId}`, {
              headers: {
                'Authorization': `Bearer ${homeAssistantToken}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (effectResponse.ok) {
              const effectData = await effectResponse.json();
              const currentState = typeof device.state === 'string' ? JSON.parse(device.state) : device.state;
              const updatedState = {
                ...currentState,
                effect: effectData.state,
                effect_list: effectData.attributes?.options || [],
              };
              return {
                ...device,
                state: JSON.stringify(updatedState),
              };
            }
          } catch (error) {
            // Ignore errors, just return device as-is
          }
        }
        return device;
      }));
    }

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

    // Get user and verify role (include name and email for Workato headers)
    const user = executeQueryOne<{ 
      id: string; 
      role: string; 
      room_number: string | null;
      name: string;
      email: string;
    }>(
      'SELECT id, role, room_number, name, email FROM users WHERE id = ?',
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
    let usedFallback = false;

    if (shouldUseMock) {
      // Mock mode: simulate device control
      newState = simulateDeviceControl(device, command, value);
      usedFallback = true;
    } else {
      // Real mode: call Home Assistant API directly
      try {
        const homeAssistantUrl = process.env.HOME_ASSISTANT_URL;
        const homeAssistantToken = process.env.HOME_ASSISTANT_TOKEN;
        
        if (!homeAssistantUrl || !homeAssistantToken) {
          throw new Error('Home Assistant not configured');
        }

        // Create guest context for Workato headers
        const guestContext = {
          name: user.name,
          email: user.email,
          roomNumber: user.room_number,
        };

        // Determine the domain from entity ID (e.g., "light" from "light.h6022")
        const domain = device.homeAssistantEntityId?.split('.')[0] || 'light';
        
        // Map command to Home Assistant service
        const serviceMap: Record<string, string> = {
          'turn_on': 'turn_on',
          'turn_off': 'turn_off',
          'toggle': 'toggle',
          'set_brightness': 'turn_on',
          'set_color': 'turn_on',
          'set_effect': 'turn_on',
          'set_temperature': 'set_temperature',
          'set_hvac_mode': 'set_hvac_mode',
          'open_cover': 'open_cover',
          'close_cover': 'close_cover',
          'set_cover_position': 'set_cover_position',
        };
        
        const service = serviceMap[command] || command;
        
        // Prepare service data
        let serviceData: any = {
          entity_id: device.homeAssistantEntityId,
        };
        
        // Add command-specific data
        if (command === 'set_brightness' && value !== undefined) {
          serviceData.brightness = value;
        } else if (command === 'set_color' && value !== undefined) {
          // Color command expects hs_color or rgb_color
          if (value.hs_color) {
            serviceData.hs_color = value.hs_color;
          } else if (value.rgb_color) {
            serviceData.rgb_color = value.rgb_color;
          }
        } else if (command === 'set_effect' && value !== undefined) {
          // Effect command - use select.select_option service for Govee music modes
          if (value.effect) {
            // For Govee devices, use the select entity
            const selectEntityId = device.homeAssistantEntityId?.replace('light.', 'select.') + '_music';
            
            const effectResponse = await secureFetch(`${homeAssistantUrl}/api/services/select/select_option`, {
              method: 'POST',
              headers: createHomeAssistantHeaders(homeAssistantToken, guestContext),
              body: JSON.stringify({
                entity_id: selectEntityId,
                option: value.effect,
              }),
            });

            if (!effectResponse.ok) {
              const errorText = await effectResponse.text();
              console.error(`Effect API error: ${errorText}`);
            }
            
            // Fetch the effect state from the select entity
            const effectStateResponse = await secureFetch(`${homeAssistantUrl}/api/states/${selectEntityId}`, {
              headers: createHomeAssistantHeaders(homeAssistantToken, guestContext),
            });
            
            if (effectStateResponse.ok) {
              const effectStateData = await effectStateResponse.json();
              serviceData.effect = effectStateData.state;
            }
          }
        } else if (command === 'set_temperature' && value !== undefined) {
          serviceData.temperature = value;
        } else if (command === 'set_hvac_mode' && value !== undefined) {
          serviceData.hvac_mode = value;
        } else if (value !== undefined) {
          serviceData.value = value;
        }

        const haResponse = await secureFetch(`${homeAssistantUrl}/api/services/${domain}/${service}`, {
          method: 'POST',
          headers: createHomeAssistantHeaders(homeAssistantToken, guestContext),
          body: JSON.stringify(serviceData),
        });

        if (!haResponse.ok) {
          const errorText = await haResponse.text();
          throw new Error(`Home Assistant API returned ${haResponse.status}: ${errorText}`);
        }

        // Fetch updated state
        const stateResponse = await secureFetch(`${homeAssistantUrl}/api/states/${device.homeAssistantEntityId}`, {
          headers: createHomeAssistantHeaders(homeAssistantToken, guestContext),
        });

        if (stateResponse.ok) {
          const stateData = await stateResponse.json();
          newState = {
            state: stateData.state,
            ...stateData.attributes,
          };
          
          // For light devices, also fetch effect state from select entity if it exists
          if (domain === 'light' && device.homeAssistantEntityId) {
            try {
              const selectEntityId = device.homeAssistantEntityId.replace('light.', 'select.') + '_music';
              const effectStateResponse = await secureFetch(`${homeAssistantUrl}/api/states/${selectEntityId}`, {
                headers: createHomeAssistantHeaders(homeAssistantToken, guestContext),
              });
              
              if (effectStateResponse.ok) {
                const effectStateData = await effectStateResponse.json();
                newState.effect = effectStateData.state;
                newState.effect_list = effectStateData.attributes?.options || [];
              }
            } catch (error) {
              // Ignore errors fetching effect state
            }
          }
        } else {
          // If we can't get the state, use the command to predict it
          newState = simulateDeviceControl(device, command, value);
        }
      } catch (error) {
        console.error('Home Assistant API error, falling back to mock mode:', error);
        newState = simulateDeviceControl(device, command, value);
        usedFallback = true;
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
      usedFallback,
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
          brightness: value?.brightness || currentState.brightness || 255,
          rgb_color: currentState.rgb_color,
          hs_color: currentState.hs_color,
          supported_color_modes: currentState.supported_color_modes,
          supported_features: currentState.supported_features,
          effect_list: currentState.effect_list,
        };
      } else if (command === 'turn_off') {
        return { 
          state: 'off',
          on: false,
          brightness: currentState.brightness || 255,
          rgb_color: currentState.rgb_color,
          hs_color: currentState.hs_color,
          supported_color_modes: currentState.supported_color_modes,
          supported_features: currentState.supported_features,
          effect_list: currentState.effect_list,
        };
      } else if (command === 'set_brightness') {
        return { 
          ...currentState,
          state: 'on',
          on: true,
          brightness: value || 255,
        };
      } else if (command === 'set_color') {
        // Convert hs_color to approximate rgb_color for display
        let rgb_color = currentState.rgb_color || [255, 255, 255];
        let hs_color = currentState.hs_color || [0, 0];
        
        if (value?.hs_color) {
          hs_color = value.hs_color;
          // Simple HS to RGB conversion for demo
          const h = value.hs_color[0];
          const s = value.hs_color[1] / 100;
          const v = 1; // Full brightness for color
          
          const c = v * s;
          const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
          const m = v - c;
          
          let r = 0, g = 0, b = 0;
          if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
          else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
          else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
          else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
          else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
          else { r = c; g = 0; b = x; }
          
          rgb_color = [
            Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255)
          ];
        } else if (value?.rgb_color) {
          rgb_color = value.rgb_color;
        }
        
        return { 
          ...currentState,
          state: 'on',
          on: true,
          rgb_color,
          hs_color,
          effect: null, // Clear effect when setting color
        };
      } else if (command === 'set_effect') {
        return {
          ...currentState,
          state: 'on',
          on: true,
          effect: value?.effect || null,
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
      } else if (command === 'set_hvac_mode' || command === 'set_mode') {
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
