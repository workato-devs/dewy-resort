#!/bin/bash

# Test Cognito Identity Pool with Bedrock
# This script tests the complete flow from ID token to Bedrock invocation

echo "=== Testing Cognito Identity Pool with Bedrock ==="
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
echo "To test Cognito Identity Pool:"
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
echo "Step 1: Getting ID token from session..."
RESPONSE=$(curl -s -H "Cookie: session=$SESSION_COOKIE" http://localhost:3000/api/debug/session-tokens)

echo "$RESPONSE" | jq '.'

HAS_ID_TOKEN=$(echo "$RESPONSE" | jq -r '.hasIdToken')
ID_TOKEN=$(echo "$RESPONSE" | jq -r '.idToken')

if [ "$HAS_ID_TOKEN" != "true" ]; then
  echo ""
  echo "❌ Session does not have ID token"
  echo "Please log out and log back in to get a fresh session"
  exit 1
fi

echo ""
echo "✅ Got fresh ID token"
echo ""

echo "Step 2: Testing Identity Pool exchange..."
COGNITO_IDENTITY_POOL_ID=us-west-2:88c48483-b39d-41e0-a8ba-cdc9ac6bfb9b \
COGNITO_USER_POOL_ID=us-west-2_l1yPytMyD \
AWS_REGION=us-west-2 \
node scripts/test-identity-pool.js "$ID_TOKEN"

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Identity Pool exchange failed"
  exit 1
fi

echo ""
echo "Step 3: Testing Bedrock access with Cognito credentials..."
export TEST_ID_TOKEN="$ID_TOKEN"
node scripts/test-bedrock-simple.js "$ID_TOKEN"

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Bedrock access failed with Cognito credentials"
  echo ""
  echo "This confirms the issue: Cognito Identity Pool credentials don't work with Bedrock"
  exit 1
fi

echo ""
echo "🎉 Success! Cognito Identity Pool credentials work with Bedrock!"
echo ""
echo "Next step: Update the application to use Cognito credentials"
