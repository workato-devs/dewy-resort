/**
 * Manager Chat Intent Handlers
 * Pattern-matching AI logic for Manager chatbot
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
  mapMaintenanceTask,
  mapRoom,
} from '@/lib/db/mappers';
import {
  ServiceRequestRow,
  MaintenanceTaskRow,
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
 * Intent: Create service request
 */
async function handleCreateServiceRequest(message: string, user: User): Promise<ChatResponse> {
  try {
    // Extract room number from message (simple pattern matching)
    const roomMatch = message.match(/room\s+(\d+)/i);
    const roomNumber = roomMatch ? roomMatch[1] : null;

    if (!roomNumber) {
      return {
        content: "I'd be happy to create a service request! Could you please specify the room number? For example: 'Create a service request for room 101'",
      };
    }

    // Verify room exists and get guest
    const roomQuery = `
      SELECT r.*, u.id as guest_id, u.name as guest_name 
      FROM rooms r
      LEFT JOIN users u ON u.room_number = r.room_number
      WHERE r.room_number = ?
    `;
    const roomData = executeQueryOne<any>(roomQuery, [roomNumber]);

    if (!roomData) {
      return {
        content: `I couldn't find room ${roomNumber}. Please check the room number and try again.`,
      };
    }

    if (!roomData.guest_id) {
      return {
        content: `Room ${roomNumber} is currently vacant. Service requests can only be created for occupied rooms.`,
      };
    }

    // Determine service type from message
    let serviceType = 'concierge';
    let priority = 'medium';
    
    if (/housekeeping|clean/i.test(message)) {
      serviceType = 'housekeeping';
    } else if (/room service|food|meal/i.test(message)) {
      serviceType = 'room_service';
    } else if (/maintenance|repair|fix/i.test(message)) {
      serviceType = 'maintenance';
      priority = 'high';
    }

    // Create service request
    const requestId = generateId();
    const description = `Manager-initiated: ${message}`;
    
    const query = `
      INSERT INTO service_requests (id, guest_id, room_number, type, priority, description, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
    `;
    
    executeUpdate(query, [requestId, roomData.guest_id, roomNumber, serviceType, priority, description]);

    // Mock Salesforce ticket creation
    const salesforceTicketId = `SF-${Date.now()}`;
    const updateQuery = `
      UPDATE service_requests 
      SET salesforce_ticket_id = ? 
      WHERE id = ?
    `;
    executeUpdate(updateQuery, [salesforceTicketId, requestId]);

    return {
      content: `✓ Service request created successfully!\n\n**Details:**\n• Room: ${roomNumber}\n• Guest: ${roomData.guest_name}\n• Type: ${serviceType}\n• Priority: ${priority}\n• Request ID: ${requestId.substring(0, 8)}\n• Salesforce Ticket: ${salesforceTicketId}\n\nThe request has been logged and the team will be notified.`,
      metadata: { requestId, roomNumber, serviceType, salesforceTicketId },
      action: 'service_request_created',
    };
  } catch (error) {
    console.error('Error creating service request:', error);
    return {
      content: "I encountered an error while creating the service request. Please try again or create it manually through the dashboard.",
    };
  }
}

/**
 * Intent: Create maintenance task
 */
async function handleCreateMaintenanceTask(message: string, user: User): Promise<ChatResponse> {
  try {
    // Extract room number from message
    const roomMatch = message.match(/room\s+(\d+)/i);
    const roomNumber = roomMatch ? roomMatch[1] : null;

    if (!roomNumber) {
      return {
        content: "I'd be happy to create a maintenance task! Could you please specify the room number? For example: 'Create maintenance task for room 101 - AC not working'",
      };
    }

    // Verify room exists
    const roomQuery = `SELECT * FROM rooms WHERE room_number = ?`;
    const roomRow = executeQueryOne<RoomRow>(roomQuery, [roomNumber]);

    if (!roomRow) {
      return {
        content: `I couldn't find room ${roomNumber}. Please check the room number and try again.`,
      };
    }

    // Determine priority from message
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
    
    if (/urgent|emergency|critical/i.test(message)) {
      priority = 'urgent';
    } else if (/high|important|asap/i.test(message)) {
      priority = 'high';
    } else if (/low|minor|when possible/i.test(message)) {
      priority = 'low';
    }

    // Extract title from message (simplified)
    let title = `Maintenance required for room ${roomNumber}`;
    const titleMatch = message.match(/[-:]\s*(.+)$/);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // Create maintenance task
    const taskId = generateId();
    const query = `
      INSERT INTO maintenance_tasks (id, room_id, title, description, priority, status, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, datetime('now'))
    `;
    
    executeUpdate(query, [taskId, roomRow.id, title, message, priority, user.id]);

    // Mock Twilio notification
    const mockNotification = {
      to: '+1234567890',
      message: `New maintenance task: ${title} (Room ${roomNumber})`,
      messageId: `TW-${Date.now()}`,
    };

    return {
      content: `✓ Maintenance task created successfully!\n\n**Details:**\n• Room: ${roomNumber}\n• Title: ${title}\n• Priority: ${priority}\n• Task ID: ${taskId.substring(0, 8)}\n• Status: Pending\n\nA notification has been sent to the maintenance team (Message ID: ${mockNotification.messageId}).`,
      metadata: { taskId, roomNumber, priority, notificationId: mockNotification.messageId },
      action: 'maintenance_task_created',
    };
  } catch (error) {
    console.error('Error creating maintenance task:', error);
    return {
      content: "I encountered an error while creating the maintenance task. Please try again or create it manually through the maintenance dashboard.",
    };
  }
}

/**
 * Intent: Check room status
 */
async function handleRoomStatusInquiry(message: string, user: User): Promise<ChatResponse> {
  try {
    // Extract room number if specified
    const roomMatch = message.match(/room\s+(\d+)/i);
    
    if (roomMatch) {
      const roomNumber = roomMatch[1];
      const roomQuery = `
        SELECT r.*, u.name as guest_name, u.email as guest_email
        FROM rooms r
        LEFT JOIN users u ON u.room_number = r.room_number
        WHERE r.room_number = ?
      `;
      const roomData = executeQueryOne<any>(roomQuery, [roomNumber]);

      if (!roomData) {
        return {
          content: `I couldn't find room ${roomNumber}. Please check the room number and try again.`,
        };
      }

      const statusEmoji: Record<string, string> = {
        vacant: '🟢',
        occupied: '🔵',
        cleaning: '🟡',
        maintenance: '🔴',
      };
      const emoji = statusEmoji[roomData.status] || '⚪';

      let response = `${emoji} **Room ${roomNumber} Status**\n\n`;
      response += `• Status: ${roomData.status}\n`;
      response += `• Type: ${roomData.type}\n`;
      response += `• Floor: ${roomData.floor}\n`;
      
      if (roomData.guest_name) {
        response += `• Guest: ${roomData.guest_name}\n`;
        response += `• Email: ${roomData.guest_email}\n`;
      } else {
        response += `• Guest: None (vacant)\n`;
      }

      return {
        content: response,
        metadata: { roomNumber, status: roomData.status },
        action: 'room_status_provided',
      };
    } else {
      // General room status overview
      const statusQuery = `
        SELECT status, COUNT(*) as count
        FROM rooms
        GROUP BY status
      `;
      const statusData = executeQuery<any>(statusQuery, []);

      let response = '**Room Status Overview**\n\n';
      const statusEmojiMap: Record<string, string> = {
        vacant: '🟢',
        occupied: '🔵',
        cleaning: '🟡',
        maintenance: '🔴',
      };
      statusData.forEach((row) => {
        const emoji = statusEmojiMap[row.status] || '⚪';
        response += `${emoji} ${row.status}: ${row.count} rooms\n`;
      });

      return {
        content: response,
        metadata: { statusData },
        action: 'room_overview_provided',
      };
    }
  } catch (error) {
    console.error('Error fetching room status:', error);
    return {
      content: "I encountered an error while fetching room status. Please try the Rooms dashboard for detailed information.",
    };
  }
}

/**
 * Intent: Check pending tasks
 */
async function handlePendingTasksInquiry(message: string, user: User): Promise<ChatResponse> {
  try {
    const tasksQuery = `
      SELECT mt.*, r.room_number
      FROM maintenance_tasks mt
      INNER JOIN rooms r ON r.id = mt.room_id
      WHERE mt.status IN ('pending', 'assigned', 'in_progress')
      ORDER BY 
        CASE mt.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        mt.created_at DESC
      LIMIT 5
    `;
    
    const tasks = executeQuery<any>(tasksQuery, []);

    if (tasks.length === 0) {
      return {
        content: "Great news! There are no pending maintenance tasks at the moment. All tasks are completed. 🎉",
      };
    }

    let response = `**Pending Maintenance Tasks** (${tasks.length} shown)\n\n`;
    
    const priorityEmojiMap: Record<string, string> = {
      urgent: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
    };
    
    tasks.forEach((task, index) => {
      const priorityEmoji = priorityEmojiMap[task.priority] || '⚪';

      response += `${index + 1}. ${priorityEmoji} **${task.title}**\n`;
      response += `   • Room: ${task.room_number}\n`;
      response += `   • Status: ${task.status}\n`;
      response += `   • Priority: ${task.priority}\n\n`;
    });

    response += `\nView all tasks in the Maintenance dashboard.`;

    return {
      content: response,
      metadata: { taskCount: tasks.length },
      action: 'pending_tasks_provided',
    };
  } catch (error) {
    console.error('Error fetching pending tasks:', error);
    return {
      content: "I encountered an error while fetching pending tasks. Please check the Maintenance dashboard.",
    };
  }
}

/**
 * Intent: Check service requests
 */
async function handleServiceRequestsInquiry(message: string, user: User): Promise<ChatResponse> {
  try {
    const requestsQuery = `
      SELECT sr.*, u.name as guest_name
      FROM service_requests sr
      INNER JOIN users u ON u.id = sr.guest_id
      WHERE sr.status IN ('pending', 'in_progress')
      ORDER BY 
        CASE sr.priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END,
        sr.created_at DESC
      LIMIT 5
    `;
    
    const requests = executeQuery<any>(requestsQuery, []);

    if (requests.length === 0) {
      return {
        content: "All service requests have been completed! No pending requests at the moment. ✓",
      };
    }

    let response = `**Active Service Requests** (${requests.length} shown)\n\n`;
    
    const requestPriorityEmojiMap: Record<string, string> = {
      high: '🔴',
      medium: '🟡',
      low: '🟢',
    };
    
    requests.forEach((req, index) => {
      const priorityEmoji = requestPriorityEmojiMap[req.priority] || '⚪';

      response += `${index + 1}. ${priorityEmoji} **${req.type}** - Room ${req.room_number}\n`;
      response += `   • Guest: ${req.guest_name}\n`;
      response += `   • Status: ${req.status}\n`;
      response += `   • Priority: ${req.priority}\n\n`;
    });

    response += `\nView all requests in the Dashboard.`;

    return {
      content: response,
      metadata: { requestCount: requests.length },
      action: 'service_requests_provided',
    };
  } catch (error) {
    console.error('Error fetching service requests:', error);
    return {
      content: "I encountered an error while fetching service requests. Please check the Dashboard.",
    };
  }
}

/**
 * Intent: Update room status
 */
async function handleUpdateRoomStatus(message: string, user: User): Promise<ChatResponse> {
  try {
    // Extract room number and status
    const roomMatch = message.match(/room\s+(\d+)/i);
    const statusMatch = message.match(/\b(vacant|occupied|cleaning|maintenance)\b/i);

    if (!roomMatch || !statusMatch) {
      return {
        content: "To update a room status, please specify both the room number and the new status. For example: 'Update room 101 to cleaning' or 'Set room 205 to vacant'",
      };
    }

    const roomNumber = roomMatch[1];
    const newStatus = statusMatch[1].toLowerCase();

    // Verify room exists
    const roomQuery = `SELECT * FROM rooms WHERE room_number = ?`;
    const roomRow = executeQueryOne<RoomRow>(roomQuery, [roomNumber]);

    if (!roomRow) {
      return {
        content: `I couldn't find room ${roomNumber}. Please check the room number and try again.`,
      };
    }

    // Update room status
    const updateQuery = `
      UPDATE rooms 
      SET status = ? 
      WHERE room_number = ?
    `;
    executeUpdate(updateQuery, [newStatus, roomNumber]);

    const updateStatusEmojiMap: Record<string, string> = {
      vacant: '🟢',
      occupied: '🔵',
      cleaning: '🟡',
      maintenance: '🔴',
    };
    const statusEmoji = updateStatusEmojiMap[newStatus] || '⚪';

    return {
      content: `✓ Room ${roomNumber} status updated successfully!\n\n${statusEmoji} New status: **${newStatus}**\n\nThe room status has been updated in the system.`,
      metadata: { roomNumber, newStatus },
      action: 'room_status_updated',
    };
  } catch (error) {
    console.error('Error updating room status:', error);
    return {
      content: "I encountered an error while updating the room status. Please try again or update it manually through the Rooms dashboard.",
    };
  }
}

/**
 * Intent: General greeting
 */
async function handleGreeting(message: string, user: User): Promise<ChatResponse> {
  const greetings = [
    `Hello ${user.name}! I'm your AI management assistant. How can I help you today?`,
    `Hi ${user.name}! Ready to assist with hotel operations. What do you need?`,
    `Hey there, ${user.name}! I'm here to help manage the hotel. What can I do for you?`,
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
    content: `I'm your AI management assistant! Here's what I can help you with:

**Service Management:**
• Create service requests for guests
• View active service requests
• Check request status

**Maintenance:**
• Create maintenance tasks
• View pending maintenance tasks
• Check task priorities

**Room Management:**
• Check room status
• Update room status
• View room occupancy overview

**Quick Actions:**
Just tell me what you need in natural language, like:
• "Create a service request for room 101"
• "Create maintenance task for room 205 - AC not working"
• "What's the status of room 303?"
• "Show me pending maintenance tasks"
• "Update room 101 to cleaning"

I'm here to make hotel management easier!`,
  };
}

/**
 * Intent: Thank you
 */
async function handleThanks(message: string, user: User): Promise<ChatResponse> {
  const responses = [
    "You're welcome! Let me know if you need anything else.",
    "Happy to help! I'm here whenever you need me.",
    "My pleasure! Feel free to ask if you need more assistance.",
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
    content: `I'm not quite sure how to help with that. Here are some things I can do:

• **Create service requests** - "Create service request for room 101"
• **Create maintenance tasks** - "Create maintenance task for room 205"
• **Check room status** - "What's the status of room 303?"
• **View pending tasks** - "Show me pending maintenance tasks"
• **Update room status** - "Update room 101 to cleaning"

Could you rephrase your request using one of these patterns?`,
  };
}

/**
 * Manager chat intents with pattern matching
 */
const managerIntents: ChatIntent[] = [
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
    pattern: /(create|add|new).*service request/i,
    handler: handleCreateServiceRequest,
    description: 'Create service request',
  },
  {
    pattern: /(create|add|new).*maintenance.*task/i,
    handler: handleCreateMaintenanceTask,
    description: 'Create maintenance task',
  },
  {
    pattern: /(update|set|change).*room.*status/i,
    handler: handleUpdateRoomStatus,
    description: 'Update room status',
  },
  {
    pattern: /(status|check|what|show).*room/i,
    handler: handleRoomStatusInquiry,
    description: 'Room status inquiry',
  },
  {
    pattern: /(pending|active|show).*task/i,
    handler: handlePendingTasksInquiry,
    description: 'Pending tasks inquiry',
  },
  {
    pattern: /(service request|guest request|active request)/i,
    handler: handleServiceRequestsInquiry,
    description: 'Service requests inquiry',
  },
  {
    pattern: /(thank|thanks|appreciate)/i,
    handler: handleThanks,
    description: 'Thank you',
  },
];

/**
 * Process manager chat message and return AI response
 */
export async function processManagerChatMessage(
  message: string,
  user: User
): Promise<ChatResponse> {
  // Find matching intent
  for (const intent of managerIntents) {
    if (intent.pattern.test(message)) {
      return await intent.handler(message, user);
    }
  }

  // No matching intent, use fallback
  return await handleUnknownIntent(message, user);
}
