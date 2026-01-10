#!/bin/bash

# Get AWS Session Credentials
# This script gets temporary credentials from your AWS CLI session
# and outputs them in a format that can be used as environment variables

echo "Getting AWS session credentials..."
echo ""

# Get credentials from AWS CLI (this will prompt for MFA if needed)
CREDS=$(aws sts get-caller-identity --profile admin-role 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ Failed to get credentials. Make sure you're authenticated with AWS CLI."
  echo ""
  echo "Run: aws sts get-caller-identity --profile admin-role"
  echo "This will prompt for MFA and cache the session."
  exit 1
fi

echo "✅ Authenticated successfully"
echo ""

# Get the session token from the AWS CLI cache
# The AWS CLI caches session tokens in ~/.aws/cli/cache/
CACHE_DIR="$HOME/.aws/cli/cache"

if [ ! -d "$CACHE_DIR" ]; then
  echo "❌ No cached credentials found"
  echo ""
  echo "The AWS CLI should cache credentials after MFA authentication."
  echo "Try running: aws sts get-caller-identity --profile admin-role"
  exit 1
fi

# Find the most recent cache file
CACHE_FILE=$(ls -t "$CACHE_DIR"/*.json 2>/dev/null | head -1)

if [ -z "$CACHE_FILE" ]; then
  echo "❌ No cached credentials found"
  exit 1
fi

echo "Found cached credentials: $CACHE_FILE"
echo ""

# Extract credentials from cache file
ACCESS_KEY=$(jq -r '.Credentials.AccessKeyId' "$CACHE_FILE")
SECRET_KEY=$(jq -r '.Credentials.SecretAccessKey' "$CACHE_FILE")
SESSION_TOKEN=$(jq -r '.Credentials.SessionToken' "$CACHE_FILE")
EXPIRATION=$(jq -r '.Credentials.Expiration' "$CACHE_FILE")

if [ "$ACCESS_KEY" == "null" ] || [ -z "$ACCESS_KEY" ]; then
  echo "❌ Could not extract credentials from cache"
  exit 1
fi

echo "Credentials expire at: $EXPIRATION"
echo ""
echo "Add these to your .env file (or export them):"
echo ""
echo "AWS_ACCESS_KEY_ID=$ACCESS_KEY"
echo "AWS_SECRET_ACCESS_KEY=$SECRET_KEY"
echo "AWS_SESSION_TOKEN=$SESSION_TOKEN"
echo ""
echo "Or export them for the current shell:"
echo ""
echo "export AWS_ACCESS_KEY_ID=$ACCESS_KEY"
echo "export AWS_SECRET_ACCESS_KEY=$SECRET_KEY"
echo "export AWS_SESSION_TOKEN=$SESSION_TOKEN"
