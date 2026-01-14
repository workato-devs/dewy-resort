/**
 * MCP Manager
 * 
 * Manages MCP (Model Context Protocol) server connections and tool execution.
 * Provides role-based configuration loading, tool discovery, and secure tool execution.
 */

import { spawn, ChildProcess } from 'child_process';
import { readFile } from 'fs/promises';
import { join } from 'path';
import {
  MCPRoleConfig,
  MCPServerConfig,
  MCPTool,
  ToolUseRequest,
  ToolResult,
  validateMCPConfig,
} from '../../../config/mcp/schema';
import {
  MCPConfigurationError,
  MCPServerError,
  MCPToolExecutionError,
  MCPToolAccessDeniedError,
  MCPToolTimeoutError,
} from './errors';
import { BedrockLogger } from './logger';

/**
 * MCP Server connection state
 */
interface MCPServerConnection {
  name: string;
  type: 'http' | 'stdio';
  process?: ChildProcess; // Only for stdio servers
  url?: string; // Only for HTTP servers
  auth?: { type: 'bearer' | 'basic' | 'none'; token?: string; username?: string; password?: string }; // Only for HTTP servers
  tools: Map<string, MCPTool>;
  lastUsed: Date;
  status: 'initializing' | 'ready' | 'error' | 'closed';
  error?: string;
}

/**
 * Role connection pool entry
 */
interface RoleConnectionPool {
  role: string;
  config: MCPRoleConfig;
  servers: Map<string, MCPServerConnection>;
  lastUsed: Date;
}

/**
 * MCP Manager configuration options
 */
interface MCPManagerOptions {
  /** Directory containing MCP configuration files */
  configDir?: string;
  
  /** Timeout for tool execution in milliseconds */
  toolTimeout?: number;
  
  /** Timeout for idle connections in milliseconds */
  idleTimeout?: number;
  
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * MCP Manager
 * 
 * Manages MCP server lifecycle, tool discovery, and execution with role-based access control.
 */
export class MCPManager {
  private configDir: string;
  private toolTimeout: number;
  private idleTimeout: number;
  private debug: boolean;
  
  // Connection pool: role -> servers
  private connectionPools: Map<string, RoleConnectionPool>;
  
  // Configuration cache: role -> config
  private configCache: Map<string, MCPRoleConfig>;
  
  // Cleanup interval
  private cleanupInterval?: NodeJS.Timeout;
  
  constructor(options: MCPManagerOptions = {}) {
    this.configDir = options.configDir || join(process.cwd(), 'config', 'mcp');
    this.toolTimeout = options.toolTimeout || 30000; // 30 seconds
    this.idleTimeout = options.idleTimeout || 30 * 60 * 1000; // 30 minutes
    this.debug = options.debug || false;
    
    this.connectionPools = new Map();
    this.configCache = new Map();
    
    // Start cleanup interval to close idle connections
    this.startCleanupInterval();
  }
  
  /**
   * Load MCP configuration for a role
   */
  async loadConfigForRole(role: string): Promise<MCPRoleConfig> {
    // Check cache first
    if (this.configCache.has(role)) {
      return this.configCache.get(role)!;
    }
    
    try {
      const configPath = join(this.configDir, `${role}.json`);
      const configData = await readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);
      
      // Validate configuration
      if (!validateMCPConfig(config)) {
        BedrockLogger.logConfigLoad('mcp', role, false);
        throw new MCPConfigurationError(`Invalid MCP configuration for role: ${role}`);
      }
      
      // Interpolate environment variables in server configs
      this.interpolateEnvVars(config);
      
      // Cache the configuration
      this.configCache.set(role, config);
      
      BedrockLogger.logConfigLoad('mcp', role, true);
      return config;
    } catch (error) {
      BedrockLogger.logConfigLoad('mcp', role, false);
      
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new MCPConfigurationError(`MCP configuration not found for role: ${role}`);
      }
      
      if (error instanceof MCPConfigurationError) {
        throw error;
      }
      
      throw new MCPConfigurationError(
        `Failed to load MCP configuration for role ${role}`,
        { originalError: error }
      );
    }
  }
  
  /**
   * Get available tools for a role
   */
  async getToolsForRole(role: string): Promise<MCPTool[]> {
    // Load configuration
    const config = await this.loadConfigForRole(role);
    
    // Get or create connection pool for role
    const pool = await this.getOrCreatePool(role, config);
    
    // Collect tools from all servers
    const tools: MCPTool[] = [];
    for (const [serverName, connection] of Array.from(pool.servers.entries())) {
      if (connection.status === 'ready') {
        tools.push(...Array.from(connection.tools.values()));
      } else {
        this.log(`Server ${serverName} not ready, skipping tools`);
      }
    }
    
    return tools;
  }
  
  /**
   * Execute a tool
   */
  async executeTool(
    role: string,
    toolName: string,
    input: any,
    userId: string,
    conversationId?: string
  ): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Log tool invocation
      BedrockLogger.logToolInvoke(userId, role, toolName, conversationId);
      
      // Validate tool access for role
      if (!await this.canRoleAccessTool(role, toolName)) {
        BedrockLogger.logToolComplete(userId, role, toolName, Date.now() - startTime, false, conversationId);
        throw new MCPToolAccessDeniedError(toolName, role);
      }
      
      // Get connection pool
      const config = await this.loadConfigForRole(role);
      const pool = await this.getOrCreatePool(role, config);
      
      // Find server that provides this tool
      let targetServer: MCPServerConnection | null = null;
      for (const connection of Array.from(pool.servers.values())) {
        if (connection.tools.has(toolName)) {
          targetServer = connection;
          break;
        }
      }
      
      if (!targetServer) {
        BedrockLogger.logToolComplete(userId, role, toolName, Date.now() - startTime, false, conversationId);
        throw new MCPToolExecutionError(toolName, 'Tool not found');
      }
      
      if (targetServer.status !== 'ready') {
        BedrockLogger.logToolComplete(userId, role, toolName, Date.now() - startTime, false, conversationId);
        throw new MCPServerError(targetServer.name, 'Server not ready');
      }
      
      // Log tool parameters for debugging
      this.log(`Executing tool ${toolName} with input: ${JSON.stringify(input)}`);
      
      // Execute tool with timeout
      const result = await this.executeToolOnServer(targetServer, toolName, input);
      
      // Update last used timestamp
      targetServer.lastUsed = new Date();
      pool.lastUsed = new Date();
      
      // Log successful completion
      const duration = Date.now() - startTime;
      BedrockLogger.logToolComplete(userId, role, toolName, duration, true, conversationId);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      BedrockLogger.logToolComplete(userId, role, toolName, duration, false, conversationId);
      
      // Re-throw if already a proper error
      if (error instanceof MCPToolAccessDeniedError ||
          error instanceof MCPToolExecutionError ||
          error instanceof MCPServerError ||
          error instanceof MCPToolTimeoutError) {
        throw error;
      }
      
      // Wrap unknown errors
      throw new MCPToolExecutionError(
        toolName,
        error instanceof Error ? error.message : 'Unknown error',
        { originalError: error }
      );
    }
  }

  /**
   * Execute a tool and return a ToolResult (for backward compatibility)
   */
  async executeToolSafe(
    role: string,
    toolName: string,
    input: any,
    userId: string,
    conversationId?: string
  ): Promise<ToolResult> {
    try {
      return await this.executeTool(role, toolName, input, userId, conversationId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
      };
    }
  }
  
  /**
   * Check if a role can access a tool
   */
  async canRoleAccessTool(role: string, toolName: string): Promise<boolean> {
    try {
      const config = await this.loadConfigForRole(role);
      
      // Check if any server in the role's config provides this tool
      for (const server of config.servers) {
        // If tools array is empty/undefined, all tools are allowed
        if (!server.tools || server.tools.length === 0) {
          return true;
        }
        // Otherwise check if tool is in the allowed list
        if (server.tools.includes(toolName)) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.log(`Error checking tool access: ${(error as Error).message}`);
      return false;
    }
  }
  
  /**
   * Reload configurations from disk
   */
  async reloadConfigs(): Promise<void> {
    this.log('Reloading MCP configurations');
    this.configCache.clear();
    
    // Close all existing connections
    for (const pool of Array.from(this.connectionPools.values())) {
      await this.closePool(pool);
    }
    this.connectionPools.clear();
  }
  
  /**
   * Shutdown the MCP Manager and close all connections
   */
  async shutdown(): Promise<void> {
    this.log('Shutting down MCP Manager');
    
    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Close all connection pools
    for (const pool of Array.from(this.connectionPools.values())) {
      await this.closePool(pool);
    }
    
    this.connectionPools.clear();
    this.configCache.clear();
  }
  
  /**
   * Get or create connection pool for a role
   */
  private async getOrCreatePool(
    role: string,
    config: MCPRoleConfig
  ): Promise<RoleConnectionPool> {
    // Check if pool exists
    if (this.connectionPools.has(role)) {
      const pool = this.connectionPools.get(role)!;
      pool.lastUsed = new Date();
      return pool;
    }
    
    // Create new pool
    this.log(`Creating connection pool for role: ${role}`);
    const pool: RoleConnectionPool = {
      role,
      config,
      servers: new Map(),
      lastUsed: new Date(),
    };
    
    // Initialize servers
    await this.initializeServers(pool, config);
    
    this.connectionPools.set(role, pool);
    return pool;
  }
  
  /**
   * Initialize MCP servers for a role
   */
  private async initializeServers(
    pool: RoleConnectionPool,
    config: MCPRoleConfig
  ): Promise<void> {
    const initPromises = config.servers.map(serverConfig =>
      this.initializeServer(pool, serverConfig)
    );
    
    await Promise.allSettled(initPromises);
  }
  
  /**
   * Initialize a single MCP server
   */
  private async initializeServer(
    pool: RoleConnectionPool,
    serverConfig: MCPServerConfig
  ): Promise<void> {
    try {
      this.log(`Initializing MCP server: ${serverConfig.name} (type: ${serverConfig.type})`);
      
      if (serverConfig.type === 'http') {
        await this.initializeHttpServer(pool, serverConfig);
      } else if (serverConfig.type === 'stdio') {
        await this.initializeStdioServer(pool, serverConfig);
      } else {
        throw new Error(`Unsupported server type: ${serverConfig.type}`);
      }
    } catch (error) {
      this.log(`Failed to initialize server ${serverConfig.name}: ${(error as Error).message}`);
    }
  }
  
  /**
   * Initialize an HTTP-based MCP server
   */
  private async initializeHttpServer(
    pool: RoleConnectionPool,
    serverConfig: MCPServerConfig
  ): Promise<void> {
    if (!serverConfig.url) {
      throw new Error(`HTTP server ${serverConfig.name} missing URL`);
    }
    
    // Interpolate environment variables in URL and auth
    const url = this.interpolateString(serverConfig.url);
    const auth = serverConfig.auth ? {
      type: serverConfig.auth.type,
      token: serverConfig.auth.token ? this.interpolateString(serverConfig.auth.token) : undefined,
      username: serverConfig.auth.username ? this.interpolateString(serverConfig.auth.username) : undefined,
      password: serverConfig.auth.password ? this.interpolateString(serverConfig.auth.password) : undefined,
    } : undefined;
    
    const connection: MCPServerConnection = {
      name: serverConfig.name,
      type: 'http',
      url,
      auth,
      tools: new Map(),
      lastUsed: new Date(),
      status: 'initializing',
    };
    
    // Discover tools from server
    await this.discoverTools(connection, serverConfig);
    
    // Mark as ready
    connection.status = 'ready';
    pool.servers.set(serverConfig.name, connection);
    
    this.log(`HTTP server ${serverConfig.name} initialized with ${connection.tools.size} tools`);
  }
  
  /**
   * Initialize a stdio-based MCP server
   */
  private async initializeStdioServer(
    pool: RoleConnectionPool,
    serverConfig: MCPServerConfig
  ): Promise<void> {
    if (!serverConfig.command) {
      throw new Error(`Stdio server ${serverConfig.name} missing command`);
    }
    
    // Spawn server process
    const serverProcess = spawn(serverConfig.command, serverConfig.args || [], {
      env: {
        ...process.env,
        ...serverConfig.env,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    
    const connection: MCPServerConnection = {
      name: serverConfig.name,
      type: 'stdio',
      process: serverProcess,
      tools: new Map(),
      lastUsed: new Date(),
      status: 'initializing',
    };
    
    // Handle process events
    serverProcess.on('error', (error: Error) => {
      this.log(`Server ${serverConfig.name} error: ${error.message}`);
      connection.status = 'error';
      connection.error = error.message;
    });
    
    serverProcess.on('exit', (code: number | null) => {
      this.log(`Server ${serverConfig.name} exited with code: ${code}`);
      connection.status = 'closed';
    });
    
    // Discover tools from server
    await this.discoverTools(connection, serverConfig);
    
    // Mark as ready
    connection.status = 'ready';
    pool.servers.set(serverConfig.name, connection);
    
    this.log(`Stdio server ${serverConfig.name} initialized with ${connection.tools.size} tools`);
  }
  
  /**
   * Discover tools from an MCP server
   */
  private async discoverTools(
    connection: MCPServerConnection,
    serverConfig: MCPServerConfig
  ): Promise<void> {
    if (connection.type === 'http') {
      // Query HTTP MCP server for available tools
      await this.discoverHttpTools(connection, serverConfig);
    } else {
      // For stdio servers, query via JSON-RPC
      await this.discoverStdioTools(connection, serverConfig);
    }
  }
  
  /**
   * Discover tools from an HTTP MCP server
   */
  private async discoverHttpTools(
    connection: MCPServerConnection,
    serverConfig: MCPServerConfig
  ): Promise<void> {
    try {
      if (!connection.url) {
        throw new Error('HTTP server missing URL');
      }
      
      // Prepare request headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add authentication
      if (connection.auth) {
        if (connection.auth.type === 'bearer' && connection.auth.token) {
          headers['Authorization'] = `Bearer ${connection.auth.token}`;
        } else if (connection.auth.type === 'basic' && connection.auth.username && connection.auth.password) {
          const credentials = Buffer.from(`${connection.auth.username}:${connection.auth.password}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
      }
      
      // Call tools/list endpoint (remove trailing slash from URL if present)
      const baseUrl = connection.url.endsWith('/') ? connection.url.slice(0, -1) : connection.url;
      const response = await fetch(`${baseUrl}/tools/list`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {},
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout for discovery
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Parse MCP response
      if (data.error) {
        throw new Error(`MCP error: ${data.error.message || JSON.stringify(data.error)}`);
      }
      
      if (!data.result) {
        throw new Error('Invalid tools/list response: missing result');
      }
      
      // Parse tools from response - handle both formats:
      // 1. {result: {tools: [...]}} - standard MCP format
      // 2. {result: [...]} - simplified format
      const tools = data.result.tools || data.result;
      
      if (!Array.isArray(tools)) {
        throw new Error(`Invalid tools/list response: expected array of tools, got ${typeof tools}`);
      }
      
      // Filter tools based on configuration
      // If tools array is empty or not specified, expose all tools
      const allowedTools = serverConfig.tools && serverConfig.tools.length > 0 
        ? new Set(serverConfig.tools) 
        : null;
      
      // Build exclude set if specified
      const excludedTools = serverConfig.excludeTools && serverConfig.excludeTools.length > 0
        ? new Set(serverConfig.excludeTools)
        : null;
      
      for (const tool of tools) {
        // Skip if tool is in exclude list
        if (excludedTools && excludedTools.has(tool.name)) {
          continue;
        }
        
        // Only add tools that are in the allowed list (or all if no filter)
        if (!allowedTools || allowedTools.has(tool.name)) {
          connection.tools.set(tool.name, {
            name: tool.name,
            description: tool.description || `Tool: ${tool.name}`,
            input_schema: tool.inputSchema || tool.input_schema || {
              type: 'object',
              properties: {},
              required: [],
            },
          });
        }
      }
      
      const filterMsg = excludedTools 
        ? `excluded ${excludedTools.size} tools` 
        : allowedTools 
          ? 'filtered' 
          : 'all tools';
      this.log(`Discovered ${connection.tools.size} tools from HTTP server ${connection.name} (${filterMsg})`);
      
    } catch (error) {
      this.log(`Failed to discover tools from HTTP server ${connection.name}: ${(error as Error).message}`);
      
      // Fall back to creating mock tool definitions if tools are specified
      if (serverConfig.tools && serverConfig.tools.length > 0) {
        this.log(`Using mock tool definitions for ${connection.name}`);
        for (const toolName of serverConfig.tools) {
          connection.tools.set(toolName, {
            name: toolName,
            description: `Tool: ${toolName}`,
            input_schema: {
              type: 'object',
              properties: {},
              required: [],
            },
          });
        }
      } else {
        this.log(`No tools configured for ${connection.name} and discovery failed`);
      }
    }
  }
  
  /**
   * Discover tools from a stdio MCP server
   */
  private async discoverStdioTools(
    connection: MCPServerConnection,
    serverConfig: MCPServerConfig
  ): Promise<void> {
    if (!connection.process || !connection.process.stdin || !connection.process.stdout) {
      this.log(`Cannot discover tools from stdio server ${connection.name}: process not available`);
      return;
    }

    try {
      // Send tools/list request via JSON-RPC
      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/list',
      };

      const response = await new Promise<any>((resolve, reject) => {
        let responseData = '';
        const timeout = setTimeout(() => {
          reject(new Error('Tool discovery timeout'));
        }, 5000);

        const onData = (chunk: Buffer) => {
          responseData += chunk.toString();
          try {
            const parsed = JSON.parse(responseData.trim());
            clearTimeout(timeout);
            if (connection.process && connection.process.stdout) {
              connection.process.stdout.removeListener('data', onData);
            }
            resolve(parsed);
          } catch {
            // Not complete JSON yet, wait for more
          }
        };

        if (connection.process && connection.process.stdout) {
          connection.process.stdout.on('data', onData);
        }

        if (connection.process && connection.process.stdin) {
          connection.process.stdin.write(JSON.stringify(request) + '\n');
        }
      });

      if (response.error) {
        throw new Error(`JSON-RPC error: ${response.error.message || JSON.stringify(response.error)}`);
      }

      const tools = response.result?.tools || [];
      
      // Filter tools based on configuration
      const allowedTools = serverConfig.tools && serverConfig.tools.length > 0 
        ? new Set(serverConfig.tools) 
        : null;
      
      // Build exclude set if specified
      const excludedTools = serverConfig.excludeTools && serverConfig.excludeTools.length > 0
        ? new Set(serverConfig.excludeTools)
        : null;
      
      for (const tool of tools) {
        // Skip if tool is in exclude list
        if (excludedTools && excludedTools.has(tool.name)) {
          continue;
        }
        
        // Only add tools that are in the allowed list (or all if no filter)
        if (!allowedTools || allowedTools.has(tool.name)) {
          connection.tools.set(tool.name, {
            name: tool.name,
            description: tool.description || `Tool: ${tool.name}`,
            input_schema: tool.inputSchema || tool.input_schema || {
              type: 'object',
              properties: {},
              required: [],
            },
          });
        }
      }
      
      const filterMsg = excludedTools 
        ? `excluded ${excludedTools.size} tools` 
        : allowedTools 
          ? 'filtered' 
          : 'all tools';
      this.log(`Discovered ${connection.tools.size} tools from stdio server ${connection.name} (${filterMsg})`);
      
    } catch (error) {
      this.log(`Failed to discover tools from stdio server ${connection.name}: ${(error as Error).message}`);
      
      // Fall back to mock tool definitions if tools are specified
      if (serverConfig.tools && serverConfig.tools.length > 0) {
        this.log(`Using mock tool definitions for ${connection.name}`);
        for (const toolName of serverConfig.tools) {
          connection.tools.set(toolName, {
            name: toolName,
            description: `Tool: ${toolName}`,
            input_schema: {
              type: 'object',
              properties: {},
              required: [],
            },
          });
        }
      }
    }
  }
  
  /**
   * Execute a tool on a server
   */
  private async executeToolOnServer(
    connection: MCPServerConnection,
    toolName: string,
    input: any
  ): Promise<ToolResult> {
    if (connection.type === 'http') {
      return this.executeHttpTool(connection, toolName, input);
    } else {
      return this.executeStdioTool(connection, toolName, input);
    }
  }
  
  /**
   * Execute a tool on an HTTP server
   */
  private async executeHttpTool(
    connection: MCPServerConnection,
    toolName: string,
    input: any
  ): Promise<ToolResult> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({
          success: false,
          error: 'Tool execution timeout',
        });
      }, this.toolTimeout);
      
      (async () => {
        try {
          if (!connection.url) {
            throw new Error('HTTP server missing URL');
          }
          
          // Prepare request headers
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          
          // Add authentication
          if (connection.auth) {
            if (connection.auth.type === 'bearer' && connection.auth.token) {
              headers['Authorization'] = `Bearer ${connection.auth.token}`;
            } else if (connection.auth.type === 'basic' && connection.auth.username && connection.auth.password) {
              const credentials = Buffer.from(`${connection.auth.username}:${connection.auth.password}`).toString('base64');
              headers['Authorization'] = `Basic ${credentials}`;
            }
          }
          
          // Make HTTP request to MCP server using JSON-RPC protocol
          // Remove trailing slash from URL if present
          const baseUrl = connection.url.endsWith('/') ? connection.url.slice(0, -1) : connection.url;
          const response = await fetch(`${baseUrl}/tools/call`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: Date.now(),
              method: 'tools/call',
              params: {
                name: toolName,
                arguments: input,
              },
            }),
            signal: AbortSignal.timeout(this.toolTimeout),
          });
          
          // Get response text first to handle empty or non-JSON responses
          const responseText = await response.text();
          
          if (!response.ok) {
            // Try to parse error as JSON
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
              const errorData = JSON.parse(responseText);
              if (errorData.error) {
                errorMessage = `HTTP ${response.status}: ${errorData.error.message || JSON.stringify(errorData.error)}`;
              } else if (errorData.error_message) {
                errorMessage = `HTTP ${response.status}: ${errorData.error_message}`;
              } else {
                errorMessage = `HTTP ${response.status}: ${responseText}`;
              }
            } catch {
              errorMessage = `HTTP ${response.status}: ${responseText}`;
            }
            throw new Error(errorMessage);
          }
          
          // Parse response JSON
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (error) {
            throw new Error(`Failed to parse MCP response as JSON. Response: ${responseText.substring(0, 200)}`);
          }
          
          // Parse MCP response
          if (data.error) {
            throw new Error(`MCP error: ${data.error.message || JSON.stringify(data.error)}`);
          }
          
          // Check if the result indicates an error (Workato MCP format)
          if (data.result?.isError) {
            const errorText = data.result.content?.[0]?.text || 'Tool execution failed';
            console.log(`[MCPManager] Tool ${toolName} returned error:`, errorText);
            console.log(`[MCPManager] Full response:`, JSON.stringify(data, null, 2));
            throw new Error(errorText);
          }
          
          clearTimeout(timeout);
          console.log(`[MCPManager] Tool ${toolName} succeeded`);
          resolve({
            success: true,
            result: data.result,
          });
        } catch (error) {
          clearTimeout(timeout);
          resolve({
            success: false,
            error: (error as Error).message,
          });
        }
      })();
    });
  }
  
  /**
   * Execute a tool on a stdio server
   */
  private async executeStdioTool(
    connection: MCPServerConnection,
    toolName: string,
    input: any
  ): Promise<ToolResult> {
    if (!connection.process) {
      return {
        success: false,
        error: 'No process available for stdio server',
      };
    }

    if (!connection.process.stdin || !connection.process.stdout) {
      return {
        success: false,
        error: 'Process stdin/stdout not available',
      };
    }

    return new Promise((resolve) => {
      let timeoutHandle: NodeJS.Timeout | null = null;
      let resolved = false;
      let responseData = '';
      
      const cleanup = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
        if (connection.process && connection.process.stdout) {
          connection.process.stdout.removeListener('data', onData);
        }
        if (connection.process && connection.process.stderr) {
          connection.process.stderr.removeListener('data', onError);
        }
      };
      
      const safeResolve = (result: ToolResult) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(result);
        }
      };
      
      // Set up response handler
      const onData = (chunk: Buffer) => {
          const chunkStr = chunk.toString();
          console.log(`[MCP Debug] Received chunk (${chunkStr.length} bytes):`, chunkStr.substring(0, 100));
          responseData += chunkStr;
          console.log(`[MCP Debug] Total responseData (${responseData.length} bytes)`);
          
          // Try to parse as complete JSON
          // JSON-RPC responses end with newline, but may contain newlines in content
          try {
            // Trim to remove trailing whitespace/newlines
            const trimmed = responseData.trim();
            if (trimmed.length === 0) {
              console.log('[MCP Debug] Empty response data, waiting for more');
              return;
            }
            
            console.log('[MCP Debug] Attempting to parse JSON, length:', trimmed.length);
            const response = JSON.parse(trimmed);
            console.log('[MCP Debug] Successfully parsed JSON response');
            
            // Check for JSON-RPC error
            if (response.error) {
              console.log('[MCP Debug] JSON-RPC error:', response.error);
              safeResolve({
                success: false,
                error: response.error.message || 'Tool execution failed',
              });
              return;
            }
            
            // Check if the result indicates an error (isError flag)
            if (response.result?.isError) {
              const errorText = response.result.content?.[0]?.text || 'Tool execution failed';
              console.log(`[MCP Debug] Tool ${toolName} returned error:`, errorText);
              safeResolve({
                success: false,
                error: errorText,
              });
              return;
            }
            
            // Extract result from MCP response format
            if (response.result && response.result.content) {
              const content = response.result.content;
              console.log('[MCP Debug] Found result.content, array:', Array.isArray(content), 'length:', content.length);
              if (Array.isArray(content) && content.length > 0) {
                const textContent = content.find((c: any) => c.type === 'text');
                if (textContent) {
                  console.log('[MCP Debug] Found text content, resolving with result');
                  safeResolve({
                    success: true,
                    result: textContent.text,
                  });
                  return;
                }
              }
            }
            
            // Fallback: return raw result
            console.log('[MCP Debug] Using fallback, returning raw result');
            safeResolve({
              success: true,
              result: response.result,
            });
          } catch (parseError) {
            // Not complete JSON yet, wait for more data
            console.log('[MCP Debug] Parse error:', (parseError as Error).message, 'Data length:', responseData.length);
            // Only log full error if we seem to have a lot of data that's failing
            if (responseData.length > 200 && responseData.includes('}')) {
              console.error('[MCP Parse Error]', parseError, 'Data length:', responseData.length, 'Preview:', responseData.substring(0, 100));
            }
          }
        };
        
        const onError = (chunk: Buffer) => {
          const errorMsg = chunk.toString();
          // Ignore stderr messages that are just logging
          if (!errorMsg.includes('MCP server running')) {
            console.error('[MCP Stdio Error]', errorMsg);
          }
        };
      
      timeoutHandle = setTimeout(() => {
        safeResolve({
          success: false,
          error: 'Tool execution timeout',
        });
      }, this.toolTimeout);
      
      try {
        const requestId = Date.now();
        const request = {
          jsonrpc: '2.0',
          id: requestId,
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: input,
          },
        };
        
        // Attach listeners
        const proc = connection.process;
        if (proc && proc.stdout) {
          proc.stdout.on('data', onData);
        }
        if (proc && proc.stderr) {
          proc.stderr.on('data', onError);
        }
        
        // Send request
        const requestStr = JSON.stringify(request) + '\n';
        console.log('[MCP Debug] Sending request:', toolName, 'Request ID:', requestId);
        console.log('[MCP Debug] Request string:', requestStr.substring(0, 200));
        if (proc && proc.stdin) {
          proc.stdin.write(requestStr, (err) => {
            if (err) {
              console.error('[MCP Debug] Failed to write to stdin:', err);
              safeResolve({
                success: false,
                error: `Failed to write to stdin: ${err.message}`,
              });
            } else {
              console.log('[MCP Debug] Successfully wrote request to stdin');
            }
          });
        } else {
          console.error('[MCP Debug] Process stdin not available');
          safeResolve({
            success: false,
            error: 'Process stdin not available',
          });
        }
        
      } catch (error) {
        safeResolve({
          success: false,
          error: (error as Error).message,
        });
      }
    });
  }
  
  /**
   * Close a connection pool
   */
  private async closePool(pool: RoleConnectionPool): Promise<void> {
    this.log(`Closing connection pool for role: ${pool.role}`);
    
    for (const connection of Array.from(pool.servers.values())) {
      await this.closeConnection(connection);
    }
    
    pool.servers.clear();
  }
  
  /**
   * Close a server connection
   */
  private async closeConnection(connection: MCPServerConnection): Promise<void> {
    if (connection.status === 'closed') {
      return;
    }
    
    this.log(`Closing server connection: ${connection.name}`);
    
    try {
      if (connection.type === 'stdio' && connection.process) {
        connection.process.kill();
      }
      // HTTP connections don't need explicit cleanup
      connection.status = 'closed';
    } catch (error) {
      this.log(`Error closing connection ${connection.name}: ${(error as Error).message}`);
    }
  }
  
  /**
   * Start cleanup interval to close idle connections
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 60000); // Run every minute
  }
  
  /**
   * Clean up idle connections
   */
  private async cleanupIdleConnections(): Promise<void> {
    const now = new Date();
    const poolsToRemove: string[] = [];
    
    for (const [role, pool] of Array.from(this.connectionPools.entries())) {
      const idleTime = now.getTime() - pool.lastUsed.getTime();
      
      if (idleTime > this.idleTimeout) {
        this.log(`Closing idle connection pool for role: ${role}`);
        await this.closePool(pool);
        poolsToRemove.push(role);
      }
    }
    
    // Remove closed pools
    for (const role of poolsToRemove) {
      this.connectionPools.delete(role);
    }
  }
  
  /**
   * Interpolate environment variables in server configuration
   */
  private interpolateEnvVars(config: MCPRoleConfig): void {
    for (const server of config.servers) {
      if (server.env) {
        for (const [key, value] of Object.entries(server.env)) {
          // Replace ${VAR_NAME} with actual environment variable value
          const interpolated = value.replace(/\$\{([^}]+)\}/g, (_, varName) => {
            return process.env[varName] || '';
          });
          server.env[key] = interpolated;
        }
      }
    }
  }
  
  /**
   * Interpolate environment variables in a string
   */
  private interpolateString(value: string): string {
    return value.replace(/\$\{([^}]+)\}/g, (_, varName) => {
      return process.env[varName] || '';
    });
  }
  
  /**
   * Log debug messages
   */
  private log(message: string): void {
    if (this.debug) {
      console.log(`[MCPManager] ${message}`);
    }
  }
}

/**
 * Singleton instance of MCP Manager
 */
let mcpManagerInstance: MCPManager | null = null;

/**
 * Get the singleton MCP Manager instance
 */
export function getMCPManager(options?: MCPManagerOptions): MCPManager {
  if (!mcpManagerInstance) {
    mcpManagerInstance = new MCPManager(options);
  }
  return mcpManagerInstance;
}

/**
 * Reset the MCP Manager instance (useful for testing)
 */
export async function resetMCPManager(): Promise<void> {
  if (mcpManagerInstance) {
    await mcpManagerInstance.shutdown();
    mcpManagerInstance = null;
  }
}
