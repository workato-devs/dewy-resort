# Unified CLI Management for Multi-Vendor Tools
# Supports: workato, salesforce, and future vendor CLIs
.PHONY: setup status validate push pull clean help workato-setup workato-status sf-setup sf-status sf-deploy start-recipes stop-recipes enable-api-endpoints create-api-client

# Default tool is workato for backward compatibility
tool ?= all

# ============================================================
# Primary Commands (Unified, Multi-Tool)
# ============================================================

help:
	@echo "Unified CLI Management"
	@echo "======================"
	@echo ""
	@echo "Multi-Tool Commands:"
	@echo "  make setup [tool=<name>]   - Install CLI(s). Options: workato, salesforce, all (default)"
	@echo "  make status [tool=<name>]  - Check CLI status. Options: workato, salesforce, all (default)"
	@echo "  make clean [tool=<name>]   - Remove CLI(s). Options: workato, salesforce, all (default)"
	@echo ""
	@echo "Workato-Specific Commands:"
	@echo "  make validate              - Validate Workato recipes locally"
	@echo "  make push                  - Push Workato recipes to developer sandbox"
	@echo "  make pull                  - Pull Workato recipes from developer sandbox"
	@echo "  make start-recipes         - Start all Workato recipes (skip failures, default)"
	@echo "  make start-recipes-stop-on-error - Start recipes (stop on first failure)"
	@echo "  make stop-recipes          - Stop all Workato recipes (skip failures, default)"
	@echo "  make stop-recipes-stop-on-error - Stop recipes (stop on first failure)"
	@echo "  make enable-api-endpoints  - Enable all API endpoints in all collections"
	@echo "  make create-api-client     - Create API client for sf-api-collection (auto-updates .env)"
	@echo ""
	@echo "Salesforce-Specific Commands:"
	@echo "  make sf-deploy org=<alias> - Deploy Salesforce metadata to specified org"
	@echo ""
	@echo "Backward-Compatible Aliases:"
	@echo "  make workato-setup         - Same as: make setup tool=workato"
	@echo "  make workato-status        - Same as: make status tool=workato"
	@echo "  make sf-setup              - Same as: make setup tool=salesforce"
	@echo "  make sf-status             - Same as: make status tool=salesforce"
	@echo ""
	@echo "Examples:"
	@echo "  make setup                 - Install all CLIs (workato + salesforce)"
	@echo "  make setup tool=workato    - Install only Workato CLI"
	@echo "  make setup tool=salesforce - Install only Salesforce CLI"
	@echo "  make status                - Check status of all CLIs"
	@echo "  make clean tool=salesforce - Remove only Salesforce CLI"
	@echo ""

# ============================================================
# Setup Commands
# ============================================================

setup:
ifeq ($(tool),all)
	@echo "Setting up all vendor CLIs..."
	@bash app/scripts/setup-cli.sh --tool=workato
	@bash app/scripts/setup-cli.sh --tool=salesforce
else
	@echo "Setting up $(tool) CLI..."
	@bash app/scripts/setup-cli.sh --tool=$(tool)
endif

# ============================================================
# Status Commands
# ============================================================

status:
ifeq ($(tool),all)
	@echo "Checking status of all vendor CLIs..."
	@echo ""
	@$(MAKE) --no-print-directory status tool=workato || true
	@echo ""
	@$(MAKE) --no-print-directory status tool=salesforce || true
else ifeq ($(tool),workato)
	@if [ ! -f bin/workato ]; then \
		echo "❌ Workato CLI not installed. Run 'make setup tool=workato' first."; \
		exit 1; \
	fi
	@echo "Workato CLI Status"
	@echo "------------------"
	@export WORKATO_API_TOKEN=$(WORKATO_API_TOKEN) && bin/workato --version
	@echo ""
	@echo "Testing connection to Workato..."
	@export WORKATO_API_TOKEN=$(WORKATO_API_TOKEN) && bin/workato workspace || echo "⚠️  Not authenticated. Set your API key in .env"
else ifeq ($(tool),salesforce)
	@if [ ! -f bin/sf ]; then \
		echo "❌ Salesforce CLI not installed. Run 'make setup tool=salesforce' first."; \
		exit 1; \
	fi
	@echo "Salesforce CLI Status"
	@echo "---------------------"
	@bin/sf --version
	@echo ""
	@echo "Authenticated orgs:"
	@bin/sf org list || echo "⚠️  No orgs authenticated. Run: bin/sf org login web"
else
	@echo "❌ Unknown tool: $(tool)"
	@echo "Valid options: workato, salesforce, all"
	@exit 1
endif

# ============================================================
# Clean Commands
# ============================================================

clean:
ifeq ($(tool),all)
	@echo "Cleaning up all vendor CLIs..."
	@bash workato/scripts/cli/workato-cleanup.sh || true
	@rm -f bin/workato
	@rm -rf tools/sf-cli/
	@rm -f bin/sf
	@echo "✓ Cleaned up all CLIs"
else ifeq ($(tool),workato)
	@echo "Cleaning up Workato CLI..."
	@bash workato/scripts/cli/workato-cleanup.sh || true
	@rm -f bin/workato
	@echo "✓ Cleaned up Workato CLI"
else ifeq ($(tool),salesforce)
	@echo "Cleaning up Salesforce CLI..."
	@rm -rf tools/sf-cli/
	@rm -f bin/sf
	@echo "✓ Cleaned up Salesforce CLI"
else
	@echo "❌ Unknown tool: $(tool)"
	@echo "Valid options: workato, salesforce, all"
	@exit 1
endif

# ============================================================
# Workato-Specific Commands
# ============================================================

# Load environment variables from .env if it exists
ifneq (,$(wildcard .env))
    include .env
    export
endif

validate:
	@if [ ! -f bin/workato ]; then \
		echo "❌ Workato CLI not installed. Run 'make setup tool=workato' first."; \
		exit 1; \
	fi
	@echo "Validating recipes in workato/recipes/..."
	@export WORKATO_API_TOKEN=$(WORKATO_API_TOKEN) && bin/workato recipe validate workato/recipes/**/*.recipe.json

push:
	@if [ ! -f bin/workato ]; then \
		echo "❌ Workato CLI not installed. Run 'make setup tool=workato' first."; \
		exit 1; \
	fi
	@echo "Pushing recipes to developer sandbox..."
	@export WORKATO_API_TOKEN=$(WORKATO_API_TOKEN) && bin/workato recipe push workato/recipes/

pull:
	@if [ ! -f bin/workato ]; then \
		echo "❌ Workato CLI not installed. Run 'make setup tool=workato' first."; \
		exit 1; \
	fi
	@echo "Pulling recipes from developer sandbox to workato/sandbox/..."
	@export WORKATO_API_TOKEN=$(WORKATO_API_TOKEN) && bin/workato recipe pull --output workato/sandbox/

workato-init:
	@echo "Initializing Workato projects..."
	@export WORKATO_API_TOKEN=$(WORKATO_API_TOKEN) && bash workato/scripts/cli/create_workato_folders.sh

start-recipes:
	@echo "Starting all Workato recipes (skipping failures)..."
	@export WORKATO_API_TOKEN=$(WORKATO_API_TOKEN) && bash workato/scripts/cli/start_workato_recipes.sh --skip-failed

start-recipes-stop-on-error:
	@echo "Starting all Workato recipes (stop on first failure)..."
	@export WORKATO_API_TOKEN=$(WORKATO_API_TOKEN) && bash workato/scripts/cli/start_workato_recipes.sh

stop-recipes:
	@echo "Stopping all Workato recipes (skipping failures)..."
	@export WORKATO_API_TOKEN=$(WORKATO_API_TOKEN) && bash workato/scripts/cli/stop_workato_recipes.sh --skip-failed

stop-recipes-stop-on-error:
	@echo "Stopping all Workato recipes (stop on first failure)..."
	@export WORKATO_API_TOKEN=$(WORKATO_API_TOKEN) && bash workato/scripts/cli/stop_workato_recipes.sh

enable-api-endpoints:
	@echo "Enabling all API endpoints..."
	@export WORKATO_API_TOKEN=$(WORKATO_API_TOKEN) && bash workato/scripts/cli/enable_api_endpoints.sh

create-api-client:
	@echo "Creating API Platform client for sf-api-collection..."
	@export WORKATO_API_TOKEN=$(WORKATO_API_TOKEN) && bash workato/scripts/cli/create_api_collection_client.sh \
		--collection-name "$(if $(collection),$(collection),sf-api-collection)" \
		--client-name "$(if $(client),$(client),SF API Client)" \
		--client-description "$(if $(description),$(description),API client for Salesforce search endpoints)"

# ============================================================
# Salesforce-Specific Commands
# ============================================================

sf-deploy:
ifndef org
	@echo "❌ Error: org parameter required"
	@echo "Usage: make sf-deploy org=myDevOrg"
	@echo ""
	@echo "Available orgs:"
	@bin/sf org list || echo "No orgs found. Run: bin/sf org login web"
	@exit 1
endif
	@if [ ! -f bin/sf ]; then \
		echo "❌ Salesforce CLI not installed. Run 'make setup tool=salesforce' first."; \
		exit 1; \
	fi
	@echo "Deploying Salesforce metadata to $(org)..."
	@cd vendor/salesforce && bash scripts/deploy.sh $(org)

# ============================================================
# Backward-Compatible Aliases
# ============================================================

workato-setup:
	@$(MAKE) setup tool=workato

workato-status:
	@$(MAKE) status tool=workato

sf-setup:
	@$(MAKE) setup tool=salesforce

sf-status:
	@$(MAKE) status tool=salesforce
