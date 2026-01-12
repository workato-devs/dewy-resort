/**
 * Home Assistant Devices List API
 * GET /api/home-assistant/devices
 * Fetches all available Home Assistant devices
 */

import { NextRequest, NextResponse } from 'next/server';
import { secureFetch } from '@/lib/fetch-utils';

export async function GET(request: NextRequest) {
  try {
    // Check if Home Assistant is configured
    const homeAssistantUrl = process.env.HOME_ASSISTANT_URL;
    const homeAssistantToken = process.env.HOME_ASSISTANT_TOKEN;
    const isEnabled = process.env.HOME_ASSISTANT_ENABLED !== 'false';

    if (!homeAssistantUrl || !homeAssistantToken || !isEnabled) {
      // Return mock response for demo mode
      return NextResponse.json({
        devices: getMockDevices(),
        demoMode: true,
      });
    }

    // Call real Home Assistant API
    try {
      const response = await secureFetch(`${homeAssistantUrl}/api/states`, {
        headers: {
          'Authorization': `Bearer ${homeAssistantToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Home Assistant API returned ${response.status}`);
      }

      const states = await response.json();

      // Filter to only include relevant device types
      const devices = states
        .filter((state: any) => {
          const domain = state.entity_id.split('.')[0];
          return ['light', 'climate', 'cover', 'switch', 'fan'].includes(domain);
        })
        .map((state: any) => ({
          entity_id: state.entity_id,
          state: state.state,
          attributes: state.attributes,
          last_changed: state.last_changed,
          last_updated: state.last_updated,
        }));

      return NextResponse.json({
        devices,
        demoMode: false,
        count: devices.length,
      });
    } catch (error) {
      console.error('Home Assistant API error, falling back to demo mode:', error);
      
      // Fallback to mock response
      return NextResponse.json({
        devices: getMockDevices(),
        demoMode: true,
      });
    }
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch devices' } },
      { status: 500 }
    );
  }
}

/**
 * Generate mock devices for demo mode
 */
function getMockDevices() {
  return [
    {
      entity_id: 'light.living_room',
      state: 'on',
      attributes: {
        brightness: 200,
        friendly_name: 'Living Room Light',
        supported_features: 1,
      },
    },
    {
      entity_id: 'light.bedroom',
      state: 'off',
      attributes: {
        brightness: 0,
        friendly_name: 'Bedroom Light',
        supported_features: 1,
      },
    },
    {
      entity_id: 'climate.thermostat',
      state: 'heat',
      attributes: {
        temperature: 72,
        current_temperature: 71,
        hvac_mode: 'heat',
        hvac_modes: ['off', 'heat', 'cool', 'auto'],
        friendly_name: 'Thermostat',
      },
    },
    {
      entity_id: 'cover.blinds',
      state: 'open',
      attributes: {
        current_position: 75,
        friendly_name: 'Window Blinds',
      },
    },
  ];
}
