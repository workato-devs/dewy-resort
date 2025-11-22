#!/bin/bash

# Run all Bedrock module tests
# This script runs all manual verification tests for the Bedrock integration

echo "=========================================="
echo "Running All Bedrock Module Tests"
echo "=========================================="
echo ""

# Track test results
FAILED=0

# Run Identity Pool tests
echo "1. Running Identity Pool Service tests..."
npx tsx lib/bedrock/__tests__/identity-pool.test.ts
if [ $? -ne 0 ]; then
  FAILED=$((FAILED + 1))
  echo "❌ Identity Pool tests failed"
else
  echo "✅ Identity Pool tests passed"
fi
echo ""

# Run Bedrock Client tests
echo "2. Running Bedrock Service tests..."
npx tsx lib/bedrock/__tests__/client.test.ts
if [ $? -ne 0 ]; then
  FAILED=$((FAILED + 1))
  echo "❌ Bedrock Service tests failed"
else
  echo "✅ Bedrock Service tests passed"
fi
echo ""

# Run MCP Manager tests
echo "3. Running MCP Manager tests..."
npx tsx lib/bedrock/__tests__/mcp-manager.test.ts
if [ $? -ne 0 ]; then
  FAILED=$((FAILED + 1))
  echo "❌ MCP Manager tests failed"
else
  echo "✅ MCP Manager tests passed"
fi
echo ""

# Run Prompt Manager tests
echo "4. Running Prompt Manager tests..."
npx tsx lib/bedrock/__tests__/prompt-manager.test.ts
if [ $? -ne 0 ]; then
  FAILED=$((FAILED + 1))
  echo "❌ Prompt Manager tests failed"
else
  echo "✅ Prompt Manager tests passed"
fi
echo ""

# Run Conversation Manager tests
echo "5. Running Conversation Manager tests..."
npx tsx lib/bedrock/__tests__/conversation-manager.test.ts
if [ $? -ne 0 ]; then
  FAILED=$((FAILED + 1))
  echo "❌ Conversation Manager tests failed"
else
  echo "✅ Conversation Manager tests passed"
fi
echo ""

# Run Integration tests
echo "6. Running Integration tests..."
npx tsx lib/bedrock/__tests__/integration.test.ts
if [ $? -ne 0 ]; then
  FAILED=$((FAILED + 1))
  echo "❌ Integration tests failed"
else
  echo "✅ Integration tests passed"
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
if [ $FAILED -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ $FAILED test suite(s) failed"
  exit 1
fi
