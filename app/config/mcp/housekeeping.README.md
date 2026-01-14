# Housekeeping MCP Configuration

This document describes the MCP (Model Context Protocol) configuration for housekeeping staff in the Hotel Management System.

## Overview

The housekeeping MCP configuration defines the remote MCP servers and tools available to housekeeping staff when using the AI-powered chat interface. This configuration enables housekeeping staff to interact with hotel systems through natural language conversations.

## Configuration File

**Location**: `config/mcp/housekeeping.json`

## Required Tools

The housekeeping configuration must include the following tools:

1. **view_my_tasks** - View assigned cleaning tasks for the day
2. **update_room_cleaning_status** - Update the cleaning status of a room
3. **report_maintenance_issue** - Report maintenance issues discovered during cleaning
4. **request_supplies** - Request cleaning supplies and equipment

## Server Configuration

### Remote MCP Server

The housekeeping configuration uses a remote HTTP-based MCP server:

```json
{
  "name": "housekeeping-tasks",
  "type": "http",
  "url": "${MCP_HOUSEKEEPING_URL}",
  "auth": {
    "type": "bearer",
    "token": "${MCP_HOUSEKEEPING_TOKEN}"
  },
  "tools": [
    "view_my_tasks",
    "update_room_cleaning_status",
    "report_maintenance_issue",
    "request_supplies"
  ]
}
```

### Environment Variables

The following environment variables must be set in your `.env` file:

- `MCP_HOUSEKEEPING_URL` - URL of the housekeeping MCP server
- `MCP_HOUSEKEEPING_TOKEN` - Authentication token for the MCP server

Example:
```bash
MCP_HOUSEKEEPING_URL=https://mcp.hotel.example.com/housekeeping
MCP_HOUSEKEEPING_TOKEN=your_housekeeping_token_here
```

## Tool Descriptions

### view_my_tasks

Retrieves the list of cleaning tasks assigned to the housekeeping staff member for the current day.

**Use cases:**
- "What rooms do I need to clean today?"
- "Show me my task list"
- "Which rooms are assigned to me?"

### update_room_cleaning_status

Updates the cleaning status of a specific room.

**Use cases:**
- "Mark room 301 as cleaned"
- "Update room 205 to in-progress"
- "Set room 410 as ready for inspection"

### report_maintenance_issue

Reports maintenance issues discovered during room cleaning.

**Use cases:**
- "Report a broken light in room 302"
- "The AC in room 215 is not working"
- "There's a leak in the bathroom of room 408"

### request_supplies

Requests cleaning supplies and equipment.

**Use cases:**
- "I need more towels"
- "Request cleaning supplies for floor 3"
- "We're running low on bathroom amenities"

## Testing the Configuration

### 1. Validate Configuration Structure

Run the validation script to check the configuration:

```bash
node scripts/test-mcp-housekeeping-config.js
```

This will verify:
- Configuration file exists and is valid JSON
- Role is set to "housekeeping"
- All required tools are configured
- Server configuration is valid
- Environment variables are set

### 2. Test MCP Manager Integration

Run the integration test to verify MCP Manager compatibility:

```bash
node scripts/test-housekeeping-mcp-manager.js
```

This will verify:
- Configuration can be loaded by MCP Manager
- All required fields are present
- Configuration is compatible with the MCP Manager schema

### 3. Verify Configuration

Run the comprehensive verification script:

```bash
node scripts/verify-housekeeping-mcp-config.js
```

This provides a detailed analysis of the configuration including:
- Configuration structure validation
- Required tools verification
- Remote server configuration check
- Summary of configured tools and servers

## Usage in Chat Interface

Once configured, housekeeping staff can use the AI chat interface to:

1. **View Tasks**: Ask about assigned cleaning tasks
2. **Update Status**: Report progress on room cleaning
3. **Report Issues**: Flag maintenance problems
4. **Request Supplies**: Order cleaning materials

The AI assistant will use the configured MCP tools to interact with the hotel management system on behalf of the housekeeping staff.

## Security Considerations

1. **Authentication**: The MCP server uses bearer token authentication
2. **Role-Based Access**: Only housekeeping staff can access these tools
3. **Data Isolation**: Tools only access data relevant to the staff member's assignments
4. **Audit Logging**: All tool executions are logged with user ID and timestamp

## Troubleshooting

### Configuration Not Loading

If the configuration fails to load:

1. Verify the file exists at `config/mcp/housekeeping.json`
2. Check that the JSON is valid (no syntax errors)
3. Ensure the role is set to "housekeeping"

### Environment Variables Not Set

If environment variables are missing:

1. Check your `.env` file
2. Ensure `MCP_HOUSEKEEPING_URL` and `MCP_HOUSEKEEPING_TOKEN` are set
3. Restart the application after updating `.env`

### Connection Failures

If the MCP server connection fails:

1. Verify the server URL is correct
2. Check that the authentication token is valid
3. Ensure the MCP server is running and accessible
4. Check network connectivity

### Missing Tools

If required tools are not available:

1. Verify all required tools are listed in the configuration
2. Check that the MCP server implements these tools
3. Ensure the server is returning tool schemas correctly

## Related Documentation

- [MCP Configuration Overview](./README.md)
- [MCP Manager Documentation](../../lib/bedrock/MCP_MANAGER_README.md)
- [Bedrock Chat Integration Design](../../.kiro/specs/bedrock-chat-integration/design.md)
- [System Requirements](../../.kiro/specs/bedrock-chat-integration/requirements.md)

## Support

For issues or questions about the housekeeping MCP configuration:

1. Check the validation scripts output for specific errors
2. Review the MCP Manager logs for connection issues
3. Verify environment variables are correctly set
4. Consult the main MCP configuration documentation
