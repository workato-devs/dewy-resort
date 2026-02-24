#!/bin/bash
set -e

echo "Workato CLI Setup"
echo "=================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Detect OS
OS="$(uname -s)"

# On macOS, prioritize Homebrew Python in PATH
if [ "$OS" = "Darwin" ]; then
    # Add Homebrew Python libexec to PATH (contains unversioned python3/pip3)
    for pyver in python@3.13 python@3.12 python@3.11; do
        libexec_path="/opt/homebrew/opt/$pyver/libexec/bin"
        if [ -d "$libexec_path" ]; then
            export PATH="$libexec_path:$PATH"
            echo "Using Homebrew $pyver"
            break
        fi
        # Intel Mac location
        libexec_path="/usr/local/opt/$pyver/libexec/bin"
        if [ -d "$libexec_path" ]; then
            export PATH="$libexec_path:$PATH"
            echo "Using Homebrew $pyver"
            break
        fi
    done
fi

# Find the correct Python 3.11+ executable
find_python() {
    local python_cmd=""
    
    # On macOS with Homebrew, prefer Homebrew Python
    if [ "$OS" = "Darwin" ]; then
        # Check Homebrew Python locations first (versioned binaries)
        for cmd in /opt/homebrew/bin/python3.13 /opt/homebrew/bin/python3.12 /opt/homebrew/bin/python3.11 \
                   /usr/local/bin/python3.13 /usr/local/bin/python3.12 /usr/local/bin/python3.11; do
            if [ -x "$cmd" ]; then
                python_cmd="$cmd"
                break
            fi
        done
    fi
    
    # If no Homebrew Python found, check standard commands
    if [ -z "$python_cmd" ]; then
        for cmd in python3.13 python3.12 python3.11 python3; do
            if command -v "$cmd" &> /dev/null; then
                local cmd_path=$(command -v "$cmd")
                # Skip system Python on macOS
                if [ "$OS" = "Darwin" ] && [[ "$cmd_path" == "/usr/bin/"* ]]; then
                    continue
                fi
                local version=$($cmd -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null)
                local major=$(echo "$version" | cut -d. -f1)
                local minor=$(echo "$version" | cut -d. -f2)
                
                if [ "$major" = "3" ] && [ "$minor" -ge "11" ]; then
                    python_cmd="$cmd"
                    break
                fi
            fi
        done
    fi
    
    echo "$python_cmd"
}

PYTHON_CMD=$(find_python)

if [ -z "$PYTHON_CMD" ]; then
    echo -e "${RED}Python 3.11+ is required but not found.${NC}"
    echo ""
    echo "Please install Python 3.11 or higher:"
    if [ "$OS" = "Darwin" ]; then
        echo "  brew install python@3.11"
    else
        echo "  sudo apt-get install python3.11  # Ubuntu/Debian"
        echo "  sudo dnf install python3.11      # Fedora"
    fi
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
PYTHON_PATH=$(which $PYTHON_CMD || echo "$PYTHON_CMD")

echo -e "${GREEN}✓${NC} Python $PYTHON_VERSION detected"
echo "  Path: $PYTHON_PATH"
echo ""

# Determine installation method based on Python source
USE_PIPX=false
INSTALL_METHOD=""

# Check if this is Homebrew Python (macOS)
if [ "$OS" = "Darwin" ]; then
    if [[ "$PYTHON_PATH" == *"/opt/homebrew/"* ]] || [[ "$PYTHON_PATH" == *"/usr/local/Cellar/"* ]]; then
        # Homebrew Python - must use pipx
        USE_PIPX=true
        INSTALL_METHOD="homebrew"
        echo "Detected: Homebrew Python (requires pipx)"
    elif [[ "$PYTHON_PATH" == "/usr/bin/python3" ]]; then
        # System Python on macOS - should not be used
        echo -e "${RED}System Python detected. Please install Python 3.11+ via Homebrew:${NC}"
        echo "  brew install python@3.11"
        exit 1
    fi
fi

# Install pipx if needed for Homebrew Python
if [ "$USE_PIPX" = true ]; then
    # Check if pipx exists and is using the right Python
    NEED_PIPX_REINSTALL=false
    
    if command -v pipx &> /dev/null; then
        # Check what Python pipx is using
        PIPX_PYTHON=$(pipx environment --value PIPX_DEFAULT_PYTHON 2>/dev/null || echo "")
        if [ -n "$PIPX_PYTHON" ]; then
            PIPX_PY_VERSION=$($PIPX_PYTHON -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null || echo "unknown")
            PIPX_PY_MAJOR=$(echo "$PIPX_PY_VERSION" | cut -d. -f1)
            PIPX_PY_MINOR=$(echo "$PIPX_PY_VERSION" | cut -d. -f2)
            
            if [ "$PIPX_PY_MAJOR" = "3" ] && [ "$PIPX_PY_MINOR" -ge "11" ]; then
                echo -e "${GREEN}✓${NC} pipx available (using Python $PIPX_PY_VERSION)"
            else
                echo -e "${YELLOW}pipx is using Python $PIPX_PY_VERSION, need 3.11+${NC}"
                NEED_PIPX_REINSTALL=true
            fi
        else
            echo -e "${GREEN}✓${NC} pipx available"
        fi
    else
        NEED_PIPX_REINSTALL=true
    fi
    
    if [ "$NEED_PIPX_REINSTALL" = true ]; then
        echo "Installing/reinstalling pipx with Python 3.11+..."
        
        # Install pipx via Homebrew (preferred) or pip
        if command -v brew &> /dev/null; then
            brew reinstall pipx 2>/dev/null || brew install pipx
        else
            $PYTHON_CMD -m pip install --user --force-reinstall pipx
        fi
        
        # Configure pipx to use our Python
        export PIPX_DEFAULT_PYTHON="$PYTHON_CMD"
        
        # Ensure pipx is in PATH
        eval "$($PYTHON_CMD -m pipx ensurepath 2>/dev/null)" || true
        export PATH="$HOME/.local/bin:$PATH"
        
        if ! command -v pipx &> /dev/null; then
            echo -e "${RED}Failed to install pipx${NC}"
            echo "Please install manually: brew install pipx"
            exit 1
        fi
        echo -e "${GREEN}✓${NC} pipx installed"
    fi
    echo ""
fi

# Install workato-platform-cli
echo "Installing workato-platform-cli..."
echo ""

if [ "$USE_PIPX" = true ]; then
    # Uninstall first if exists (pipx doesn't have --upgrade for reinstall)
    pipx uninstall workato-platform-cli 2>/dev/null || true
    
    # Set default Python for pipx and install
    export PIPX_DEFAULT_PYTHON="$PYTHON_CMD"
    echo "Using Python: $PYTHON_CMD"
    
    pipx install workato-platform-cli --python "$PYTHON_CMD"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓${NC} workato-platform-cli installed via pipx"
    else
        echo -e "${RED}Failed to install workato-platform-cli${NC}"
        exit 1
    fi
else
    # Use pip for non-Homebrew Python (Linux, pyenv, etc.)
    $PYTHON_CMD -m pip install --user --upgrade workato-platform-cli
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓${NC} workato-platform-cli installed via pip"
    else
        echo -e "${RED}Failed to install workato-platform-cli${NC}"
        exit 1
    fi
fi

echo ""

# Create bin directory
mkdir -p bin

# Create wrapper script
echo "Creating wrapper script at bin/workato..."

if [ "$USE_PIPX" = true ]; then
    # pipx installs to ~/.local/bin
    cat > bin/workato << 'WRAPPER'
#!/bin/bash
# Workato CLI wrapper script (pipx installation)

# Ensure pipx bin is in PATH
export PATH="$HOME/.local/bin:$PATH"

if ! command -v workato &> /dev/null; then
    echo "Workato CLI not found in PATH."
    echo "Please run './setup.sh --tool=workato' to install."
    exit 1
fi

exec workato "$@"
WRAPPER
else
    # pip --user installs to ~/.local/bin on Linux
    cat > bin/workato << 'WRAPPER'
#!/bin/bash
# Workato CLI wrapper script (pip installation)

# Ensure local bin is in PATH
export PATH="$HOME/.local/bin:$PATH"

if ! command -v workato &> /dev/null; then
    echo "Workato CLI not found in PATH."
    echo "Please run './setup.sh --tool=workato' to install."
    exit 1
fi

exec workato "$@"
WRAPPER
fi

chmod +x bin/workato

echo -e "${GREEN}✓${NC} Wrapper script created"
echo ""

# Verify installation
echo "Verifying installation..."

# Ensure PATH includes local bin for verification
export PATH="$HOME/.local/bin:$PATH"

if bin/workato --version > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Workato CLI successfully installed!"
    echo ""
    bin/workato --version
    echo ""
    echo "You can now use the CLI via:"
    echo "  bin/workato <command>"
    echo ""
    echo "To authenticate, set WORKATO_API_TOKEN in .env or run:"
    echo "  bin/workato login"
else
    echo -e "${RED}Installation verification failed${NC}"
    echo ""
    echo "Try adding ~/.local/bin to your PATH:"
    echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
    exit 1
fi
