#!/bin/bash

# Generic CLI Setup Orchestrator
# Dispatches to tool-specific setup scripts
# Usage: ./setup-cli.sh --tool=<name>

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TOOL=""
for arg in "$@"; do
    case $arg in
        --tool=*)
            TOOL="${arg#*=}"
            shift
            ;;
        *)
            echo -e "${RED}Unknown argument: $arg${NC}"
            echo "Usage: $0 --tool=<name>"
            echo "Available tools: workato, salesforce"
            exit 1
            ;;
    esac
done

if [ -z "$TOOL" ]; then
    echo -e "${RED}Error: --tool argument is required${NC}"
    echo "Usage: $0 --tool=<name>"
    echo "Available tools: workato, salesforce"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

case "$TOOL" in
    workato)
        echo -e "${BLUE}========================================${NC}"
        echo -e "${BLUE}Verifying Workato CLI (wk)${NC}"
        echo -e "${BLUE}========================================${NC}"
        echo ""

        if command -v wk &> /dev/null; then
            echo -e "${GREEN}wk CLI available: $(wk version)${NC}"
            echo ""
            echo "To verify auth:"
            echo "  make status tool=workato"
        else
            echo -e "${YELLOW}wk CLI not found.${NC}"
            echo ""
            echo "Install it:"
            echo "  macOS/Linux: brew install workato/tap/wk"
            echo "  Windows:     scoop install wk"
            echo ""
            echo "Then authenticate:"
            echo "  wk auth login"
            exit 1
        fi
        ;;
    salesforce)
        TOOL_SCRIPT="$PROJECT_ROOT/vendor/salesforce/scripts/salesforce-setup.sh"

        if [ ! -f "$TOOL_SCRIPT" ]; then
            echo -e "${RED}Error: Salesforce setup script not found at $TOOL_SCRIPT${NC}"
            exit 1
        fi

        WRAPPER_SCRIPT="$PROJECT_ROOT/bin/sf"

        if [ -f "$WRAPPER_SCRIPT" ]; then
            echo -e "${YELLOW}Salesforce CLI appears to be already installed${NC}"
            echo "Wrapper found at: $WRAPPER_SCRIPT"
            echo ""
            if [ -t 0 ]; then
                echo -n "Reinstall anyway? [y/N] "
                read -r REPLY
            else
                REPLY="n"
            fi
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo "Skipping. To force reinstall: make clean tool=salesforce && make setup tool=salesforce"
                exit 0
            fi
        fi

        echo -e "${BLUE}========================================${NC}"
        echo -e "${BLUE}Setting up Salesforce CLI${NC}"
        echo -e "${BLUE}========================================${NC}"
        echo ""

        cd "$PROJECT_ROOT"
        bash "$TOOL_SCRIPT"

        if [ -f "$WRAPPER_SCRIPT" ]; then
            echo ""
            echo -e "${GREEN}Salesforce CLI successfully installed!${NC}"
            echo "  Verify: make status tool=salesforce"
        else
            echo -e "${RED}Installation failed: Wrapper script not created${NC}"
            exit 1
        fi
        ;;
    *)
        echo -e "${RED}Error: Unknown tool '$TOOL'${NC}"
        echo "Available tools: workato, salesforce"
        exit 1
        ;;
esac
