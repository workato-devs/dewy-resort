# Dynamic MCP Proxy Implementation

**Date:** 2026-01-16

## Problem Statement

The original implementation had several architectural issues:

1. **Hardcoded tool descriptions** - Duplicated Workato's descriptions in local server
2. **Description drift** - Local descriptions became stale when Workato changed
3. **Tool duplication** - Agent saw both wrapped and unwrapped versions
4. **No excludeTools** - Underlying Workato tools not hidden from agent
5. **Maintenance burden** - Every Workato change required code updates

## Solution: Dynamic Proxy Architecture

Implemented a dynamic proxy pattern where the local MCP server:

1. **Fetches tool definitions from Workato** at startup via `tools/list`
2. **Proxies tools requiring idempotency tokens** with auto-generation
3. **Uses Workato's descriptions dynamically** (no hardcoded descriptions)
4. **Excludes underlying Workato tools** via `excludeTools` configuration

## Implementation Details

### 1. Configuration File (`app/config/mcp/workato-tool-names.ts`)

Changed from static tool name constants to proxy configuration:

```typescript
export interface ToolProxyConfig {
  workatoToolName: string;      // Exact Workato tool name
  localToolName: string;         // Wrapped tool name exposed to agent
  server: 'operations' | 'services';  // Which Workato server
  injectParams?: string[];       // Params to inject from env
}

export const TOOLS_REQUIRING_IDEMPOTENCY: ToolProxyConfig[] = [
  {
    workatoToolName: 'Create_booking_orchestrator',
    localToolName: 'create_booking_with_token',
    server: 'operations',
  },
  // ... more tools
];
```

### 2. Dynamic Tool Discovery (`hotel-db-server.ts`)

**On startup:**
```typescript
async function initializeToolCache() {
  // Fetch from Workato operations server
  const tools = await fetchWorkatoTools(operationsUrl, operationsToken);
  tools.forEach(tool => workatoToolsCache.set(tool.name, tool));
  
  // Fetch from Workato services server
  const tools = await fetchWorkatoTools(servicesUrl, servicesToken);
  tools.forEach(tool => workatoToolsCache.set(tool.name, tool));
}
```

**When listing tools:**
```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => {
  await initializeToolCache();
  
  const tools: Tool[] = [];
  
  // Generate proxied tools dynamically
  for (const config of TOOLS_REQUIRING_IDEMPOTENCY) {
    const workatoTool = workatoToolsCache.get(config.workatoToolName);
    const proxiedTool = {
      name: config.localToolName,
      description: `${workatoTool.description}\n\n🔑 Auto-generates UUID token`,
      inputSchema: removeIdempotencyFields(workatoTool.inputSchema),
    };
    tools.push(proxiedTool);
  }
  
  // Add local-only tools
  tools.push(...LOCAL_TOOL_DEFINITIONS);
  
  return { tools };
});
```

### 3. MCP Configuration Updates

**Manager config (`app/config/mcp/manager.json`):**
```json
{
  "servers": [
    {
      "name": "hotel-db",
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "src/lib/mcp/hotel-db-server.ts"]
    },
    {
      "name": "hotel-operations",
      "type": "http",
      "url": "${MCP_MANAGER_URL}",
      "excludeTools": [
        "Create_booking_orchestrator",
        "Manage_booking_orchestrator",
        "Submit_maintenance_request"
      ]
    }
  ]
}
```

**Guest config (`app/config/mcp/guest.json`):**
```json
{
  "servers": [
    {
      "name": "hotel-db",
      "tools": [
        "find_service_request_by_token",
        "get_guest_service_requests",
        "find_booking_by_token",
        "create_service_request_with_token"
      ]
    },
    {
      "name": "hotel-services",
      "excludeTools": [
        "Submit_guest_service_request"
      ]
    }
  ]
}
```

### 4. Tool Execution Flow

```
Agent calls: create_booking_with_token
  ↓
handleProxiedTool(config, args)
  ├─ Generate UUID token
  ├─ Inject env params (manager_email, etc.)
  ├─ Store in local SQLite
  ├─ Call Workato: Create_booking_orchestrator
  ├─ Update local DB with Salesforce IDs
  └─ Return result with token
```

## Benefits

### 1. Single Source of Truth
- Workato owns tool descriptions
- No duplication or drift
- Changes propagate automatically

### 2. Clean Agent Experience
- Agent sees only wrapped versions
- No confusion about which tool to use
- Clear indication of auto-token generation

### 3. Maintainability
- Description changes: **No code updates needed**
- New tools: Add one config entry
- Tool renames: Update config only

### 4. Type Safety
- TypeScript interfaces for proxy config
- Compile-time validation
- IDE autocomplete

## Testing

### Test Dynamic Proxy
```bash
cd app && npx tsx scripts/test-dynamic-mcp-proxy.ts
```

**Output:**
```
✅ Found 11 tools:

🔑 Proxied tools (with auto-token): 4
   - create_booking_with_token
     ✅ Has auto-token indicator
     ✅ Has dynamic description (565 chars)
   - manage_booking_with_token
     ✅ Has auto-token indicator
     ✅ Has dynamic description (431 chars)

🔍 Verifying idempotency_token removed from schemas:
   ✅ create_booking_with_token - token parameter removed
   ✅ manage_booking_with_token - token parameter removed
```

### Test Tool Discovery
```bash
cd app && npx tsx scripts/discover-mcp-tools.ts
```

Shows current Workato tool names and descriptions.

## Migration Path

### Before (Static Definitions)
```typescript
const TOOLS: Tool[] = [
  {
    name: 'create_booking_with_token',
    description: 'Create a booking with auto-generated idempotency token...',
    inputSchema: { /* hardcoded schema */ }
  }
];
```

### After (Dynamic Proxy)
```typescript
// Configuration only
const TOOLS_REQUIRING_IDEMPOTENCY = [
  {
    workatoToolName: 'Create_booking_orchestrator',
    localToolName: 'create_booking_with_token',
    server: 'operations',
  }
];

// Tool definition generated dynamically from Workato
```

## Files Changed

### Created
- `app/scripts/test-dynamic-mcp-proxy.ts` - Test script for proxy architecture
- `DYNAMIC_MCP_PROXY_IMPLEMENTATION.md` - This document

### Modified
- `app/config/mcp/workato-tool-names.ts` - Changed to proxy configuration
- `app/config/mcp/manager.json` - Added excludeTools, fixed path
- `app/config/mcp/guest.json` - Added excludeTools, fixed path, added wrapped tool
- `app/config/mcp/README.md` - Updated documentation
- `app/src/lib/mcp/hotel-db-server.ts` - Complete rewrite with dynamic proxy

## Maintenance

### When Workato Descriptions Change
**Action required:** None - updates automatically

### When Workato Tool Names Change
1. Run: `npx tsx scripts/discover-mcp-tools.ts`
2. Update `workatoToolName` in `workato-tool-names.ts`
3. Update `excludeTools` in role configs
4. Test: `npx tsx scripts/test-dynamic-mcp-proxy.ts`

### When New Tools Need Wrapping
1. Add entry to `TOOLS_REQUIRING_IDEMPOTENCY`
2. Add to `excludeTools` in appropriate role config
3. Test with discovery and proxy test scripts

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        AI Agent                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Sees only wrapped tools:
                         │ - create_booking_with_token
                         │ - create_maintenance_task_with_token
                         │ - find_booking_by_token
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Local hotel-db MCP Server (stdio)              │
│                                                              │
│  On Startup:                                                │
│  ├─ Fetch tools from MCP_MANAGER_URL                        │
│  ├─ Fetch tools from MCP_GUEST_URL                          │
│  └─ Cache tool metadata (name, description, schema)        │
│                                                              │
│  On tools/list:                                             │
│  ├─ Generate proxied tool definitions                       │
│  │  ├─ Use Workato's description                           │
│  │  ├─ Add "🔑 Auto-generates UUID token" note            │
│  │  └─ Remove idempotency_token from schema               │
│  └─ Add local-only database lookup tools                   │
│                                                              │
│  On tool execution:                                         │
│  ├─ Generate UUID token                                     │
│  ├─ Store in local SQLite                                   │
│  ├─ Inject env params                                       │
│  ├─ Call underlying Workato tool                           │
│  ├─ Update local DB with Salesforce IDs                    │
│  └─ Return combined result                                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP JSON-RPC calls
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           Workato MCP Servers (http)                        │
│                                                              │
│  hotel-operations (MCP_MANAGER_URL)                         │
│  ├─ Create_booking_orchestrator  ← EXCLUDED                │
│  ├─ Manage_booking_orchestrator  ← EXCLUDED                │
│  ├─ Submit_maintenance_request   ← EXCLUDED                │
│  ├─ Check_in_guest                                          │
│  ├─ Process_guest_checkout                                  │
│  └─ Search_cases_on_behalf_of_staff                        │
│                                                              │
│  hotel-services (MCP_GUEST_URL)                             │
│  ├─ Submit_guest_service_request ← EXCLUDED                │
│  ├─ Manage_booking_orchestrator                             │
│  ├─ Check_in_guest                                          │
│  └─ Search_rooms_on_behalf_of_guest                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                  Salesforce / Stripe
```

## Conclusion

The dynamic proxy architecture provides:
- ✅ Automatic description updates from Workato
- ✅ Clean separation of concerns
- ✅ Reduced maintenance burden
- ✅ Better agent experience
- ✅ Type-safe configuration

Tool descriptions are now the single responsibility of Workato, while the local server focuses on idempotency token management and local database tracking.
