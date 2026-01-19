#!/usr/bin/env node
/**
 * Hotel Database MCP Server
 * 
 * Dynamic proxy server that wraps Workato MCP tools requiring idempotency tokens.
 * 
 * Architecture:
 * 1. On startup, fetches tool definitions from Workato MCP servers
 * 2. Proxies tools that require idempotency tokens with auto-generation
 * 3. Exposes local-only database lookup tools
 * 4. Uses Workato's tool descriptions dynamically (no hardcoded descriptions)
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
import { 
  TOOLS_REQUIRING_IDEMPOTENCY, 
  LOCAL_ONLY_TOOLS,
  type ToolProxyConfig 
} from '../../../config/mcp/workato-tool-names.js';

/**
 * Workato tool metadata cache
 */
interface WorkatoToolMetadata {
  name: string;
  description: string;
  inputSchema: any;
}

const workatoToolsCache = new Map<string, WorkatoToolMetadata>();
let toolsFetched = false;

/**
 * Fetch tool definitions from Workato MCP server
 */
async function fetchWorkatoTools(url: string, token: string): Promise<WorkatoToolMetadata[]> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-TOKEN': token,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/list',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.result && data.result.tools) {
      return data.result.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema || tool.input_schema || {},
      }));
    }
    
    return [];
  } catch (error) {
    console.error(`Failed to fetch tools from ${url}:`, error);
    return [];
  }
}

/**
 * Initialize tool cache by fetching from Workato
 */
async function initializeToolCache(): Promise<void> {
  if (toolsFetched) return;

  const managerUrl = process.env.MCP_MANAGER_URL;
  const managerToken = process.env.MCP_MANAGER_TOKEN;
  const guestUrl = process.env.MCP_GUEST_URL;
  const guestToken = process.env.MCP_GUEST_TOKEN;

  // Fetch from manager server
  if (managerUrl && managerToken) {
    const tools = await fetchWorkatoTools(managerUrl, managerToken);
    tools.forEach(tool => workatoToolsCache.set(tool.name, tool));
  }

  // Fetch from guest server
  if (guestUrl && guestToken) {
    const tools = await fetchWorkatoTools(guestUrl, guestToken);
    tools.forEach(tool => workatoToolsCache.set(tool.name, tool));
  }

  toolsFetched = true;
}

/**
 * Generate tool definition for a proxied Workato tool
 */
function generateProxiedToolDefinition(config: ToolProxyConfig): Tool | null {
  const workatoTool = workatoToolsCache.get(config.workatoToolName);
  
  if (!workatoTool) {
    console.error(`Workato tool not found: ${config.workatoToolName}`);
    return null;
  }

  // Clone the input schema and modify it
  const inputSchema = JSON.parse(JSON.stringify(workatoTool.inputSchema));
  
  // Remove idempotency_token from required fields if present
  if (inputSchema.required && Array.isArray(inputSchema.required)) {
    inputSchema.required = inputSchema.required.filter((field: string) => 
      field !== 'idempotency_token' && field !== 'booking_external_id'
    );
  }
  
  // Remove idempotency_token from properties if present
  if (inputSchema.properties) {
    delete inputSchema.properties.idempotency_token;
    delete inputSchema.properties.booking_external_id;
  }

  // Remove injected params from schema (they come from env)
  if (config.injectParams) {
    config.injectParams.forEach(param => {
      if (inputSchema.properties) {
        delete inputSchema.properties[param];
      }
      if (inputSchema.required) {
        inputSchema.required = inputSchema.required.filter((field: string) => field !== param);
      }
    });
  }

  return {
    name: config.localToolName,
    description: `${workatoTool.description}\n\n🔑 This tool automatically generates a UUID idempotency token and stores it in the local database for tracking.`,
    inputSchema,
  };
}

/**
 * Local-only tool definitions (database lookups)
 */
const LOCAL_TOOL_DEFINITIONS: Tool[] = [
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
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List available tools (dynamically generated)
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  // Ensure tools are fetched from Workato
  await initializeToolCache();

  const tools: Tool[] = [];

  // Add proxied Workato tools
  for (const config of TOOLS_REQUIRING_IDEMPOTENCY) {
    const tool = generateProxiedToolDefinition(config);
    if (tool) {
      tools.push(tool);
    }
  }

  // Add local-only tools
  tools.push(...LOCAL_TOOL_DEFINITIONS);

  return { tools };
});

/**
 * Call Workato MCP tool via HTTP
 * 
 * @param toolName - The Workato tool name
 * @param input - Tool input parameters
 * @param useManagerUrl - If true, uses MCP_MANAGER_URL; otherwise uses MCP_GUEST_URL
 * @returns Tool execution result
 */
async function callWorkatoTool(toolName: string, input: any, useManagerUrl: boolean = false): Promise<any> {
  const workatoUrl = useManagerUrl 
    ? (process.env.MCP_MANAGER_URL || process.env.MCP_GUEST_URL || 'https://220.apim.mcp.trial.workato.com/zaynet2/dewy-hotel-apis-v1')
    : (process.env.MCP_GUEST_URL || 'https://220.apim.mcp.trial.workato.com/zaynet2/dewy-hotel-apis-v1');
  
  const workatoToken = useManagerUrl
    ? (process.env.MCP_MANAGER_TOKEN || process.env.MCP_GUEST_TOKEN)
    : process.env.MCP_GUEST_TOKEN;
  
  if (!workatoToken) {
    throw new Error('Workato token not configured in environment. Please set MCP_GUEST_TOKEN or MCP_MANAGER_TOKEN in .env file.');
  }

  const fullUrl = `${workatoUrl}/tools/call`;
  
  // Log request for debugging
  const fs = require('fs');
  const logPath = path.join(process.cwd(), 'var', 'logs', 'mcp-server-debug.log');
  fs.appendFileSync(logPath, `${new Date().toISOString()} - Calling Workato tool: ${toolName}\n`);
  fs.appendFileSync(logPath, `${new Date().toISOString()} - Request body: ${JSON.stringify(input, null, 2)}\n`);
  
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

  const responseText = await response.text();
  
  fs.appendFileSync(logPath, `${new Date().toISOString()} - Response status: ${response.status}\n`);
  fs.appendFileSync(logPath, `${new Date().toISOString()} - Response body: ${responseText.substring(0, 500)}\n`);

  let jsonRpcResponse;
  try {
    jsonRpcResponse = JSON.parse(responseText);
  } catch (error) {
    throw new Error(`Failed to parse Workato JSON-RPC response. Response: ${responseText.substring(0, 200)}`);
  }

  if (jsonRpcResponse.error) {
    throw new Error(`Workato JSON-RPC error calling ${toolName}:\n${jsonRpcResponse.error.message || JSON.stringify(jsonRpcResponse.error)}`);
  }

  if (jsonRpcResponse.result?.isError) {
    const errorText = jsonRpcResponse.result.content?.[0]?.text || 'Tool execution failed';
    throw new Error(`Workato tool error calling ${toolName}:\n${errorText}`);
  }

  return jsonRpcResponse.result;
}

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Find if this is a proxied tool
    const proxyConfig = TOOLS_REQUIRING_IDEMPOTENCY.find(c => c.localToolName === name);
    
    if (proxyConfig) {
      return await handleProxiedTool(proxyConfig, args);
    }

    // Handle local-only tools
    switch (name) {
      case 'find_service_request_by_token':
        return handleFindServiceRequestByToken(args);
      
      case 'find_maintenance_task_by_token':
        return handleFindMaintenanceTaskByToken(args);
      
      case 'find_transaction_by_token':
        return handleFindTransactionByToken(args);
      
      case 'find_booking_by_token':
        return handleFindBookingByToken(args);
      
      case 'get_guest_service_requests':
        return handleGetGuestServiceRequests(args);
      
      case 'get_room_maintenance_tasks':
        return handleGetRoomMaintenanceTasks(args);
      
      case 'find_tokens_by_guest_email':
        return handleFindTokensByGuestEmail(args);
      
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
 * Handle proxied Workato tool with idempotency token injection
 */
async function handleProxiedTool(config: ToolProxyConfig, args: any): Promise<any> {
  const idempotencyToken = generateIdempotencyToken();
  const now = new Date().toISOString();
  
  // Inject environment parameters if configured
  const enrichedArgs = { ...args };
  
  if (config.injectParams) {
    for (const param of config.injectParams) {
      if (param === 'manager_email') {
        enrichedArgs.manager_email = process.env.USER_EMAIL || 'manager@hotel.com';
      } else if (param === 'manager_first_name') {
        enrichedArgs.manager_first_name = process.env.USER_FIRST_NAME || 'Manager';
      } else if (param === 'manager_last_name') {
        enrichedArgs.manager_last_name = process.env.USER_LAST_NAME || 'User';
      }
    }
  }

  // Add idempotency token based on tool type
  if (config.workatoToolName.includes('booking')) {
    enrichedArgs.booking_external_id = idempotencyToken;
  } else {
    enrichedArgs.idempotency_token = idempotencyToken;
  }

  // Store in local database before calling Workato
  await storeLocalRecord(config, args, idempotencyToken, now);

  // Call Workato tool
  const useOperationsUrl = config.server === 'operations';
  const workatoResult = await callWorkatoTool(config.workatoToolName, enrichedArgs, useOperationsUrl);

  // Update local database with Salesforce IDs
  await updateLocalRecordWithSalesforceIds(config, idempotencyToken, workatoResult);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          idempotency_token: idempotencyToken,
          ...extractResultData(workatoResult),
        }, null, 2),
      },
    ],
  };
}

/**
 * Store record in local database
 */
async function storeLocalRecord(config: ToolProxyConfig, args: any, token: string, timestamp: string): Promise<void> {
  const fs = require('fs');
  const logPath = path.join(process.cwd(), 'var', 'logs', 'mcp-server-debug.log');

  if (config.localToolName === 'create_booking_with_token') {
    const roomQuery = `SELECT id FROM rooms WHERE room_number = ? LIMIT 1`;
    const roomResults = executeQuery(roomQuery, [args.room_number]);
    
    if (roomResults.length === 0) {
      throw new Error(`Room ${args.room_number} not found in database`);
    }
    
    const room_id = (roomResults[0] as any).id;
    
    const guestQuery = `SELECT id FROM users WHERE email = ? LIMIT 1`;
    const guestResults = executeQuery(guestQuery, [args.guest_email]);
    const guest_id = guestResults.length > 0 ? (guestResults[0] as any).id : null;

    executeUpdate(
      `INSERT INTO bookings (
        idempotency_token, guest_id, room_id, check_in_date, check_out_date, 
        number_of_guests, special_requests, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [token, guest_id, room_id, args.check_in_date, args.check_out_date, 
       args.number_of_guests || 1, args.special_requests, 'reserved', timestamp]
    );
  } 
  else if (config.localToolName === 'create_maintenance_task_with_token') {
    const roomNumberStr = String(args.room_number);
    const roomQuery = `SELECT id FROM rooms WHERE room_number = ? LIMIT 1`;
    const roomResults = executeQuery(roomQuery, [roomNumberStr]);
    
    if (roomResults.length === 0) {
      throw new Error(`Room ${roomNumberStr} not found in database`);
    }
    
    const room_id = (roomResults[0] as any).id;
    const manager_email = process.env.USER_EMAIL || 'manager@hotel.com';
    
    const managerQuery = `SELECT id FROM users WHERE email = ? LIMIT 1`;
    const managerResults = executeQuery(managerQuery, [manager_email]);
    
    let created_by_id;
    if (managerResults.length > 0) {
      created_by_id = (managerResults[0] as any).id;
    } else {
      const defaultManager = executeQuery('SELECT id FROM users WHERE role = ? LIMIT 1', ['manager']);
      if (defaultManager.length > 0) {
        created_by_id = (defaultManager[0] as any).id;
      } else {
        throw new Error('No manager found in database');
      }
    }

    const taskTitle = args.title || args.description.substring(0, 50);
    const taskId = `task_${Date.now()}_${randomUUID().substring(0, 8)}`;

    executeUpdate(
      `INSERT INTO maintenance_tasks (
        id, room_id, title, description, priority, status, 
        created_by, idempotency_token, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [taskId, room_id, taskTitle, args.description, (args.priority || 'Medium').toLowerCase(), 
       'pending', created_by_id, token, timestamp]
    );
  }
  else if (config.localToolName === 'create_service_request_with_token') {
    const guestQuery = `
      SELECT u.id, u.email, u.name 
      FROM users u 
      WHERE u.room_number = ? AND u.role = 'guest'
      LIMIT 1
    `;
    const guestResults = executeQuery(guestQuery, [args.room_number]);
    
    if (guestResults.length === 0) {
      throw new Error(`No guest found in room ${args.room_number}`);
    }
    
    const guest = guestResults[0] as any;
    const requestId = `req_${Date.now()}_${randomUUID().substring(0, 8)}`;

    executeUpdate(
      `INSERT INTO service_requests (
        id, guest_id, room_number, type, priority, description, 
        status, idempotency_token, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [requestId, guest.id, args.room_number, (args.request_type || 'Housekeeping').toLowerCase(), 
       (args.priority || 'Medium').toLowerCase(), args.description, 'pending', token, timestamp]
    );
  }
}

/**
 * Update local record with Salesforce IDs from Workato response
 */
async function updateLocalRecordWithSalesforceIds(config: ToolProxyConfig, token: string, result: any): Promise<void> {
  // Extract data from MCP result format
  const resultText = result.content?.[0]?.text;
  if (!resultText) return;

  try {
    const data = JSON.parse(resultText);
    
    if (config.localToolName === 'create_booking_with_token') {
      if (data.opportunity_id) {
        executeUpdate(
          `UPDATE bookings SET 
            salesforce_opportunity_id = ?,
            booking_number = ?,
            updated_at = ?
          WHERE idempotency_token = ?`,
          [data.opportunity_id, data.booking_number, new Date().toISOString(), token]
        );
      }
    }
    else if (config.localToolName === 'create_maintenance_task_with_token') {
      if (data.case_id) {
        executeUpdate(
          `UPDATE maintenance_tasks SET salesforce_case_id = ? WHERE idempotency_token = ?`,
          [data.case_id, token]
        );
      }
    }
    else if (config.localToolName === 'create_service_request_with_token') {
      if (data.case_id) {
        executeUpdate(
          `UPDATE service_requests SET salesforce_ticket_id = ? WHERE idempotency_token = ?`,
          [data.case_id, token]
        );
      }
    }
  } catch (error) {
    // Ignore parse errors - result might not be JSON
  }
}

/**
 * Extract relevant data from Workato result
 */
function extractResultData(result: any): any {
  const resultText = result.content?.[0]?.text;
  if (!resultText) return {};

  try {
    return JSON.parse(resultText);
  } catch {
    return { raw_result: resultText };
  }
}

/**
 * Local-only tool handlers
 */
function handleFindServiceRequestByToken(args: any) {
  const { idempotency_token } = args;
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

function handleFindMaintenanceTaskByToken(args: any) {
  const { idempotency_token } = args;
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

function handleFindTransactionByToken(args: any) {
  const { idempotency_token } = args;
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

function handleFindBookingByToken(args: any) {
  const { idempotency_token } = args;
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

function handleGetGuestServiceRequests(args: any) {
  const { guest_id, status, limit = 10 } = args;
  
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

function handleGetRoomMaintenanceTasks(args: any) {
  const { room_id, status, assigned_to, limit = 20 } = args;
  
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

function handleFindTokensByGuestEmail(args: any) {
  const { guest_email, limit = 50 } = args;
  
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
  
  const serviceRequestsQuery = `
    SELECT id, room_number, type, priority, description, status, 
           idempotency_token, salesforce_ticket_id, created_at
    FROM service_requests 
    WHERE guest_id = ?
    ORDER BY created_at DESC 
    LIMIT ?
  `;
  const serviceRequests = executeQuery(serviceRequestsQuery, [guest_id, limit]);
  
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

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Don't log to stderr as it interferes with JSON-RPC communication
}

main().catch((error) => {
  // Log fatal errors to a file instead of stderr to avoid interfering with stdio
  const fs = require('fs');
  const logPath = path.join(process.cwd(), 'var', 'logs', 'mcp-server-error.log');
  fs.appendFileSync(logPath, `${new Date().toISOString()} - Fatal error: ${error}\n`);
  process.exit(1);
});
