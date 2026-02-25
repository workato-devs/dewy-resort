# Unified CLI Management for Multi-Vendor Tools
# Supports: workato, salesforce, and future vendor CLIs
.PHONY: setup status validate push pull clean help workato-setup workato-status sf-setup sf-status sf-deploy start-recipes stop-recipes enable-api-endpoints create-api-client

# Default tool is workato for backward compatibility
tool ?= all

# ============================================================
# Platform Detection
# ============================================================

ifeq ($(OS),Windows_NT)
    PLATFORM     := windows
    # MSYS2/MinGW Make (common Windows install via Chocolatey) sets HOME to
    # Unix-style paths (e.g., /c/Users/foo). CLI tools use HOME to locate
    # their credential and config stores:
    #   - Salesforce CLI: $HOME/.sf/  (OAuth tokens)
    #   - Workato CLI:    $HOME/.workato/ (profiles & keychain refs)
    # Normalize HOME to the native Windows USERPROFILE so CLIs can find
    # credentials that were stored during interactive authentication.
    export HOME := $(USERPROFILE)
    # Prevent MSYS2 from auto-converting arguments that resemble Unix paths
    # (e.g., --target-org could be mangled). These apply to recipe shell lines.
    export MSYS_NO_PATHCONV := 1
    export MSYS2_ARG_CONV_EXCL := *
    WORKATO_CMD  := workato
    SF_CMD       := sf
    PS_EXEC      := powershell -NoProfile -ExecutionPolicy Bypass -File
else
    PLATFORM     := unix
    WORKATO_CMD  := bin/workato
    SF_CMD       := bin/sf
endif

# CLI availability (evaluated by Make, not by shell)
ifeq ($(PLATFORM),windows)
    HAS_WORKATO := $(shell where workato >NUL 2>NUL && echo 1)
    HAS_SF      := $(shell where sf >NUL 2>NUL && echo 1)
else
    HAS_WORKATO := $(if $(wildcard bin/workato),1,)
    HAS_SF      := $(if $(wildcard bin/sf),1,)
endif

# Script dispatch (maps to .sh on Unix, .ps1 on Windows with correct param syntax)
ifeq ($(PLATFORM),windows)
    SETUP_WORKATO      = $(PS_EXEC) app\scripts\setup\setup-cli.ps1 -Tool workato
    SETUP_SALESFORCE   = $(PS_EXEC) app\scripts\setup\setup-cli.ps1 -Tool salesforce
    SETUP_TOOL         = $(PS_EXEC) app\scripts\setup\setup-cli.ps1 -Tool $(tool)
    CLEANUP_WORKATO    = $(PS_EXEC) workato\scripts\cli\workato-cleanup.ps1
    RUN_START_RECIPES  = $(PS_EXEC) workato\scripts\cli\start_workato_recipes.ps1 -SkipFailed
    RUN_START_STRICT   = $(PS_EXEC) workato\scripts\cli\start_workato_recipes.ps1
    RUN_STOP_RECIPES   = $(PS_EXEC) workato\scripts\cli\stop_workato_recipes.ps1 -SkipFailed
    RUN_STOP_STRICT    = $(PS_EXEC) workato\scripts\cli\stop_workato_recipes.ps1
    RUN_ENABLE_EP      = $(PS_EXEC) workato\scripts\cli\enable_api_endpoints.ps1
    RUN_WORKATO_INIT   = $(PS_EXEC) workato\scripts\cli\create_workato_folders.ps1
    RUN_SF_DEPLOY      = $(PS_EXEC) vendor\salesforce\scripts\deploy.ps1 -TargetOrg
else
    SETUP_WORKATO      = bash app/scripts/setup/setup-cli.sh --tool=workato
    SETUP_SALESFORCE   = bash app/scripts/setup/setup-cli.sh --tool=salesforce
    SETUP_TOOL         = bash app/scripts/setup/setup-cli.sh --tool=$(tool)
    CLEANUP_WORKATO    = bash workato/scripts/cli/workato-cleanup.sh
    RUN_START_RECIPES  = bash workato/scripts/cli/start_workato_recipes.sh --skip-failed
    RUN_START_STRICT   = bash workato/scripts/cli/start_workato_recipes.sh
    RUN_STOP_RECIPES   = bash workato/scripts/cli/stop_workato_recipes.sh --skip-failed
    RUN_STOP_STRICT    = bash workato/scripts/cli/stop_workato_recipes.sh
    RUN_ENABLE_EP      = bash workato/scripts/cli/enable_api_endpoints.sh
    RUN_WORKATO_INIT   = bash workato/scripts/cli/create_workato_folders.sh
    RUN_SF_DEPLOY      = bash vendor/salesforce/scripts/deploy.sh
endif

# Default values for create-api-client
collection ?= sf-api-collection
client ?= SF API Client
description ?= API client for Salesforce search endpoints

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
	@$(SETUP_WORKATO)
	@$(SETUP_SALESFORCE)
else
	@echo "Setting up $(tool) CLI..."
	@$(SETUP_TOOL)
endif

# ============================================================
# Status Commands
# ============================================================

status:
ifeq ($(tool),all)
	@echo "Checking status of all vendor CLIs..."
	@echo ""
	-@$(MAKE) --no-print-directory status tool=workato
	@echo ""
	-@$(MAKE) --no-print-directory status tool=salesforce
else ifeq ($(tool),workato)
ifeq ($(HAS_WORKATO),)
	@echo "❌ Workato CLI not installed. Run 'make setup tool=workato' first."
	@exit 1
endif
	@echo "Workato CLI Status"
	@echo "------------------"
	@$(WORKATO_CMD) --version
	@echo ""
	@echo "Testing connection to Workato..."
	-@$(WORKATO_CMD) workspace || echo "⚠️  Not authenticated. Set your API key in .env"
else ifeq ($(tool),salesforce)
ifeq ($(HAS_SF),)
	@echo "❌ Salesforce CLI not installed. Run 'make setup tool=salesforce' first."
	@exit 1
endif
	@echo "Salesforce CLI Status"
	@echo "---------------------"
	@$(SF_CMD) --version
	@echo ""
	@echo "Authenticated orgs:"
	-@$(SF_CMD) org list || echo "⚠️  No orgs authenticated. Run: $(SF_CMD) org login web"
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
	-@$(CLEANUP_WORKATO)
ifeq ($(PLATFORM),windows)
	@powershell -NoProfile -Command "Remove-Item -Force -ErrorAction SilentlyContinue bin\workato*"
	@powershell -NoProfile -Command "Remove-Item -Recurse -Force -ErrorAction SilentlyContinue tools\sf-cli"
	@powershell -NoProfile -Command "Remove-Item -Force -ErrorAction SilentlyContinue bin\sf*"
else
	@rm -f bin/workato
	@rm -rf tools/sf-cli/
	@rm -f bin/sf
endif
	@echo "✓ Cleaned up all CLIs"
else ifeq ($(tool),workato)
	@echo "Cleaning up Workato CLI..."
	-@$(CLEANUP_WORKATO)
ifeq ($(PLATFORM),windows)
	@powershell -NoProfile -Command "Remove-Item -Force -ErrorAction SilentlyContinue bin\workato*"
else
	@rm -f bin/workato
endif
	@echo "✓ Cleaned up Workato CLI"
else ifeq ($(tool),salesforce)
	@echo "Cleaning up Salesforce CLI..."
ifeq ($(PLATFORM),windows)
	@powershell -NoProfile -Command "Remove-Item -Recurse -Force -ErrorAction SilentlyContinue tools\sf-cli"
	@powershell -NoProfile -Command "Remove-Item -Force -ErrorAction SilentlyContinue bin\sf*"
else
	@rm -rf tools/sf-cli/
	@rm -f bin/sf
endif
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
ifeq ($(HAS_WORKATO),)
	@echo "❌ Workato CLI not installed. Run 'make setup tool=workato' first."
	@exit 1
endif
	@echo "Validating recipes in workato/recipes/..."
	@$(WORKATO_CMD) recipe validate workato/recipes/**/*.recipe.json

push:
ifeq ($(HAS_WORKATO),)
	@echo "❌ Workato CLI not installed. Run 'make setup tool=workato' first."
	@exit 1
endif
	@echo "Pushing recipes to developer sandbox..."
ifeq ($(PLATFORM),windows)
	@powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Directory projects\* | ForEach-Object { Write-Host ('Pushing ' + $$_.Name + '...'); Push-Location $$_.FullName; workato push; Pop-Location }"
else
	@for folder in projects/*/; do \
		echo "Pushing $$folder..."; \
		(cd "$$folder" && workato push); \
	done
endif

pull:
ifeq ($(HAS_WORKATO),)
	@echo "❌ Workato CLI not installed. Run 'make setup tool=workato' first."
	@exit 1
endif
	@echo "Pulling recipes from developer sandbox to workato/sandbox/..."
	@$(WORKATO_CMD) recipe pull --output workato/sandbox/

workato-init:
	@echo "Initializing Workato projects..."
	@$(RUN_WORKATO_INIT)

start-recipes:
	@echo "Starting all Workato recipes (skipping failures)..."
	@$(RUN_START_RECIPES)

start-recipes-stop-on-error:
	@echo "Starting all Workato recipes (stop on first failure)..."
	@$(RUN_START_STRICT)

stop-recipes:
	@echo "Stopping all Workato recipes (skipping failures)..."
	@$(RUN_STOP_RECIPES)

stop-recipes-stop-on-error:
	@echo "Stopping all Workato recipes (stop on first failure)..."
	@$(RUN_STOP_STRICT)

enable-api-endpoints:
	@echo "Enabling all API endpoints..."
	@$(RUN_ENABLE_EP)

create-api-client:
	@echo "Creating API Platform client for sf-api-collection..."
ifeq ($(PLATFORM),windows)
	@$(PS_EXEC) workato\scripts\cli\create_api_collection_client.ps1 -CollectionName "$(collection)" -ClientName "$(client)" -ClientDescription "$(description)"
else
	@bash workato/scripts/cli/create_api_collection_client.sh \
		--collection-name "$(collection)" \
		--client-name "$(client)" \
		--client-description "$(description)"
endif

# ============================================================
# Salesforce-Specific Commands
# ============================================================

sf-deploy:
ifndef org
	@echo "❌ Error: org parameter required"
	@echo "Usage: make sf-deploy org=myDevOrg"
	@echo ""
	@echo "Available orgs:"
	-@$(SF_CMD) org list || echo "No orgs found. Run: $(SF_CMD) org login web"
	@exit 1
endif
ifeq ($(HAS_SF),)
	@echo "❌ Salesforce CLI not installed. Run 'make setup tool=salesforce' first."
	@exit 1
endif
	@echo "Deploying Salesforce metadata to $(org)..."
	@$(RUN_SF_DEPLOY) $(org)

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
