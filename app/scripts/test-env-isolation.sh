#!/bin/bash

# Test Environment Variable Isolation
# This script verifies that the server only uses .env variables and doesn't inherit shell variables

# Get the app directory (parent of scripts)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Testing Environment Variable Isolation ==="
echo ""

# Set a test environment variable that should NOT be inherited
export TEST_SHELL_VAR="this_should_not_be_in_server"
export AWS_ACCESS_KEY_ID="FAKE_KEY_FROM_SHELL"

echo "Shell environment variables set:"
echo "  TEST_SHELL_VAR=$TEST_SHELL_VAR"
echo "  AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID"
echo ""

# Check what's in .env
echo "Variables in .env file:"
grep "^AWS_ACCESS_KEY_ID=" "$APP_DIR/.env" | head -1
echo ""

# Restart server with these shell variables set
echo "Restarting server..."
bash "$APP_DIR/scripts/dev-tools/server.sh" restart > /dev/null 2>&1

sleep 3

# Check server logs to see what credentials it's using
echo "Checking server logs for credential usage..."
echo ""

# Look for any indication of which credentials are being used
tail -50 "$APP_DIR/var/logs/node/dev.log" 2>&1 | grep -i "access.*key\|credential\|authentication" | head -5

echo ""
echo "If the server is using credentials from .env (starting with ASIA), the isolation is working."
echo "If it's using FAKE_KEY_FROM_SHELL, the isolation is NOT working."
echo ""

# Clean up
unset TEST_SHELL_VAR
unset AWS_ACCESS_KEY_ID

echo "Test complete. Check the logs above to verify isolation."
