#!/bin/bash

# Create an API Platform client for an API collection and generate an API key
# Uses the Workato API Platform endpoints (not Developer API)
#
# Usage:
#   ./create_api_collection_client.sh --collection-name "sf-api-collection" --client-name "SF API Client"

set -e

# Parse arguments
COLLECTION_NAME=""
CLIENT_NAME=""
CLIENT_DESCRIPTION=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --collection-name)
            COLLECTION_NAME="$2"
            shift 2
            ;;
        --collection-name=*)
            COLLECTION_NAME="${1#*=}"
            shift
            ;;
        --client-name)
            CLIENT_NAME="$2"
            shift 2
            ;;
        --client-name=*)
            CLIENT_NAME="${1#*=}"
            shift
            ;;
        --client-description)
            CLIENT_DESCRIPTION="$2"
            shift 2
            ;;
        --client-description=*)
            CLIENT_DESCRIPTION="${1#*=}"
            shift
            ;;
        *)
            echo "Unknown argument: $1"
            echo "Usage: $0 --collection-name <name> --client-name <name> [--client-description <desc>]"
            exit 1
            ;;
    esac
done

# Validate required arguments
if [ -z "$COLLECTION_NAME" ] || [ -z "$CLIENT_NAME" ]; then
    echo "Error: --collection-name and --client-name are required"
    echo "Usage: $0 --collection-name <name> --client-name <name> [--client-description <desc>]"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Creating API Platform Client${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}Collection: ${COLLECTION_NAME}${NC}"
echo -e "${YELLOW}Client Name: ${CLIENT_NAME}${NC}"
if [ -n "$CLIENT_DESCRIPTION" ]; then
    echo -e "${YELLOW}Description: ${CLIENT_DESCRIPTION}${NC}"
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

# Step 1: Find the API collection
echo -e "${YELLOW}Step 1: Finding API collection...${NC}"

COLLECTIONS_JSON=$(curl -s -X GET \
    "https://app.trial.workato.com/api/api_collections?per_page=100" \
    -H "Authorization: Bearer ${WORKATO_API_TOKEN}" \
    -H "Content-Type: application/json")

COLLECTION_ID=$(echo "$COLLECTIONS_JSON" | jq -r ".[] | select(.name == \"$COLLECTION_NAME\") | .id")

if [ -z "$COLLECTION_ID" ] || [ "$COLLECTION_ID" = "null" ]; then
    echo -e "${RED}Error: Collection '${COLLECTION_NAME}' not found${NC}"
    echo ""
    echo -e "${YELLOW}Available collections:${NC}"
    echo "$COLLECTIONS_JSON" | jq -r '.[] | "  - \(.name) (ID: \(.id))"'
    exit 1
fi

echo -e "${GREEN}✓ Found collection (ID: ${COLLECTION_ID})${NC}"
echo ""

# Step 2: Check if API Platform client already exists
echo -e "${YELLOW}Step 2: Checking for existing API Platform client...${NC}"

CLIENTS_JSON=$(curl -s -X GET \
    "https://app.trial.workato.com/api/v2/api_clients?per_page=100" \
    -H "Authorization: Bearer ${WORKATO_API_TOKEN}" \
    -H "Content-Type: application/json")

# Check if we got an error
if echo "$CLIENTS_JSON" | jq -e '.message' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$CLIENTS_JSON" | jq -r '.message')
    echo -e "${RED}Error: ${ERROR_MSG}${NC}"
    echo -e "${YELLOW}Make sure your WORKATO_API_TOKEN has API Platform scopes enabled${NC}"
    exit 1
fi

EXISTING_CLIENT_ID=$(echo "$CLIENTS_JSON" | jq -r ".data[] | select(.name == \"$CLIENT_NAME\") | .id")

if [ -n "$EXISTING_CLIENT_ID" ] && [ "$EXISTING_CLIENT_ID" != "null" ]; then
    echo -e "${YELLOW}⚠️  API Platform client '${CLIENT_NAME}' already exists (ID: ${EXISTING_CLIENT_ID})${NC}"
    echo -e "${YELLOW}Using existing client...${NC}"
    CLIENT_ID=$EXISTING_CLIENT_ID
    
    # Get existing client details to extract token
    CLIENT_DETAILS=$(echo "$CLIENTS_JSON" | jq -r ".data[] | select(.id == $CLIENT_ID)")
    
    # Try to get existing keys
    KEYS_JSON=$(curl -s -X GET \
        "https://app.trial.workato.com/api/v2/api_clients/${CLIENT_ID}/api_keys?per_page=100" \
        -H "Authorization: Bearer ${WORKATO_API_TOKEN}" \
        -H "Content-Type: application/json")
    
    EXISTING_KEY_ID=$(echo "$KEYS_JSON" | jq -r '.data[0].id // empty')
    
    if [ -n "$EXISTING_KEY_ID" ]; then
        echo -e "${YELLOW}Found existing API key (ID: ${EXISTING_KEY_ID})${NC}"
        echo -e "${YELLOW}Refreshing the key secret...${NC}"
        
        REFRESH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT \
            "https://app.trial.workato.com/api/v2/api_clients/${CLIENT_ID}/api_keys/${EXISTING_KEY_ID}/refresh_secret" \
            -H "Authorization: Bearer ${WORKATO_API_TOKEN}" \
            -H "Content-Type: application/json")
        
        HTTP_CODE=$(echo "$REFRESH_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
        RESPONSE_BODY=$(echo "$REFRESH_RESPONSE" | sed '/HTTP_CODE:/d')
        
        if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
            API_TOKEN=$(echo "$RESPONSE_BODY" | jq -r '.data.auth_token // .data.key // .data.secret // .data.api_key // .data.token')
            echo -e "${GREEN}✓ Refreshed API key${NC}"
        else
            echo -e "${RED}Failed to refresh key, will create a new one${NC}"
            EXISTING_KEY_ID=""
        fi
    fi
else
    # Step 3: Create the API Platform client
    echo -e "${YELLOW}Creating new API Platform client...${NC}"
    
    # Build the request body
    REQUEST_BODY=$(jq -n \
        --arg name "$CLIENT_NAME" \
        --arg description "$CLIENT_DESCRIPTION" \
        --arg collection_ids "$COLLECTION_ID" \
        '{
            name: $name,
            api_collection_ids: [$collection_ids],
            auth_type: "token"
        }')
    
    if [ -n "$CLIENT_DESCRIPTION" ]; then
        REQUEST_BODY=$(echo "$REQUEST_BODY" | jq --arg desc "$CLIENT_DESCRIPTION" '. + {description: $desc}')
    fi
    
    CREATE_CLIENT_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
        "https://app.trial.workato.com/api/v2/api_clients" \
        -H "Authorization: Bearer ${WORKATO_API_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "$REQUEST_BODY")
    
    HTTP_CODE=$(echo "$CREATE_CLIENT_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$CREATE_CLIENT_RESPONSE" | sed '/HTTP_CODE:/d')
    
    if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
        echo -e "${RED}Error: Failed to create API Platform client (HTTP ${HTTP_CODE})${NC}"
        echo "$RESPONSE_BODY" | jq '.'
        exit 1
    fi
    
    CLIENT_ID=$(echo "$RESPONSE_BODY" | jq -r '.data.id')
    echo -e "${GREEN}✓ Created API Platform client (ID: ${CLIENT_ID})${NC}"
fi

echo ""

# Step 4: Create or get API key
if [ -z "$API_TOKEN" ]; then
    echo -e "${YELLOW}Step 3: Creating API key...${NC}"
    
    CREATE_KEY_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
        "https://app.trial.workato.com/api/v2/api_clients/${CLIENT_ID}/api_keys" \
        -H "Authorization: Bearer ${WORKATO_API_TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{"name": "Default Key", "active": true}')
    
    HTTP_CODE=$(echo "$CREATE_KEY_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$CREATE_KEY_RESPONSE" | sed '/HTTP_CODE:/d')
    
    if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
        echo -e "${RED}Error: Failed to create API key (HTTP ${HTTP_CODE})${NC}"
        echo "$RESPONSE_BODY" | jq '.'
        exit 1
    fi
    
    API_KEY_ID=$(echo "$RESPONSE_BODY" | jq -r '.data.id')
    API_TOKEN=$(echo "$RESPONSE_BODY" | jq -r '.data.auth_token // .data.key // .data.secret // .data.api_key // .data.token')
    echo -e "${GREEN}✓ Created API key (ID: ${API_KEY_ID})${NC}"
fi

echo ""

# Step 5: Display the results
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}API Platform Client Created Successfully${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${CYAN}Client Details:${NC}"
echo -e "  Name: ${CLIENT_NAME}"
echo -e "  ID: ${CLIENT_ID}"
echo -e "  Collection: ${COLLECTION_NAME} (ID: ${COLLECTION_ID})"
echo ""
echo -e "${CYAN}API Token:${NC}"
echo -e "${YELLOW}${API_TOKEN}${NC}"
echo ""
echo -e "${RED}⚠️  IMPORTANT: This token will only be shown once!${NC}"
echo -e "${RED}   Save it now in a secure location.${NC}"
echo ""

# Get the API collection URL
COLLECTION_INFO=$(echo "$COLLECTIONS_JSON" | jq -r ".[] | select(.id == $COLLECTION_ID)")
API_URL=$(echo "$COLLECTION_INFO" | jq -r '.url')

if [ -n "$API_URL" ] && [ "$API_URL" != "null" ]; then
    echo -e "${CYAN}API Base URL:${NC}"
    echo -e "${YELLOW}${API_URL}${NC}"
    echo ""
    echo -e "${CYAN}Example Usage:${NC}"
    echo -e "  curl -X POST '${API_URL}/search-cases' \\"
    echo -e "    -H 'API-TOKEN: ${API_TOKEN}' \\"
    echo -e "    -H 'Content-Type: application/json' \\"
    echo -e "    -d '{\"status\": \"New\"}'"
    echo ""
fi

# Step 6: Update app/.env file
echo -e "${YELLOW}Step 4: Updating app/.env file...${NC}"

if [ -f "$ENV_FILE" ]; then
    # Check if the variables exist
    if grep -q "^SALESFORCE_API_COLLECTION_URL=" "$ENV_FILE"; then
        # Update existing SALESFORCE_API_COLLECTION_URL
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^SALESFORCE_API_COLLECTION_URL=.*|SALESFORCE_API_COLLECTION_URL=$API_URL|" "$ENV_FILE"
        else
            sed -i "s|^SALESFORCE_API_COLLECTION_URL=.*|SALESFORCE_API_COLLECTION_URL=$API_URL|" "$ENV_FILE"
        fi
        echo -e "${GREEN}✓ Updated SALESFORCE_API_COLLECTION_URL${NC}"
    else
        # Add SALESFORCE_API_COLLECTION_URL after WORKATO_HOST
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "/^WORKATO_HOST=/a\\
\\
# Workato API Collection Configuration\\
SALESFORCE_API_COLLECTION_URL=$API_URL\\
SALESFORCE_API_AUTH_TOKEN=
" "$ENV_FILE"
        else
            sed -i "/^WORKATO_HOST=/a\\
\\
# Workato API Collection Configuration\\
SALESFORCE_API_COLLECTION_URL=$API_URL\\
SALESFORCE_API_AUTH_TOKEN=" "$ENV_FILE"
        fi
        echo -e "${GREEN}✓ Added SALESFORCE_API_COLLECTION_URL${NC}"
    fi
    
    if grep -q "^SALESFORCE_API_AUTH_TOKEN=" "$ENV_FILE"; then
        # Update existing SALESFORCE_API_AUTH_TOKEN
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^SALESFORCE_API_AUTH_TOKEN=.*|SALESFORCE_API_AUTH_TOKEN=$API_TOKEN|" "$ENV_FILE"
        else
            sed -i "s|^SALESFORCE_API_AUTH_TOKEN=.*|SALESFORCE_API_AUTH_TOKEN=$API_TOKEN|" "$ENV_FILE"
        fi
        echo -e "${GREEN}✓ Updated SALESFORCE_API_AUTH_TOKEN${NC}"
    else
        # Add SALESFORCE_API_AUTH_TOKEN after SALESFORCE_API_COLLECTION_URL
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "/^SALESFORCE_API_COLLECTION_URL=/a\\
SALESFORCE_API_AUTH_TOKEN=$API_TOKEN
" "$ENV_FILE"
        else
            sed -i "/^SALESFORCE_API_COLLECTION_URL=/a\\
SALESFORCE_API_AUTH_TOKEN=$API_TOKEN" "$ENV_FILE"
        fi
        echo -e "${GREEN}✓ Added SALESFORCE_API_AUTH_TOKEN${NC}"
    fi
    
    echo -e "${GREEN}✓ app/.env file updated successfully${NC}"
else
    echo -e "${YELLOW}⚠️  app/.env file not found, skipping update${NC}"
fi

echo ""

exit 0
