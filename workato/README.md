# Workato Integration Platform

Workato recipes and integration workflows for the Dewy Resort hotel management system.

## Structure

- `recipes/` - Workato recipe definitions (committed to version control)
  - `atomic-salesforce-recipes/` - Single-purpose Salesforce operations (MCP atomic skills)
  - `atomic-stripe-recipes/` - Payment operations (optional)
  - `orchestrator-recipes/` - Multi-step business workflows (MCP tools)
  - `home-assistant/` - Home Assistant IoT control recipes
- `scripts/cli/` - API client creation scripts
- `docs/` - Workato integration documentation

## CLI

This project uses the **wk CLI** (Go-based, cross-platform):

```bash
# Install
brew install workato/tap/wk     # macOS/Linux
scoop install wk                 # Windows

# Authenticate
wk auth login

# Common operations (via Make targets)
make validate          # Lint all recipes
make push              # Push recipes to workspace
make pull              # Pull recipes from workspace
make start-recipes     # Start all stopped recipes
make stop-recipes      # Stop all running recipes
make workato-init      # Clone workspace projects
```

## Usage

See [WORKATO_SETUP.md](docs/WORKATO_SETUP.md) for complete setup instructions.
