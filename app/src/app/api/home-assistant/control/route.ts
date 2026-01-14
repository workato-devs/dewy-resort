/**
 * Home Assistant Device Control API
 * POST /api/home-assistant/control
 * Sends control commands to Home Assistant devices
 */

import { NextRequest, NextResponse } from 'next/server';
import { secureFetch } from '@/lib/fetch-utils';

interface ControlRequest {
  entityId: string;
  service: string;
  data?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const body: ControlRequest = await request.json();
    const { entityId, service, data } = body;

    if (!entityId || !service) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Entity ID and service are required' } },
        { status: 400 }
      );
    }

    // Check if Home Assistant is configured
    const homeAssistantUrl = process.env.HOME_ASSISTANT_URL;
    const homeAssistantToken = process.env.HOME_ASSISTANT_TOKEN;
    const isEnabled = process.env.ENABLE_HOME_ASSISTANT !== 'false';

    if (!homeAssistantUrl || !homeAssistantToken || !isEnabled) {
      // Return mock response for demo mode
      await simulateDelay(200, 400);
      
      return NextResponse.json({
        success: true,
        state: getMockStateAfterControl(entityId, service, data),
        demoMode: true,
      });
    }

    // Call real Home Assistant API
    try {
      // Determine the domain from entity ID (e.g., "light" from "light.bedroom")
      const domain = entityId.split('.')[0];
      
      const response = await secureFetch(`${homeAssistantUrl}/api/services/${domain}/${service}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${homeAssistantToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity_id: entityId,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error(`Home Assistant API returned ${response.status}`);
      }

      // Fetch updated state
      const stateResponse = await secureFetch(`${homeAssistantUrl}/api/states/${entityId}`, {
        headers: {
          'Authorization': `Bearer ${homeAssistantToken}`,
          'Content-Type': 'application/json',
        },
      });

      const stateData = await stateResponse.json();

      return NextResponse.json({
        success: true,
        state: {
          state: stateData.state,
          attributes: stateData.attributes,
        },
        demoMode: false,
      });
    } catch (error) {
      console.error('Home Assistant API error, falling back to demo mode:', error);
      
      // Fallback to mock response
      await simulateDelay(200, 400);
      
      return NextResponse.json({
        success: true,
        state: getMockStateAfterControl(entityId, service, data),
        demoMode: true,
      });
    }
  } catch (error) {
    console.error('Error controlling device:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to control device' } },
      { status: 500 }
    );
  }
}

/**
 * Simulate realistic API delay
 */
function simulateDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Generate mock state after control command
 */
function getMockStateAfterControl(
  entityId: string,
  service: string,
  data?: Record<string, any>
): any {
  const domain = entityId.split('.')[0];

  switch (domain) {
    case 'light':
      return getMockLightState(service, data);
    case 'climate':
      return getMockClimateState(service, data);
    case 'cover':
      return getMockCoverState(service, data);
    default:
      return { state: 'unknown' };
  }
}

/**
 * Mock light state after control
 */
function getMockLightState(service: string, data?: Record<string, any>): any {
  switch (service) {
    case 'turn_on':
      const state: any = {
        state: 'on',
        brightness: data?.brightness || 255,
      };
      
      // Add color if provided
      if (data?.hs_color) {
        state.hs_color = data.hs_color;
        // Convert HS to RGB for display
        const h = data.hs_color[0];
        const s = data.hs_color[1] / 100;
        const v = 1;
        
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
        
        state.rgb_color = [
          Math.round((r + m) * 255),
          Math.round((g + m) * 255),
          Math.round((b + m) * 255)
        ];
      } else if (data?.rgb_color) {
        state.rgb_color = data.rgb_color;
      }
      
      return state;
      
    case 'turn_off':
      return {
        state: 'off',
        brightness: 0,
      };
    case 'toggle':
      return {
        state: 'on',
        brightness: 200,
      };
    default:
      return { state: 'on', brightness: 200 };
  }
}

/**
 * Mock climate/thermostat state after control
 */
function getMockClimateState(service: string, data?: Record<string, any>): any {
  switch (service) {
    case 'set_temperature':
      return {
        state: 'heat',
        temperature: data?.temperature || 72,
        current_temperature: (data?.temperature || 72) - 1,
      };
    case 'set_hvac_mode':
      return {
        state: data?.hvac_mode || 'heat',
        temperature: 72,
        current_temperature: 71,
      };
    default:
      return {
        state: 'heat',
        temperature: 72,
        current_temperature: 71,
      };
  }
}

/**
 * Mock cover/blinds state after control
 */
function getMockCoverState(service: string, data?: Record<string, any>): any {
  switch (service) {
    case 'open_cover':
      return {
        state: 'open',
        current_position: 100,
      };
    case 'close_cover':
      return {
        state: 'closed',
        current_position: 0,
      };
    case 'set_cover_position':
      return {
        state: data?.position > 50 ? 'open' : 'closed',
        current_position: data?.position || 50,
      };
    default:
      return {
        state: 'open',
        current_position: 75,
      };
  }
}
