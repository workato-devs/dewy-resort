#!/usr/bin/env node
/**
 * Hotel Database MCP Server
 * 
 * Provides MCP tools for querying the local SQLite database.
 * Exposes idempotency token lookups and database queries as tools
 * that can be called by the AI agent.
 * 
 * Usage: node lib/mcp/hotel-db-server.js
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

// Import database utilities
import { 
  findServiceRequestByToken, 
  findMaintenanceTaskByToken,
  findTransactionByToken,
  findBookingByToken,
  generateIdempotencyToken
} from '../utils/idempotency.js';
import { executeQuery, executeUpdate } from '../db/client.js';
import { randomUUID } from 'crypto';
import path from 'path';

/**
 * Tool definitions
 */
const TOOLS: Tool[] = [
  {
    name: 'create_maintenance_task_with_token',
    description: 'Create a maintenance task with auto-generated idempotency token. This tool generates a UUID token, stores it in the local database, and creates the task in Salesforce via Workato. The manager information (email, first name, last name) will be automatically populated from the user profile. Returns the created task with the token.',
    inputSchema: {
      type: 'object',
      properties: {
        room_number: {
          type: 'string',
          description: 'Room number (e.g., "101", "205")',
        },
        title: {
          type: 'string',
          description: 'Brief title of the maintenance task (e.g., "AC not working", "Leaky faucet")',
        },
        description: {
          type: 'string',
          description: 'Detailed description of the maintenance issue',
        },
        priority: {
          type: 'string',
          description: 'Priority level - defaults to Medium if not specified',
          enum: ['Low', 'Medium', 'High', 'Urgent'],
        },
        type: {
          type: 'string',
          description: 'Type of maintenance - defaults to General if not specified',
          enum: ['Plumbing', 'Electrical', 'HVAC', 'Housekeeping', 'General'],
        },
      },
      required: ['room_number', 'description'],
    },
  },
  {
    name: 'create_service_request_with_token',
    description: 'Create a service request with auto-generated idempotency token. This tool generates a UUID token, stores it in the local database, and creates the request in Salesforce via Workato. Guest information will be looked up from the room number. Returns the created request with the token.',
    inputSchema: {
      type: 'object',
      properties: {
        room_number: {
          type: 'string',
          description: 'Room number',
        },
        request_type: {
          type: 'string',
          description: 'Type of service request - defaults to Housekeeping if not specified',
          enum: ['Housekeeping', 'Room Service', 'Concierge', 'Maintenance'],
        },
        priority: {
          type: 'string',
          description: 'Priority level - defaults to Medium if not specified',
          enum: ['Low', 'Medium', 'High'],
        },
        description: {
          type: 'string',
          description: 'Description of the service request',
        },
      },
      required: ['room_number', 'description'],
    },
  },
  {
    name: 'find_service_request_by_token',
    description: 'Find a service request by its idempotency token. Returns the full service request record including Salesforce ticket ID.',
    inputSchema: {
      type: 'object',
      properties: {
        idempotency_token: {
          type: 'string',
          description: 'The idempotency token (UUID) to search for',
        },
      },
      required: ['idempotency_token'],
    },
  },
  {
    name: 'find_maintenance_task_by_token',
    description: 'Find a maintenance task by its idempotency token. Returns the full maintenance task record.',
    inputSchema: {
      type: 'object',
      properties: {
        idempotency_token: {
          type: 'string',
          description: 'The idempotency token (UUID) to search for',
        },
      },
      required: ['idempotency_token'],
    },
  },
  {
    name: 'find_transaction_by_token',
    description: 'Find a transaction by its idempotency token. Returns the full transaction record including Stripe transaction ID.',
    inputSchema: {
      type: 'object',
      properties: {
        idempotency_token: {
          type: 'string',
          description: 'The idempotency token (UUID) to search for',
        },
      },
      required: ['idempotency_token'],
    },
  },
  {
    name: 'create_booking_with_token',
    description: 'Create a booking with auto-generated idempotency token. This tool generates a UUID token, stores it in the local database, and creates the booking in Salesforce via Workato. Returns the created booking with the token.',
    inputSchema: {
      type: 'object',
      properties: {
        guest_email: {
          type: 'string',
          description: 'Guest email address',
        },
        guest_first_name: {
          type: 'string',
          description: 'Guest first name',
        },
        guest_last_name: {
          type: 'string',
          description: 'Guest last name',
        },
        room_number: {
          type: 'string',
          description: 'Room number (e.g., "101", "205")',
        },
        check_in_date: {
          type: 'string',
          description: 'Check-in date (ISO 8601 format: YYYY-MM-DD)',
        },
        check_out_date: {
          type: 'string',
          description: 'Check-out date (ISO 8601 format: YYYY-MM-DD)',
        },
        number_of_guests: {
          type: 'number',
          description: 'Number of guests (default: 1)',
        },
        special_requests: {
          type: 'string',
          description: 'Special requests or notes',
        },
      },
      required: ['guest_email', 'guest_first_name', 'guest_last_name', 'room_number', 'check_in_date', 'check_out_date'],
    },
  },
  {
    name: 'manage_booking_with_token',
    description: 'Update an existing booking with auto-generated idempotency token. This tool generates a UUID token, stores it in the local database, and updates the booking in Salesforce via Workato. Returns the updated booking with the token.',
    inputSchema: {
      type: 'object',
      properties: {
        external_id: {
          type: 'string',
          description: 'External ID of the booking to update (from previous create_booking_with_token call)',
        },
        guest_email: {
          type: 'string',
          description: 'Updated guest email address',
        },
        room_number: {
          type: 'string',
          description: 'Updated room number',
        },
        check_in_date: {
          type: 'string',
          description: 'Updated check-in date (ISO 8601 format: YYYY-MM-DD)',
        },
        check_out_date: {
          type: 'string',
          description: 'Updated check-out date (ISO 8601 format: YYYY-MM-DD)',
        },
        number_of_guests: {
          type: 'number',
          description: 'Updated number of guests',
        },
        special_requests: {
          type: 'string',
          description: 'Updated special requests or notes',
        },
        status: {
          type: 'string',
          description: 'Updated booking status',
          enum: ['reserved', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
        },
      },
      required: ['external_id'],
    },
  },
  {
    name: 'find_booking_by_token',
    description: 'Find a booking by its idempotency token. Returns the full booking record including Salesforce booking ID.',
    inputSchema: {
      type: 'object',
      properties: {
        idempotency_token: {
          type: 'string',
          description: 'The idempotency token (UUID) to search for',
        },
      },
      required: ['idempotency_token'],
    },
  },
  {
    name: 'get_guest_service_requests',
    description: 'Get all service requests for a specific guest. Returns list with idempotency tokens.',
    inputSchema: {
      type: 'object',
      properties: {
        guest_id: {
          type: 'string',
          description: 'The guest user ID',
        },
        status: {
          type: 'string',
          description: 'Optional status filter (pending, in_progress, completed, cancelled)',
          enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10)',
          default: 10,
        },
      },
      required: ['guest_id'],
    },
  },
  {
    name: 'get_room_maintenance_tasks',
    description: 'Get all maintenance tasks for a specific room. Returns list with idempotency tokens.',
    inputSchema: {
      type: 'object',
      properties: {
        room_id: {
          type: 'string',
          description: 'The room ID',
        },
        status: {
          type: 'string',
          description: 'Optional status filter (pending, assigned, in_progress, completed)',
          enum: ['pending', 'assigned', 'in_progress', 'completed'],
        },
        assigned_to: {
          type: 'string',
          description: 'Optional filter by assigned staff member email',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 20)',
          default: 20,
        },
      },
      required: ['room_id'],
    },
  },
  {
    name: 'find_tokens_by_guest_email',
    description: 'Find all idempotency tokens associated with a guest email address. Returns service requests, bookings, and transactions with their tokens.',
    inputSchema: {
      type: 'object',
      properties: {
        guest_email: {
          type: 'string',
          description: 'The guest email address to search for',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results per category (default: 50)',
          default: 50,
        },
      },
      required: ['guest_email'],
    },
  },
];

/**
 * Create and configure the MCP server
 */
const server = new Server(
  {
    name: 'hotel-db-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

/**
 * Call Workato MCP tool via HTTP
 */
async function callWorkatoTool(toolName: string, input: any, useOperationsUrl: boolean = false): Promise<any> {
  // Use operations URL for booking operations, services URL for others
  const workatoUrl = useOperationsUrl 
    ? (process.env.MCP_OPERATIONS_URL || process.env.MCP_HOTEL_SERVICES_URL || 'https://220.apim.mcp.trial.workato.com/zaynet2/dewy-hotel-apis-v1')
    : (process.env.MCP_HOTEL_SERVICES_URL || 'https://220.apim.mcp.trial.workato.com/zaynet2/dewy-hotel-apis-v1');
  
  const workatoToken = useOperationsUrl
    ? (process.env.MCP_OPERATIONS_TOKEN || process.env.MCP_HOTEL_SERVICES_TOKEN)
    : process.env.MCP_HOTEL_SERVICES_TOKEN;
  
  if (!workatoToken) {
    throw new Error('Workato token not configured in environment. Please set MCP_HOTEL_SERVICES_TOKEN or MCP_OPERATIONS_TOKEN in .env file.');
  }

  // Workato MCP uses JSON-RPC protocol with /tools/call endpoint
  const fullUrl = `${workatoUrl}/tools/call`;
  
  // Log request for debugging
  const fs = require('fs');
  const logPath = path.join(process.cwd(), 'var', 'logs', 'mcp-server-debug.log');
  fs.appendFileSync(logPath, `${new Date().toISOString()} - Calling Workato tool: ${toolName}\n`);
  fs.appendFileSync(logPath, `${new Date().toISOString()} - Request body: ${JSON.stringify(input, null, 2)}\n`);
  
  // Workato MCP servers use JSON-RPC 2.0 protocol
  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-TOKEN': workatoToken,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: input,
      },
    }),
  });

  // Get response text first to handle both JSON and non-JSON responses
  const responseText = await response.text();
  
  fs.appendFileSync(logPath, `${new Date().toISOString()} - Response status: ${response.status}\n`);
  fs.appendFileSync(logPath, `${new Date().toISOString()} - Response body: ${responseText.substring(0, 500)}\n`);

  // Parse JSON-RPC response
  let jsonRpcResponse;
  try {
    jsonRpcResponse = JSON.parse(responseText);
  } catch (error) {
    throw new Error(`Failed to parse Workato JSON-RPC response. Response: ${responseText.substring(0, 200)}`);
  }

  // Check for JSON-RPC error
  if (jsonRpcResponse.error) {
    throw new Error(`Workato JSON-RPC error calling ${toolName}:\n${jsonRpcResponse.error.message || JSON.stringify(jsonRpcResponse.error)}`);
  }

  // Check if the result indicates an error (isError flag)
  if (jsonRpcResponse.result?.isError) {
    const errorText = jsonRpcResponse.result.content?.[0]?.text || 'Tool execution failed';
    throw new Error(`Workato tool error calling ${toolName}:\n${errorText}`);
  }

  // Return the result content
  return jsonRpcResponse.result;
}

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'create_maintenance_task_with_token': {
        const {
          room_number,
          title,
          description,
          priority = 'Medium',
          type = 'General',
        } = args as {
          room_number: string;
          title?: string;
          description: string;
          priority?: string;
          type?: string;
        };

        // Look up room ID from room number
        // Ensure room_number is a string
        const roomNumberStr = String(room_number);
        
        // Debug logging
        const fs = require('fs');
        const logPath = path.join(process.cwd(), 'var', 'logs', 'mcp-server-debug.log');
        fs.appendFileSync(logPath, `${new Date().toISOString()} - Looking up room ${roomNumberStr} (type: ${typeof room_number}, converted: ${typeof roomNumberStr})\n`);
        
        const roomQuery = `SELECT id FROM rooms WHERE room_number = ? LIMIT 1`;
        const roomResults = executeQuery(roomQuery, [roomNumberStr]);
        
        fs.appendFileSync(logPath, `${new Date().toISOString()} - Query returned ${roomResults.length} results\n`);
        
        if (roomResults.length === 0) {
          // Log all rooms for debugging
          const allRooms = executeQuery('SELECT room_number FROM rooms ORDER BY room_number', []);
          fs.appendFileSync(logPath, `${new Date().toISOString()} - Available rooms: ${JSON.stringify(allRooms.map((r: any) => r.room_number))}\n`);
          throw new Error(`Room ${roomNumberStr} not found in database`);
        }
        
        const room_id = (roomResults[0] as any).id;
        fs.appendFileSync(logPath, `${new Date().toISOString()} - Found room_id: ${room_id}\n`);

        // Get manager info from environment (set by the chat context)
        const manager_email = process.env.USER_EMAIL || 'manager@hotel.com';
        const manager_first_name = process.env.USER_FIRST_NAME || 'Manager';
        const manager_last_name = process.env.USER_LAST_NAME || 'User';
        
        // Look up manager user ID from email
        const managerQuery = `SELECT id FROM users WHERE email = ? LIMIT 1`;
        const managerResults = executeQuery(managerQuery, [manager_email]);
        
        let created_by_id;
        if (managerResults.length > 0) {
          created_by_id = (managerResults[0] as any).id;
          fs.appendFileSync(logPath, `${new Date().toISOString()} - Found manager user_id: ${created_by_id}\n`);
        } else {
          // If manager not found, use first manager in database
          const defaultManager = executeQuery('SELECT id FROM users WHERE role = ? LIMIT 1', ['manager']);
          if (defaultManager.length > 0) {
            created_by_id = (defaultManager[0] as any).id;
            fs.appendFileSync(logPath, `${new Date().toISOString()} - Using default manager user_id: ${created_by_id}\n`);
          } else {
            throw new Error('No manager found in database');
          }
        }

        // Generate title from description if not provided
        const taskTitle = title || description.substring(0, 50);

        // Generate idempotency token
        const idempotencyToken = generateIdempotencyToken();
        const taskId = `task_${Date.now()}_${randomUUID().substring(0, 8)}`;
        const now = new Date().toISOString();

        // Store in local database first
        executeUpdate(
          `INSERT INTO maintenance_tasks (
            id, room_id, title, description, priority, status, 
            created_by, idempotency_token, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [taskId, room_id, taskTitle, description, priority.toLowerCase(), 'pending', created_by_id, idempotencyToken, now]
        );

        // Call Workato to create in Salesforce
        // Use the actual Workato tool name: Submit_maintenance_request
        const workatoResult = await callWorkatoTool('Submit_maintenance_request', {
          idempotency_token: idempotencyToken,
          manager_email,
          manager_first_name,
          manager_last_name,
          room_number,
          type,
          priority,
          description,
        });

        // Update with Salesforce case ID if returned
        if (workatoResult.case_id) {
          executeUpdate(
            `UPDATE maintenance_tasks SET salesforce_case_id = ? WHERE id = ?`,
            [workatoResult.case_id, taskId]
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                task_id: taskId,
                room_number,
                idempotency_token: idempotencyToken,
                salesforce_case_id: workatoResult.case_id,
                message: `Maintenance task created successfully for room ${room_number}. Tracking token: ${idempotencyToken}`,
              }, null, 2),
            },
          ],
        };
      }

      case 'create_service_request_with_token': {
        const {
          room_number,
          request_type = 'Housekeeping',
          priority = 'Medium',
          description,
        } = args as {
          room_number: string;
          request_type?: string;
          priority?: string;
          description: string;
        };

        // Look up guest info from room number
        const guestQuery = `
          SELECT u.id, u.email, u.name 
          FROM users u 
          WHERE u.room_number = ? AND u.role = 'guest'
          LIMIT 1
        `;
        const guestResults = executeQuery(guestQuery, [room_number]);
        
        if (guestResults.length === 0) {
          throw new Error(`No guest found in room ${room_number}`);
        }
        
        const guest = guestResults[0] as any;
        const [guest_first_name, ...lastNameParts] = guest.name.split(' ');
        const guest_last_name = lastNameParts.join(' ') || guest_first_name;

        // Generate idempotency token
        const idempotencyToken = generateIdempotencyToken();
        const requestId = `req_${Date.now()}_${randomUUID().substring(0, 8)}`;
        const now = new Date().toISOString();

        // Store in local database first
        executeUpdate(
          `INSERT INTO service_requests (
            id, guest_id, room_number, type, priority, description, 
            status, idempotency_token, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [requestId, guest.id, room_number, request_type.toLowerCase(), priority.toLowerCase(), description, 'pending', idempotencyToken, now]
        );

        // Call Workato to create in Salesforce
        // Use the actual Workato tool name: Submit_guest_service_request
        const workatoResult = await callWorkatoTool('Submit_guest_service_request', {
          idempotency_token: idempotencyToken,
          guest_email: guest.email,
          guest_first_name,
          guest_last_name,
          room_number,
          request_type,
          priority,
          description,
        });

        // Update with Salesforce case ID if returned
        if (workatoResult.case_id) {
          executeUpdate(
            `UPDATE service_requests SET salesforce_ticket_id = ? WHERE id = ?`,
            [workatoResult.case_id, requestId]
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                request_id: requestId,
                idempotency_token: idempotencyToken,
                salesforce_case_id: workatoResult.case_id,
                message: `Service request created successfully. Tracking token: ${idempotencyToken}`,
              }, null, 2),
            },
          ],
        };
      }

      case 'find_service_request_by_token': {
        const { idempotency_token } = args as { idempotency_token: string };
        const result = findServiceRequestByToken(idempotency_token);
        
        return {
          content: [
            {
              type: 'text',
              text: result 
                ? JSON.stringify(result, null, 2)
                : 'No service request found with that idempotency token',
            },
          ],
        };
      }

      case 'find_maintenance_task_by_token': {
        const { idempotency_token } = args as { idempotency_token: string };
        const result = findMaintenanceTaskByToken(idempotency_token);
        
        return {
          content: [
            {
              type: 'text',
              text: result 
                ? JSON.stringify(result, null, 2)
                : 'No maintenance task found with that idempotency token',
            },
          ],
        };
      }

      case 'find_transaction_by_token': {
        const { idempotency_token } = args as { idempotency_token: string };
        const result = findTransactionByToken(idempotency_token);
        
        return {
          content: [
            {
              type: 'text',
              text: result 
                ? JSON.stringify(result, null, 2)
                : 'No transaction found with that idempotency token',
            },
          ],
        };
      }

      case 'create_booking_with_token': {
        const {
          guest_email,
          guest_first_name,
          guest_last_name,
          room_number,
          check_in_date,
          check_out_date,
          number_of_guests = 1,
          special_requests,
        } = args as {
          guest_email: string;
          guest_first_name: string;
          guest_last_name: string;
          room_number: string;
          check_in_date: string;
          check_out_date: string;
          number_of_guests?: number;
          special_requests?: string;
        };

        // NOTE: The create-booking Workato recipe does not exist yet
        // This tool is a placeholder for when the recipe is implemented
        // See: workato/docs/mcp-create-booking.md for specification
        
        // Look up guest ID from email
        const guestQuery = `SELECT id FROM users WHERE email = ? LIMIT 1`;
        const guestResults = executeQuery(guestQuery, [guest_email]);
        const guest_id = guestResults.length > 0 ? (guestResults[0] as any).id : null;

        // Look up room ID from room number
        const roomQuery = `SELECT id FROM rooms WHERE room_number = ? LIMIT 1`;
        const roomResults = executeQuery(roomQuery, [room_number]);
        
        if (roomResults.length === 0) {
          throw new Error(`Room ${room_number} not found in database`);
        }
        
        const room_id = (roomResults[0] as any).id;

        // Generate idempotency token
        const idempotencyToken = generateIdempotencyToken();
        const now = new Date().toISOString();

        // Store in local database first
        executeUpdate(
          `INSERT INTO bookings (
            idempotency_token, guest_id, room_id, check_in_date, check_out_date, 
            number_of_guests, special_requests, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [idempotencyToken, guest_id, room_id, check_in_date, check_out_date, number_of_guests, special_requests, 'reserved', now]
        );

        // Call Workato to create in Salesforce (use operations URL for booking operations)
        // Use the actual Workato tool name: Create_booking (singular)
        let workatoResult;
        try {
          workatoResult = await callWorkatoTool('Create_booking', {
            guest_email,
            guest_first_name,
            guest_last_name,
            room_number,
            check_in_date,
            check_out_date,
            number_of_guests,
            special_requests,
            booking_external_id: idempotencyToken,
          }, true);
        } catch (workatoError) {
          // Re-throw with more context
          const errorMsg = workatoError instanceof Error ? workatoError.message : String(workatoError);
          throw new Error(`Failed to create booking in Workato/Salesforce: ${errorMsg}`);
        }

        // Update with Salesforce IDs if returned
        if (workatoResult.opportunity_id) {
          executeUpdate(
            `UPDATE bookings SET 
              salesforce_opportunity_id = ?,
              booking_number = ?,
              updated_at = ?
            WHERE idempotency_token = ?`,
            [
              workatoResult.opportunity_id || null,
              workatoResult.booking_number || null,
              new Date().toISOString(),
              idempotencyToken
            ]
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                idempotency_token: idempotencyToken,
                salesforce_opportunity_id: workatoResult.opportunity_id,
                booking_number: workatoResult.booking_number,
                room_number,
                check_in_date,
                check_out_date,
                message: `Booking created successfully for ${guest_first_name} ${guest_last_name}. Tracking token: ${idempotencyToken}`,
              }, null, 2),
            },
          ],
        };
      }

      case 'manage_booking_with_token': {
        const {
          external_id,
          guest_email,
          room_number,
          check_in_date,
          check_out_date,
          number_of_guests,
          special_requests,
          status,
        } = args as {
          external_id: string;
          guest_email?: string;
          room_number?: string;
          check_in_date?: string;
          check_out_date?: string;
          number_of_guests?: number;
          special_requests?: string;
          status?: string;
        };

        // NOTE: The manage-booking Workato recipe does not exist yet
        // This tool is a placeholder for when the recipe is implemented
        // See: workato/docs/mcp-manage-booking.md for specification

        const now = new Date().toISOString();

        // Call Workato to update in Salesforce (use operations URL for booking operations)
        // Use the actual Workato tool name from MCP discovery: Manage_bookings
        let workatoResult;
        try {
          workatoResult = await callWorkatoTool('Manage_bookings', {
            external_id: external_id, // Workato expects external_id (the booking's External_ID__c)
            guest_email,
            room_number,
            check_in_date,
            check_out_date,
            number_of_guests,
            special_requests,
            status,
          }, true);
        } catch (workatoError) {
          // Re-throw with more context
          const errorMsg = workatoError instanceof Error ? workatoError.message : String(workatoError);
          throw new Error(`Failed to update booking in Workato/Salesforce: ${errorMsg}`);
        }

        // Update local database with new values
        const updateFields: string[] = [];
        const updateValues: any[] = [];

        if (guest_email) {
          const guestQuery = `SELECT id FROM users WHERE email = ? LIMIT 1`;
          const guestResults = executeQuery(guestQuery, [guest_email]);
          if (guestResults.length > 0) {
            updateFields.push('guest_id = ?');
            updateValues.push((guestResults[0] as any).id);
          }
        }

        if (room_number) {
          const roomQuery = `SELECT id FROM rooms WHERE room_number = ? LIMIT 1`;
          const roomResults = executeQuery(roomQuery, [room_number]);
          if (roomResults.length > 0) {
            updateFields.push('room_id = ?');
            updateValues.push((roomResults[0] as any).id);
          }
        }

        if (check_in_date) {
          updateFields.push('check_in_date = ?');
          updateValues.push(check_in_date);
        }

        if (check_out_date) {
          updateFields.push('check_out_date = ?');
          updateValues.push(check_out_date);
        }

        if (number_of_guests !== undefined) {
          updateFields.push('number_of_guests = ?');
          updateValues.push(number_of_guests);
        }

        if (special_requests !== undefined) {
          updateFields.push('special_requests = ?');
          updateValues.push(special_requests);
        }

        if (status) {
          updateFields.push('status = ?');
          updateValues.push(status);
        }

        updateFields.push('updated_at = ?');
        updateValues.push(now);

        // Update by idempotency token (external_id)
        updateValues.push(external_id);

        if (updateFields.length > 1) { // More than just updated_at
          executeUpdate(
            `UPDATE bookings SET ${updateFields.join(', ')} WHERE idempotency_token = ?`,
            updateValues
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                external_id,
                message: `Booking updated successfully.`,
              }, null, 2),
            },
          ],
        };
      }

      case 'find_booking_by_token': {
        const { idempotency_token } = args as { idempotency_token: string };
        const result = findBookingByToken(idempotency_token);
        
        return {
          content: [
            {
              type: 'text',
              text: result 
                ? JSON.stringify(result, null, 2)
                : 'No booking found with that idempotency token',
            },
          ],
        };
      }

      case 'get_guest_service_requests': {
        const { guest_id, status, limit = 10 } = args as { 
          guest_id: string; 
          status?: string;
          limit?: number;
        };
        
        let query = `
          SELECT id, guest_id, room_number, type, priority, description, 
                 status, idempotency_token, salesforce_ticket_id, created_at
          FROM service_requests 
          WHERE guest_id = ?
        `;
        const params: any[] = [guest_id];
        
        if (status) {
          query += ' AND status = ?';
          params.push(status);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);
        
        const results = executeQuery(query, params);
        
        return {
          content: [
            {
              type: 'text',
              text: results.length > 0
                ? JSON.stringify(results, null, 2)
                : 'No service requests found for this guest',
            },
          ],
        };
      }

      case 'get_room_maintenance_tasks': {
        const { room_id, status, assigned_to, limit = 20 } = args as { 
          room_id: string; 
          status?: string;
          assigned_to?: string;
          limit?: number;
        };
        
        let query = `
          SELECT id, room_id, title, description, priority, status, 
                 assigned_to, created_by, idempotency_token, created_at
          FROM maintenance_tasks 
          WHERE room_id = ?
        `;
        const params: any[] = [room_id];
        
        if (status) {
          query += ' AND status = ?';
          params.push(status);
        }
        
        if (assigned_to) {
          query += ' AND assigned_to = ?';
          params.push(assigned_to);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);
        
        const results = executeQuery(query, params);
        
        return {
          content: [
            {
              type: 'text',
              text: results.length > 0
                ? JSON.stringify(results, null, 2)
                : 'No maintenance tasks found for this room',
            },
          ],
        };
      }

      case 'find_tokens_by_guest_email': {
        const { guest_email, limit = 50 } = args as { 
          guest_email: string; 
          limit?: number;
        };
        
        // First, find the guest user ID
        const guestQuery = `SELECT id FROM users WHERE email = ? AND role = 'guest' LIMIT 1`;
        const guestResults = executeQuery(guestQuery, [guest_email]);
        
        if (guestResults.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  guest_email,
                  found: false,
                  message: 'No guest found with this email address',
                }, null, 2),
              },
            ],
          };
        }
        
        const guest_id = (guestResults[0] as any).id;
        
        // Get service requests
        const serviceRequestsQuery = `
          SELECT id, room_number, type, priority, description, status, 
                 idempotency_token, salesforce_ticket_id, created_at
          FROM service_requests 
          WHERE guest_id = ?
          ORDER BY created_at DESC 
          LIMIT ?
        `;
        const serviceRequests = executeQuery(serviceRequestsQuery, [guest_id, limit]);
        
        // Get bookings
        const bookingsQuery = `
          SELECT b.idempotency_token, r.room_number, b.check_in_date, b.check_out_date, 
                 b.number_of_guests, b.status, 
                 b.salesforce_opportunity_id, 
                 b.booking_number, b.created_at
          FROM bookings b
          LEFT JOIN rooms r ON b.room_id = r.id
          WHERE b.guest_id = ?
          ORDER BY b.created_at DESC 
          LIMIT ?
        `;
        const bookings = executeQuery(bookingsQuery, [guest_id, limit]);
        
        // Get transactions
        const transactionsQuery = `
          SELECT id, amount, type, status, 
                 idempotency_token, stripe_transaction_id, created_at
          FROM transactions 
          WHERE guest_id = ?
          ORDER BY created_at DESC 
          LIMIT ?
        `;
        const transactions = executeQuery(transactionsQuery, [guest_id, limit]);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                guest_email,
                guest_id,
                found: true,
                service_requests: {
                  count: serviceRequests.length,
                  items: serviceRequests,
                },
                bookings: {
                  count: bookings.length,
                  items: bookings,
                },
                transactions: {
                  count: transactions.length,
                  items: transactions,
                },
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Don't log to stderr as it interferes with JSON-RPC communication
  // console.error('Hotel DB MCP server running on stdio');
}

main().catch((error) => {
  // Log fatal errors to a file instead of stderr to avoid interfering with stdio
  const fs = require('fs');
  const logPath = path.join(process.cwd(), 'var', 'logs', 'mcp-server-error.log');
  fs.appendFileSync(logPath, `${new Date().toISOString()} - Fatal error: ${error}\n`);
  process.exit(1);
});
