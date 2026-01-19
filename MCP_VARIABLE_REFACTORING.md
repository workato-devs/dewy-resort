# MCP Environment Variable Refactoring

## Summary

Successfully refactored MCP environment variable names to align with user roles throughout the application.

## Changes Made

### Variable Name Mapping

| Old Name | New Name | Purpose |
|----------|----------|---------|
| `MCP_HOTEL_SERVICES_URL` | `MCP_GUEST_URL` | Guest MCP server endpoint |
| `MCP_HOTEL_SERVICES_TOKEN` | `MCP_GUEST_TOKEN` | Guest MCP server authentication |
| `MCP_OPERATIONS_URL` | `MCP_MANAGER_URL` | Manager MCP server endpoint |
| `MCP_OPERATIONS_TOKEN` | `MCP_MANAGER_TOKEN` | Manager MCP server authentication |

### Files Updated

#### Environment Configuration
- `app/.env` - Updated production environment variables
- `app/.env.example` - Updated example configuration with new variable names

#### MCP Configuration Files
- `app/config/mcp/guest.json` - Updated guest role MCP server configuration
- `app/config/mcp/manager.json` - Updated manager role MCP server configuration

#### Source Code
- `app/src/lib/mcp/hotel-db-server.ts` - Updated variable references and function parameters
  - Changed `useOperationsUrl` parameter to `useManagerUrl`
  - Updated all environment variable references
  - Updated error messages

#### Test Scripts
- `app/scripts/verify-bedrock-integration.js` - Updated environment variable checks
- `app/scripts/test-booking-workato-direct.ts` - Updated MCP URL/token references
- `app/scripts/discover-mcp-tools.ts` - Updated guest and manager server discovery
- `app/scripts/test-workato-rest-api.ts` - Updated all MCP variable references
- `app/scripts/test-mcp-http.js` - Updated server configuration
- `app/scripts/test-workato-mcp-search-cases.ts` - Updated all test functions

#### Documentation
- `DYNAMIC_MCP_PROXY_IMPLEMENTATION.md` - Updated architecture diagrams and examples
- `app/src/lib/mcp/README.md` - Updated configuration examples
- `app/config/mcp/manager.README.md` - Updated environment variable documentation

## Naming Rationale

The new naming convention aligns with the role-based architecture:

- **Guest Role**: Uses `MCP_GUEST_*` variables to access guest-specific MCP tools
- **Manager Role**: Uses `MCP_MANAGER_*` variables to access manager-specific MCP tools
- **Housekeeping Role**: Uses `MCP_HOUSEKEEPING_*` variables (already aligned)
- **Maintenance Role**: Uses `MCP_MAINTENANCE_*` variables (already aligned)

This creates a consistent pattern where each role has its own clearly named MCP server configuration.

## Migration Notes

If you have existing `.env` files, update them with the new variable names:

```bash
# Old names (deprecated)
MCP_HOTEL_SERVICES_URL=...
MCP_HOTEL_SERVICES_TOKEN=...
MCP_OPERATIONS_URL=...
MCP_OPERATIONS_TOKEN=...

# New names (use these)
MCP_GUEST_URL=...
MCP_GUEST_TOKEN=...
MCP_MANAGER_URL=...
MCP_MANAGER_TOKEN=...
```

## Verification

All references to the old variable names have been removed. You can verify with:

```bash
# Should return no results
grep -r "MCP_HOTEL_SERVICES\|MCP_OPERATIONS" app/
```

The refactoring maintains backward compatibility in the code logic while using clearer, role-aligned naming.
