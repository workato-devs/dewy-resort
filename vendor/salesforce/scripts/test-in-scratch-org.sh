#!/bin/bash

# Salesforce Scratch Org Testing Script for Dewy Resort Hotel
# This script creates a scratch org, deploys metadata, and validates everything works
# Use this to test changes before deploying to dev sandbox

set -e  # Exit on error

echo "========================================="
echo "Dewy Resort Hotel - Scratch Org Testing"
echo "========================================="
echo ""

# Check if Salesforce CLI is installed
# Use the project's bin/sf wrapper if available, otherwise look in PATH
if [ -f "../../bin/sf" ]; then
    SF_CLI="../../bin/sf"
elif [ -f "../bin/sf" ]; then
    SF_CLI="../bin/sf"
elif command -v sf &> /dev/null; then
    SF_CLI="sf"
else
    echo "Error: Salesforce CLI (sf) is not installed."
    echo "Please install it via: make setup tool=salesforce"
    exit 1
fi

echo "✓ Salesforce CLI is installed"
echo ""

# Get the DevHub org alias
DEVHUB_ORG="${1:-}"

if [ -z "$DEVHUB_ORG" ]; then
    echo "Usage: ./test-in-scratch-org.sh <devhub-org-alias>"
    echo ""
    echo "Example: ./test-in-scratch-org.sh dewyHotelDevHub"
    echo ""
    echo "Available orgs:"
    $SF_CLI org list
    echo ""
    echo "To authenticate to your DevHub-enabled sandbox:"
    echo "  bin/sf org login web --alias dewyHotelDevHub --set-default-dev-hub"
    exit 1
fi

echo "DevHub org: $DEVHUB_ORG"
echo ""

# Verify DevHub connection
echo "Verifying DevHub connection..."
if ! $SF_CLI org display --target-org "$DEVHUB_ORG" &> /dev/null; then
    echo "Error: Unable to connect to DevHub '$DEVHUB_ORG'"
    echo "Please authenticate first:"
    echo "  bin/sf org login web --alias $DEVHUB_ORG --set-default-dev-hub"
    exit 1
fi

echo "✓ Connected to DevHub: $DEVHUB_ORG"
echo ""

# Generate unique scratch org alias
SCRATCH_ORG_ALIAS="dewy-scratch-$(date +%Y%m%d-%H%M%S)"

# Create scratch org
echo "========================================="
echo "Step 1: Creating Scratch Org"
echo "========================================="
echo ""
echo "Creating scratch org: $SCRATCH_ORG_ALIAS"
echo "Duration: 7 days"
echo ""

$SF_CLI org create scratch \
    --definition-file config/project-scratch-def.json \
    --alias "$SCRATCH_ORG_ALIAS" \
    --duration-days 7 \
    --set-default \
    --target-dev-hub "$DEVHUB_ORG" \
    --wait 10

echo ""
echo "✓ Scratch org created successfully"
echo "  Alias: $SCRATCH_ORG_ALIAS"
echo ""

# Deploy metadata
echo "========================================="
echo "Step 2: Deploying Metadata"
echo "========================================="
echo ""
echo "Deploying custom objects, fields, validation rules, and permission sets..."

$SF_CLI project deploy start \
    --source-dir force-app/main/default \
    --target-org "$SCRATCH_ORG_ALIAS" \
    --wait 10

echo ""
echo "✓ Metadata deployed successfully"
echo ""

# Assign permission set
echo "========================================="
echo "Step 3: Assigning Permission Set"
echo "========================================="
echo ""
echo "Assigning 'Hotel Management Admin' permission set to default user..."

$SF_CLI org assign permset \
    --name Hotel_Management_Admin \
    --target-org "$SCRATCH_ORG_ALIAS"

echo ""
echo "✓ Permission set assigned"
echo ""

# Import seed data
echo "========================================="
echo "Step 4: Importing Seed Data"
echo "========================================="
echo ""
echo "Importing Accounts, Contacts, and Hotel Rooms..."

cd data

$SF_CLI data import tree \
    --plan data-plan.json \
    --target-org "$SCRATCH_ORG_ALIAS"

cd ../scripts

echo ""
echo "✓ Seed data imported successfully"
echo ""

# Get org info
echo "========================================="
echo "Scratch Org Ready for Testing!"
echo "========================================="
echo ""

# Display org details
ORG_INFO=$($SF_CLI org display --target-org "$SCRATCH_ORG_ALIAS" --json)
USERNAME=$(echo "$ORG_INFO" | grep -o '"username":"[^"]*' | cut -d'"' -f4)
ORG_ID=$(echo "$ORG_INFO" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
INSTANCE_URL=$(echo "$ORG_INFO" | grep -o '"instanceUrl":"[^"]*' | cut -d'"' -f4)

echo "Org Details:"
echo "  Alias: $SCRATCH_ORG_ALIAS"
echo "  Username: $USERNAME"
echo "  Org ID: $ORG_ID"
echo "  Instance URL: $INSTANCE_URL"
echo "  Expires: 7 days from now"
echo ""

echo "Deployment Summary:"
echo "  ✓ 4 custom objects (Booking__c, Hotel_Room__c, Payment_Transaction__c, SMS_Notification__c)"
echo "  ✓ Custom fields on Case, Contact, Opportunity"
echo "  ✓ 4 validation rules"
echo "  ✓ 1 permission set (Hotel Management Admin)"
echo "  ✓ 3 Accounts, 3 Contacts, 10 Hotel Rooms"
echo ""

echo "Testing Checklist:"
echo "  [ ] Verify all custom objects are visible"
echo "  [ ] Create a test Booking record"
echo "  [ ] Create a test Case linked to a Hotel Room"
echo "  [ ] Verify validation rules fire correctly"
echo "  [ ] Test Payment Transaction creation"
echo "  [ ] Test SMS Notification creation"
echo ""

echo "Commands:"
echo "  Open org:        $SF_CLI org open --target-org $SCRATCH_ORG_ALIAS"
echo "  View limits:     $SF_CLI org display limits --target-org $SCRATCH_ORG_ALIAS"
echo "  Delete org:      $SF_CLI org delete scratch --target-org $SCRATCH_ORG_ALIAS --no-prompt"
echo ""

echo "Once validated, deploy to dev sandbox:"
echo "  cd salesforce && bash scripts/deploy.sh <dev-sandbox-alias>"
echo ""

# Automatically open the org
read -p "Open scratch org now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    $SF_CLI org open --target-org "$SCRATCH_ORG_ALIAS"
fi
