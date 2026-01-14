# MCP Manager Implementation

## Overview

The MCP Manager is a core component of the Bedrock chat integration that manages Model Context Protocol (MCP) server connections and tool execution. It provides role-based access control, tool discovery, and secure tool execution for all user roles in the hotel management system.

## Features

### 1. Role-Based Configuration Loading

The MCP Manager loads role-specific configurations from JSON files in the `config/mcp/` directory:

- `guest.json` - Guest tools (service requests, room controls, billing)
- `manager.json` - Manager tools (analytics, operations, bookings)
- `housekeeping.json` - Housekeeping tools (tasks, room status, supplies)
- `maintenance.json` - Maintenance tools (work orders, equipment, parts)

**Example Usage:**
```typescript
const manager = new MCPManager();
const config = await manager.loadConfigForRole('guest');
console.log(`Loaded ${config.servers.length} servers for guest role`);
```

### 2. Tool Discovery

The MCP Manager discovers available tools from MCP servers and provides them to the LLM:

```typescript
const tools = await manager.getToolsForRole('manager');
console.log(`Manager has access to ${tools.length} tools`);
tools.forEach(tool => {
  console.log(`- ${tool.name}: ${tool.description}`);
});
```

### 3. Role-Based Access Control

The manager enforces strict role-based access control to ensure users can only access tools appropriate for their role:

```typescript
// Check if a role can access a specific tool
const canAccess = await manager.canRoleAccessTool('guest', 'create_service_request');
// Returns: true

const cannotAccess = await manager.canRoleAccessTool('guest', 'get_occupancy_stats');
// Returns: false (manager-only tool)
```

### 4. Tool Execution

Execute tools securely with automatic role validation:

```typescript
const result = await manager.executeTool(
  'guest',
  'create_service_request',
  {
    category: 'housekeeping',
    description: 'Need extra towels',
    priority: 'medium'
  },
  'user-123'
);

if (result.success) {
  console.log('Service request created:', result.result);
} else {
  console.error('Error:', result.error);
}
```

### 5. Connection Pooling and Lifecycle Management

The MCP Manager maintains connection pools for each role and automatically manages server lifecycle:

- **Lazy Initialization**: Servers are spawned only when first needed
- **Connection Pooling**: Reuses existing connections for the same role
- **Idle Timeout**: Closes connections after 30 minutes of inactivity
- **Automatic Cleanup**: Periodically cleans up idle connections
- **Graceful Shutdown**: Properly closes all connections on shutdown

```typescript
// Connections are automatically managed
const tools1 = await manager.getToolsForRole('guest'); // Spawns servers
const tools2 = await manager.getToolsForRole('guest'); // Reuses connections

// Manually reload configurations if needed
await manager.reloadConfigs();

// Shutdown when done
await manager.shutdown();
```

## Architecture

### Connection Pool Structure

```
MCPManager
├── Connection Pools (Map<role, RoleConnectionPool>)
│   ├── guest
│   │   ├── hotel-services (MCPServerConnection)
│   │   │   ├── process: ChildProcess
│   │   │   ├── tools: Map<name, MCPTool>
│   │   │   ├── status: 'ready' | 'initializing' | 'error' | 'closed'
│   │   │   └── lastUsed: Date
│   │   └── room-controls (MCPServerConnection)
│   ├── manager
│   │   ├── hotel-analytics (MCPServerConnection)
│   │   └── hotel-operations (MCPServerConnection)
│   ├── housekeeping
│   │   └── housekeeping-tasks (MCPServerConnection)
│   └── maintenance
│       └── maintenance-tasks (MCPServerConnection)
└── Configuration Cache (Map<role, MCPRoleConfig>)
```

### Server Lifecycle

1. **Initialization**: Server process spawned with configured command and args
2. **Tool Discovery**: Tools are discovered from server configuration
3. **Ready State**: Server marked as ready for tool execution
4. **Active Use**: Server processes tool execution requests
5. **Idle State**: Server remains running but unused
6. **Cleanup**: Server closed after idle timeout
7. **Shutdown**: Server process terminated gracefully

## Configuration

### MCP Manager Options

```typescript
const manager = new MCPManager({
  configDir: './config/mcp',      // Directory containing role configs
  toolTimeout: 30000,              // Tool execution timeout (30s)
  idleTimeout: 1800000,            // Idle connection timeout (30min)
  debug: false                     // Enable debug logging
});
```

### Environment Variable Interpolation

MCP server configurations support environment variable interpolation:

```json
{
  "name": "room-controls",
  "command": "node",
  "args": ["mcp-servers/room-controls/index.js"],
  "env": {
    "HOME_ASSISTANT_URL": "${HOME_ASSISTANT_URL}",
    "HOME_ASSISTANT_TOKEN": "${HOME_ASSISTANT_TOKEN}"
  }
}
```

The manager automatically replaces `${VAR_NAME}` with the actual environment variable value.

## Security

### Role Validation

Every tool execution is validated against the role's configuration:

1. Check if the role has access to the requested tool
2. Verify the tool exists in the role's server configuration
3. Ensure the server is in a ready state
4. Execute the tool with timeout protection
5. Log the execution with user ID for audit

### Tool Access Matrix

| Role | Guest Tools | Manager Tools | Housekeeping Tools | Maintenance Tools |
|------|-------------|---------------|-------------------|-------------------|
| Guest | ✅ | ❌ | ❌ | ❌ |
| Manager | ❌ | ✅ | ❌ | ❌ |
| Housekeeping | ❌ | ❌ | ✅ | ❌ |
| Maintenance | ❌ | ❌ | ❌ | ✅ |

### Audit Logging

All tool executions are logged with:
- User ID
- Role
- Tool name
- Timestamp
- Execution result

## Error Handling

The MCP Manager handles various error scenarios gracefully:

### Configuration Errors

```typescript
try {
  await manager.loadConfigForRole('invalid-role');
} catch (error) {
  // Error: MCP configuration not found for role: invalid-role
}
```

### Tool Access Errors

```typescript
const result = await manager.executeTool('guest', 'manager_only_tool', {}, 'user-123');
// Returns: { success: false, error: "Tool 'manager_only_tool' is not available for your role" }
```

### Server Errors

If an MCP server fails to start or crashes:
- The server is marked with status 'error'
- Tools from that server are unavailable
- Other servers continue to function normally
- Error is logged for troubleshooting

### Timeout Protection

Tool execution has a configurable timeout (default 30 seconds):
```typescript
const result = await manager.executeTool('guest', 'slow_tool', {}, 'user-123');
// If timeout: { success: false, error: "Tool execution timeout" }
```

## Integration with Bedrock

The MCP Manager integrates with the Bedrock service to provide tools to the LLM:

```typescript
// In the chat streaming endpoint
const manager = getMCPManager();
const tools = await manager.getToolsForRole(userRole);

// Pass tools to Bedrock
const bedrockService = new BedrockService(credentials, region);
const stream = bedrockService.streamInvoke({
  model: 'anthropic.claude-3-sonnet-20240229-v1:0',
  messages: conversationMessages,
  systemPrompt: rolePrompt,
  tools: tools  // MCP tools available to the LLM
});

// When LLM requests tool use
for await (const chunk of stream) {
  if (chunk.type === 'tool_use') {
    const result = await manager.executeTool(
      userRole,
      chunk.toolUse.toolName,
      chunk.toolUse.toolInput,
      userId
    );
    // Return result to LLM
  }
}
```

## Testing

### Manual Validation

A validation script is provided to test the MCP Manager:

```bash
node lib/bedrock/__tests__/validate-mcp-manager.js
```

This script validates:
- Configuration loading for all roles
- Tool discovery
- Role-based access control
- Tool execution
- Configuration caching
- Error handling

### Unit Tests

Unit tests are available in `lib/bedrock/__tests__/mcp-manager.test.ts` and cover:
- Configuration loading and validation
- Tool discovery and schema validation
- Role-based access control
- Tool execution with various scenarios
- Lifecycle management
- Error handling

## Performance Considerations

### Connection Reuse

The MCP Manager reuses server connections for the same role, avoiding the overhead of spawning new processes for each request.

### Lazy Initialization

Servers are only spawned when first needed, reducing resource usage for unused roles.

### Automatic Cleanup

Idle connections are automatically closed after 30 minutes, freeing up system resources.

### Caching

Role configurations are cached in memory after first load, avoiding repeated file I/O.

## Future Enhancements

### Phase 2

1. **Real MCP Protocol Implementation**: Currently uses mock tool execution; implement actual MCP protocol communication
2. **HTTP-based MCP Servers**: Support MCP servers over HTTP in addition to stdio
3. **Tool Result Caching**: Cache tool results for idempotent operations
4. **Advanced Monitoring**: Add metrics for tool execution times, success rates, and error rates

### Phase 3

1. **Dynamic Tool Loading**: Support hot-reloading of tools without restarting servers
2. **Tool Composition**: Allow tools to call other tools
3. **Custom Tool Validation**: Add custom validation logic for tool inputs
4. **Tool Rate Limiting**: Implement per-tool rate limiting

## Troubleshooting

### Server Won't Start

Check the server configuration:
- Verify the command and args are correct
- Ensure the server script exists at the specified path
- Check environment variables are set correctly

### Tools Not Discovered

Verify the configuration:
- Check the tools array in the server configuration
- Ensure tool names match exactly
- Review server logs for errors

### Tool Execution Fails

Debug steps:
1. Verify the role has access to the tool
2. Check the server status (should be 'ready')
3. Review tool input parameters
4. Check server logs for execution errors
5. Verify timeout is sufficient for the operation

### Memory Leaks

If you notice increasing memory usage:
1. Check idle timeout is set appropriately
2. Verify cleanup interval is running
3. Ensure servers are being closed properly
4. Review server process management

## API Reference

See the TypeScript interfaces in `lib/bedrock/mcp-manager.ts` for complete API documentation.

## Related Documentation

- [MCP Configuration Schema](../../config/mcp/schema.ts)
- [Bedrock Integration Design](./design.md)
- [Identity Pool Service](./identity-pool.ts)
- [Bedrock Client](./client.ts)
