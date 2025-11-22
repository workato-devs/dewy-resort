/**
 * MCP Configuration Schema
 * 
 * This file defines the TypeScript types for MCP (Model Context Protocol) configurations.
 * Each role (guest, manager, housekeeping, maintenance) has its own configuration file
 * that specifies which MCP servers and tools are available for that role.
 */

/**
 * Environment variable configuration for MCP servers
 * Supports both literal values and environment variable references using ${VAR_NAME} syntax
 */
export interface MCPServerEnv {
  [key: string]: string;
}

/**
 * Authentication configuration for HTTP-based MCP servers
 */
export interface MCPServerAuth {
  /** Authentication type */
  type: 'bearer' | 'basic' | 'none';
  
  /** Bearer token (for bearer auth) */
  token?: string;
  
  /** Username (for basic auth) */
  username?: string;
  
  /** Password (for basic auth) */
  password?: string;
}

/**
 * Configuration for a single MCP server
 */
export interface MCPServerConfig {
  /** Unique name for the MCP server */
  name: string;
  
  /** Server connection type */
  type: 'http' | 'stdio';
  
  // HTTP server configuration
  /** URL for HTTP-based MCP servers */
  url?: string;
  
  /** Authentication configuration for HTTP servers */
  auth?: MCPServerAuth;
  
  // Stdio server configuration (backward compatibility)
  /** Command to execute the MCP server (e.g., "node", "python") */
  command?: string;
  
  /** Arguments to pass to the command */
  args?: string[];
  
  /** Environment variables for the server process */
  env?: MCPServerEnv;
  
  /** 
   * List of tool names that this server provides and should be exposed to the LLM.
   * If empty or omitted, all tools from the server will be exposed.
   * Use this to restrict which tools are available for security/role-based access control.
   */
  tools?: string[];
  
  /**
   * List of tool names to exclude from this server.
   * Use this to hide specific tools that are wrapped by other servers.
   * Takes precedence over the tools array.
   */
  excludeTools?: string[];
}

/**
 * Complete MCP configuration for a specific role
 */
export interface MCPRoleConfig {
  /** Role identifier (guest, manager, housekeeping, maintenance) */
  role: 'guest' | 'manager' | 'housekeeping' | 'maintenance';
  
  /** List of MCP servers available for this role */
  servers: MCPServerConfig[];
}

/**
 * MCP Tool definition (returned by MCP servers)
 * Note: Uses snake_case for input_schema to match Bedrock's expected format
 */
export interface MCPTool {
  /** Tool name */
  name: string;
  
  /** Human-readable description of what the tool does */
  description: string;
  
  /** JSON Schema defining the tool's input parameters */
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Tool execution request from the LLM
 */
export interface ToolUseRequest {
  /** Name of the tool to execute */
  toolName: string;
  
  /** Input parameters for the tool */
  toolInput: any;
}

/**
 * Result of tool execution
 */
export interface ToolResult {
  /** Whether the tool executed successfully */
  success: boolean;
  
  /** Tool output data (if successful) */
  result?: any;
  
  /** Error message (if failed) */
  error?: string;
}

/**
 * Validates that a configuration object matches the MCPRoleConfig schema
 */
export function validateMCPConfig(config: any): config is MCPRoleConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }

  if (!['guest', 'manager', 'housekeeping', 'maintenance'].includes(config.role)) {
    return false;
  }

  if (!Array.isArray(config.servers)) {
    return false;
  }

  for (const server of config.servers) {
    if (!server.name || typeof server.name !== 'string') {
      return false;
    }
    
    // Validate server type
    if (!server.type || !['http', 'stdio'].includes(server.type)) {
      return false;
    }
    
    // Validate HTTP server configuration
    if (server.type === 'http') {
      if (!server.url || typeof server.url !== 'string') {
        return false;
      }
      if (server.auth) {
        if (!['bearer', 'basic', 'none'].includes(server.auth.type)) {
          return false;
        }
      }
    }
    
    // Validate stdio server configuration
    if (server.type === 'stdio') {
      if (!server.command || typeof server.command !== 'string') {
        return false;
      }
      if (!Array.isArray(server.args)) {
        return false;
      }
    }
    
    // Tools array is optional - if not provided, all tools from server will be exposed
    if (server.tools !== undefined && !Array.isArray(server.tools)) {
      return false;
    }
    
    // ExcludeTools array is optional
    if (server.excludeTools !== undefined && !Array.isArray(server.excludeTools)) {
      return false;
    }
  }

  return true;
}
