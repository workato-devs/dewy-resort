#!/bin/bash

# Quick diagnostic script for maintenance tasks issue

echo "╔════════════════════════════════════════════════════════════╗"
echo "║          Quick Maintenance Tasks Diagnostic                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if dev server is running
echo "1. Checking if dev server is running..."
if curl -s http://localhost:3000/api/manager/maintenance > /dev/null 2>&1; then
    echo "   ✓ Dev server is running"
else
    echo "   ✗ Dev server is NOT running"
    echo "   → Start it with: cd app && npm run dev"
    exit 1
fi

# Check environment variables
echo ""
echo "2. Checking environment configuration..."
cd app
if grep -q "SALESFORCE_ENABLED=true" .env; then
    echo "   ✓ Salesforce is enabled"
else
    echo "   ✗ Salesforce is disabled"
fi

if grep -q "WORKATO_MOCK_MODE=true" .env; then
    echo "   ✓ Mock mode is enabled (using mock data)"
else
    echo "   ✓ Mock mode is disabled (using real Salesforce)"
fi

# Test the API
echo ""
echo "3. Testing maintenance API..."
RESPONSE=$(curl -s http://localhost:3000/api/manager/maintenance)
TASK_COUNT=$(echo $RESPONSE | grep -o '"tasks":\[' | wc -l)

if [ $TASK_COUNT -gt 0 ]; then
    NUM_TASKS=$(echo $RESPONSE | grep -o '"id":' | wc -l)
    echo "   ✓ API is working - Found $NUM_TASKS tasks"
else
    echo "   ⚠ API returned no tasks"
    echo "   → You may need to create some maintenance tasks"
fi

echo ""
echo "4. Next steps:"
echo "   • Run: npx tsx scripts/check-salesforce-data.ts"
echo "   • Or create tasks via UI: http://localhost:3000/manager/maintenance"
echo ""
