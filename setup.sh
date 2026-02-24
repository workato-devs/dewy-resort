#!/bin/bash
#
# Dewy Resort Workshop - Setup Script for Mac/Linux
#
# This is the main entry point for Mac/Linux users to set up the workshop environment.
#
# Usage:
#   ./setup.sh                    # Interactive setup (installs prerequisites + all tools)
#   ./setup.sh --tool=workato     # Setup specific tool
#   ./setup.sh --tool=salesforce  # Setup specific tool
#   ./setup.sh --tool=all         # Setup all tools (default)
#   ./setup.sh --skip-deps        # Skip prerequisite installation
#   ./setup.sh --help             # Show help

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Defaults
TOOL="all"
SKIP_DEPS=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --tool=*)
            TOOL="${arg#*=}"
            ;;
        --skip-deps)
            SKIP_DEPS=true
            ;;
        --help|-h)
            echo ""
            echo "Dewy Resort Workshop Setup"
            echo "=========================="
            echo ""
            echo "Usage:"
            echo "  ./setup.sh                    # Install all CLIs"
            echo "  ./setup.sh --tool=workato     # Install only Workato CLI"
            echo "  ./setup.sh --tool=salesforce  # Install only Salesforce CLI"
            echo "  ./setup.sh --skip-deps        # Skip prerequisite checks"
            echo ""
            echo "Available Commands (after setup):"
            echo ""
            echo "  Workato:"
            echo "    ./workato/scripts/cli/start_workato_recipes.sh"
            echo "    ./workato/scripts/cli/stop_workato_recipes.sh"
            echo ""
            echo "  Salesforce:"
            echo "    ./vendor/salesforce/scripts/deploy.sh <org-alias>"
            echo ""
            echo "  Dev Server:"
            echo "    cd app && npm run dev"
            echo ""
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $arg${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Dewy Resort Workshop Setup${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Darwin*)
            OS="macos"
            ;;
        Linux*)
            OS="linux"
            if [ -f /etc/os-release ]; then
                . /etc/os-release
                DISTRO="$ID"
            else
                DISTRO="unknown"
            fi
            ;;
        *)
            echo -e "${RED}Unsupported OS: $(uname -s)${NC}"
            echo "For Windows, use setup.ps1"
            exit 1
            ;;
    esac
}

# Check if command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Install Homebrew (macOS)
install_homebrew() {
    if command_exists brew; then
        echo -e "${GREEN}✓${NC} Homebrew available"
        return 0
    fi
    
    echo -e "${YELLOW}Installing Homebrew...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add to PATH for Apple Silicon
    if [ -f /opt/homebrew/bin/brew ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
    
    echo -e "${GREEN}✓${NC} Homebrew installed"
}

# Install Git
install_git() {
    if command_exists git; then
        echo -e "${GREEN}✓${NC} Git available: $(git --version | head -1)"
        return 0
    fi
    
    echo -e "${YELLOW}Installing Git...${NC}"
    
    case "$OS" in
        macos)
            brew install git
            ;;
        linux)
            case "$DISTRO" in
                ubuntu|debian|pop)
                    sudo apt-get update && sudo apt-get install -y git
                    ;;
                fedora|rhel|centos)
                    sudo dnf install -y git || sudo yum install -y git
                    ;;
                arch|manjaro)
                    sudo pacman -S --noconfirm git
                    ;;
                *)
                    echo -e "${RED}Please install Git manually${NC}"
                    return 1
                    ;;
            esac
            ;;
    esac
    
    echo -e "${GREEN}✓${NC} Git installed"
}

# Install make
install_make() {
    if command_exists make; then
        echo -e "${GREEN}✓${NC} make available: $(make --version | head -1)"
        return 0
    fi
    
    echo -e "${YELLOW}Installing make...${NC}"
    
    case "$OS" in
        macos)
            # make comes with Xcode Command Line Tools
            xcode-select --install 2>/dev/null || true
            # If that doesn't work, install via Homebrew
            if ! command_exists make; then
                brew install make
            fi
            ;;
        linux)
            case "$DISTRO" in
                ubuntu|debian|pop)
                    sudo apt-get update && sudo apt-get install -y make
                    ;;
                fedora|rhel|centos)
                    sudo dnf install -y make || sudo yum install -y make
                    ;;
                arch|manjaro)
                    sudo pacman -S --noconfirm make
                    ;;
                *)
                    echo -e "${RED}Please install make manually${NC}"
                    return 1
                    ;;
            esac
            ;;
    esac
    
    echo -e "${GREEN}✓${NC} make installed"
}

# Install Node.js v20
install_node() {
    if command_exists node; then
        local version=$(node --version | sed 's/v//' | cut -d. -f1)
        if [ "$version" = "20" ]; then
            echo -e "${GREEN}✓${NC} Node.js v20 available: $(node --version)"
            return 0
        else
            echo -e "${YELLOW}⚠${NC}  Node.js v$version found, but v20 is required"
        fi
    fi
    
    echo -e "${YELLOW}Installing Node.js v20...${NC}"
    
    case "$OS" in
        macos)
            brew install node@20
            brew link --overwrite node@20 2>/dev/null || true
            ;;
        linux)
            if command_exists curl; then
                curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
                case "$DISTRO" in
                    ubuntu|debian|pop)
                        sudo apt-get install -y nodejs
                        ;;
                    fedora|rhel|centos)
                        sudo dnf install -y nodejs || sudo yum install -y nodejs
                        ;;
                    arch|manjaro)
                        sudo pacman -S --noconfirm nodejs npm
                        ;;
                    *)
                        echo -e "${RED}Please install Node.js v20 manually${NC}"
                        return 1
                        ;;
                esac
            else
                echo -e "${RED}curl required to install Node.js${NC}"
                return 1
            fi
            ;;
    esac
    
    echo -e "${GREEN}✓${NC} Node.js v20 installed"
}

# Install Python 3.11+
install_python() {
    # On macOS, we must use Homebrew Python, not system Python
    if [ "$OS" = "macos" ]; then
        # Check for Homebrew Python specifically
        for cmd in /opt/homebrew/bin/python3.13 /opt/homebrew/bin/python3.12 /opt/homebrew/bin/python3.11 \
                   /usr/local/bin/python3.13 /usr/local/bin/python3.12 /usr/local/bin/python3.11; do
            if [ -x "$cmd" ]; then
                local version=$($cmd -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
                echo -e "${GREEN}✓${NC} Python $version available (Homebrew: $cmd)"
                return 0
            fi
        done
        
        # No Homebrew Python found, install it
        echo -e "${YELLOW}Installing Python 3.11 via Homebrew...${NC}"
        brew install python@3.11
        
        # Also install pipx for package management
        echo -e "${YELLOW}Installing pipx...${NC}"
        brew install pipx
        pipx ensurepath 2>/dev/null || true
        
        echo -e "${GREEN}✓${NC} Python 3.11 installed via Homebrew"
        return 0
    fi
    
    # Linux: check for Python 3.11+
    for cmd in python3.13 python3.12 python3.11 python3; do
        if command_exists "$cmd"; then
            local version=$($cmd -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null)
            local major=$(echo "$version" | cut -d. -f1)
            local minor=$(echo "$version" | cut -d. -f2)
            
            if [ "$major" = "3" ] && [ "$minor" -ge "11" ]; then
                echo -e "${GREEN}✓${NC} Python $version available (using $cmd)"
                return 0
            fi
        fi
    done
    
    echo -e "${YELLOW}Installing Python 3.11+...${NC}"
    
    case "$DISTRO" in
        ubuntu|debian|pop)
            sudo apt-get update
            sudo apt-get install -y python3.11 python3-pip 2>/dev/null || \
            sudo apt-get install -y python3 python3-pip
            ;;
        fedora|rhel|centos)
            sudo dnf install -y python3.11 python3-pip 2>/dev/null || \
            sudo dnf install -y python3 python3-pip
            ;;
        arch|manjaro)
            sudo pacman -S --noconfirm python python-pip
            ;;
        *)
            echo -e "${RED}Please install Python 3.11+ manually${NC}"
            return 1
            ;;
    esac
    
    echo -e "${GREEN}✓${NC} Python installed"
}

# Install prerequisites
install_prerequisites() {
    echo -e "${CYAN}Checking Prerequisites${NC}"
    echo "----------------------"
    echo ""
    
    detect_os
    echo -e "OS: ${GREEN}$OS${NC}"
    [ "$OS" = "linux" ] && echo -e "Distro: ${GREEN}$DISTRO${NC}"
    echo ""
    
    # macOS: ensure Homebrew
    if [ "$OS" = "macos" ]; then
        install_homebrew || return 1
    fi
    
    install_git || return 1
    install_make || return 1
    install_node || return 1
    install_python || return 1
    
    echo ""
    echo -e "${GREEN}✓${NC} All prerequisites satisfied"
    return 0
}

# Setup Workato CLI
setup_workato() {
    echo ""
    echo -e "${BLUE}--- Setting up Workato CLI ---${NC}"
    
    if [ -f "workato/scripts/cli/workato-setup.sh" ]; then
        bash workato/scripts/cli/workato-setup.sh
    else
        echo -e "${RED}Workato setup script not found${NC}"
        return 1
    fi
}

# Setup Salesforce CLI
setup_salesforce() {
    echo ""
    echo -e "${BLUE}--- Setting up Salesforce CLI ---${NC}"
    
    if [ -f "vendor/salesforce/scripts/salesforce-setup.sh" ]; then
        bash vendor/salesforce/scripts/salesforce-setup.sh
    else
        echo -e "${RED}Salesforce setup script not found${NC}"
        return 1
    fi
}

# Main execution
main() {
    # Install prerequisites unless skipped
    if [ "$SKIP_DEPS" = false ]; then
        echo -e "${CYAN}========================================${NC}"
        echo -e "${CYAN}  Step 1: Prerequisites${NC}"
        echo -e "${CYAN}========================================${NC}"
        echo ""
        
        if ! install_prerequisites; then
            echo ""
            echo -e "${RED}Prerequisite installation failed${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}Skipping prerequisite checks${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  Step 2: Installing CLI Tools${NC}"
    echo -e "${CYAN}========================================${NC}"
    
    case "$TOOL" in
        all)
            echo ""
            echo "Setting up all vendor CLIs..."
            setup_workato || echo -e "${YELLOW}⚠${NC}  Workato setup had issues"
            setup_salesforce || echo -e "${YELLOW}⚠${NC}  Salesforce setup had issues"
            ;;
        workato)
            setup_workato || exit 1
            ;;
        salesforce)
            setup_salesforce || exit 1
            ;;
        *)
            echo -e "${RED}Unknown tool: $TOOL${NC}"
            echo "Valid options: workato, salesforce, all"
            exit 1
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Setup Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Next steps:"
    echo "  cd app"
    echo "  cp .env.example .env"
    echo "  # Edit .env with your configuration"
    echo "  npm install"
    echo "  npm run dev"
    echo ""
}

main
