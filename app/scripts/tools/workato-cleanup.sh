#!/bin/bash

echo "🧹 Workato CLI Cleanup"
echo "======================"
echo ""

# Check if pipx is available and workato-platform-cli is installed via pipx
if command -v pipx &> /dev/null; then
    if pipx list | grep -q workato-platform-cli; then
        echo "Removing workato-platform-cli via pipx..."
        pipx uninstall workato-platform-cli
        echo "✓ Removed workato-platform-cli from pipx"
    fi
fi

# Check if workato is installed via pip (user install)
if [ -f "$HOME/.local/bin/workato" ]; then
    echo "Removing workato-platform-cli via pip..."
    python3 -m pip uninstall -y workato-platform-cli
    echo "✓ Removed workato-platform-cli from pip"
fi

# Remove legacy virtual environment if it exists
if [ -d "tools/workato-cli-env" ]; then
    echo "Removing legacy virtual environment..."
    rm -rf tools/workato-cli-env/
    echo "✓ Removed legacy virtual environment"
fi

echo "✓ Workato CLI cleanup completed"
