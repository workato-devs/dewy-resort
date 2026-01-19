#!/bin/bash

# Test Authentication Flow
# This script tests the complete authentication flow for Bedrock chat

echo "=== Testing Authentication Flow ==="
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
echo "To test authentication:"
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
echo "Step 1: Getting session tokens..."
RESPONSE=$(curl -s -H "Cookie: session=$SESSION_COOKIE" http://localhost:3000/api/debug/session-tokens)

echo "$RESPONSE" | jq '.'

HAS_ID_TOKEN=$(echo "$RESPONSE" | jq -r '.hasIdToken')
ID_TOKEN=$(echo "$RESPONSE" | jq -r '.idToken')

if [ "$HAS_ID_TOKEN" != "true" ]; then
  echo ""
  echo "❌ Session does not have ID token"
  echo "This is the root cause of the authentication error"
  echo ""
  echo "Possible causes:"
  echo "  1. Session was created before Cognito authentication was enabled"
  echo "  2. ID token was not stored during login"
  echo "  3. Session storage is not persisting Cognito tokens"
  echo ""
  echo "Solution: Log out and log back in to get a fresh session with ID token"
  exit 1
fi

echo ""
echo "✅ Session has ID token"
echo ""

echo "Step 2: Testing Identity Pool exchange..."
node scripts/test-identity-pool.js "$ID_TOKEN"

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Identity Pool exchange failed"
  exit 1
fi

echo ""
echo "Step 3: Testing Bedrock access..."
export TEST_ID_TOKEN="$ID_TOKEN"
node scripts/test-bedrock-simple.js

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Bedrock access test failed"
  exit 1
fi

echo ""
echo "🎉 All tests passed! Authentication flow is working correctly."
