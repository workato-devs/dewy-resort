/**
 * Home Assistant Device Control API
 * POST /api/home-assistant/control
 * Sends control commands to Home Assistant devices
 */

import { NextRequest, NextResponse } from 'next/server';

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
      
      const response = await fetch(`${homeAssistantUrl}/api/services/${domain}/${service}`, {
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
      const stateResponse = await fetch(`${homeAssistantUrl}/api/states/${entityId}`, {
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
      return {
        state: 'on',
        brightness: data?.brightness || 255,
      };
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
