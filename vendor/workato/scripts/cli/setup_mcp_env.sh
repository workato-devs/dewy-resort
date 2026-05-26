#!/bin/bash

# Retrieve MCP server URLs and tokens using wk CLI and update app/.env.
#
# Usage:
#   ./setup_mcp_env.sh [--env-file path/to/.env]

set -e

ENV_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --env-file)    ENV_FILE="$2"; shift 2 ;;
        --env-file=*)  ENV_FILE="${1#*=}"; shift ;;
        *)
            echo "Unknown argument: $1"
            echo "Usage: $0 [--env-file path/to/.env]"
            exit 1
            ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
[ -z "$ENV_FILE" ] && ENV_FILE="$PROJECT_ROOT/app/.env"

if ! command -v wk &> /dev/null; then
    echo "Error: wk CLI not found. Install it:"
    echo "  macOS/Linux: brew install workato/tap/wk"
    echo "  Windows:     scoop install wk"
    exit 1
fi

update_env_var() {
    local key="$1" val="$2" file="$3"
    if [ ! -f "$file" ]; then
        echo "  Warning: $file not found, skipping env update"
        return
    fi
    if grep -q "^${key}=" "$file"; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^${key}=.*|${key}=${val}|" "$file"
        else
            sed -i "s|^${key}=.*|${key}=${val}|" "$file"
        fi
        echo "  Updated ${key}"
    else
        echo "${key}=${val}" >> "$file"
        echo "  Added ${key}"
    fi
}

echo "========================================"
echo "Setting up MCP Server Environment"
echo "========================================"
echo ""

echo "Step 1: Finding MCP servers..."
SERVERS_JSON=$(wk mcp servers list --json 2>/dev/null | tr -d '\n ' ) || {
    echo "Error: Failed to list MCP servers. Are you authenticated? Run: wk auth login"
    exit 1
}

get_server_handle() {
    local name="$1"
    local handle
    handle=$(echo "$SERVERS_JSON" | grep -o "\"id\":\"[^\"]*\"[^}]*\"name\":\"${name}\"" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    if [ -z "$handle" ]; then
        handle=$(echo "$SERVERS_JSON" | grep -o "\"name\":\"${name}\"[^}]*\"id\":\"[^\"]*\"" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    fi
    echo "$handle"
}

GUEST_HANDLE=$(get_server_handle "dewy-resort-guest")
MANAGER_HANDLE=$(get_server_handle "dewy-resort-manager")

if [ -z "$GUEST_HANDLE" ]; then
    echo "Error: MCP server 'dewy-resort-guest' not found."
    echo "Run 'make create-mcp-servers' first."
    exit 1
fi
if [ -z "$MANAGER_HANDLE" ]; then
    echo "Error: MCP server 'dewy-resort-manager' not found."
    echo "Run 'make create-mcp-servers' first."
    exit 1
fi

echo "  Found guest server:   $GUEST_HANDLE"
echo "  Found manager server: $MANAGER_HANDLE"
echo ""

echo "Step 2: Retrieving MCP URLs..."
GUEST_INFO=$(wk mcp servers get "$GUEST_HANDLE" --json 2>/dev/null | tr -d '\n ')
GUEST_MCP_URL=$(echo "$GUEST_INFO" | grep -o '"mcp_url":"[^"]*"' | head -1 | cut -d'"' -f4)

MANAGER_INFO=$(wk mcp servers get "$MANAGER_HANDLE" --json 2>/dev/null | tr -d '\n ')
MANAGER_MCP_URL=$(echo "$MANAGER_INFO" | grep -o '"mcp_url":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$GUEST_MCP_URL" ] || [ -z "$MANAGER_MCP_URL" ]; then
    echo "Error: Could not retrieve MCP URLs."
    echo "  Guest:   ${GUEST_MCP_URL:-MISSING}"
    echo "  Manager: ${MANAGER_MCP_URL:-MISSING}"
    exit 1
fi

GUEST_URL="${GUEST_MCP_URL%%\?*}"
GUEST_TOKEN="${GUEST_MCP_URL##*wkt_token=}"
MANAGER_URL="${MANAGER_MCP_URL%%\?*}"
MANAGER_TOKEN="${MANAGER_MCP_URL##*wkt_token=}"

echo "  Guest URL:     $GUEST_URL"
echo "  Guest token:   ${GUEST_TOKEN:0:8}..."
echo "  Manager URL:   $MANAGER_URL"
echo "  Manager token: ${MANAGER_TOKEN:0:8}..."
echo ""

echo "Step 3: Updating $ENV_FILE..."
update_env_var "MCP_GUEST_URL" "$GUEST_URL" "$ENV_FILE"
update_env_var "MCP_GUEST_TOKEN" "$GUEST_TOKEN" "$ENV_FILE"
update_env_var "MCP_GUEST_MCP_URL" "$GUEST_MCP_URL" "$ENV_FILE"
update_env_var "MCP_MANAGER_URL" "$MANAGER_URL" "$ENV_FILE"
update_env_var "MCP_MANAGER_TOKEN" "$MANAGER_TOKEN" "$ENV_FILE"
update_env_var "MCP_MANAGER_MCP_URL" "$MANAGER_MCP_URL" "$ENV_FILE"

echo ""
echo "========================================"
echo "MCP Environment Setup Complete"
echo "========================================"
echo ""
echo "  Guest MCP:   $GUEST_MCP_URL"
echo "  Manager MCP: $MANAGER_MCP_URL"
echo ""
echo "  Values saved to $ENV_FILE"
echo "  Full MCP URLs can be used directly with Claude, Codex, etc."
echo ""
exit 0
