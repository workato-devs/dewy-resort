# Hotel Database MCP Server

Local MCP server that exposes SQLite database operations as tools for the AI agent.

## Overview

The Hotel DB MCP server provides tools for querying the local SQLite database, with a focus on idempotency token lookups and record retrieval. This allows the AI agent to:

- Look up service requests and maintenance tasks by idempotency token
- Retrieve lists of records for guests or rooms
- Access tracking references for Salesforce integration

## Tools

### 1. create_booking_with_token

Create a booking with auto-generated idempotency token.

**Parameters:**
- `guest_email` (string, required): Guest email address
- `guest_first_name` (string, required): Guest first name
- `guest_last_name` (string, required): Guest last name
- `room_number` (string, required): Room number (e.g., "101")
- `check_in_date` (string, required): Check-in date (ISO 8601: YYYY-MM-DD)
- `check_out_date` (string, required): Check-out date (ISO 8601: YYYY-MM-DD)
- `number_of_guests` (number, optional): Number of guests (default: 1)
- `special_requests` (string, optional): Special requests or notes

**Returns:** Created booking with idempotency token and Salesforce IDs

### 2. manage_booking_with_token

Update an existing booking with auto-generated idempotency token.

**Parameters:**
- `external_id` (string, required): External ID from create_booking_with_token
- `guest_email` (string, optional): Updated guest email
- `room_number` (string, optional): Updated room number
- `check_in_date` (string, optional): Updated check-in date
- `check_out_date` (string, optional): Updated check-out date
- `number_of_guests` (number, optional): Updated number of guests
- `special_requests` (string, optional): Updated special requests
- `status` (string, optional): Updated status (reserved, checked_in, checked_out, cancelled, no_show)

**Returns:** Updated booking with update tracking token

### 3. find_booking_by_token

Find a booking by its idempotency token.

**Parameters:**
- `idempotency_token` (string, required): The UUID token to search for

**Returns:** Full booking record including Salesforce booking ID

### 4. find_service_request_by_token

Find a service request by its idempotency token.

**Parameters:**
- `idempotency_token` (string, required): The UUID token to search for

**Returns:** Full service request record including Salesforce ticket ID

### 5. find_maintenance_task_by_token

Find a maintenance task by its idempotency token.

**Parameters:**
- `idempotency_token` (string, required): The UUID token to search for

**Returns:** Full maintenance task record

### 6. find_transaction_by_token

Find a transaction by its idempotency token.

**Parameters:**
- `idempotency_token` (string, required): The UUID token to search for

**Returns:** Full transaction record including Stripe transaction ID

### 7. get_guest_service_requests

Get all service requests for a specific guest.

**Parameters:**
- `guest_id` (string, required): The guest user ID
- `status` (string, optional): Filter by status (pending, in_progress, completed, cancelled)
- `limit` (number, optional): Maximum results (default: 10)

**Returns:** List of service requests with idempotency tokens

### 8. get_room_maintenance_tasks

Get all maintenance tasks for a specific room.

**Parameters:**
- `room_id` (string, required): The room ID
- `status` (string, optional): Filter by status (pending, assigned, in_progress, completed)
- `assigned_to` (string, optional): Filter by assigned staff member
- `limit` (number, optional): Maximum results (default: 20)

**Returns:** List of maintenance tasks with idempotency tokens

## Configuration

The server is configured in role-specific MCP config files:

### Manager (`config/mcp/manager.json`)
```json
{
  "name": "hotel-db",
  "type": "stdio",
  "command": "npx",
  "args": ["tsx", "lib/mcp/hotel-db-server.ts"],
  "tools": [
    "create_booking_with_token",
    "manage_booking_with_token",
    "find_booking_by_token",
    "create_maintenance_task_with_token",
    "create_service_request_with_token",
    "find_service_request_by_token",
    "find_maintenance_task_by_token",
    "find_transaction_by_token",
    "get_guest_service_requests",
    "get_room_maintenance_tasks"
  ]
},
{
  "name": "hotel-operations",
  "type": "http",
  "url": "${MCP_MANAGER_URL}",
  "excludeTools": [
    "create-booking",
    "manage-booking"
  ]
}
```

### Guest (`config/mcp/guest.json`)
```json
{
  "name": "hotel-db",
  "type": "stdio",
  "command": "npx",
  "args": ["tsx", "lib/mcp/hotel-db-server.ts"],
  "tools": [
    "find_booking_by_token",
    "find_service_request_by_token",
    "get_guest_service_requests"
  ]
},
{
  "name": "hotel-operations",
  "type": "http",
  "url": "${MCP_MANAGER_URL}",
  "excludeTools": [
    "create-booking",
    "manage-booking"
  ]
}
```

### Maintenance (`config/mcp/maintenance.json`)
```json
{
  "name": "hotel-db",
  "type": "stdio",
  "command": "npx",
  "args": ["tsx", "lib/mcp/hotel-db-server.ts"],
  "tools": [
    "find_maintenance_task_by_token",
    "get_room_maintenance_tasks"
  ]
}
```

### Housekeeping (`config/mcp/housekeeping.json`)
```json
{
  "name": "hotel-db",
  "type": "stdio",
  "command": "npx",
  "args": ["tsx", "lib/mcp/hotel-db-server.ts"],
  "tools": [
    "find_service_request_by_token",
    "get_guest_service_requests"
  ]
}
```

## Running the Server

The server is automatically started by the MCP manager when the AI agent needs to use database tools.

### Manual Testing

You can test the server manually using the MCP CLI:

```bash
# Start the server
npx tsx lib/mcp/hotel-db-server.ts

# The server will listen on stdio for MCP protocol messages
```

## Implementation Details

- **Protocol**: MCP (Model Context Protocol) over stdio
- **Database**: SQLite via `lib/db/client.ts`
- **Transport**: Standard input/output (stdio)
- **Error Handling**: All errors are caught and returned as error responses

## Dependencies

- `@modelcontextprotocol/sdk` - MCP SDK for server implementation
- `tsx` - TypeScript execution for Node.js
- Local database utilities from `lib/db/client.ts` and `lib/utils/idempotency.ts`
