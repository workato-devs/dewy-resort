# Scripts Directory

This directory contains all scripts for development, testing, setup, and maintenance of the application.

## Directory Structure

```
scripts/
├── tests/              # All validation and test scripts
│   ├── auth/          # Authentication & authorization tests
│   ├── bedrock/       # AWS Bedrock integration tests
│   ├── cognito/       # AWS Cognito integration tests
│   ├── database/      # Database operation tests
│   ├── home-assistant/# Home Assistant integration tests
│   ├── integration/   # Cross-system integration tests
│   ├── mcp/           # MCP server tests
│   ├── salesforce/    # Salesforce integration tests
│   ├── ui/            # UI component tests
│   └── workato/       # Workato integration tests
├── setup/             # Setup and initialization scripts
├── migration/         # Database migration scripts
├── utils/             # Utility scripts
├── dev-tools/         # Development tools
└── tools/             # Script templates
```

## Test Scripts

All test scripts are validation scripts generated during development to ensure proper operation of integrations and features. They are organized by the system or feature they test.

### Authentication Tests (`tests/auth/`)
- Authentication flow validation
- OAuth integration tests
- Session management tests
- Token handling tests
- Provider switching tests

### AWS Bedrock Tests (`tests/bedrock/`)
- Bedrock service integration
- Streaming chat functionality
- Conversation management
- Configuration validation

### AWS Cognito Tests (`tests/cognito/`)
- Cognito configuration
- Identity pool integration
- Credential exchange
- Token management

### Database Tests (`tests/database/`)
- Database operations
- Idempotency token management
- Mock data store validation

### Home Assistant Tests (`tests/home-assistant/`)
- Home Assistant API integration
- Device control validation

### Integration Tests (`tests/integration/`)
- Cross-system integration tests
- End-to-end workflows
- Mock mode validation

### MCP Tests (`tests/mcp/`)
- MCP server configuration
- Tool discovery and execution
- Role-based access control
- Dynamic proxy functionality

### Salesforce Tests (`tests/salesforce/`)
- Salesforce API integration
- CRUD operations validation
- Search functionality
- Data synchronization
- See `tests/salesforce/README_SALESFORCE_TESTS.md` for detailed documentation

### UI Tests (`tests/ui/`)
- Component functionality
- Tab persistence
- Message history display
- Dashboard error handling

### Workato Tests (`tests/workato/`)
- Workato recipe integration
- API endpoint validation
- Error handling
- Booking operations

## Setup Scripts (`setup/`)

Scripts for initial setup and configuration:

- `setup-cli.sh` - Install vendor CLIs (Workato, Salesforce)
- `setup-db.js` - Initialize database schema
- `init-db.js` - Create database and tables
- `seed-db.js` - Populate database with sample data
- `create-cognito-staff-users.sh` - Create staff users in Cognito
- `fix-bcrypt.sh` - Fix bcrypt native module issues

## Migration Scripts (`migration/`)

Database migration scripts for schema updates:

- `migrate-add-mock-flag.js` - Add mock device flag to schema
- `migrate-cognito-tokens.js` - Migrate to Cognito token format
- `migrate-okta-session.js` - Migrate Okta session data
- `add-staff-roles.js` - Add staff role support

## Utility Scripts (`utils/`)

General-purpose utility scripts:

- `check-env.js` - Validate environment configuration
- `configure-mock-devices.js` - Manage mock device settings
- `dump-database.sh` - Backup database
- `export-app.sh` - Export application bundle
- `purge-idempotency-tokens.ts` - Clean up expired tokens

## Running Scripts

### From package.json

Many commonly-used scripts are available as npm commands:

```bash
# Development
npm run dev                          # Start dev server (checks env first)

# Database
npm run db:init                      # Initialize database
npm run db:seed                      # Seed with sample data
npm run db:migrate                   # Run migrations
npm run db:dump                      # Backup database

# Device Management
npm run devices:list                 # List all devices
npm run devices:stats                # Show device statistics
npm run devices:help                 # Show device management help

# Testing
npm run test:salesforce              # Run Salesforce tests (automated)
npm run test:salesforce:interactive  # Run Salesforce tests (interactive)
npm run test:home-assistant          # Test Home Assistant integration

# Verification
npm run verify:mock                  # Verify mock mode
npm run verify:bedrock               # Verify Bedrock configuration

# Utilities
npm run purge-idempotency            # Clean up expired tokens
```

### From Makefile

CLI setup and management:

```bash
# Setup
make setup                    # Install all CLIs
make setup tool=workato       # Install Workato CLI only
make setup tool=salesforce    # Install Salesforce CLI only

# Status
make status                   # Check all CLI status
make status tool=workato      # Check Workato CLI status

# Workato Operations
make validate                 # Validate recipes
make push                     # Push recipes to sandbox
make pull                     # Pull recipes from sandbox
make start-recipes            # Start all recipes
make stop-recipes             # Stop all recipes
```

### Direct Execution

Test scripts can be run directly:

```bash
# TypeScript tests (use tsx)
tsx scripts/tests/salesforce/test-salesforce-automated.ts
tsx scripts/tests/mcp/test-dynamic-mcp-proxy.ts

# JavaScript tests (use node)
node scripts/tests/auth/test-auth-config.js
node scripts/tests/bedrock/test-bedrock-simple.js

# Shell scripts (use bash)
bash scripts/tests/integration/quick-check.sh
bash scripts/tests/cognito/test-cognito-bedrock.sh
```

## Development Tools (`dev-tools/`)

Tools for development workflow:

- `server.sh` - Development server management

## Script Templates (`tools/`)

Templates for creating new scripts:

- `wrapper-template.sh` - Template for wrapper scripts

## Notes

- All test scripts were generated during development to validate integrations
- Test scripts are not unit tests but integration/validation tests
- Scripts use environment variables from `.env` file
- Many scripts support both real and mock modes via `WORKATO_MOCK_MODE`
- See individual test directories for specific documentation
