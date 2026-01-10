#!/bin/bash

# Start all Workato recipes in ascending order by recipe ID
# Uses the Workato Developer API via MCP server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Starting Workato Recipes${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed${NC}"
    echo "Please install jq: brew install jq"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Check for required environment variables
if [ -z "$WORKATO_API_TOKEN" ]; then
    echo -e "${RED}Error: WORKATO_API_TOKEN not set${NC}"
    echo "Please set WORKATO_API_TOKEN in your .env file"
    exit 1
fi

# Fetch all recipes using the Workato API
echo -e "${YELLOW}Fetching all recipes...${NC}"

RECIPES_JSON=$(curl -s -X GET \
    "https://app.trial.workato.com/api/recipes?per_page=100" \
    -H "Authorization: Bearer ${WORKATO_API_TOKEN}" \
    -H "Content-Type: application/json")

# Check if the API call was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to fetch recipes from Workato API${NC}"
    exit 1
fi

# Parse and sort recipes by ID (ascending)
RECIPE_IDS=$(echo "$RECIPES_JSON" | jq -r '.items[] | .id' | sort -n)

if [ -z "$RECIPE_IDS" ]; then
    echo -e "${YELLOW}No recipes found${NC}"
    exit 0
fi

TOTAL_RECIPES=$(echo "$RECIPE_IDS" | wc -l | tr -d ' ')
echo -e "${GREEN}Found ${TOTAL_RECIPES} recipes${NC}"
echo ""

# Counter for tracking progress
STARTED=0
FAILED=0
ALREADY_RUNNING=0

# Start each recipe
for RECIPE_ID in $RECIPE_IDS; do
    # Get recipe details
    RECIPE_INFO=$(echo "$RECIPES_JSON" | jq -r ".items[] | select(.id == $RECIPE_ID)")
    RECIPE_NAME=$(echo "$RECIPE_INFO" | jq -r '.name')
    RECIPE_RUNNING=$(echo "$RECIPE_INFO" | jq -r '.running')
    
    echo -e "${BLUE}Recipe ID: ${RECIPE_ID}${NC} - ${RECIPE_NAME}"
    
    # Check if recipe is already running
    if [ "$RECIPE_RUNNING" = "true" ]; then
        echo -e "${YELLOW}  ⚠️  Already running, skipping...${NC}"
        ALREADY_RUNNING=$((ALREADY_RUNNING + 1))
        echo ""
        continue
    fi
    
    # Start the recipe
    START_RESPONSE=$(curl -s -X PUT \
        "https://app.trial.workato.com/api/recipes/${RECIPE_ID}/start" \
        -H "Authorization: Bearer ${WORKATO_API_TOKEN}" \
        -H "Content-Type: application/json")
    
    # Check if start was successful
    if echo "$START_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ Started successfully${NC}"
        STARTED=$((STARTED + 1))
    else
        ERROR_MSG=$(echo "$START_RESPONSE" | jq -r '.message // "Unknown error"')
        echo -e "${RED}  ✗ Failed to start: ${ERROR_MSG}${NC}"
        FAILED=$((FAILED + 1))
    fi
    
    echo ""
    
    # Small delay to avoid rate limiting
    sleep 0.5
done

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total recipes: ${TOTAL_RECIPES}"
echo -e "${GREEN}Started: ${STARTED}${NC}"
echo -e "${YELLOW}Already running: ${ALREADY_RUNNING}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All recipes processed successfully${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some recipes failed to start${NC}"
    exit 1
fi
