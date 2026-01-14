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

# Detect installation method: pipx for Homebrew Python, pip for others
PYTHON_PATH=$(which python3)
USE_PIPX=false

if [[ "$PYTHON_PATH" == *"/opt/homebrew/"* ]] || [[ "$PYTHON_PATH" == *"/usr/local/"* ]]; then
    if command -v pipx &> /dev/null; then
        echo "✓ Homebrew Python detected with pipx available"
        USE_PIPX=true
    else
        echo "⚠️  Homebrew Python detected but pipx not available"
        echo "Installing pipx..."
        python3 -m pip install --user pipx
        python3 -m pipx ensurepath
        export PATH="$HOME/.local/bin:$PATH"
        if command -v pipx &> /dev/null; then
            USE_PIPX=true
        else
            echo "❌ Failed to install pipx, falling back to pip"
        fi
    fi
fi

# Install workato-platform-cli
if [ "$USE_PIPX" = true ]; then
    echo "Installing workato-platform-cli using pipx..."
    pipx install workato-platform-cli
    WORKATO_EXECUTABLE=$(pipx list --short | grep workato-platform-cli | cut -d' ' -f2)/bin/workato
else
    echo "Installing workato-platform-cli using pip..."
    python3 -m pip install --user workato-platform-cli
    WORKATO_EXECUTABLE="$HOME/.local/bin/workato"
fi

echo "✓ workato-platform-cli installed"
echo ""

# Create bin directory
mkdir -p bin

# Create wrapper script
echo "Creating wrapper script at bin/workato..."
if [ "$USE_PIPX" = true ]; then
    cat > bin/workato << 'EOF'
#!/bin/bash
# Workato CLI wrapper script (pipx installation)

if ! command -v workato &> /dev/null; then
    echo "❌ Workato CLI not found in PATH."
    echo "Please run 'make setup tool=workato' to install the Workato CLI."
    exit 1
fi

# Execute workato CLI with all arguments
exec workato "$@"
EOF
else
    cat > bin/workato << EOF
#!/bin/bash
# Workato CLI wrapper script (pip installation)

WORKATO_EXECUTABLE="$WORKATO_EXECUTABLE"

if [ ! -f "\$WORKATO_EXECUTABLE" ]; then
    echo "❌ Workato CLI not found at \$WORKATO_EXECUTABLE"
    echo "Please run 'make setup tool=workato' to install the Workato CLI."
    exit 1
fi

# Execute workato CLI with all arguments
exec "\$WORKATO_EXECUTABLE" "\$@"
EOF
fi

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
