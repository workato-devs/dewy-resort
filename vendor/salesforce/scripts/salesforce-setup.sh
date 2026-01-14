#!/bin/bash
set -e

echo "🔧 Salesforce CLI Setup"
echo "========================"
echo ""

# Detect OS and architecture
OS="$(uname -s)"
ARCH="$(uname -m)"

echo "Detected platform: $OS $ARCH"
echo ""

# Determine download URL based on platform
SF_INSTALL_DIR="tools/sf-cli"
DOWNLOAD_URL=""

case "$OS" in
    Darwin)
        # macOS
        if [ "$ARCH" = "arm64" ]; then
            # Apple Silicon
            DOWNLOAD_URL="https://developer.salesforce.com/media/salesforce-cli/sf/channels/stable/sf-darwin-arm64.tar.xz"
        else
            # Intel Mac
            DOWNLOAD_URL="https://developer.salesforce.com/media/salesforce-cli/sf/channels/stable/sf-darwin-x64.tar.xz"
        fi
        ;;
    Linux)
        # Linux
        if [ "$ARCH" = "x86_64" ]; then
            DOWNLOAD_URL="https://developer.salesforce.com/media/salesforce-cli/sf/channels/stable/sf-linux-x64.tar.xz"
        elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
            DOWNLOAD_URL="https://developer.salesforce.com/media/salesforce-cli/sf/channels/stable/sf-linux-arm64.tar.xz"
        else
            echo "❌ Unsupported Linux architecture: $ARCH"
            exit 1
        fi
        ;;
    MINGW*|MSYS*|CYGWIN*)
        # Windows (Git Bash, MSYS, Cygwin)
        echo "❌ Windows detected. Please install Salesforce CLI manually:"
        echo ""
        echo "Option 1: Using npm (recommended for Windows)"
        echo "  npm install --global @salesforce/cli"
        echo ""
        echo "Option 2: Using Windows installer"
        echo "  Download from: https://developer.salesforce.com/tools/salesforcecli"
        echo ""
        exit 1
        ;;
    *)
        echo "❌ Unsupported operating system: $OS"
        echo "Please install Salesforce CLI manually: https://developer.salesforce.com/tools/salesforcecli"
        exit 1
        ;;
esac

# Check for required tools
echo "Checking for required tools..."
if ! command -v curl &> /dev/null; then
    echo "❌ curl is not installed. Please install curl first."
    exit 1
fi

if ! command -v tar &> /dev/null; then
    echo "❌ tar is not installed. Please install tar first."
    exit 1
fi

echo "✓ Required tools available"
echo ""

# Create tools directory
mkdir -p tools

# Remove existing installation if present
if [ -d "$SF_INSTALL_DIR" ]; then
    echo "Removing existing Salesforce CLI installation..."
    rm -rf "$SF_INSTALL_DIR"
fi

# Download and extract Salesforce CLI
echo "Downloading Salesforce CLI from:"
echo "  $DOWNLOAD_URL"
echo ""
echo "This may take a few minutes..."

TEMP_DIR=$(mktemp -d)
DOWNLOAD_FILE="$TEMP_DIR/sf-cli.tar.xz"

if curl -fL -o "$DOWNLOAD_FILE" "$DOWNLOAD_URL"; then
    echo "✓ Download complete"
else
    echo "❌ Download failed"
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo ""
echo "Extracting Salesforce CLI to $SF_INSTALL_DIR..."
mkdir -p "$SF_INSTALL_DIR"
tar -xf "$DOWNLOAD_FILE" -C "$SF_INSTALL_DIR" --strip-components=1

# Clean up temp files
rm -rf "$TEMP_DIR"

echo "✓ Salesforce CLI extracted"
echo ""

# Create bin directory
mkdir -p bin

# Create wrapper script
echo "Creating wrapper script at bin/sf..."
cat > bin/sf << 'EOF'
#!/bin/bash
# Salesforce CLI wrapper script
# This script executes the Salesforce CLI from the isolated installation

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SF_CLI="$PROJECT_ROOT/tools/sf-cli/bin/sf"

if [ ! -f "$SF_CLI" ]; then
    echo "❌ Salesforce CLI installation not found."
    echo "Please run 'make setup tool=salesforce' to install the Salesforce CLI."
    exit 1
fi

# Execute sf CLI with all arguments
exec "$SF_CLI" "$@"
EOF

# Make wrapper script executable
chmod +x bin/sf

echo "✓ Wrapper script created"
echo ""

# Verify installation
echo "Verifying installation..."
if bin/sf --version > /dev/null 2>&1; then
    echo "✓ Salesforce CLI successfully installed!"
    echo ""
    bin/sf --version
    echo ""
    echo "You can now use the CLI via:"
    echo "  - bin/sf <command>"
    echo "  - make status tool=salesforce (to check connection)"
    echo "  - make sf-deploy org=<alias> (to deploy metadata)"
    echo ""
    echo "To authenticate to a Salesforce org:"
    echo "  bin/sf org login web --alias myDevOrg"
    echo ""
    echo "To list authenticated orgs:"
    echo "  bin/sf org list"
    echo ""
else
    echo "❌ Installation verification failed"
    exit 1
fi
