#!/bin/bash
#
# Dewy Resort Workshop - Bootstrap Script for Mac/Linux
#
# One-liner installation:
#   curl -fsSL https://raw.githubusercontent.com/workato-devs/dewy-resort/main/bootstrap.sh | bash
#
# Or with options:
#   curl -fsSL https://raw.githubusercontent.com/workato-devs/dewy-resort/main/bootstrap.sh | bash -s -- --branch=feature-branch
#
# Options:
#   --repo=<url>      Repository URL (default: https://github.com/workato-devs/dewy-resort.git)
#   --branch=<name>   Branch to clone (default: main)
#   --dir=<path>      Target directory (default: ./dewy-resort)
#   --skip-deps       Skip dependency installation
#   --help            Show this help message

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Defaults
REPO_URL="https://github.com/workato-devs/dewy-resort.git"
BRANCH="main"
TARGET_DIR=""
SKIP_DEPS=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --repo=*)
            REPO_URL="${arg#*=}"
            ;;
        --branch=*)
            BRANCH="${arg#*=}"
            ;;
        --dir=*)
            TARGET_DIR="${arg#*=}"
            ;;
        --skip-deps)
            SKIP_DEPS=true
            ;;
        --help)
            echo "Dewy Resort Workshop Bootstrap"
            echo ""
            echo "Usage:"
            echo "  curl -fsSL <url>/bootstrap.sh | bash"
            echo "  curl -fsSL <url>/bootstrap.sh | bash -s -- [options]"
            echo ""
            echo "Options:"
            echo "  --repo=<url>      Repository URL"
            echo "  --branch=<name>   Branch to clone (default: main)"
            echo "  --dir=<path>      Target directory (default: ./dewy-resort)"
            echo "  --skip-deps       Skip dependency installation"
            echo "  --help            Show this help"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $arg${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Set default target directory
if [ -z "$TARGET_DIR" ]; then
    TARGET_DIR="$(pwd)/dewy-resort"
fi

echo ""
echo -e "${CYAN}========================================"
echo -e "  Dewy Resort Workshop Bootstrap"
echo -e "========================================${NC}"
echo ""

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Darwin*)
            OS="macos"
            ;;
        Linux*)
            OS="linux"
            # Detect distro
            if [ -f /etc/os-release ]; then
                . /etc/os-release
                DISTRO="$ID"
            else
                DISTRO="unknown"
            fi
            ;;
        *)
            echo -e "${RED}Unsupported operating system: $(uname -s)${NC}"
            echo "This script supports macOS and Linux only."
            echo "For Windows, use bootstrap.ps1"
            exit 1
            ;;
    esac
    echo -e "Detected OS: ${GREEN}$OS${NC}"
    if [ "$OS" = "linux" ]; then
        echo -e "Distribution: ${GREEN}$DISTRO${NC}"
    fi
}

# Check if command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Install Homebrew (macOS)
install_homebrew() {
    if command_exists brew; then
        echo -e "${GREEN}✓${NC} Homebrew already installed"
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
        echo -e "${GREEN}✓${NC} Git already installed: $(git --version)"
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
                    echo -e "${RED}Please install Git manually for your distribution${NC}"
                    exit 1
                    ;;
            esac
            ;;
    esac
    
    echo -e "${GREEN}✓${NC} Git installed"
}

# Install make
install_make() {
    if command_exists make; then
        echo -e "${GREEN}✓${NC} make already installed: $(make --version | head -1)"
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
                    exit 1
                    ;;
            esac
            ;;
    esac
    
    echo -e "${GREEN}✓${NC} make installed"
}

# Install Node.js v20
install_node() {
    local need_install=false
    
    if command_exists node; then
        local version=$(node --version | sed 's/v//' | cut -d. -f1)
        if [ "$version" = "20" ]; then
            echo -e "${GREEN}✓${NC} Node.js v20 already installed: $(node --version)"
            return 0
        else
            echo -e "${YELLOW}Node.js v$version found, but v20 is required${NC}"
            need_install=true
        fi
    else
        need_install=true
    fi
    
    if [ "$need_install" = true ]; then
        echo -e "${YELLOW}Installing Node.js v20...${NC}"
        
        case "$OS" in
            macos)
                brew install node@20
                brew link --overwrite node@20 || true
                ;;
            linux)
                # Use NodeSource for consistent v20 installation
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
                            exit 1
                            ;;
                    esac
                else
                    echo -e "${RED}curl is required to install Node.js${NC}"
                    exit 1
                fi
                ;;
        esac
        
        echo -e "${GREEN}✓${NC} Node.js v20 installed"
    fi
}

# Check for wk CLI
check_wk() {
    if command_exists wk; then
        echo -e "${GREEN}✓${NC} wk CLI available: $(wk version)"
        return 0
    fi

    echo -e "${YELLOW}wk CLI not found. Install it after bootstrap:${NC}"
    echo "  macOS/Linux: brew install workato/tap/wk"
    echo "  Windows:     scoop install wk"
    return 1
}

# Clone repository
clone_repo() {
    echo ""
    echo -e "${BLUE}Cloning repository...${NC}"
    echo "  URL: $REPO_URL"
    echo "  Branch: $BRANCH"
    echo "  Target: $TARGET_DIR"
    echo ""
    
    if [ -d "$TARGET_DIR" ]; then
        echo -e "${YELLOW}Directory already exists: $TARGET_DIR${NC}"
        echo -n "Delete and re-clone? [y/N] "
        read -r reply
        if [[ $reply =~ ^[Yy]$ ]]; then
            rm -rf "$TARGET_DIR"
        else
            echo "Using existing directory"
            return 0
        fi
    fi
    
    git clone --branch "$BRANCH" "$REPO_URL" "$TARGET_DIR"
    echo -e "${GREEN}✓${NC} Repository cloned"
}

# Run setup
run_setup() {
    echo ""
    echo -e "${BLUE}Running setup...${NC}"
    echo ""
    
    cd "$TARGET_DIR"
    
    # Install npm dependencies for the app
    if [ -f "app/package.json" ]; then
        echo "Installing npm dependencies..."
        cd app
        npm install
        cd ..
        echo -e "${GREEN}✓${NC} npm dependencies installed"
    fi
    
    # Run CLI setup via make
    if [ -f "Makefile" ]; then
        echo ""
        echo "Setting up vendor CLIs..."
        make setup
    fi
}

# Main execution
main() {
    detect_os
    echo ""
    
    if [ "$SKIP_DEPS" = false ]; then
        echo -e "${CYAN}Step 1: Installing Dependencies${NC}"
        echo "--------------------------------"
        
        # Install package manager (macOS only)
        if [ "$OS" = "macos" ]; then
            install_homebrew
        fi
        
        install_git
        install_make
        install_node
        check_wk || true
        
        echo ""
        echo -e "${GREEN}✓${NC} All dependencies installed"
    else
        echo -e "${YELLOW}Skipping dependency installation${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}Step 2: Clone Repository${NC}"
    echo "------------------------"
    clone_repo
    
    echo ""
    echo -e "${CYAN}Step 3: Run Setup${NC}"
    echo "-----------------"
    run_setup
    
    echo ""
    echo -e "${GREEN}========================================"
    echo -e "  Bootstrap Complete!"
    echo -e "========================================${NC}"
    echo ""
    echo "The Dewy Resort workshop is ready at:"
    echo -e "  ${CYAN}$TARGET_DIR${NC}"
    echo ""
    echo "Next steps:"
    echo "  cd \"$TARGET_DIR\""
    echo "  wk auth login                    # Authenticate with Workato"
    echo "  make workato-init                # Initialize wk project"
    echo "  make start-recipes               # Start all recipes"
    echo "  cd app && cp .env.example .env   # Configure app"
    echo "  npm install && npm run dev"
    echo ""
}

main
