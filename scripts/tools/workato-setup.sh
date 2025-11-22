#!/bin/bash
set -e

echo "🔧 Workato CLI Setup"
echo "===================="
echo ""

# Check Python version
echo "Checking Python version..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
REQUIRED_VERSION="3.8"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Python $PYTHON_VERSION found, but Python $REQUIRED_VERSION or higher is required."
    exit 1
fi

echo "✓ Python $PYTHON_VERSION detected"
echo ""

# Check and install uv package manager
echo "Checking for uv package manager..."
if ! command -v uv &> /dev/null; then
    echo "Installing uv package manager..."
    curl -LsSf https://astral.sh/uv/install.sh | sh

    # Add uv to PATH for current session
    export PATH="$HOME/.cargo/bin:$PATH"

    if ! command -v uv &> /dev/null; then
        echo "❌ Failed to install uv. Please install manually: https://github.com/astral-sh/uv"
        exit 1
    fi
fi

echo "✓ uv package manager available"
echo ""

# Create isolated virtual environment
VENV_DIR="tools/workato-cli-env"
echo "Creating isolated virtual environment in $VENV_DIR..."

# Create tools directory if it doesn't exist
mkdir -p tools

# Remove existing venv if present
if [ -d "$VENV_DIR" ]; then
    echo "Removing existing virtual environment..."
    rm -rf "$VENV_DIR"
fi

# Create new venv using uv
uv venv "$VENV_DIR"

echo "✓ Virtual environment created"
echo ""

# Install workato-platform-cli from PyPI
echo "Installing workato-platform-cli from PyPI..."
uv pip install --python "$VENV_DIR/bin/python" workato-platform-cli

echo "✓ workato-platform-cli installed"
echo ""

# Create bin directory
mkdir -p bin

# Create wrapper script
echo "Creating wrapper script at bin/workato..."
cat > bin/workato << 'EOF'
#!/bin/bash
# Workato CLI wrapper script
# This script executes the Workato CLI from the isolated virtual environment

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VENV_WORKATO="$PROJECT_ROOT/tools/workato-cli-env/bin/workato"

if [ ! -f "$VENV_WORKATO" ]; then
    echo "❌ Workato CLI virtual environment not found."
    echo "Please run 'make setup' to install the Workato CLI."
    exit 1
fi

# Execute workato CLI with all arguments
exec "$VENV_WORKATO" "$@"
EOF

# Make wrapper script executable
chmod +x bin/workato

echo "✓ Wrapper script created"
echo ""

# Verify installation
echo "Verifying installation..."
if bin/workato --version > /dev/null 2>&1; then
    echo "✓ Workato CLI successfully installed!"
    echo ""
    bin/workato --version
    echo ""
    echo "You can now use the CLI via:"
    echo "  - bin/workato <command>"
    echo "  - make status (to check connection)"
    echo "  - make validate (to validate recipes)"
    echo "  - make push (to push recipes to sandbox)"
    echo ""
    echo "To authenticate, set your API key in .workatoenv or run:"
    echo "  bin/workato login"
else
    echo "❌ Installation verification failed"
    exit 1
fi
