#!/bin/bash

# Dev Server Management Script
# Usage: ./server.sh {start|stop|restart|status} [environment]
# Default environment: dev

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VAR_DIR="$PROJECT_ROOT/var"
PID_DIR="$VAR_DIR/run"
LOG_DIR="$VAR_DIR/logs/node"

# Default environment
ENV="${2:-dev}"
PID_FILE="$PID_DIR/server-${ENV}.pid"
LOG_FILE="$LOG_DIR/${ENV}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Ensure directories exist
mkdir -p "$PID_DIR"
mkdir -p "$LOG_DIR"

# Function to check if process is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            return 0
        else
            # PID file exists but process is not running
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Function to check if any server is already running on the port
is_port_in_use() {
    local PORT=3000
    # Check for listening processes only, not connected clients
    if lsof -ti:$PORT -sTCP:LISTEN > /dev/null 2>&1; then
        return 0
    fi
    return 1
}

# Function to get the npm command based on environment
get_npm_command() {
    case "$ENV" in
        dev)
            echo "npm run dev"
            ;;
        prod)
            echo "npm run start"
            ;;
        *)
            echo "npm run dev"
            ;;
    esac
}

# Function to kill any process on port 3000
kill_port_3000() {
    local PORT=3000
    
    # Get only LISTENING processes on port 3000 (not connected clients like Chrome)
    # Using -sTCP:LISTEN to filter for listening sockets only
    local LISTENING_PIDS=$(lsof -ti:$PORT -sTCP:LISTEN 2>/dev/null || true)
    
    if [ -z "$LISTENING_PIDS" ]; then
        return
    fi
    
    echo -e "${YELLOW}Killing listening process(es) on port $PORT...${NC}"
    for PID in $LISTENING_PIDS; do
        local CMD=$(ps -p "$PID" -o command= 2>/dev/null || echo "unknown")
        echo "  Killing PID: $PID ($CMD)"
        kill -9 "$PID" 2>/dev/null || true
    done
    
    sleep 1
    
    # Verify port is clear (check for listening processes only)
    if lsof -ti:$PORT -sTCP:LISTEN > /dev/null 2>&1; then
        echo -e "${RED}Warning: Port $PORT still has listening process${NC}"
    else
        echo -e "${GREEN}Port $PORT cleared${NC}"
    fi
}

# Function to start the server
start_server() {
    # Always kill anything on port 3000 first
    kill_port_3000
    
    # Check if server is already running via PID file
    if is_running; then
        echo -e "${YELLOW}Server is already running (PID: $(cat "$PID_FILE"))${NC}"
        echo -e "${YELLOW}Restarting...${NC}"
        stop_server
        sleep 2
    fi

    echo -e "${GREEN}Starting $ENV server...${NC}"
    echo "Log file: $LOG_FILE"
    
    cd "$PROJECT_ROOT"
    
    # Get the appropriate npm command
    NPM_CMD=$(get_npm_command)
    
    # Start the server with clean environment, only loading from .env
    # This prevents shell environment variables from leaking into the server
    if [ -f "$PROJECT_ROOT/.env" ]; then
        # Use env -i to start with clean environment
        # Add minimal required PATH for node/npm to work
        # Load all variables from .env file
        # Pipe through while loop to add timestamps to each line
        (env -i \
            PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$HOME/.nvm/versions/node/$(node -v)/bin" \
            HOME="$HOME" \
            $(grep -v '^#' "$PROJECT_ROOT/.env" | grep -v '^$' | xargs) \
            $NPM_CMD 2>&1 | while IFS= read -r line; do echo "[$(date '+%Y-%m-%d %H:%M:%S')] $line"; done >> "$LOG_FILE") &
    else
        echo -e "${RED}Error: .env file not found at $PROJECT_ROOT/.env${NC}"
        exit 1
    fi
    
    # Save PID
    echo $! > "$PID_FILE"
    
    # Wait a moment and check if it's still running
    sleep 2
    if is_running; then
        echo -e "${GREEN}Server started successfully (PID: $(cat "$PID_FILE"))${NC}"
        echo -e "${GREEN}➜${NC}  Local:   \033]8;;http://localhost:3000\033\\http://localhost:3000\033]8;;\033\\"
        echo "Tail logs with: tail -f $LOG_FILE"
    else
        echo -e "${RED}Server failed to start. Check logs: $LOG_FILE${NC}"
        exit 1
    fi
}

# Function to stop the server
stop_server() {
    local STOPPED=0
    
    # Stop process from PID file if it exists
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo -e "${YELLOW}Stopping server (PID: $PID)...${NC}"
            
            # Kill the process group to get all child processes
            pkill -P "$PID" 2>/dev/null || true
            kill "$PID" 2>/dev/null || true
            
            # Wait up to 10 seconds for graceful shutdown
            for i in {1..10}; do
                if ! ps -p "$PID" > /dev/null 2>&1; then
                    break
                fi
                sleep 1
            done
            
            # Force kill if still running
            if ps -p "$PID" > /dev/null 2>&1; then
                echo -e "${YELLOW}Force killing server...${NC}"
                pkill -9 -P "$PID" 2>/dev/null || true
                kill -9 "$PID" 2>/dev/null || true
            fi
            STOPPED=1
        fi
        rm -f "$PID_FILE"
    fi
    
    # Also kill any orphaned next dev/start processes ONLY in this project directory
    # Use full path to ensure we only kill processes from THIS project
    local PROJECT_PATTERN="$PROJECT_ROOT"
    
    # Find Next.js processes running in this project directory
    local NEXT_PIDS=$(ps aux | grep -E "next (dev|start)" | grep "$PROJECT_PATTERN" | grep -v grep | awk '{print $2}' || true)
    
    if [ -n "$NEXT_PIDS" ]; then
        echo -e "${YELLOW}Cleaning up orphaned Next.js processes for this project...${NC}"
        for PID in $NEXT_PIDS; do
            echo "  Killing Next.js PID: $PID"
            kill -9 "$PID" 2>/dev/null || true
        done
        STOPPED=1
    fi
    
    if [ $STOPPED -eq 1 ]; then
        echo -e "${GREEN}Server stopped${NC}"
    else
        echo -e "${YELLOW}Server is not running${NC}"
    fi
}

# Function to show server status
show_status() {
    if is_running; then
        PID=$(cat "$PID_FILE")
        echo -e "${GREEN}Server is running${NC}"
        echo "PID: $PID"
        echo "Environment: $ENV"
        echo -e "${GREEN}➜${NC}  Local:   \033]8;;http://localhost:3000\033\\http://localhost:3000\033]8;;\033\\"
        echo "Log file: $LOG_FILE"
        echo ""
        echo "Recent logs:"
        tail -n 10 "$LOG_FILE" 2>/dev/null || echo "No logs available"
    else
        echo -e "${RED}Server is not running${NC}"
    fi
}

# Main script logic
case "${1:-}" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        stop_server
        sleep 1
        start_server
        ;;
    status)
        show_status
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status} [environment]"
        echo ""
        echo "Commands:"
        echo "  start    - Start the server (restarts if already running)"
        echo "  stop     - Stop the server"
        echo "  restart  - Restart the server"
        echo "  status   - Show server status and recent logs"
        echo ""
        echo "Environments:"
        echo "  dev      - Development server (default)"
        echo "  prod     - Production server"
        echo ""
        echo "Examples:"
        echo "  $0 start          # Start dev server"
        echo "  $0 start prod     # Start production server"
        echo "  $0 restart dev    # Restart dev server"
        echo "  $0 status         # Show status of dev server"
        exit 1
        ;;
esac
