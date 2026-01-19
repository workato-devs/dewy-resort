/**
 * Workato MCP Tool Configuration
 * 
 * This file defines which Workato tools require idempotency token wrapping.
 * The local hotel-db MCP server will proxy these tools with automatic token generation.
 * 
 * Tools listed here should be added to excludeTools in the MCP config to prevent
 * the agent from seeing both the wrapped and unwrapped versions.
 * 
 * To discover current tool names, run: npx tsx scripts/discover-mcp-tools.ts
 * 
 * Last updated: 2026-01-16
 */

/**
 * Configuration for tools that require idempotency token wrapping
 */
export interface ToolProxyConfig {
  /** The exact Workato tool name to proxy */
  workatoToolName: string;
  /** The local wrapped tool name (exposed to agent) */
  localToolName: string;
  /** Which Workato server this tool is on */
  server: 'operations' | 'services';
  /** Additional parameters to inject (e.g., manager info from env) */
  injectParams?: string[];
}

/**
 * Tools that require idempotency token wrapping
 * 
 * These tools will be:
 * 1. Excluded from the Workato MCP server (via excludeTools config)
 * 2. Proxied through hotel-db server with auto-generated tokens
 * 3. Dynamically described using Workato's tool metadata
 */
export const TOOLS_REQUIRING_IDEMPOTENCY: ToolProxyConfig[] = [
  // Manager tools (hotel-operations server)
  {
    workatoToolName: 'Create_booking_orchestrator',
    localToolName: 'create_booking_with_token',
    server: 'operations',
  },
  {
    workatoToolName: 'Manage_booking_orchestrator',
    localToolName: 'manage_booking_with_token',
    server: 'operations',
  },
  {
    workatoToolName: 'Submit_maintenance_request',
    localToolName: 'create_maintenance_task_with_token',
    server: 'operations',
    injectParams: ['manager_email', 'manager_first_name', 'manager_last_name'],
  },
  
  // Guest tools (hotel-services server)
  {
    workatoToolName: 'Submit_guest_service_request',
    localToolName: 'create_service_request_with_token',
    server: 'services',
  },
];

/**
 * Additional local-only tools (not proxied from Workato)
 * These are database lookup tools that don't call Workato
 */
export const LOCAL_ONLY_TOOLS = [
  'find_booking_by_token',
  'find_service_request_by_token',
  'find_maintenance_task_by_token',
  'find_transaction_by_token',
  'get_guest_service_requests',
  'get_room_maintenance_tasks',
  'find_tokens_by_guest_email',
] as const;

/**
 * Get list of tool names to exclude from Workato MCP servers
 */
export function getExcludeToolsList(server: 'operations' | 'services'): string[] {
  return TOOLS_REQUIRING_IDEMPOTENCY
    .filter(config => config.server === server)
    .map(config => config.workatoToolName);
}

/**
 * Type definitions
 */
export type ProxiedToolName = typeof TOOLS_REQUIRING_IDEMPOTENCY[number]['localToolName'];
export type LocalOnlyToolName = typeof LOCAL_ONLY_TOOLS[number];
