#!/bin/bash

#
# Deploy Chat Conversations DynamoDB Table
#
# This script deploys the DynamoDB table for storing chat conversations
# with private message history and access controls.
#
# Usage:
#   ./deploy-chat-table.sh <environment> [billing-mode]
#
# Arguments:
#   environment    - Environment name (dev, staging, prod)
#   billing-mode   - Optional: PAY_PER_REQUEST (default) or PROVISIONED
#
# Examples:
#   ./deploy-chat-table.sh dev
#   ./deploy-chat-table.sh prod PROVISIONED
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 1 ]; then
    echo -e "${RED}Error: Missing required argument${NC}"
    echo "Usage: $0 <environment> [billing-mode]"
    echo ""
    echo "Arguments:"
    echo "  environment    - Environment name (dev, staging, prod)"
    echo "  billing-mode   - Optional: PAY_PER_REQUEST (default) or PROVISIONED"
    echo ""
    echo "Examples:"
    echo "  $0 dev"
    echo "  $0 prod PROVISIONED"
    exit 1
fi

ENVIRONMENT=$1
BILLING_MODE=${2:-PAY_PER_REQUEST}
STACK_NAME="chat-conversations-${ENVIRONMENT}"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TEMPLATE_FILE="${SCRIPT_DIR}/../templates/chat-conversations-table.yaml"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo -e "${RED}Error: Invalid environment '${ENVIRONMENT}'${NC}"
    echo "Must be one of: dev, staging, prod"
    exit 1
fi

# Validate billing mode
if [[ ! "$BILLING_MODE" =~ ^(PAY_PER_REQUEST|PROVISIONED)$ ]]; then
    echo -e "${RED}Error: Invalid billing mode '${BILLING_MODE}'${NC}"
    echo "Must be one of: PAY_PER_REQUEST, PROVISIONED"
    exit 1
fi

echo -e "${GREEN}=== Deploying Chat Conversations Table ===${NC}"
echo "Environment: ${ENVIRONMENT}"
echo "Stack Name: ${STACK_NAME}"
echo "Billing Mode: ${BILLING_MODE}"
echo ""

# Check if template file exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo -e "${RED}Error: Template file '${TEMPLATE_FILE}' not found${NC}"
    exit 1
fi

# Validate template
echo -e "${YELLOW}Validating CloudFormation template...${NC}"
aws cloudformation validate-template \
    --template-body file://${TEMPLATE_FILE} \
    --profile admin-role \
    --region us-west-2 \
    --no-paginate \
    > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Template is valid${NC}"
else
    echo -e "${RED}✗ Template validation failed${NC}"
    exit 1
fi

# Check if stack exists
echo ""
echo -e "${YELLOW}Checking if stack exists...${NC}"
STACK_EXISTS=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --profile admin-role \
    --region us-west-2 \
    --no-paginate \
    --query 'Stacks[0].StackName' \
    --output text 2>/dev/null || echo "")

if [ -n "$STACK_EXISTS" ]; then
    echo -e "${YELLOW}Stack exists. Updating...${NC}"
    OPERATION="update-stack"
else
    echo -e "${YELLOW}Stack does not exist. Creating...${NC}"
    OPERATION="create-stack"
fi

# Deploy stack
echo ""
echo -e "${YELLOW}Deploying stack...${NC}"

PARAMETERS="ParameterKey=Environment,ParameterValue=${ENVIRONMENT}"
PARAMETERS="${PARAMETERS} ParameterKey=BillingMode,ParameterValue=${BILLING_MODE}"

if [ "$BILLING_MODE" = "PROVISIONED" ]; then
    # Add capacity parameters for provisioned mode
    PARAMETERS="${PARAMETERS} ParameterKey=ReadCapacityUnits,ParameterValue=5"
    PARAMETERS="${PARAMETERS} ParameterKey=WriteCapacityUnits,ParameterValue=5"
fi

aws cloudformation ${OPERATION} \
    --stack-name ${STACK_NAME} \
    --template-body file://${TEMPLATE_FILE} \
    --parameters ${PARAMETERS} \
    --capabilities CAPABILITY_NAMED_IAM \
    --profile admin-role \
    --region us-west-2 \
    --no-paginate

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Stack deployment failed${NC}"
    exit 1
fi

# Wait for stack operation to complete
echo ""
echo -e "${YELLOW}Waiting for stack operation to complete...${NC}"
echo "This may take a few minutes..."

if [ "$OPERATION" = "create-stack" ]; then
    WAIT_COMMAND="stack-create-complete"
else
    WAIT_COMMAND="stack-update-complete"
fi

aws cloudformation wait ${WAIT_COMMAND} \
    --stack-name ${STACK_NAME} \
    --profile admin-role \
    --region us-west-2

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Stack operation completed successfully${NC}"
else
    echo -e "${RED}✗ Stack operation failed or timed out${NC}"
    echo ""
    echo "Check the CloudFormation console for details:"
    echo "https://console.aws.amazon.com/cloudformation/home?region=us-west-2#/stacks"
    exit 1
fi

# Get stack outputs
echo ""
echo -e "${GREEN}=== Stack Outputs ===${NC}"
aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --profile admin-role \
    --region us-west-2 \
    --no-paginate \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table

# Get environment variables
echo ""
echo -e "${GREEN}=== Environment Variables ===${NC}"
echo "Add these to your .env file:"
echo ""
aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --profile admin-role \
    --region us-west-2 \
    --no-paginate \
    --query 'Stacks[0].Outputs[?OutputKey==`EnvironmentVariables`].OutputValue' \
    --output text

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Add the environment variables above to your .env file"
echo "2. Attach the access policy to your application's IAM role"
echo "3. Restart your application to use the new table"
echo ""
echo "Policy ARN:"
aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --profile admin-role \
    --region us-west-2 \
    --no-paginate \
    --query 'Stacks[0].Outputs[?OutputKey==`AccessPolicyArn`].OutputValue' \
    --output text
