/**
 * Guest Chat Intent Handlers
 * Pattern-matching AI logic for Dewy chatbot
 */

import { User } from '@/types';
import { 
  executeQuery, 
  executeQueryOne, 
  executeUpdate, 
  generateId 
} from '@/lib/db/client';
import { 
  mapServiceRequest, 
  mapCharge, 
  mapRoomDevice 
} from '@/lib/db/mappers';
import {
  ServiceRequestRow,
  ChargeRow,
  RoomDeviceRow,
  RoomRow,
} from '@/types';

export interface ChatIntent {
  pattern: RegExp;
  handler: (message: string, user: User) => Promise<ChatResponse>;
  description: string;
}

export interface ChatResponse {
  content: string;
  metadata?: any;
  action?: string;
}

/**
 * Intent: Request housekeeping service
 */
async function handleHousekeepingRequest(message: string, user: User): Promise<ChatResponse> {
  if (!user.roomNumber) {
    return {
      content: "I'm sorry, but I couldn't find your room assignment. Please contact the front desk for assistance.",
    };
  }

  try {
    // Create service request
    const requestId = generateId();
    const query = `
      INSERT INTO service_requests (id, guest_id, room_number, type, priority, description, status, created_at)
      VALUES (?, ?, ?, 'housekeeping', 'medium', ?, 'pending', datetime('now'))
    `;
    
    const description = `Housekeeping requested via Dewy: ${message}`;
    executeUpdate(query, [requestId, user.id, user.roomNumber, description]);

    // Mock Salesforce ticket creation
    const salesforceTicketId = `SF-${Date.now()}`;
    const updateQuery = `
      UPDATE service_requests 
      SET salesforce_ticket_id = ? 
      WHERE id = ?
    `;
    executeUpdate(updateQuery, [salesforceTicketId, requestId]);

    return {
      content: `I've submitted your housekeeping request for room ${user.roomNumber}. Our team will be with you shortly! Your request ID is ${requestId.substring(0, 8)}.`,
      metadata: { requestId, type: 'housekeeping' },
      action: 'service_request_created',
    };
  } catch (error) {
    console.error('Error creating housekeeping request:', error);
    return {
      content: "I'm sorry, I encountered an error while submitting your housekeeping request. Please try again or contact the front desk.",
    };
  }
}

/**
 * Intent: Request room service
 */
async function handleRoomServiceRequest(message: string, user: User): Promise<ChatResponse> {
  if (!user.roomNumber) {
    return {
      content: "I'm sorry, but I couldn't find your room assignment. Please contact the front desk for assistance.",
    };
  }

  try {
    const requestId = generateId();
    const query = `
      INSERT INTO service_requests (id, guest_id, room_number, type, priority, description, status, created_at)
      VALUES (?, ?, ?, 'room_service', 'medium', ?, 'pending', datetime('now'))
    `;
    
    const description = `Room service requested via Dewy: ${message}`;
    executeUpdate(query, [requestId, user.id, user.roomNumber, description]);

    const salesforceTicketId = `SF-${Date.now()}`;
    const updateQuery = `
      UPDATE service_requests 
      SET salesforce_ticket_id = ? 
      WHERE id = ?
    `;
    executeUpdate(updateQuery, [salesforceTicketId, requestId]);

    return {
      content: `I've placed your room service order for room ${user.roomNumber}. It should arrive within 30-45 minutes. Your order ID is ${requestId.substring(0, 8)}.`,
      metadata: { requestId, type: 'room_service' },
      action: 'service_request_created',
    };
  } catch (error) {
    console.error('Error creating room service request:', error);
    return {
      content: "I'm sorry, I encountered an error while placing your room service order. Please try again or call room service directly.",
    };
  }
}

/**
 * Intent: Request maintenance
 */
async function handleMaintenanceRequest(message: string, user: User): Promise<ChatResponse> {
  if (!user.roomNumber) {
    return {
      content: "I'm sorry, but I couldn't find your room assignment. Please contact the front desk for assistance.",
    };
  }

  try {
    const requestId = generateId();
    const query = `
      INSERT INTO service_requests (id, guest_id, room_number, type, priority, description, status, created_at)
      VALUES (?, ?, ?, 'maintenance', 'high', ?, 'pending', datetime('now'))
    `;
    
    const description = `Maintenance requested via Dewy: ${message}`;
    executeUpdate(query, [requestId, user.id, user.roomNumber, description]);

    const salesforceTicketId = `SF-${Date.now()}`;
    const updateQuery = `
      UPDATE service_requests 
      SET salesforce_ticket_id = ? 
      WHERE id = ?
    `;
    executeUpdate(updateQuery, [salesforceTicketId, requestId]);

    return {
      content: `I've submitted your maintenance request for room ${user.roomNumber}. Our maintenance team will address this as soon as possible. Your request ID is ${requestId.substring(0, 8)}.`,
      metadata: { requestId, type: 'maintenance' },
      action: 'service_request_created',
    };
  } catch (error) {
    console.error('Error creating maintenance request:', error);
    return {
      content: "I'm sorry, I encountered an error while submitting your maintenance request. Please try again or contact the front desk.",
    };
  }
}

/**
 * Intent: Check billing/charges
 */
async function handleBillingInquiry(message: string, user: User): Promise<ChatResponse> {
  try {
    const query = `
      SELECT * FROM charges 
      WHERE guest_id = ? 
      ORDER BY date DESC
    `;
    
    const chargeRows = executeQuery<ChargeRow>(query, [user.id]);
    const charges = chargeRows.map(mapCharge);

    if (charges.length === 0) {
      return {
        content: "You currently have no charges on your account. Enjoy your stay!",
      };
    }

    const total = charges.reduce((sum, charge) => sum + charge.amount, 0);
    const unpaidTotal = charges
      .filter(charge => !charge.paid)
      .reduce((sum, charge) => sum + charge.amount, 0);

    const chargesList = charges
      .slice(0, 5)
      .map(c => `• ${c.description}: $${c.amount.toFixed(2)}${c.paid ? ' (paid)' : ''}`)
      .join('\n');

    return {
      content: `Here's a summary of your charges:\n\n${chargesList}\n\nTotal charges: $${total.toFixed(2)}\nUnpaid balance: $${unpaidTotal.toFixed(2)}\n\nYou can view detailed billing information in the Billing section.`,
      metadata: { total, unpaidTotal, chargeCount: charges.length },
      action: 'billing_info_provided',
    };
  } catch (error) {
    console.error('Error fetching billing info:', error);
    return {
      content: "I'm sorry, I encountered an error while fetching your billing information. Please try the Billing section or contact the front desk.",
    };
  }
}

/**
 * Intent: Check room controls/devices
 */
async function handleRoomControlInquiry(message: string, user: User): Promise<ChatResponse> {
  if (!user.roomNumber) {
    return {
      content: "I'm sorry, but I couldn't find your room assignment.",
    };
  }

  try {
    // Get room ID
    const roomQuery = `SELECT * FROM rooms WHERE room_number = ?`;
    const roomRow = executeQueryOne<RoomRow>(roomQuery, [user.roomNumber]);

    if (!roomRow) {
      return {
        content: "I'm sorry, I couldn't find your room information.",
      };
    }

    // Get room devices
    const devicesQuery = `SELECT * FROM room_devices WHERE room_id = ?`;
    const deviceRows = executeQuery<RoomDeviceRow>(devicesQuery, [roomRow.id]);
    const devices = deviceRows.map(mapRoomDevice);

    if (devices.length === 0) {
      return {
        content: "Your room doesn't have any smart devices configured at the moment.",
      };
    }

    const devicesList = devices
      .map(d => {
        const state = JSON.parse(d.state);
        if (d.type === 'light') {
          return `• ${d.name}: ${state.on ? 'On' : 'Off'}${state.brightness ? ` (${state.brightness}% brightness)` : ''}`;
        } else if (d.type === 'thermostat') {
          return `• ${d.name}: ${state.temperature}°F`;
        }
        return `• ${d.name}: Active`;
      })
      .join('\n');

    return {
      content: `Here's the status of your room controls:\n\n${devicesList}\n\nYou can adjust these settings in the Room Controls section.`,
      metadata: { deviceCount: devices.length },
      action: 'room_controls_info_provided',
    };
  } catch (error) {
    console.error('Error fetching room controls:', error);
    return {
      content: "I'm sorry, I encountered an error while checking your room controls. Please try the Room Controls section.",
    };
  }
}

/**
 * Intent: General greeting
 */
async function handleGreeting(message: string, user: User): Promise<ChatResponse> {
  const greetings = [
    `Hello ${user.name}! I'm Dewy, your AI assistant. How can I help you today?`,
    `Hi ${user.name}! Welcome! What can I do for you?`,
    `Hey there, ${user.name}! I'm here to help. What do you need?`,
  ];

  return {
    content: greetings[Math.floor(Math.random() * greetings.length)],
  };
}

/**
 * Intent: Help/capabilities
 */
async function handleHelp(message: string, user: User): Promise<ChatResponse> {
  return {
    content: `I'm Dewy, your personal hotel assistant! Here's what I can help you with:

• **Housekeeping** - Request cleaning or fresh towels
• **Room Service** - Order food and beverages
• **Maintenance** - Report issues in your room
• **Billing** - Check your current charges
• **Room Controls** - Check the status of lights and temperature
• **General Questions** - Ask me anything about your stay!

Just tell me what you need, and I'll take care of it!`,
  };
}

/**
 * Intent: Checkout inquiry
 */
async function handleCheckoutInquiry(message: string, user: User): Promise<ChatResponse> {
  return {
    content: `To check out, please visit the Billing section where you can review your charges and complete the checkout process. If you need any assistance, I'm here to help or you can contact the front desk.`,
    action: 'checkout_info_provided',
  };
}

/**
 * Intent: Thank you
 */
async function handleThanks(message: string, user: User): Promise<ChatResponse> {
  const responses = [
    "You're very welcome! Let me know if you need anything else.",
    "Happy to help! Enjoy your stay!",
    "My pleasure! I'm here if you need me.",
  ];

  return {
    content: responses[Math.floor(Math.random() * responses.length)],
  };
}

/**
 * Default fallback handler
 */
async function handleUnknownIntent(message: string, user: User): Promise<ChatResponse> {
  return {
    content: `I'm not quite sure how to help with that, but I'm here to assist! I can help you with:

• Requesting housekeeping, room service, or maintenance
• Checking your billing information
• Viewing room control status
• Answering questions about your stay

Could you rephrase your request, or let me know which of these I can help you with?`,
  };
}

/**
 * Guest chat intents with pattern matching
 */
const guestIntents: ChatIntent[] = [
  {
    pattern: /^(hi|hello|hey|good morning|good afternoon|good evening)/i,
    handler: handleGreeting,
    description: 'Greeting',
  },
  {
    pattern: /(help|what can you do|capabilities|assist)/i,
    handler: handleHelp,
    description: 'Help request',
  },
  {
    pattern: /(housekeeping|clean|towels|sheets|tidy)/i,
    handler: handleHousekeepingRequest,
    description: 'Housekeeping request',
  },
  {
    pattern: /(room service|food|order|menu|hungry|eat|drink|beverage)/i,
    handler: handleRoomServiceRequest,
    description: 'Room service request',
  },
  {
    pattern: /(maintenance|repair|broken|fix|not working|issue|problem)/i,
    handler: handleMaintenanceRequest,
    description: 'Maintenance request',
  },
  {
    pattern: /(bill|billing|charges|cost|price|pay|payment)/i,
    handler: handleBillingInquiry,
    description: 'Billing inquiry',
  },
  {
    pattern: /(room control|light|temperature|thermostat|device|smart)/i,
    handler: handleRoomControlInquiry,
    description: 'Room controls inquiry',
  },
  {
    pattern: /(checkout|check out|leaving|departure)/i,
    handler: handleCheckoutInquiry,
    description: 'Checkout inquiry',
  },
  {
    pattern: /(thank|thanks|appreciate)/i,
    handler: handleThanks,
    description: 'Thank you',
  },
];

/**
 * Process guest chat message and return AI response
 */
export async function processGuestChatMessage(
  message: string,
  user: User
): Promise<ChatResponse> {
  // Find matching intent
  for (const intent of guestIntents) {
    if (intent.pattern.test(message)) {
      return await intent.handler(message, user);
    }
  }

  // No matching intent, use fallback
  return await handleUnknownIntent(message, user);
}
