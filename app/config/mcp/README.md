# MCP Configuration

This directory contains MCP (Model Context Protocol) server configurations and tool proxy definitions.

## Overview

The `hotel-db-server` is a local MCP server that provides **two types of tools**:

1. **Database Lookup Tools** - Direct SQLite queries for idempotency tokens, service requests, bookings, and transactions
2. **Proxied Workato Tools** - Wraps Workato MCP tools with automatic idempotency token generation

## Architecture: Dynamic Proxy Pattern

The local `hotel-db-server` uses a **dynamic proxy architecture** that:

1. **Provides direct database access** for token lookups and queries
2. **Fetches tool definitions from Workato** at startup via `tools/list`
3. **Proxies tools requiring idempotency tokens** with auto-generation
4. **Uses Workato's descriptions dynamically** (no hardcoded descriptions)
5. **Excludes underlying Workato tools** via `excludeTools` config

This ensures:
- ✅ Fast local database queries without network calls
- ✅ Single source of truth for tool descriptions (Workato)
- ✅ No description drift when Workato tools change
- ✅ Agent only sees one version of each tool
- ✅ Automatic UUID token generation and local DB tracking

## Files

### `workato-tool-names.ts`

Defines which Workato tools require idempotency token wrapping. The local server dynamically fetches tool metadata from Workato and proxies these tools with auto-token generation.

**Configuration structure:**
```typescript
{
  workatoToolName: 'Create_booking_orchestrator',  // Exact Workato tool name
  localToolName: 'create_booking_with_token',      // Wrapped tool name
  server: 'operations',                             // Which Workato server
  injectParams: ['manager_email', ...]              // Params from env
}
```

**How to update:**
1. Run discovery to see current Workato tool names:
   ```bash
   cd app && npx tsx scripts/discover-mcp-tools.ts
   ```
2. Update `TOOLS_REQUIRING_IDEMPOTENCY` array if tool names changed
3. Update `excludeTools` in role configs to match
4. Test with: `npx tsx scripts/test-dynamic-mcp-proxy.ts`

### Role-specific MCP configs

- `manager.json` - Manager role MCP server configuration
- `guest.json` - Guest role MCP server configuration  
- `housekeeping.json` - Housekeeping role MCP server configuration
- `maintenance.json` - Maintenance role MCP server configuration

Each config defines:
- Local MCP servers (stdio) - e.g., `hotel-db` wrapper
- Remote MCP servers (http) - e.g., Workato MCP endpoints
- Tool filtering via `excludeTools` array

## Architecture

```
AI Agent
  ↓
Local hotel-db MCP Server (stdio)
  ├─ Database Lookup Tools (local SQLite queries)
  │  ├─ find_service_request_by_token
  │  ├─ find_maintenance_task_by_token
  │  ├─ find_booking_by_token
  │  ├─ find_transaction_by_token
  │  ├─ get_guest_service_requests
  │  ├─ get_room_maintenance_tasks
  │  └─ find_tokens_by_guest_email
  │
  └─ Proxied Workato Tools (with auto-token generation)
     ├─ Generates UUID idempotency tokens
     ├─ Stores in local SQLite database
     └─ Calls Workato MCP tools via HTTP
         ↓
Workato MCP Servers (http)
  ├─ hotel-operations (Manager tools)
  └─ hotel-services (Guest tools)
      ↓
Salesforce / Stripe / Twilio
```

### Database Lookup Tools

These tools provide **direct SQLite access** for querying local records:

- **find_service_request_by_token** - Look up service request by idempotency token
- **find_maintenance_task_by_token** - Look up maintenance task by idempotency token
- **find_booking_by_token** - Look up booking by idempotency token
- **find_transaction_by_token** - Look up transaction by idempotency token
- **get_guest_service_requests** - Get all service requests for a guest (with optional status filter)
- **get_room_maintenance_tasks** - Get all maintenance tasks for a room (with optional status/assignee filter)
- **find_tokens_by_guest_email** - Find all tokens (service requests, bookings, transactions) for a guest email

### Proxied Workato Tools

The local wrapper provides automatic idempotency token generation for:
- **create_booking_with_token** - Wraps `Create_booking_orchestrator`
- **manage_booking_with_token** - Wraps `Manage_booking_orchestrator`
- **create_service_request_with_token** - Wraps `Submit_guest_service_request`
- **create_maintenance_task_with_token** - Wraps `Submit_maintenance_request`


## Dynamic Proxy Flow

```
AI Agent requests: create_booking_with_token
  ↓
Local hotel-db MCP Server
  ├─ Fetched tool description from Workato (cached)
  ├─ Added note: "🔑 Auto-generates UUID token"
  ├─ Removed idempotency_token from input schema
  └─ Exposed as: create_booking_with_token
  
When called:
  ├─ Generate UUID token
  ├─ Store in local SQLite
  ├─ Inject token + env params
  ├─ Call Workato: Create_booking_orchestrator
  ├─ Update local DB with Salesforce IDs
  └─ Return combined result

Agent never sees: Create_booking_orchestrator (excluded)
```

## Testing

### Test Dynamic Proxy
```bash
cd app && npx tsx scripts/test-dynamic-mcp-proxy.ts
```

Verifies:
- Tool descriptions fetched from Workato
- Idempotency token removed from schemas
- Auto-token indicator added to descriptions
- Local-only tools present

### Test Tool Discovery
```bash
cd app && npx tsx scripts/discover-mcp-tools.ts
```

Shows current Workato tool names and descriptions.

## Maintenance

When Workato tool names or descriptions change:

1. **No code changes needed** - descriptions update automatically
2. **If tool names change**: Update `workato-tool-names.ts` config
3. **If new tools need wrapping**: Add to `TOOLS_REQUIRING_IDEMPOTENCY`
4. **Update excludeTools**: Add to role configs to hide underlying tool
