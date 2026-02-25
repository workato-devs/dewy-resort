#!/bin/bash

# Salesforce Metadata Deployment Script for Dewy Resort Hotel
# This script deploys all custom objects, fields, and validation rules to Salesforce

set -e  # Exit on error

# Resolve directories relative to the script so this works regardless of
# caller's working directory (e.g., invoked from Make at the project root).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SF_PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$SF_PROJECT_DIR")"

cd "$SF_PROJECT_DIR"

echo "========================================="
echo "Dewy Resort Hotel - Salesforce Deployment"
echo "========================================="
echo ""

# Check if Salesforce CLI is installed
# Use the project's bin/sf wrapper if available, otherwise look in PATH
if [ -f "$PROJECT_ROOT/bin/sf" ]; then
    SF_CLI="$PROJECT_ROOT/bin/sf"
elif command -v sf &> /dev/null; then
    SF_CLI="sf"
else
    echo "Error: Salesforce CLI (sf) is not installed."
    echo "Please install it via: make setup tool=salesforce"
    exit 1
fi

echo "✓ Salesforce CLI is installed"
echo ""

# Get the target org (default or user-specified)
TARGET_ORG="${1:-}"

if [ -z "$TARGET_ORG" ]; then
    echo "Usage: ./deploy.sh <target-org-alias>"
    echo ""
    echo "Example: ./deploy.sh myDevOrg"
    echo ""
    echo "Available orgs:"
    $SF_CLI org list
    exit 1
fi

echo "Target org: $TARGET_ORG"
echo ""

# Verify org connection
echo "Verifying connection to $TARGET_ORG..."
if ! $SF_CLI org display --target-org "$TARGET_ORG" &> /dev/null; then
    echo ""
    echo "Error: Unable to authenticate to org '$TARGET_ORG'"
    echo ""
    echo "This usually means the access token has expired."
    echo "Re-authenticate from your terminal:"
    echo "  $SF_CLI org login web --alias $TARGET_ORG"
    echo ""
    echo "Then retry:  make sf-deploy org=$TARGET_ORG"
    exit 1
fi

echo "✓ Connected to $TARGET_ORG"
echo ""

# Deploy metadata
echo "========================================="
echo "Step 1: Deploying Metadata"
echo "========================================="
echo ""
echo "Deploying custom objects, fields, and validation rules..."
$SF_CLI project deploy start \
    --source-dir force-app/main/default \
    --target-org "$TARGET_ORG" \
    --wait 10

echo ""
echo "✓ Metadata deployed successfully"
echo ""

# Assign permission set
echo "========================================="
echo "Step 2: Assigning Permission Set"
echo "========================================="
echo ""
echo "Assigning 'Hotel Management Admin' permission set to current user..."

$SF_CLI org assign permset \
    --name Hotel_Management_Admin \
    --target-org "$TARGET_ORG"

echo ""
echo "✓ Permission set assigned"
echo ""

# Import seed data
echo "========================================="
echo "Step 3: Importing Seed Data"
echo "========================================="
echo ""
echo "Importing Accounts, Contacts, and Hotel Rooms..."

# Import data using the data plan
$SF_CLI data import tree \
    --plan data/data-plan.json \
    --target-org "$TARGET_ORG"


echo ""
echo "✓ Seed data imported successfully"
echo ""

# Summary
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Summary:"
echo "  • 4 custom objects created (Booking__c, Hotel_Room__c, Payment_Transaction__c, SMS_Notification__c)"
echo "  • Custom fields added to Case, Contact, Opportunity"
echo "  • 4 validation rules deployed"
echo "  • 1 permission set assigned (Hotel Management Admin)"
echo "  • 3 Accounts created"
echo "  • 3 Contacts created"
echo "  • 10 Hotel Rooms created"
echo ""
echo "Next steps:"
echo "  1. Verify deployment in Salesforce Setup → Object Manager"
echo "  2. Review validation rules"
echo "  3. Test creating sample Booking records"
echo "  4. Configure Workato connection to this org"
echo ""
echo "To open the org:"
echo "  bin/sf org open --target-org $TARGET_ORG"
echo ""
