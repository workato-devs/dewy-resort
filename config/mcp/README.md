# MCP (Model Context Protocol) Configuration

This directory contains role-specific MCP configurations for the Bedrock chat integration. Each role (guest, manager, housekeeping, maintenance) has its own configuration file that defines which remote MCP servers and tools are available.

## Overview

MCP servers provide tools that AI chat agents can use to perform actions on behalf of users. The configuration supports both HTTP-based remote servers and stdio-based local servers.

## Configuration Files

- `guest.json` - Guest MCP configuration
- `manager.json` - Manager MCP configuration
- `housekeeping.json` - Housekeeping MCP configuration
- `maintenance.json` - Maintenance MCP configuration
- `schema.ts` - TypeScript schema definitions

## Configuration Structure

### HTTP-based MCP Server (Recommended)

```json
{
  "role": "guest",
  "servers": [
    {
      "name": "hotel-services",
      "type": "http",
      "url": "${MCP_HOTEL_SERVICES_URL}",
      "auth": {
        "type": "bearer",
        "token": "${MCP_HOTEL_SERVICES_TOKEN}"
      },
      "tools": [
        "create_service_request",
        "view_my_charges",
        "request_amenity"
      ]
    }
  ]
}
```

### Stdio-based MCP Server (Backward Compatibility)

```json
{
  "role": "guest",
  "servers": [
    {
      "name": "local-services",
      "type": "stdio",
      "command": "node",
      "args": ["mcp-servers/hotel-services/index.js"],
      "env": {
        "DATABASE_URL": "sqlite:database/hotel.db"
      },
      "tools": [
        "create_service_request",
        "view_my_charges"
      ]
    }
  ]
}
```

## Environment Variables

MCP configurations support environment variable interpolation using the `${VAR_NAME}` syntax. This allows you to keep sensitive credentials out of configuration files.

### Guest MCP Servers

```bash
# Hotel Services MCP Server
MCP_HOTEL_SERVICES_URL=https://mcp.hotel.example.com/services
MCP_HOTEL_SERVICES_TOKEN=your_hotel_services_token

# Room Controls MCP Server
MCP_ROOM_CONTROLS_URL=https://mcp.hotel.example.com/room-controls
MCP_ROOM_CONTROLS_TOKEN=your_room_controls_token
```

### Manager MCP Servers

```bash
# Analytics MCP Server
MCP_ANALYTICS_URL=https://mcp.hotel.example.com/analytics
MCP_ANALYTICS_TOKEN=your_analytics_token

# Operations MCP Server
MCP_OPERATIONS_URL=https://mcp.hotel.example.com/operations
MCP_OPERATIONS_TOKEN=your_operations_token
```

### Housekeeping MCP Servers

```bash
# Housekeeping Tasks MCP Server
MCP_HOUSEKEEPING_URL=https://mcp.hotel.example.com/housekeeping
MCP_HOUSEKEEPING_TOKEN=your_housekeeping_token
```

### Maintenance MCP Servers

```bash
# Maintenance Tasks MCP Server
MCP_MAINTENANCE_URL=https://mcp.hotel.example.com/maintenance
MCP_MAINTENANCE_TOKEN=your_maintenance_token
```

## Authentication Types

### Bearer Token Authentication

```json
{
  "auth": {
    "type": "bearer",
    "token": "${MCP_SERVER_TOKEN}"
  }
}
```

The token is sent in the `Authorization` header as `Bearer <token>`.

### Basic Authentication

```json
{
  "auth": {
    "type": "basic",
    "username": "${MCP_USERNAME}",
    "password": "${MCP_PASSWORD}"
  }
}
```

Credentials are base64-encoded and sent in the `Authorization` header as `Basic <credentials>`.

### No Authentication

```json
{
  "auth": {
    "type": "none"
  }
}
```

No authentication headers are sent.

## Guest Tools

The guest MCP configuration provides the following tools:

### Hotel Services
- `create_service_request` - Create a new service request (housekeeping, maintenance, room service, concierge)
- `view_my_charges` - View current charges and billing information
- `request_amenity` - Request hotel amenities

### Room Controls
- `control_lights` - Control room lighting
- `control_thermostat` - Adjust room temperature
- `control_blinds` - Control window blinds

## Testing Configuration

Use the test script to validate your MCP configuration:

```bash
node scripts/test-mcp-guest-config.js
```

This script will:
1. Load and validate the configuration structure
2. Check that all required environment variables are set
3. Test connectivity to remote MCP servers
4. Verify tool discovery

## MCP Server Development

When developing MCP servers, they should:

1. **Expose a REST API** for HTTP-based servers:
   - `GET /` - Health check endpoint
   - `POST /tools/{toolName}` - Execute a tool
   - Return JSON responses with tool results

2. **Implement authentication**:
   - Validate bearer tokens or basic auth credentials
   - Return 401 for unauthorized requests

3. **Follow the MCP protocol**:
   - Accept tool input as JSON in request body
   - Return tool results as JSON
   - Handle errors gracefully with appropriate status codes

4. **Provide tool schemas**:
   - Document tool names, descriptions, and input schemas
   - Follow JSON Schema format for input validation

## Security Considerations

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate tokens regularly** for production environments
4. **Implement rate limiting** on MCP servers
5. **Validate tool access** based on user roles
6. **Log all tool executions** for audit purposes

## Troubleshooting

### Configuration not loading

- Check that the configuration file exists in `config/mcp/`
- Verify JSON syntax is valid
- Ensure the role name matches the filename

### Environment variables not interpolated

- Check that variables are defined in `.env` file
- Verify the syntax uses `${VAR_NAME}` format
- Restart the application after changing `.env`

### Connection failures

- Verify the MCP server URL is correct
- Check that authentication credentials are valid
- Ensure the MCP server is running and accessible
- Check network connectivity and firewall rules

### Tool execution errors

- Verify the tool name is listed in the server's tools array
- Check that the tool input matches the expected schema
- Review MCP server logs for error details
- Ensure the user has permission to access the tool

## Related Documentation

- [Bedrock Chat Integration Design](../../.kiro/specs/bedrock-chat-integration/design.md)
- [MCP Manager Implementation](../../lib/bedrock/MCP_MANAGER_README.md)
- [System Prompts](../prompts/README.md)
