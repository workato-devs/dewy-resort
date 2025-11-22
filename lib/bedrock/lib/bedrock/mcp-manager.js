"use strict";
/**
 * MCP Manager
 *
 * Manages MCP (Model Context Protocol) server connections and tool execution.
 * Provides role-based configuration loading, tool discovery, and secure tool execution.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPManager = void 0;
exports.getMCPManager = getMCPManager;
exports.resetMCPManager = resetMCPManager;
const child_process_1 = require("child_process");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const schema_1 = require("../../config/mcp/schema");
/**
 * MCP Manager
 *
 * Manages MCP server lifecycle, tool discovery, and execution with role-based access control.
 */
class MCPManager {
    constructor(options = {}) {
        this.configDir = options.configDir || (0, path_1.join)(process.cwd(), 'config', 'mcp');
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
    async loadConfigForRole(role) {
        // Check cache first
        if (this.configCache.has(role)) {
            return this.configCache.get(role);
        }
        try {
            const configPath = (0, path_1.join)(this.configDir, `${role}.json`);
            const configData = await (0, promises_1.readFile)(configPath, 'utf-8');
            const config = JSON.parse(configData);
            // Validate configuration
            if (!(0, schema_1.validateMCPConfig)(config)) {
                throw new Error(`Invalid MCP configuration for role: ${role}`);
            }
            // Interpolate environment variables in server configs
            this.interpolateEnvVars(config);
            // Cache the configuration
            this.configCache.set(role, config);
            this.log(`Loaded MCP configuration for role: ${role}`);
            return config;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`MCP configuration not found for role: ${role}`);
            }
            throw new Error(`Failed to load MCP configuration for role ${role}: ${error.message}`);
        }
    }
    /**
     * Get available tools for a role
     */
    async getToolsForRole(role) {
        // Load configuration
        const config = await this.loadConfigForRole(role);
        // Get or create connection pool for role
        const pool = await this.getOrCreatePool(role, config);
        // Collect tools from all servers
        const tools = [];
        for (const [serverName, connection] of Array.from(pool.servers.entries())) {
            if (connection.status === 'ready') {
                tools.push(...Array.from(connection.tools.values()));
            }
            else {
                this.log(`Server ${serverName} not ready, skipping tools`);
            }
        }
        return tools;
    }
    /**
     * Execute a tool
     */
    async executeTool(role, toolName, input, userId) {
        try {
            // Validate tool access for role
            if (!await this.canRoleAccessTool(role, toolName)) {
                this.log(`Tool access denied: ${toolName} for role: ${role}`);
                return {
                    success: false,
                    error: `Tool '${toolName}' is not available for your role`,
                };
            }
            // Get connection pool
            const config = await this.loadConfigForRole(role);
            const pool = await this.getOrCreatePool(role, config);
            // Find server that provides this tool
            let targetServer = null;
            for (const connection of Array.from(pool.servers.values())) {
                if (connection.tools.has(toolName)) {
                    targetServer = connection;
                    break;
                }
            }
            if (!targetServer) {
                return {
                    success: false,
                    error: `Tool '${toolName}' not found`,
                };
            }
            if (targetServer.status !== 'ready') {
                return {
                    success: false,
                    error: `Tool server is not ready`,
                };
            }
            // Execute tool with timeout
            this.log(`Executing tool: ${toolName} for user: ${userId}`);
            const result = await this.executeToolOnServer(targetServer, toolName, input);
            // Update last used timestamp
            targetServer.lastUsed = new Date();
            pool.lastUsed = new Date();
            return result;
        }
        catch (error) {
            this.log(`Tool execution error: ${error.message}`);
            return {
                success: false,
                error: `Tool execution failed: ${error.message}`,
            };
        }
    }
    /**
     * Check if a role can access a tool
     */
    async canRoleAccessTool(role, toolName) {
        try {
            const config = await this.loadConfigForRole(role);
            // Check if any server in the role's config provides this tool
            for (const server of config.servers) {
                if (server.tools.includes(toolName)) {
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            this.log(`Error checking tool access: ${error.message}`);
            return false;
        }
    }
    /**
     * Reload configurations from disk
     */
    async reloadConfigs() {
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
    async shutdown() {
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
    async getOrCreatePool(role, config) {
        // Check if pool exists
        if (this.connectionPools.has(role)) {
            const pool = this.connectionPools.get(role);
            pool.lastUsed = new Date();
            return pool;
        }
        // Create new pool
        this.log(`Creating connection pool for role: ${role}`);
        const pool = {
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
    async initializeServers(pool, config) {
        const initPromises = config.servers.map(serverConfig => this.initializeServer(pool, serverConfig));
        await Promise.allSettled(initPromises);
    }
    /**
     * Initialize a single MCP server
     */
    async initializeServer(pool, serverConfig) {
        try {
            this.log(`Initializing MCP server: ${serverConfig.name}`);
            // Spawn server process
            const serverProcess = (0, child_process_1.spawn)(serverConfig.command, serverConfig.args, {
                env: Object.assign(Object.assign({}, process.env), serverConfig.env),
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            const connection = {
                name: serverConfig.name,
                process: serverProcess,
                tools: new Map(),
                lastUsed: new Date(),
                status: 'initializing',
            };
            // Handle process events
            serverProcess.on('error', (error) => {
                this.log(`Server ${serverConfig.name} error: ${error.message}`);
                connection.status = 'error';
                connection.error = error.message;
            });
            serverProcess.on('exit', (code) => {
                this.log(`Server ${serverConfig.name} exited with code: ${code}`);
                connection.status = 'closed';
            });
            // Discover tools from server
            await this.discoverTools(connection, serverConfig);
            // Mark as ready
            connection.status = 'ready';
            pool.servers.set(serverConfig.name, connection);
            this.log(`Server ${serverConfig.name} initialized with ${connection.tools.size} tools`);
        }
        catch (error) {
            this.log(`Failed to initialize server ${serverConfig.name}: ${error.message}`);
        }
    }
    /**
     * Discover tools from an MCP server
     */
    async discoverTools(connection, serverConfig) {
        // For now, create mock tool definitions based on the configured tool names
        // In a real implementation, this would communicate with the MCP server
        // to discover actual tool schemas
        for (const toolName of serverConfig.tools) {
            const tool = {
                name: toolName,
                description: `Tool: ${toolName}`,
                inputSchema: {
                    type: 'object',
                    properties: {},
                    required: [],
                },
            };
            connection.tools.set(toolName, tool);
        }
    }
    /**
     * Execute a tool on a server
     */
    async executeToolOnServer(connection, toolName, input) {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve({
                    success: false,
                    error: 'Tool execution timeout',
                });
            }, this.toolTimeout);
            try {
                // For now, return a mock success result
                // In a real implementation, this would send a request to the MCP server
                // and wait for the response
                clearTimeout(timeout);
                resolve({
                    success: true,
                    result: {
                        message: `Tool ${toolName} executed successfully`,
                        input,
                    },
                });
            }
            catch (error) {
                clearTimeout(timeout);
                resolve({
                    success: false,
                    error: error.message,
                });
            }
        });
    }
    /**
     * Close a connection pool
     */
    async closePool(pool) {
        this.log(`Closing connection pool for role: ${pool.role}`);
        for (const connection of Array.from(pool.servers.values())) {
            await this.closeConnection(connection);
        }
        pool.servers.clear();
    }
    /**
     * Close a server connection
     */
    async closeConnection(connection) {
        if (connection.status === 'closed') {
            return;
        }
        this.log(`Closing server connection: ${connection.name}`);
        try {
            connection.process.kill();
            connection.status = 'closed';
        }
        catch (error) {
            this.log(`Error closing connection ${connection.name}: ${error.message}`);
        }
    }
    /**
     * Start cleanup interval to close idle connections
     */
    startCleanupInterval() {
        this.cleanupInterval = setInterval(() => {
            this.cleanupIdleConnections();
        }, 60000); // Run every minute
    }
    /**
     * Clean up idle connections
     */
    async cleanupIdleConnections() {
        const now = new Date();
        const poolsToRemove = [];
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
    interpolateEnvVars(config) {
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
     * Log debug messages
     */
    log(message) {
        if (this.debug) {
            console.log(`[MCPManager] ${message}`);
        }
    }
}
exports.MCPManager = MCPManager;
/**
 * Singleton instance of MCP Manager
 */
let mcpManagerInstance = null;
/**
 * Get the singleton MCP Manager instance
 */
function getMCPManager(options) {
    if (!mcpManagerInstance) {
        mcpManagerInstance = new MCPManager(options);
    }
    return mcpManagerInstance;
}
/**
 * Reset the MCP Manager instance (useful for testing)
 */
async function resetMCPManager() {
    if (mcpManagerInstance) {
        await mcpManagerInstance.shutdown();
        mcpManagerInstance = null;
    }
}
