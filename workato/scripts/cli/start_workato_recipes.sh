#!/bin/bash

# Start all Workato recipes in ascending order by recipe ID
# Uses the Workato Developer API via MCP server
#
# Usage:
#   ./start_workato_recipes.sh              # Stop on first failure
#   ./start_workato_recipes.sh --skip-failed # Continue on failures

set -e

# Parse arguments
SKIP_FAILED=false
for arg in "$@"; do
    case $arg in
        --skip-failed)
            SKIP_FAILED=true
            shift
            ;;
        *)
            echo "Unknown argument: $arg"
            echo "Usage: $0 [--skip-failed]"
            exit 1
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Starting Workato Recipes${NC}"
if [ "$SKIP_FAILED" = true ]; then
    echo -e "${YELLOW}Mode: Skip failed recipes${NC}"
else
    echo -e "${YELLOW}Mode: Stop on first failure${NC}"
fi
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed${NC}"
    echo "Please install jq: brew install jq"
    exit 1
fi

# Get the project root directory (3 levels up from workato/scripts/cli/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Load environment variables from app/.env
ENV_FILE="$PROJECT_ROOT/app/.env"
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    echo -e "${RED}Error: .env file not found at $ENV_FILE${NC}"
    echo "Please create app/.env with WORKATO_API_TOKEN"
    exit 1
fi

# Check for required environment variables
if [ -z "$WORKATO_API_TOKEN" ]; then
    echo -e "${RED}Error: WORKATO_API_TOKEN not set${NC}"
    echo "Please set WORKATO_API_TOKEN in your app/.env file"
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
    START_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT \
        "https://app.trial.workato.com/api/recipes/${RECIPE_ID}/start" \
        -H "Authorization: Bearer ${WORKATO_API_TOKEN}" \
        -H "Content-Type: application/json")
    
    # Extract HTTP code and response body
    HTTP_CODE=$(echo "$START_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$START_RESPONSE" | sed '/HTTP_CODE:/d')
    
    # Check if the response indicates success
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
        # Parse the success field from JSON response
        SUCCESS=$(echo "$RESPONSE_BODY" | jq -r '.success' 2>/dev/null)
        
        if [ "$SUCCESS" = "true" ]; then
            echo -e "${GREEN}  ✓ Started successfully${NC}"
            STARTED=$((STARTED + 1))
        elif [ "$SUCCESS" = "false" ]; then
            # Check for config errors (unconnected accounts)
            HAS_CONFIG_ERRORS=$(echo "$RESPONSE_BODY" | jq -r '.config_errors | length > 0' 2>/dev/null)
            if [ "$HAS_CONFIG_ERRORS" = "true" ]; then
                echo -e "${RED}  ✗ Cannot start: Connection not configured${NC}"
                echo -e "${RED}     Configure connections in Workato UI: https://app.trial.workato.com${NC}"
                FAILED=$((FAILED + 1))
                
                if [ "$SKIP_FAILED" = false ]; then
                    echo ""
                    echo -e "${RED}========================================${NC}"
                    echo -e "${RED}Stopping due to configuration error${NC}"
                    echo -e "${RED}========================================${NC}"
                    echo ""
                    echo -e "Recipes processed before error:"
                    echo -e "  ${GREEN}Started: ${STARTED}${NC}"
                    echo -e "  ${YELLOW}Already running: ${ALREADY_RUNNING}${NC}"
                    echo ""
                    echo -e "Next steps:"
                    echo -e "  1. Log in to Workato: https://app.trial.workato.com"
                    echo -e "  2. Configure required connections (Salesforce, Stripe, etc.)"
                    echo -e "  3. Run 'make start-recipes' again"
                    echo ""
                    echo -e "Or run with: make start-recipes-skip-failed"
                    exit 1
                fi
            else
                CODE_ERRORS=$(echo "$RESPONSE_BODY" | jq -r '.code_errors | length > 0' 2>/dev/null)
                if [ "$CODE_ERRORS" = "true" ]; then
                    echo -e "${RED}  ✗ Failed to start: Code errors detected${NC}"
                else
                    echo -e "${RED}  ✗ Failed to start: Unknown configuration issue${NC}"
                fi
                FAILED=$((FAILED + 1))
                
                if [ "$SKIP_FAILED" = false ]; then
                    echo ""
                    echo -e "${RED}========================================${NC}"
                    echo -e "${RED}Stopping due to recipe error${NC}"
                    echo -e "${RED}========================================${NC}"
                    exit 1
                fi
            fi
        else
            # No success field or null - assume it started if HTTP 200
            echo -e "${GREEN}  ✓ Started successfully${NC}"
            STARTED=$((STARTED + 1))
        fi
    else
        ERROR_MSG=$(echo "$RESPONSE_BODY" | jq -r '.message // .error // "Unknown error"' 2>/dev/null || echo "$RESPONSE_BODY")
        echo -e "${RED}  ✗ Failed to start (HTTP ${HTTP_CODE}): ${ERROR_MSG}${NC}"
        FAILED=$((FAILED + 1))
        
        if [ "$SKIP_FAILED" = false ]; then
            echo ""
            echo -e "${RED}========================================${NC}"
            echo -e "${RED}Stopping due to API error${NC}"
            echo -e "${RED}========================================${NC}"
            exit 1
        fi
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

if [ $FAILED -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some recipes failed to start${NC}"
    echo -e "${YELLOW}Common reasons:${NC}"
    echo -e "${YELLOW}  - Connections not configured in Workato UI${NC}"
    echo -e "${YELLOW}  - Missing required fields or configuration${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  1. Log in to Workato: https://app.trial.workato.com"
    echo -e "  2. Navigate to each recipe that failed"
    echo -e "  3. Configure the required connections (Salesforce, Stripe, etc.)"
    echo -e "  4. Test the recipe manually"
    echo -e "  5. Start the recipe from the Workato UI"
    echo ""
fi

if [ $STARTED -gt 0 ]; then
    echo -e "${GREEN}✓ Successfully started ${STARTED} recipe(s)${NC}"
fi

if [ $FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi
