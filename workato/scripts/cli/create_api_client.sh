#!/bin/bash

# Create an API client for an API collection and generate an API key
# Uses the Workato Developer API
#
# Usage:
#   ./create_api_client.sh --collection-name "sf-api-collection" --client-name "SF API Client"

set -e

# Parse arguments
COLLECTION_NAME=""
CLIENT_NAME=""
CLIENT_DESCRIPTION=""
KEY_NAME="Default Key"

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
        --key-name)
            KEY_NAME="$2"
            shift 2
            ;;
        --key-name=*)
            KEY_NAME="${1#*=}"
            shift
            ;;
        *)
            echo "Unknown argument: $1"
            echo "Usage: $0 --collection-name <name> --client-name <name> [--client-description <desc>] [--key-name <name>]"
            exit 1
            ;;
    esac
done

# Validate required arguments
if [ -z "$COLLECTION_NAME" ] || [ -z "$CLIENT_NAME" ]; then
    echo "Error: --collection-name and --client-name are required"
    echo "Usage: $0 --collection-name <name> --client-name <name> [--client-description <desc>] [--key-name <name>]"
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
echo -e "${BLUE}Creating API Client${NC}"
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

# Step 2: Check if API client already exists
echo -e "${YELLOW}Step 2: Checking for existing API client...${NC}"

CLIENTS_JSON=$(curl -s -X GET \
    "https://app.trial.workato.com/api/developer_api_clients?per_page=100" \
    -H "Authorization: Bearer ${WORKATO_API_TOKEN}" \
    -H "Content-Type: application/json")

EXISTING_CLIENT_ID=$(echo "$CLIENTS_JSON" | jq -r '.result.items[] | select(.name == "'"$CLIENT_NAME"'") | .id')

if [ -n "$EXISTING_CLIENT_ID" ] && [ "$EXISTING_CLIENT_ID" != "null" ]; then
    echo -e "${YELLOW}⚠️  API client '${CLIENT_NAME}' already exists (ID: ${EXISTING_CLIENT_ID})${NC}"
    echo -e "${YELLOW}Using existing client...${NC}"
    CLIENT_ID=$EXISTING_CLIENT_ID
else
    # Step 3: Get API client roles
    echo -e "${YELLOW}Getting API client roles...${NC}"
    
    ROLES_JSON=$(curl -s -X GET \
        "https://app.trial.workato.com/api/developer_api_client_roles?per_page=100" \
        -H "Authorization: Bearer ${WORKATO_API_TOKEN}" \
        -H "Content-Type: application/json")
    
    # Get the first role ID (or create a default one)
    ROLE_ID=$(echo "$ROLES_JSON" | jq -r '.result.items[0].id')
    
    if [ -z "$ROLE_ID" ] || [ "$ROLE_ID" = "null" ]; then
        echo -e "${RED}Error: No API client roles found${NC}"
        echo "Please create an API client role in Workato first"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Found API client role (ID: ${ROLE_ID})${NC}"
    
    # Step 4: Create the API client
    echo -e "${YELLOW}Creating new API client...${NC}"
    
    # Build the request body
    REQUEST_BODY=$(jq -n \
        --arg name "$CLIENT_NAME" \
        --arg description "$CLIENT_DESCRIPTION" \
        --arg role_id "$ROLE_ID" \
        '{
            name: $name,
            api_privilege_group_id: ($role_id | tonumber),
            all_folders: true
        }' \
        $([ -n "$CLIENT_DESCRIPTION" ] && echo "--arg description \"$CLIENT_DESCRIPTION\""))
    
    if [ -n "$CLIENT_DESCRIPTION" ]; then
        REQUEST_BODY=$(echo "$REQUEST_BODY" | jq --arg desc "$CLIENT_DESCRIPTION" '. + {description: $desc}')
    fi
    
    CREATE_CLIENT_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
        "https://app.trial.workato.com/api/developer_api_clients" \
        -H "Authorization: Bearer ${WORKATO_API_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "$REQUEST_BODY")
    
    HTTP_CODE=$(echo "$CREATE_CLIENT_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$CREATE_CLIENT_RESPONSE" | sed '/HTTP_CODE:/d')
    
    if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
        echo -e "${RED}Error: Failed to create API client (HTTP ${HTTP_CODE})${NC}"
        echo "$RESPONSE_BODY" | jq '.'
        exit 1
    fi
    
    CLIENT_ID=$(echo "$RESPONSE_BODY" | jq -r '.result.id')
    echo -e "${GREEN}✓ Created API client (ID: ${CLIENT_ID})${NC}"
    
    # Extract token if it was created
    API_TOKEN=$(echo "$RESPONSE_BODY" | jq -r '.result.token.value // empty')
    if [ -n "$API_TOKEN" ]; then
        echo -e "${GREEN}✓ API token generated during creation${NC}"
        TOKEN_CREATED=true
    fi
fi

echo ""

# Step 5: Regenerate API key if needed
if [ -z "$API_TOKEN" ]; then
    echo -e "${YELLOW}Step 4: Regenerating API token...${NC}"
    
    CREATE_KEY_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
        "https://app.trial.workato.com/api/developer_api_clients/${CLIENT_ID}/regenerate" \
        -H "Authorization: Bearer ${WORKATO_API_TOKEN}" \
        -H "Content-Type: application/json")
    
    HTTP_CODE=$(echo "$CREATE_KEY_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$CREATE_KEY_RESPONSE" | sed '/HTTP_CODE:/d')
    
    if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
        echo -e "${RED}Error: Failed to regenerate API token (HTTP ${HTTP_CODE})${NC}"
        echo "$RESPONSE_BODY" | jq '.'
        exit 1
    fi
    
    API_TOKEN=$(echo "$RESPONSE_BODY" | jq -r '.result.token.value // .token.value // .api_token // .token // .key')
    echo -e "${GREEN}✓ Regenerated API token${NC}"
else
    echo -e "${YELLOW}Step 4: Using token from creation${NC}"
fi
echo ""

# Step 6: Display the results
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}API Client Created Successfully${NC}"
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
    echo -e "    -H 'Authorization: Bearer ${API_TOKEN}' \\"
    echo -e "    -H 'Content-Type: application/json' \\"
    echo -e "    -d '{\"status\": \"New\"}'"
    echo ""
    echo -e "${RED}⚠️  IMPORTANT: API Collection Access${NC}"
    echo -e "${YELLOW}If you get 'Access to this API has been disallowed':${NC}"
    echo -e "  1. Go to: https://app.trial.workato.com/api_management"
    echo -e "  2. Click on your API collection: ${COLLECTION_NAME}"
    echo -e "  3. Go to 'Access' or 'Clients' tab"
    echo -e "  4. Add the API client '${CLIENT_NAME}' (ID: ${CLIENT_ID}) to allowed clients"
    echo -e "  5. Or enable 'Allow anonymous access' for testing"
    echo ""
fi

# Optionally save to a file
OUTPUT_FILE="$PROJECT_ROOT/.workato-api-client-${CLIENT_ID}.json"
echo "{\"client_id\": $CLIENT_ID, \"client_name\": \"$CLIENT_NAME\", \"collection_id\": $COLLECTION_ID, \"collection_name\": \"$COLLECTION_NAME\", \"api_token\": \"$API_TOKEN\", \"api_url\": \"$API_URL\", \"created_at\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}" | jq '.' > "$OUTPUT_FILE"
echo -e "${GREEN}✓ API key details saved to: ${OUTPUT_FILE}${NC}"
echo -e "${RED}⚠️  Remember to add this file to .gitignore!${NC}"
echo ""

# Step 7: Update app/.env file
echo -e "${YELLOW}Step 5: Updating app/.env file...${NC}"

if [ -f "$ENV_FILE" ]; then
    # Check if the variables exist
    if grep -q "^SALESFORCE_API_COLLECTION_URL=" "$ENV_FILE"; then
        # Update existing SALESFORCE_API_COLLECTION_URL
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|^SALESFORCE_API_COLLECTION_URL=.*|SALESFORCE_API_COLLECTION_URL=$API_URL|" "$ENV_FILE"
        else
            # Linux
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
            # macOS
            sed -i '' "s|^SALESFORCE_API_AUTH_TOKEN=.*|SALESFORCE_API_AUTH_TOKEN=$API_TOKEN|" "$ENV_FILE"
        else
            # Linux
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
