#!/bin/bash

cd projects
export $(grep -v '^#' ../.env | xargs)

folders=("Workspace-Connections" "Salesforce" "atomic-salesforce-recipes" "atomic-stripe-recipes" "orchestrator-recipes")

for folder in "${folders[@]}"; do
    workato init --profile default --region custom --non-interactive --project-name "$folder" --api-url "$WORKATO_HOST" 2>/dev/null || true
    
    if [ -d "../workato/$folder" ]; then
        cp -r "../workato/$folder"/* "$folder"/ 2>/dev/null || true
        echo "Copied recipes to $folder"
        (cd "$folder" && workato push)
    fi
    
    curl -X POST "$WORKATO_HOST/api/folders" \
        -H "Authorization: Bearer $WORKATO_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$folder\"}"
    echo "Created $folder"
done
