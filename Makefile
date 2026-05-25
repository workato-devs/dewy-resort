# Unified CLI Management for Multi-Vendor Tools
# Supports: wk (Workato), sf (Salesforce)
.PHONY: setup status validate push pull clean help doctor workato-setup workato-status sf-setup sf-status sf-deploy start-recipes stop-recipes enable-api-endpoints create-api-client workato-init

tool ?= all

# ============================================================
# Platform Detection
# ============================================================

ifeq ($(OS),Windows_NT)
    PLATFORM     := windows
    export HOME := $(USERPROFILE)
    export MSYS_NO_PATHCONV := 1
    export MSYS2_ARG_CONV_EXCL := *
    SF_CMD       := sf
else
    PLATFORM     := unix
    SF_CMD       ?= $(CURDIR)/bin/sf
endif

# wk CLI (cross-platform Go binary, globally installed via brew/scoop)
WK_CMD := wk

# CLI availability
HAS_WK := $(shell $(WK_CMD) version >/dev/null 2>&1 && echo 1)
ifeq ($(PLATFORM),windows)
    HAS_SF := $(or $(shell where sf >NUL 2>NUL && echo 1),$(wildcard bin/sf.cmd))
else
    HAS_SF := $(if $(wildcard $(SF_CMD)),1,)
endif

# Salesforce setup dispatch
ifeq ($(PLATFORM),windows)
    PS_EXEC         := powershell -NoProfile -ExecutionPolicy Bypass -File
    SETUP_SALESFORCE = $(PS_EXEC) app\scripts\setup\setup-cli.ps1 -Tool salesforce
    RUN_SF_DEPLOY    = $(PS_EXEC) vendor\salesforce\scripts\deploy.ps1 -TargetOrg
else
    SETUP_SALESFORCE = bash app/scripts/setup/setup-cli.sh --tool=salesforce
    RUN_SF_DEPLOY    = bash vendor/salesforce/scripts/deploy.sh
endif

# Default values for create-api-client
collection ?= sf-api-collection
client ?= SF API Client
description ?= API client for Salesforce search endpoints

# Load environment variables from .env if it exists
ifneq (,$(wildcard .env))
    include .env
    export
endif

# ============================================================
# Primary Commands
# ============================================================

help:
	@echo "Unified CLI Management"
	@echo "======================"
	@echo ""
	@echo "Multi-Tool Commands:"
	@echo "  make setup [tool=<name>]   - Verify/install CLI(s). Options: workato, salesforce, all (default)"
	@echo "  make status [tool=<name>]  - Check CLI status. Options: workato, salesforce, all (default)"
	@echo "  make clean [tool=<name>]   - Remove CLI(s). Options: salesforce, all (default)"
	@echo ""
	@echo "Workato Commands (requires wk CLI):"
	@echo "  make workato-init          - Initialize wk project (clone workspace folders)"
	@echo "  make validate              - Lint all Workato recipes"
	@echo "  make push                  - Push recipes to workspace"
	@echo "  make pull                  - Pull recipes from workspace"
	@echo "  make start-recipes         - Start all stopped recipes"
	@echo "  make stop-recipes          - Stop all running recipes"
	@echo "  make enable-api-endpoints  - Enable all disabled API endpoints"
	@echo "  make create-api-client     - Create API client & update .env"
	@echo ""
	@echo "Salesforce Commands:"
	@echo "  make sf-deploy org=<alias> - Deploy Salesforce metadata to specified org"
	@echo ""
	@echo "Diagnostics:"
	@echo "  make doctor                - Verify CLI installations"
	@echo ""
	@echo "Backward-Compatible Aliases:"
	@echo "  make workato-setup         - Same as: make setup tool=workato"
	@echo "  make workato-status        - Same as: make status tool=workato"
	@echo "  make sf-setup              - Same as: make setup tool=salesforce"
	@echo "  make sf-status             - Same as: make status tool=salesforce"

# ============================================================
# Setup Commands
# ============================================================

setup:
ifeq ($(tool),all)
	@echo "Verifying all vendor CLIs..."
	@$(MAKE) --no-print-directory setup tool=workato
	@echo ""
	@$(MAKE) --no-print-directory setup tool=salesforce
else ifeq ($(tool),workato)
ifeq ($(HAS_WK),1)
	@echo "wk CLI found: $$($(WK_CMD) version)"
else
	@echo "wk CLI not found. Install it:"
	@echo "  macOS/Linux: brew install workato/tap/wk"
	@echo "  Windows:     scoop install wk"
	@exit 1
endif
else ifeq ($(tool),salesforce)
	@echo "Setting up Salesforce CLI..."
	@$(SETUP_SALESFORCE)
else
	@echo "Unknown tool: $(tool). Valid options: workato, salesforce, all"
	@exit 1
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
ifeq ($(HAS_WK),)
	@echo "wk CLI not installed. Run 'make setup tool=workato' for instructions."
	@exit 1
endif
	@echo "Workato CLI Status"
	@echo "------------------"
	@$(WK_CMD) version
	@echo ""
	@echo "Auth profile:"
	-@$(WK_CMD) auth status || echo "Not authenticated. Run: wk auth login"
else ifeq ($(tool),salesforce)
ifeq ($(HAS_SF),)
	@echo "Salesforce CLI not installed. Run 'make setup tool=salesforce' first."
	@exit 1
endif
	@echo "Salesforce CLI Status"
	@echo "---------------------"
	@$(SF_CMD) --version
	@echo ""
	@echo "Authenticated orgs:"
	-@$(SF_CMD) org list || echo "No orgs authenticated. Run: $(SF_CMD) org login web"
else
	@echo "Unknown tool: $(tool). Valid options: workato, salesforce, all"
	@exit 1
endif

# ============================================================
# Clean Commands
# ============================================================

clean:
ifeq ($(tool),all)
	@echo "Cleaning up vendor CLIs..."
	@$(MAKE) --no-print-directory clean tool=salesforce
else ifeq ($(tool),workato)
	@echo "wk CLI is managed by your package manager (brew/scoop)."
	@echo "To uninstall: brew uninstall wk  OR  scoop uninstall wk"
else ifeq ($(tool),salesforce)
	@echo "Cleaning up Salesforce CLI..."
ifeq ($(PLATFORM),windows)
	@powershell -NoProfile -Command "Remove-Item -Recurse -Force -ErrorAction SilentlyContinue tools\sf-cli"
	@powershell -NoProfile -Command "Remove-Item -Force -ErrorAction SilentlyContinue bin\sf*"
else
	@rm -rf tools/sf-cli/
	@rm -f bin/sf
endif
	@echo "Cleaned up Salesforce CLI"
else
	@echo "Unknown tool: $(tool). Valid options: workato, salesforce, all"
	@exit 1
endif

# ============================================================
# Workato Commands
# ============================================================

validate:
ifeq ($(HAS_WK),)
	@echo "wk CLI not installed. Run 'make setup tool=workato' for instructions."
	@exit 1
endif
	@echo "Linting recipes in workato/recipes/..."
	@$(WK_CMD) lint workato/recipes/**/*.recipe.json

push:
ifeq ($(HAS_WK),)
	@echo "wk CLI not installed. Run 'make setup tool=workato' for instructions."
	@exit 1
endif
	@echo "Pushing recipes to workspace..."
	@cd demo-project && $(WK_CMD) push

pull:
ifeq ($(HAS_WK),)
	@echo "wk CLI not installed. Run 'make setup tool=workato' for instructions."
	@exit 1
endif
	@echo "Pulling recipes from workspace..."
	@cd demo-project && $(WK_CMD) pull

workato-init:
ifeq ($(HAS_WK),)
	@echo "wk CLI not installed. Run 'make setup tool=workato' for instructions."
	@exit 1
endif
	@echo "Initializing wk project..."
	@$(WK_CMD) clone "Workspace Connections"
	@$(WK_CMD) clone "atomic-salesforce-recipes"
	@$(WK_CMD) clone "atomic-stripe-recipes"
	@$(WK_CMD) clone "home-assistant"
	@$(WK_CMD) clone "orchestrator-recipes"
	@$(WK_CMD) clone "sf-api-collection"
	@echo "Project initialized. Run 'make pull' to sync recipes."

start-recipes:
ifeq ($(HAS_WK),)
	@echo "wk CLI not installed. Run 'make setup tool=workato' for instructions."
	@exit 1
endif
	@echo "Starting all stopped recipes..."
	@$(WK_CMD) recipes list --status stopped 2>/dev/null | awk 'NR>1 {print $$1}' | while read id; do \
		echo "  Starting recipe $$id..."; \
		$(WK_CMD) recipes start "$$id" --no-wait || echo "  Failed to start $$id (skipping)"; \
	done
	@echo "Done."

stop-recipes:
ifeq ($(HAS_WK),)
	@echo "wk CLI not installed. Run 'make setup tool=workato' for instructions."
	@exit 1
endif
	@echo "Stopping all running recipes..."
	@$(WK_CMD) recipes list --status running 2>/dev/null | awk 'NR>1 {print $$1}' | while read id; do \
		echo "  Stopping recipe $$id..."; \
		$(WK_CMD) recipes stop "$$id" || echo "  Failed to stop $$id (skipping)"; \
	done
	@echo "Done."

enable-api-endpoints:
ifeq ($(HAS_WK),)
	@echo "wk CLI not installed. Run 'make setup tool=workato' for instructions."
	@exit 1
endif
	@echo "Enabling all disabled API endpoints..."
	@$(WK_CMD) api endpoints list 2>/dev/null | awk 'NR>1 && $$NF=="no" {print $$1}' | while read id; do \
		echo "  Enabling endpoint $$id..."; \
		$(WK_CMD) api endpoints enable "$$id" || echo "  Failed to enable $$id (skipping)"; \
	done
	@echo "Done."

create-api-client:
ifeq ($(HAS_WK),)
	@echo "wk CLI not installed. Run 'make setup tool=workato' for instructions."
	@exit 1
endif
	@echo "Creating API Platform client for $(collection)..."
ifeq ($(PLATFORM),windows)
	@$(PS_EXEC) workato\scripts\cli\create_api_collection_client.ps1 -CollectionName "$(collection)" -ClientName "$(client)" -ClientDescription "$(description)"
else
	@bash workato/scripts/cli/create_api_collection_client.sh \
		--collection-name "$(collection)" \
		--client-name "$(client)" \
		--client-description "$(description)"
endif

# ============================================================
# Salesforce Commands
# ============================================================

sf-deploy:
ifndef org
	@echo "Error: org parameter required"
	@echo "Usage: make sf-deploy org=myDevOrg"
	@echo ""
	@echo "Available orgs:"
	-@$(SF_CMD) org list || echo "No orgs found. Run: $(SF_CMD) org login web"
	@exit 1
endif
ifeq ($(HAS_SF),)
	@echo "Salesforce CLI not installed. Run 'make setup tool=salesforce' first."
	@exit 1
endif
	@echo "Deploying Salesforce metadata to $(org)..."
	@$(RUN_SF_DEPLOY) $(org)

# ============================================================
# Diagnostics
# ============================================================

doctor:
	@echo "Environment"
	@echo "==========="
	@echo "  Platform: $(PLATFORM)"
	@echo "  CURDIR:   $(CURDIR)"
	@echo ""
	@echo "Workato CLI (wk)"
	@echo "================"
ifeq ($(HAS_WK),1)
	@echo "  Status:  $$($(WK_CMD) version) ... OK"
	@echo "  Profile: $$($(WK_CMD) auth status 2>&1 | head -1)"
else
	@echo "  Status:  NOT FOUND"
	@echo "  Install: brew install workato/tap/wk (macOS/Linux)"
	@echo "           scoop install wk (Windows)"
endif
	@echo ""
	@echo "Salesforce CLI (sf)"
	@echo "==================="
ifeq ($(HAS_SF),1)
	@echo "  Wrapper: $(SF_CMD) ... found"
ifeq ($(PLATFORM),windows)
	@powershell -NoProfile -Command "try { $$v = (& $(SF_CMD) --version 2>&1) -split \"\`n\" | Select-Object -First 1; Write-Host \"  Binary:  $$v ... OK\" } catch { Write-Host '  Binary:  FAILED'; Write-Host '           Run make setup tool=salesforce' }"
else
	@if $(SF_CMD) --version >/dev/null 2>&1; then \
		echo "  Binary:  $$($(SF_CMD) --version 2>&1 | head -1) ... OK"; \
	else \
		echo "  Binary:  FAILED — wrapper exists but underlying binary is not functional"; \
		echo "           Run 'make setup tool=salesforce' to reinstall"; \
	fi
endif
else
	@echo "  Wrapper: $(SF_CMD) ... NOT FOUND"
	@echo "           Run 'make setup tool=salesforce' to install"
endif

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
