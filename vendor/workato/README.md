# Workato Integration Platform

Workato recipes and integration workflows for the Dewy Resort hotel management system.

## Structure

- `recipes/` - Workato recipe definitions (committed to version control)
  - `atomic-salesforce-recipes/` - Single-purpose Salesforce operations (MCP atomic skills)
  - `atomic-stripe-recipes/` - Payment operations (optional)
  - `orchestrator-recipes/` - Multi-step business workflows (MCP tools)
  - `home-assistant/` - Home Assistant IoT control recipes
  - `sf-api-collection/` - Salesforce search API collection and endpoints
  - `Workspace Connections/` - Shared connection definitions
- `api-definitions/` - API collection and MCP server definitions
  - `guest-collection/` - Guest-facing API collection (7 endpoints)
  - `manager-collection/` - Manager/staff API collection (10 endpoints)
  - `mcp-servers.json` - MCP server manifest for batch creation

## CLI

This project uses the **wk CLI** (Go-based, cross-platform):

```bash
# Install
brew install workato/tap/wk     # macOS/Linux
scoop install wk                 # Windows

# Authenticate
wk auth login

# Initialize project (sets up sync on workato/recipes/)
make workato-init

# Recipe management
make validate          # Lint all recipes
make push              # Push recipes to workspace
make pull              # Pull recipes from workspace
make start-recipes     # Start all stopped recipes
make stop-recipes      # Stop all running recipes

# API Platform & MCP setup (replaces manual UI steps)
make setup-api         # Create collections + endpoints + enable
make setup-mcp         # Create MCP servers + update app/.env
make create-api-client # Create API client for a collection
```

## Usage

See [WORKATO_SETUP.md](docs/WORKATO_SETUP.md) for complete setup instructions.
