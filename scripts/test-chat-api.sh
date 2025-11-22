#!/bin/bash

# Test Chat API with Server-Side Credentials
# This script tests the /api/chat/stream endpoint after the fix

echo "=== Testing Chat API with Server-Side Credentials ==="
echo ""

# Check if server is running
if ! bash scripts/dev-tools/server.sh status > /dev/null 2>&1; then
  echo "❌ Dev server is not running"
  echo "Start it with: bash scripts/dev-tools/server.sh start"
  exit 1
fi

echo "✅ Dev server is running"
echo ""

# Get session cookie from user
echo "To test the chat API:"
echo "1. Log in to http://localhost:3000 as a manager"
echo "2. Open browser DevTools > Application > Cookies"
echo "3. Copy the 'session' cookie value"
echo ""
read -p "Paste your session cookie value: " SESSION_COOKIE

if [ -z "$SESSION_COOKIE" ]; then
  echo "❌ No session cookie provided"
  exit 1
fi

echo ""
echo "Testing chat stream endpoint..."
echo ""

# Test the chat stream endpoint
curl -N -H "Cookie: session=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"message":"Say hello in one sentence"}' \
  http://localhost:3000/api/chat/stream 2>&1 | head -50

echo ""
echo ""
echo "If you see streaming tokens above, the fix is working!"
echo "If you see an error, check the server logs:"
echo "  tail -f var/logs/node/dev.log"
