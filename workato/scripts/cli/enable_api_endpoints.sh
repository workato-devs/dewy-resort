#!/bin/bash

# Enable all API endpoints in specified API collections
# Uses the Workato Developer API
#
# Usage:
#   ./enable_api_endpoints.sh                    # Enable all endpoints in all collections
#   ./enable_api_endpoints.sh --collection-name "sf-api-collection"  # Enable specific collection

set -e

# Parse arguments
COLLECTION_NAME=""
for arg in "$@"; do
    case $arg in
        --collection-name=*)
            COLLECTION_NAME="${arg#*=}"
            shift
            ;;
        --collection-name)
            COLLECTION_NAME="$2"
            shift 2
            ;;
        *)
            if [ -n "$1" ] && [ "${1:0:1}" != "-" ]; then
                echo "Unknown argument: $arg"
                echo "Usage: $0 [--collection-name <name>]"
                exit 1
            fi
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
echo -e "${BLUE}Enabling Workato API Endpoints${NC}"
if [ -n "$COLLECTION_NAME" ]; then
    echo -e "${YELLOW}Collection: ${COLLECTION_NAME}${NC}"
else
    echo -e "${YELLOW}All collections${NC}"
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

# Fetch all API collections
echo -e "${YELLOW}Fetching API collections...${NC}"

COLLECTIONS_JSON=$(curl -s -X GET \
    "https://app.trial.workato.com/api/api_collections?per_page=100" \
    -H "Authorization: Bearer ${WORKATO_API_TOKEN}" \
    -H "Content-Type: application/json")

# Check if the API call was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to fetch API collections from Workato API${NC}"
    exit 1
fi

# Filter collections if name specified
if [ -n "$COLLECTION_NAME" ]; then
    COLLECTION_IDS=$(echo "$COLLECTIONS_JSON" | jq -r ".[] | select(.name == \"$COLLECTION_NAME\") | .id")
    if [ -z "$COLLECTION_IDS" ]; then
        echo -e "${RED}Error: Collection '${COLLECTION_NAME}' not found${NC}"
        echo ""
        echo -e "${YELLOW}Available collections:${NC}"
        echo "$COLLECTIONS_JSON" | jq -r '.[] | "  - \(.name) (ID: \(.id))"'
        exit 1
    fi
else
    COLLECTION_IDS=$(echo "$COLLECTIONS_JSON" | jq -r '.[] | .id')
fi

if [ -z "$COLLECTION_IDS" ]; then
    echo -e "${YELLOW}No API collections found${NC}"
    exit 0
fi

TOTAL_COLLECTIONS=$(echo "$COLLECTION_IDS" | wc -l | tr -d ' ')
echo -e "${GREEN}Found ${TOTAL_COLLECTIONS} collection(s)${NC}"
echo ""

# Counter for tracking progress
ENABLED=0
FAILED=0
ALREADY_ENABLED=0
RECIPE_NOT_STARTED=0

# Process each collection
for COLLECTION_ID in $COLLECTION_IDS; do
    # Get collection details
    COLLECTION_INFO=$(echo "$COLLECTIONS_JSON" | jq -r ".[] | select(.id == $COLLECTION_ID)")
    COLLECTION_NAME_DISPLAY=$(echo "$COLLECTION_INFO" | jq -r '.name')
    
    echo -e "${BLUE}Collection: ${COLLECTION_NAME_DISPLAY} (ID: ${COLLECTION_ID})${NC}"
    
    # Fetch endpoints for this collection
    ENDPOINTS_JSON=$(curl -s -X GET \
        "https://app.trial.workato.com/api/api_endpoints?api_collection_id=${COLLECTION_ID}&per_page=100" \
        -H "Authorization: Bearer ${WORKATO_API_TOKEN}" \
        -H "Content-Type: application/json")
    
    ENDPOINT_IDS=$(echo "$ENDPOINTS_JSON" | jq -r '.[] | .id')
    
    if [ -z "$ENDPOINT_IDS" ]; then
        echo -e "${YELLOW}  No endpoints found in this collection${NC}"
        echo ""
        continue
    fi
    
    ENDPOINT_COUNT=$(echo "$ENDPOINT_IDS" | wc -l | tr -d ' ')
    echo -e "${YELLOW}  Found ${ENDPOINT_COUNT} endpoint(s)${NC}"
    
    # Enable each endpoint
    for ENDPOINT_ID in $ENDPOINT_IDS; do
        ENDPOINT_INFO=$(echo "$ENDPOINTS_JSON" | jq -r ".[] | select(.id == $ENDPOINT_ID)")
        ENDPOINT_NAME=$(echo "$ENDPOINT_INFO" | jq -r '.name')
        ENDPOINT_ACTIVE=$(echo "$ENDPOINT_INFO" | jq -r '.active')
        RECIPE_ID=$(echo "$ENDPOINT_INFO" | jq -r '.flow_id')
        
        echo -e "  ${BLUE}Endpoint: ${ENDPOINT_NAME} (ID: ${ENDPOINT_ID})${NC}"
        
        # Check if already enabled
        if [ "$ENDPOINT_ACTIVE" = "true" ]; then
            echo -e "    ${YELLOW}⚠️  Already enabled${NC}"
            ALREADY_ENABLED=$((ALREADY_ENABLED + 1))
            continue
        fi
        
        # Check if recipe is started
        if [ -n "$RECIPE_ID" ] && [ "$RECIPE_ID" != "null" ]; then
            RECIPE_INFO=$(curl -s -X GET \
                "https://app.trial.workato.com/api/recipes/${RECIPE_ID}" \
                -H "Authorization: Bearer ${WORKATO_API_TOKEN}" \
                -H "Content-Type: application/json")
            
            RECIPE_RUNNING=$(echo "$RECIPE_INFO" | jq -r '.running')
            
            if [ "$RECIPE_RUNNING" != "true" ]; then
                echo -e "    ${RED}✗ Cannot enable: Recipe not started (ID: ${RECIPE_ID})${NC}"
                echo -e "    ${YELLOW}  Run 'make start-recipes' first${NC}"
                RECIPE_NOT_STARTED=$((RECIPE_NOT_STARTED + 1))
                continue
            fi
        fi
        
        # Enable the endpoint
        ENABLE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT \
            "https://app.trial.workato.com/api/api_endpoints/${ENDPOINT_ID}/enable" \
            -H "Authorization: Bearer ${WORKATO_API_TOKEN}" \
            -H "Content-Type: application/json")
        
        # Extract HTTP code and response body
        HTTP_CODE=$(echo "$ENABLE_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
        RESPONSE_BODY=$(echo "$ENABLE_RESPONSE" | sed '/HTTP_CODE:/d')
        
        # Check if the response indicates success
        if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
            echo -e "    ${GREEN}✓ Enabled successfully${NC}"
            ENABLED=$((ENABLED + 1))
        else
            ERROR_MSG=$(echo "$RESPONSE_BODY" | jq -r '.message // .error // "Unknown error"' 2>/dev/null || echo "$RESPONSE_BODY")
            echo -e "    ${RED}✗ Failed to enable (HTTP ${HTTP_CODE}): ${ERROR_MSG}${NC}"
            FAILED=$((FAILED + 1))
        fi
        
        # Small delay to avoid rate limiting
        sleep 0.3
    done
    
    echo ""
done

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Enabled: ${ENABLED}${NC}"
echo -e "${YELLOW}Already enabled: ${ALREADY_ENABLED}${NC}"
echo -e "${YELLOW}Recipe not started: ${RECIPE_NOT_STARTED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo ""

if [ $RECIPE_NOT_STARTED -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some endpoints could not be enabled because their recipes are not started${NC}"
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  1. Run: make start-recipes"
    echo -e "  2. Run: make enable-api-endpoints"
    echo ""
fi

if [ $ENABLED -gt 0 ]; then
    echo -e "${GREEN}✓ Successfully enabled ${ENABLED} endpoint(s)${NC}"
fi

if [ $FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi
