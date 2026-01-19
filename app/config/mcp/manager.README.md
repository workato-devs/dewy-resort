# Manager MCP Configuration

This document describes the MCP (Model Context Protocol) configuration for the hotel manager role.

## Overview

The manager MCP configuration defines which remote MCP servers and tools are available to hotel managers when using the AI-powered chat interface. Managers have access to analytics and operational tools that help them monitor hotel performance and manage operations.

## Configuration File

**Location**: `config/mcp/manager.json`

## Remote MCP Servers

### 1. Hotel Analytics Server

**Purpose**: Provides analytics and reporting tools for hotel performance metrics.

**Configuration**:
- **Name**: `hotel-analytics`
- **Type**: HTTP
- **URL**: Configured via `MCP_ANALYTICS_URL` environment variable
- **Authentication**: Bearer token via `MCP_ANALYTICS_TOKEN` environment variable

**Available Tools**:
- `get_occupancy_stats` - Retrieve current and historical occupancy statistics
- `get_revenue_report` - Generate revenue reports for specified time periods

### 2. Hotel Operations Server

**Purpose**: Provides operational management tools for bookings and room assignments.

**Configuration**:
- **Name**: `hotel-operations`
- **Type**: HTTP
- **URL**: Configured via `MCP_MANAGER_URL` environment variable
- **Authentication**: Bearer token via `MCP_MANAGER_TOKEN` environment variable

**Available Tools**:
- `view_all_bookings` - View all current and upcoming bookings
- `assign_room` - Assign guests to specific rooms

## Environment Variables

The following environment variables must be set in your `.env` file:

```bash
# Manager MCP Servers
MCP_ANALYTICS_URL=https://mcp.hotel.example.com/analytics
MCP_ANALYTICS_TOKEN=your_analytics_token
MCP_MANAGER_URL=https://mcp.hotel.example.com/operations
MCP_MANAGER_TOKEN=your_manager_mcp_token
```

## Tool Descriptions

### get_occupancy_stats

Retrieves occupancy statistics for the hotel, including current occupancy rate, available rooms, and historical trends.

**Example Use Cases**:
- "What's our current occupancy rate?"
- "Show me occupancy trends for the past week"
- "How many rooms are available tonight?"

### get_revenue_report

Generates revenue reports for specified time periods, including room revenue, service revenue, and total revenue.

**Example Use Cases**:
- "Show me this month's revenue report"
- "What was our revenue last quarter?"
- "Compare revenue between this month and last month"

### view_all_bookings

Displays all current and upcoming bookings with guest information, room assignments, and booking details.

**Example Use Cases**:
- "Show me all bookings for this week"
- "Who's checking in today?"
- "List all upcoming reservations"

### assign_room

Assigns a guest to a specific room, updating the booking and room status.

**Example Use Cases**:
- "Assign guest John Smith to room 305"
- "Move the guest in room 201 to room 305"
- "What rooms can I assign to the Smith party?"

## Security

- All MCP server connections use HTTPS with bearer token authentication
- Tokens should be kept secure and rotated regularly
- Manager tools have access to sensitive operational data and should only be available to authorized manager users
- The MCP Manager validates role-based access before executing any tools

## Testing

To test the manager MCP configuration:

```bash
# Validate configuration structure
node scripts/test-mcp-manager-config.js

# Verify MCP Manager can load the configuration
node scripts/verify-mcp-manager-config.js
```

## Troubleshooting

### Configuration Not Loading

If the configuration fails to load:
1. Verify the file exists at `config/mcp/manager.json`
2. Check that the JSON is valid (no syntax errors)
3. Ensure the `role` field is set to `"manager"`

### Environment Variables Not Set

If you see warnings about missing environment variables:
1. Check your `.env` file contains all required variables
2. Ensure variable names match exactly (case-sensitive)
3. Restart your development server after updating `.env`

### Connection Failures

If MCP servers cannot be reached:
1. Verify the server URLs are correct
2. Check that authentication tokens are valid
3. Ensure the MCP servers are deployed and accessible
4. Check network connectivity and firewall rules

### Tools Not Available

If specific tools are not available:
1. Verify the tool names in the configuration match the server's tool names
2. Check that the MCP server is properly initialized
3. Review server logs for any errors during tool discovery

## Related Documentation

- [MCP Manager Implementation](../../lib/bedrock/MCP_MANAGER_README.md)
- [Bedrock Chat Integration Design](../../.kiro/specs/bedrock-chat-integration/design.md)
- [Guest MCP Configuration](./guest.json)
- [System Prompts](../prompts/manager.txt)

## Future Enhancements

Potential additional tools for manager role:
- `get_staff_schedule` - View staff schedules and assignments
- `create_maintenance_task` - Create new maintenance tasks
- `view_guest_feedback` - Access guest reviews and feedback
- `generate_forecast` - Generate occupancy and revenue forecasts
- `manage_pricing` - Adjust room pricing and availability
