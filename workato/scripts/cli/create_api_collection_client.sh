#!/bin/bash

# Create an API Platform client for an API collection and generate an API key.
# Uses wk CLI for auth and collection lookup; curl for v2 API client operations
# (wk doesn't have api client commands yet).
#
# Usage:
#   ./create_api_collection_client.sh --collection-name "sf-api-collection" --client-name "SF API Client"

set -e

COLLECTION_NAME=""
CLIENT_NAME=""
CLIENT_DESCRIPTION=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --collection-name)    COLLECTION_NAME="$2"; shift 2 ;;
        --collection-name=*)  COLLECTION_NAME="${1#*=}"; shift ;;
        --client-name)        CLIENT_NAME="$2"; shift 2 ;;
        --client-name=*)      CLIENT_NAME="${1#*=}"; shift ;;
        --client-description) CLIENT_DESCRIPTION="$2"; shift 2 ;;
        --client-description=*) CLIENT_DESCRIPTION="${1#*=}"; shift ;;
        *)
            echo "Unknown argument: $1"
            echo "Usage: $0 --collection-name <name> --client-name <name> [--client-description <desc>]"
            exit 1
            ;;
    esac
done

if [ -z "$COLLECTION_NAME" ] || [ -z "$CLIENT_NAME" ]; then
    echo "Error: --collection-name and --client-name are required"
    echo "Usage: $0 --collection-name <name> --client-name <name> [--client-description <desc>]"
    exit 1
fi

# Verify wk CLI is available
if ! command -v wk &> /dev/null; then
    echo "Error: wk CLI not found. Install it:"
    echo "  macOS/Linux: brew install workato/tap/wk"
    echo "  Windows:     scoop install wk"
    exit 1
fi

# Get auth details from wk CLI
API_TOKEN=$(wk auth token 2>/dev/null) || {
    echo "Error: Not authenticated. Run: wk auth login"
    exit 1
}
BASE_URL=$(wk auth status --json 2>/dev/null | grep -o '"base_url":"[^"]*"' | cut -d'"' -f4)
if [ -z "$BASE_URL" ]; then
    echo "Error: Could not determine Workato base URL from wk auth status"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/app/.env"

echo "========================================"
echo "Creating API Platform Client"
echo "========================================"
echo "Collection: ${COLLECTION_NAME}"
echo "Client Name: ${CLIENT_NAME}"
[ -n "$CLIENT_DESCRIPTION" ] && echo "Description: ${CLIENT_DESCRIPTION}"
echo "Workspace:  ${BASE_URL}"
echo "========================================"
echo ""

# Step 1: Find the API collection using wk CLI
echo "Step 1: Finding API collection..."

COLLECTION_ID=$(wk api collections list 2>/dev/null | awk -v name="$COLLECTION_NAME" '$2==name {print $1}')

if [ -z "$COLLECTION_ID" ]; then
    echo "Error: Collection '${COLLECTION_NAME}' not found"
    echo ""
    echo "Available collections:"
    wk api collections list 2>/dev/null | awk 'NR>1 {print "  - " $2 " (ID: " $1 ")"}'
    exit 1
fi

# Get the collection URL from the REST API (wk table output doesn't include it)
COLLECTION_URL=$(curl -s "${BASE_URL}/api/api_collections?per_page=100" \
    -H "Authorization: Bearer ${API_TOKEN}" \
    -H "Content-Type: application/json" | \
    grep -o "\"url\":\"[^\"]*\"" | head -1 | cut -d'"' -f4)

echo "Found collection (ID: ${COLLECTION_ID})"
echo ""

# Step 2: Check for existing API Platform client
echo "Step 2: Checking for existing API Platform client..."

CLIENT_ID=""
API_KEY_TOKEN=""

CLIENTS_RESPONSE=$(curl -s "${BASE_URL}/api/v2/api_clients?per_page=100" \
    -H "Authorization: Bearer ${API_TOKEN}" \
    -H "Content-Type: application/json")

# Check for API error
if echo "$CLIENTS_RESPONSE" | grep -q '"message":'; then
    ERROR_MSG=$(echo "$CLIENTS_RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
    echo "Error: ${ERROR_MSG}"
    echo "Make sure your auth profile has API Platform scopes enabled"
    exit 1
fi

# Check if client with this name already exists
if echo "$CLIENTS_RESPONSE" | grep -q "\"name\":\"${CLIENT_NAME}\""; then
    # Extract the ID of the matching client — find the data block containing our client name
    CLIENT_ID=$(echo "$CLIENTS_RESPONSE" | grep -o '"id":[0-9]*,"name":"'"${CLIENT_NAME}"'"' | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)

    if [ -n "$CLIENT_ID" ]; then
        echo "API Platform client '${CLIENT_NAME}' already exists (ID: ${CLIENT_ID})"
        echo "Using existing client..."

        # Try to get existing keys and refresh
        KEYS_RESPONSE=$(curl -s "${BASE_URL}/api/v2/api_clients/${CLIENT_ID}/api_keys?per_page=100" \
            -H "Authorization: Bearer ${API_TOKEN}" \
            -H "Content-Type: application/json")

        EXISTING_KEY_ID=$(echo "$KEYS_RESPONSE" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

        if [ -n "$EXISTING_KEY_ID" ]; then
            echo "Found existing API key (ID: ${EXISTING_KEY_ID}), refreshing..."

            REFRESH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT \
                "${BASE_URL}/api/v2/api_clients/${CLIENT_ID}/api_keys/${EXISTING_KEY_ID}/refresh_secret" \
                -H "Authorization: Bearer ${API_TOKEN}" \
                -H "Content-Type: application/json")

            HTTP_CODE=$(echo "$REFRESH_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
            RESPONSE_BODY=$(echo "$REFRESH_RESPONSE" | sed '/HTTP_CODE:/d')

            if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
                API_KEY_TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"auth_token":"[^"]*"' | head -1 | cut -d'"' -f4)
                [ -z "$API_KEY_TOKEN" ] && API_KEY_TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
                [ -z "$API_KEY_TOKEN" ] && API_KEY_TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"secret":"[^"]*"' | head -1 | cut -d'"' -f4)
                echo "Refreshed API key"
            else
                echo "Failed to refresh key, will create a new one"
            fi
        fi
    fi
fi

# Step 3: Create client if it doesn't exist
if [ -z "$CLIENT_ID" ]; then
    echo "Creating new API Platform client..."

    REQUEST_BODY="{\"name\":\"${CLIENT_NAME}\",\"api_collection_ids\":[\"${COLLECTION_ID}\"],\"auth_type\":\"token\""
    [ -n "$CLIENT_DESCRIPTION" ] && REQUEST_BODY="${REQUEST_BODY},\"description\":\"${CLIENT_DESCRIPTION}\""
    REQUEST_BODY="${REQUEST_BODY}}"

    CREATE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
        "${BASE_URL}/api/v2/api_clients" \
        -H "Authorization: Bearer ${API_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "$REQUEST_BODY")

    HTTP_CODE=$(echo "$CREATE_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$CREATE_RESPONSE" | sed '/HTTP_CODE:/d')

    if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
        echo "Error: Failed to create API Platform client (HTTP ${HTTP_CODE})"
        echo "$RESPONSE_BODY"
        exit 1
    fi

    CLIENT_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
    echo "Created API Platform client (ID: ${CLIENT_ID})"
fi

echo ""

# Step 4: Create API key if we don't have one yet
if [ -z "$API_KEY_TOKEN" ]; then
    echo "Step 3: Creating API key..."

    KEY_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
        "${BASE_URL}/api/v2/api_clients/${CLIENT_ID}/api_keys" \
        -H "Authorization: Bearer ${API_TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{"name": "Default Key", "active": true}')

    HTTP_CODE=$(echo "$KEY_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    RESPONSE_BODY=$(echo "$KEY_RESPONSE" | sed '/HTTP_CODE:/d')

    if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
        echo "Error: Failed to create API key (HTTP ${HTTP_CODE})"
        echo "$RESPONSE_BODY"
        exit 1
    fi

    API_KEY_TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"auth_token":"[^"]*"' | head -1 | cut -d'"' -f4)
    [ -z "$API_KEY_TOKEN" ] && API_KEY_TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"token":"[^"]*"' | head -1 | cut -d'"' -f4)
    [ -z "$API_KEY_TOKEN" ] && API_KEY_TOKEN=$(echo "$RESPONSE_BODY" | grep -o '"secret":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "Created API key"
fi

echo ""

# Step 5: Display results
echo "========================================"
echo "API Platform Client Created Successfully"
echo "========================================"
echo ""
echo "Client Details:"
echo "  Name: ${CLIENT_NAME}"
echo "  ID: ${CLIENT_ID}"
echo "  Collection: ${COLLECTION_NAME} (ID: ${COLLECTION_ID})"
echo ""
echo "API Token: ${API_KEY_TOKEN}"
echo ""
echo "IMPORTANT: This token will only be shown once!"
echo "   Save it now in a secure location."
echo ""

if [ -n "$COLLECTION_URL" ] && [ "$COLLECTION_URL" != "null" ]; then
    echo "API Base URL: ${COLLECTION_URL}"
    echo ""
    echo "Example Usage:"
    echo "  curl -X POST '${COLLECTION_URL}/search-cases' \\"
    echo "    -H 'API-TOKEN: ${API_KEY_TOKEN}' \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -d '{\"status\": \"New\"}'"
    echo ""
fi

# Step 6: Update app/.env file
echo "Step 4: Updating app/.env file..."

if [ -f "$ENV_FILE" ]; then
    update_env_var() {
        local key="$1" val="$2"
        if grep -q "^${key}=" "$ENV_FILE"; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
            else
                sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
            fi
            echo "Updated ${key}"
        else
            echo "${key}=${val}" >> "$ENV_FILE"
            echo "Added ${key}"
        fi
    }

    [ -n "$COLLECTION_URL" ] && [ "$COLLECTION_URL" != "null" ] && \
        update_env_var "SALESFORCE_API_COLLECTION_URL" "$COLLECTION_URL"
    [ -n "$API_KEY_TOKEN" ] && \
        update_env_var "SALESFORCE_API_AUTH_TOKEN" "$API_KEY_TOKEN"

    echo "app/.env file updated successfully"
else
    echo "app/.env file not found, skipping update"
fi

echo ""
exit 0
