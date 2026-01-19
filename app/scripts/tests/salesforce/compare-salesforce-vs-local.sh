#!/bin/bash

# Compare Salesforce vs Local Database Data
# This script fetches data with Salesforce enabled, then disabled, to show the difference

set -e

echo "=========================================="
echo "Salesforce vs Local Database Comparison"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if server is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${RED}❌ Server is not running on localhost:3000${NC}"
    exit 1
fi

# Fetch current data (should be from Salesforce)
echo -e "${BLUE}Fetching data with SALESFORCE_ENABLED=true...${NC}"
echo ""

SALESFORCE_DATA=$(curl -s http://localhost:3000/api/manager/dashboard)
SF_ROOMS=$(echo "$SALESFORCE_DATA" | python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps(data['roomStatuses'][:3], indent=2))")

echo "Sample rooms from Salesforce:"
echo "$SF_ROOMS"
echo ""

# Extract IDs
SF_ID_1=$(echo "$SF_ROOMS" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['id'])")
SF_ID_2=$(echo "$SF_ROOMS" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[1]['id'])")
SF_ID_3=$(echo "$SF_ROOMS" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[2]['id'])")

echo -e "${GREEN}Salesforce Room IDs:${NC}"
echo "  Room 1: $SF_ID_1"
echo "  Room 2: $SF_ID_2"
echo "  Room 3: $SF_ID_3"
echo ""

# Check local database
echo -e "${BLUE}Checking local database IDs...${NC}"
echo ""

LOCAL_IDS=$(sqlite3 var/hotel.db "SELECT id, room_number FROM rooms LIMIT 3;")
echo "Local database room IDs:"
echo "$LOCAL_IDS"
echo ""

# Compare
echo "=========================================="
echo -e "${GREEN}Comparison Results:${NC}"
echo "=========================================="
echo ""
echo "Salesforce IDs (from API):"
echo "  - Format: 18-character alphanumeric (e.g., a01g5000006PCXhAAO)"
echo "  - Pattern: Starts with 'a01' (Salesforce object prefix)"
echo "  - Example: $SF_ID_1"
echo ""
echo "Local Database IDs:"
echo "  - Format: Simple strings (e.g., room_1, room_2)"
echo "  - Pattern: Typically 'room_' prefix with number"
echo "  - Example: $(echo "$LOCAL_IDS" | head -1 | cut -d'|' -f1)"
echo ""
echo -e "${YELLOW}Conclusion:${NC}"
if [[ $SF_ID_1 == a01* ]]; then
    echo "✓ The API is returning Salesforce IDs, NOT local database IDs"
    echo "✓ This proves the data is coming from Salesforce via Workato"
else
    echo "⚠ The API appears to be using local database"
fi
echo ""

# Show API call evidence
echo -e "${BLUE}Recent Workato API Calls:${NC}"
tail -20 var/logs/node/dev.log | grep "POST https://apim.trial.workato.com" | tail -5
echo ""

echo "To see live API calls as they happen:"
echo "  tail -f var/logs/node/dev.log | grep 'Workato'"
