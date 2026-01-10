#!/bin/bash

# Generic CLI Setup Orchestrator
# Dispatches to tool-specific setup scripts in scripts/tools/
# Usage: ./setup-cli.sh --tool=<name>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
TOOL=""
for arg in "$@"; do
    case $arg in
        --tool=*)
            TOOL="${arg#*=}"
            shift
            ;;
        *)
            echo -e "${RED}❌ Unknown argument: $arg${NC}"
            echo "Usage: $0 --tool=<name>"
            echo "Available tools: workato, salesforce"
            exit 1
            ;;
    esac
done

# Validate tool argument
if [ -z "$TOOL" ]; then
    echo -e "${RED}❌ Error: --tool argument is required${NC}"
    echo "Usage: $0 --tool=<name>"
    echo "Available tools: workato, salesforce"
    exit 1
fi

# Get project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TOOL_SCRIPT="$SCRIPT_DIR/tools/${TOOL}-setup.sh"

# Check if tool-specific setup script exists
if [ ! -f "$TOOL_SCRIPT" ]; then
    echo -e "${RED}❌ Error: Unknown tool '$TOOL'${NC}"
    echo ""
    echo "Available tools:"
    for script in "$SCRIPT_DIR/tools/"*-setup.sh; do
        if [ -f "$script" ]; then
            tool_name=$(basename "$script" -setup.sh)
            echo "  - $tool_name"
        fi
    done
    echo ""
    echo "To add a new tool, create: scripts/tools/${TOOL}-setup.sh"
    exit 1
fi

# Check if wrapper already exists (skip if already installed)
WRAPPER_SCRIPT=""
case "$TOOL" in
    workato)
        WRAPPER_SCRIPT="$PROJECT_ROOT/bin/workato"
        ;;
    salesforce)
        WRAPPER_SCRIPT="$PROJECT_ROOT/bin/sf"
        ;;
    *)
        WRAPPER_SCRIPT="$PROJECT_ROOT/bin/$TOOL"
        ;;
esac

if [ -f "$WRAPPER_SCRIPT" ]; then
    echo -e "${YELLOW}⚠️  $TOOL CLI appears to be already installed${NC}"
    echo "Wrapper found at: $WRAPPER_SCRIPT"
    echo ""
    read -p "Reinstall anyway? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping installation. To force reinstall:"
        echo "  make clean tool=$TOOL && make setup tool=$TOOL"
        exit 0
    fi
fi

# Execute tool-specific setup script
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Setting up $TOOL CLI${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

cd "$PROJECT_ROOT"
bash "$TOOL_SCRIPT"

# Verify installation
if [ -f "$WRAPPER_SCRIPT" ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ $TOOL CLI successfully installed!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "To verify installation:"
    echo "  make status tool=$TOOL"
    echo ""
else
    echo -e "${RED}❌ Installation failed: Wrapper script not created${NC}"
    exit 1
fi
