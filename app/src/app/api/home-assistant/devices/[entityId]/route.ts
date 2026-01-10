/**
 * Home Assistant Device State API
 * GET /api/home-assistant/devices/:entityId
 * Fetches the current state of a Home Assistant device
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { entityId: string } }
) {
  try {
    const { entityId } = params;

    if (!entityId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Entity ID is required' } },
        { status: 400 }
      );
    }

    // Check if Home Assistant is configured
    const homeAssistantUrl = process.env.HOME_ASSISTANT_URL;
    const homeAssistantToken = process.env.HOME_ASSISTANT_TOKEN;
    const isEnabled = process.env.ENABLE_HOME_ASSISTANT !== 'false';

    if (!homeAssistantUrl || !homeAssistantToken || !isEnabled) {
      // Return mock response for demo mode
      return NextResponse.json({
        entity_id: entityId,
        state: getMockDeviceState(entityId),
        attributes: getMockDeviceAttributes(entityId),
        demoMode: true,
      });
    }

    // Call real Home Assistant API
    try {
      const response = await fetch(`${homeAssistantUrl}/api/states/${entityId}`, {
        headers: {
          'Authorization': `Bearer ${homeAssistantToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Home Assistant API returned ${response.status}`);
      }

      const data = await response.json();

      return NextResponse.json({
        entity_id: data.entity_id,
        state: data.state,
        attributes: data.attributes,
        demoMode: false,
      });
    } catch (error) {
      console.error('Home Assistant API error, falling back to demo mode:', error);
      
      // Fallback to mock response
      return NextResponse.json({
        entity_id: entityId,
        state: getMockDeviceState(entityId),
        attributes: getMockDeviceAttributes(entityId),
        demoMode: true,
      });
    }
  } catch (error) {
    console.error('Error fetching device state:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch device state' } },
      { status: 500 }
    );
  }
}

/**
 * Generate mock device state based on entity ID
 */
function getMockDeviceState(entityId: string): string {
  if (entityId.startsWith('light.')) {
    return 'on';
  } else if (entityId.startsWith('climate.')) {
    return 'heat';
  } else if (entityId.startsWith('cover.')) {
    return 'open';
  }
  return 'unknown';
}

/**
 * Generate mock device attributes based on entity ID
 */
function getMockDeviceAttributes(entityId: string): Record<string, any> {
  if (entityId.startsWith('light.')) {
    return {
      brightness: 200,
      friendly_name: entityId.replace('light.', '').replace(/_/g, ' '),
      supported_features: 1,
    };
  } else if (entityId.startsWith('climate.')) {
    return {
      temperature: 72,
      current_temperature: 71,
      hvac_mode: 'heat',
      hvac_modes: ['off', 'heat', 'cool', 'auto'],
      friendly_name: entityId.replace('climate.', '').replace(/_/g, ' '),
    };
  } else if (entityId.startsWith('cover.')) {
    return {
      current_position: 75,
      friendly_name: entityId.replace('cover.', '').replace(/_/g, ' '),
    };
  }
  return {};
}
