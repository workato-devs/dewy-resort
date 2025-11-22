# Maintenance MCP Configuration

This configuration defines the MCP (Model Context Protocol) servers and tools available to maintenance staff in the Hotel Management System.

## Overview

The maintenance role has access to tools for managing work orders, updating task status, accessing equipment information, and ordering parts.

## Configuration

The configuration is stored in `config/mcp/maintenance.json` and defines remote MCP servers that provide maintenance-specific tools.

### MCP Server: maintenance-tasks

**Purpose**: Provides tools for maintenance staff to manage work orders and equipment

**Connection Type**: HTTP/HTTPS remote server

**Environment Variables**:
- `MCP_MAINTENANCE_URL`: URL of the maintenance-tasks MCP server
- `MCP_MAINTENANCE_TOKEN`: Bearer token for authentication

**Available Tools**:
1. `view_my_work_orders` - View assigned maintenance work orders
2. `update_task_status` - Update the status of maintenance tasks
3. `get_equipment_info` - Access equipment information and specifications
4. `order_parts` - Order parts and supplies for maintenance work

## Setup

### 1. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Maintenance MCP Server
MCP_MAINTENANCE_URL=https://mcp.hotel.example.com/maintenance
MCP_MAINTENANCE_TOKEN=your_maintenance_token_here
```

### 2. MCP Server Requirements

The remote MCP server must:
- Implement the Model Context Protocol over HTTP/HTTPS
- Support bearer token authentication
- Provide the four maintenance tools listed above
- Return tool schemas that match the expected format

### 3. Tool Schemas

Each tool should follow the MCP tool schema format:

```json
{
  "name": "view_my_work_orders",
  "description": "View assigned maintenance work orders",
  "inputSchema": {
    "type": "object",
    "properties": {
      "status": {
        "type": "string",
        "enum": ["pending", "in_progress", "completed"],
        "description": "Filter by work order status"
      }
    }
  }
}
```

## Testing

### Test Configuration Loading

```bash
node scripts/test-mcp-maintenance-config.js
```

### Test MCP Manager Integration

```bash
node scripts/test-maintenance-mcp-manager.js
```

### Verify Configuration

```bash
node scripts/verify-maintenance-mcp-config.js
```

## Security

- The bearer token should be kept secure and rotated regularly
- The MCP server should validate the token on each request
- Tools should validate that the maintenance staff member has access to the requested resources
- All tool executions are logged with user ID for audit purposes

## Troubleshooting

### Connection Issues

If the MCP server cannot be reached:
1. Verify the `MCP_MAINTENANCE_URL` is correct
2. Check network connectivity to the server
3. Verify the server is running and healthy
4. Check server logs for authentication errors

### Authentication Issues

If authentication fails:
1. Verify the `MCP_MAINTENANCE_TOKEN` is correct
2. Check if the token has expired
3. Verify the server is configured to accept bearer tokens
4. Check server logs for authentication errors

### Tool Discovery Issues

If tools are not discovered:
1. Verify the MCP server implements the protocol correctly
2. Check that the server returns tool schemas in the expected format
3. Verify the tool names in the configuration match the server's tools
4. Check server logs for protocol errors

## Related Documentation

- [MCP Configuration Overview](./README.md)
- [MCP Manager Implementation](../../lib/bedrock/MCP_MANAGER_README.md)
- [Bedrock Integration Design](../../.kiro/specs/bedrock-chat-integration/design.md)
