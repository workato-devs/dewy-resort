#!/bin/bash
# Vendor CLI Wrapper Template
#
# This is a template for creating wrapper scripts for vendor CLIs
# Copy this file and customize it for each new vendor tool
#
# Usage: Copy this to bin/<tool-name> and customize the variables below

# ============================================================
# Configuration - Customize these for each vendor CLI
# ============================================================

# Tool name (e.g., "workato", "salesforce", "twilio", "stripe")
TOOL_NAME="<TOOL_NAME>"

# Path to the actual CLI executable relative to tools/ directory
# Examples:
#   - tools/workato-cli-env/bin/workato (Python venv)
#   - tools/sf-cli/bin/sf (standalone binary)
#   - tools/twilio-cli-env/node_modules/.bin/twilio (npm isolated)
CLI_EXECUTABLE="tools/<TOOL_DIR>/bin/<TOOL_NAME>"

# ============================================================
# Wrapper Logic - Generally no changes needed below
# ============================================================

# Get project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FULL_CLI_PATH="$PROJECT_ROOT/$CLI_EXECUTABLE"

# Check if CLI is installed
if [ ! -f "$FULL_CLI_PATH" ]; then
    echo "❌ $TOOL_NAME CLI installation not found."
    echo ""
    echo "Expected location: $CLI_EXECUTABLE"
    echo ""
    echo "To install, run:"
    echo "  make setup tool=$TOOL_NAME"
    echo ""
    exit 1
fi

# Execute CLI with all arguments passed through
exec "$FULL_CLI_PATH" "$@"

# ============================================================
# Example Customizations for Different Installation Types
# ============================================================
#
# For Python venv (like Workato):
#   TOOL_NAME="workato"
#   CLI_EXECUTABLE="tools/workato-cli-env/bin/workato"
#
# For standalone binary (like Salesforce):
#   TOOL_NAME="salesforce"
#   CLI_EXECUTABLE="tools/sf-cli/bin/sf"
#
# For npm isolated (like Twilio):
#   TOOL_NAME="twilio"
#   CLI_EXECUTABLE="tools/twilio-cli-env/node_modules/.bin/twilio"
#
# For Go binary (like Stripe):
#   TOOL_NAME="stripe"
#   CLI_EXECUTABLE="tools/stripe-cli/stripe"
#
