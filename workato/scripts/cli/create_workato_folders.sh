#!/bin/bash

# Get the project root directory (3 levels up from workato/scripts/cli/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PROJECTS_DIR="$PROJECT_ROOT/projects"

# Create projects directory if it doesn't exist
mkdir -p "$PROJECTS_DIR"
cd "$PROJECTS_DIR"

# Load environment variables from app/.env (where the actual .env file is located)
ENV_FILE="$PROJECT_ROOT/app/.env"
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    echo "Warning: .env file not found at $ENV_FILE"
    echo "Please create app/.env with WORKATO_API_TOKEN and WORKATO_HOST"
    exit 1
fi

# Validate required environment variables
if [ -z "$WORKATO_HOST" ]; then
    echo "Error: WORKATO_HOST is not set in app/.env"
    exit 1
fi

if [ -z "$WORKATO_API_TOKEN" ]; then
    echo "Error: WORKATO_API_TOKEN is not set in app/.env"
    exit 1
fi

folders=("Workspace Connections" "atomic-salesforce-recipes" "atomic-stripe-recipes" "orchestrator-recipes" "sf-api-collection")

for folder in "${folders[@]}"; do
    workato init --profile default --region custom --non-interactive --project-name "$folder" --api-url "$WORKATO_HOST" 2>/dev/null || true
    
    if [ -d "$PROJECT_ROOT/workato/recipes/$folder" ]; then
        cp -r "$PROJECT_ROOT/workato/recipes/$folder"/* "$folder"/ 2>/dev/null || true
        echo "Copied recipes to $folder"
        (cd "$folder" && workato push)
    else
        echo "Warning: No recipes found at $PROJECT_ROOT/workato/recipes/$folder"
    fi
    
    curl -X POST "$WORKATO_HOST/api/folders" \
        -H "Authorization: Bearer $WORKATO_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$folder\"}"
    echo "Created $folder"
done
