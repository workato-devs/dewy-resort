#!/bin/bash

# Cognito Identity Pool Deployment Script for Bedrock Integration
# Usage: ./deploy-identity-pool.sh <environment> <user-pool-id> <client-id> [bedrock-model-id] [aws-profile] [aws-region]

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_section() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Function to validate AWS CLI is installed
validate_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        echo "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    fi
    
    print_info "AWS CLI version: $(aws --version)"
}

# Function to validate AWS credentials
validate_aws_credentials() {
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials are not configured or invalid."
        echo "Run 'aws configure' to set up your credentials."
        exit 1
    fi
    
    local identity=$(aws sts get-caller-identity --output json)
    local account_id=$(echo $identity | grep -o '"Account": "[^"]*' | cut -d'"' -f4)
    local user_arn=$(echo $identity | grep -o '"Arn": "[^"]*' | cut -d'"' -f4)
    
    print_info "AWS Account: $account_id"
    print_info "AWS Identity: $user_arn"
}

# Function to validate parameters
validate_parameters() {
    if [ -z "$ENVIRONMENT" ]; then
        print_error "Environment parameter is required"
        echo "Usage: $0 <environment> <user-pool-id> <client-id> [bedrock-model-id] [aws-profile] [aws-region]"
        exit 1
    fi
    
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
        print_error "Environment must be one of: dev, staging, prod"
        exit 1
    fi
    
    if [ -z "$USER_POOL_ID" ]; then
        print_error "User Pool ID parameter is required"
        echo "Usage: $0 <environment> <user-pool-id> <client-id> [bedrock-model-id] [aws-profile] [aws-region]"
        exit 1
    fi
    
    if [ -z "$CLIENT_ID" ]; then
        print_error "Client ID parameter is required"
        echo "Usage: $0 <environment> <user-pool-id> <client-id> [bedrock-model-id] [aws-profile] [aws-region]"
        exit 1
    fi
    
    # Validate User Pool ID format
    if [[ ! "$USER_POOL_ID" =~ ^[a-z0-9-]+_[a-zA-Z0-9]+$ ]]; then
        print_error "Invalid User Pool ID format. Expected format: region_id (e.g., us-west-2_abc123)"
        exit 1
    fi
}

# Function to check Bedrock model access
check_bedrock_access() {
    local model_id=$1
    
    print_info "Checking Bedrock model access..."
    
    # Try to list foundation models to verify Bedrock access
    if aws bedrock list-foundation-models --output json &> /dev/null; then
        print_info "Bedrock access verified"
        
        # Check if specific model is available
        local model_exists=$(aws bedrock list-foundation-models \
            --query "modelSummaries[?modelId=='${model_id}'].modelId" \
            --output text 2>/dev/null || echo "")
        
        if [ -n "$model_exists" ]; then
            print_info "Model ${model_id} is available"
        else
            print_warning "Model ${model_id} not found in available models"
            print_warning "The deployment will continue, but verify the model ID is correct"
        fi
    else
        print_warning "Unable to verify Bedrock access. Ensure you have bedrock:ListFoundationModels permission"
        print_warning "The deployment will continue, but Bedrock access may not work"
    fi
}

# Function to deploy CloudFormation stack
deploy_stack() {
    local stack_name="$STACK_NAME"
    
    print_section "Deploying CloudFormation Stack"
    print_info "Stack Name: $stack_name"
    print_info "Template: $TEMPLATE_FILE"
    print_info "Environment: $ENVIRONMENT"
    print_info "User Pool ID: $USER_POOL_ID"
    print_info "Client ID: $CLIENT_ID"
    print_info "Bedrock Model: $BEDROCK_MODEL_ID"
    
    # Check if stack exists
    if aws cloudformation describe-stacks --stack-name "$stack_name" &> /dev/null; then
        print_warning "Stack already exists. Updating..."
        OPERATION="update-stack"
    else
        print_info "Creating new stack..."
        OPERATION="create-stack"
    fi
    
    # Deploy stack
    aws cloudformation $OPERATION \
        --stack-name "$stack_name" \
        --template-body "file://$TEMPLATE_FILE" \
        --parameters \
            ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
            ParameterKey=UserPoolId,ParameterValue="$USER_POOL_ID" \
            ParameterKey=UserPoolClientId,ParameterValue="$CLIENT_ID" \
            ParameterKey=BedrockModelId,ParameterValue="$BEDROCK_MODEL_ID" \
        --capabilities CAPABILITY_NAMED_IAM \
        --tags \
            Key=Environment,Value="$ENVIRONMENT" \
            Key=Application,Value=HotelManagementSystem \
            Key=ManagedBy,Value=CloudFormation \
            Key=Purpose,Value=BedrockIntegration
    
    if [ $? -eq 0 ]; then
        print_info "Stack deployment initiated successfully"
    else
        print_error "Stack deployment failed"
        exit 1
    fi
    
    # Wait for stack operation to complete
    print_info "Waiting for stack operation to complete (this may take a few minutes)..."
    
    if [ "$OPERATION" = "create-stack" ]; then
        aws cloudformation wait stack-create-complete --stack-name "$stack_name"
    else
        # Update may fail if no changes, which is okay
        aws cloudformation wait stack-update-complete --stack-name "$stack_name" 2>/dev/null || {
            local stack_status=$(aws cloudformation describe-stacks \
                --stack-name "$stack_name" \
                --query 'Stacks[0].StackStatus' \
                --output text)
            
            if [ "$stack_status" = "UPDATE_COMPLETE" ] || [[ "$stack_status" == *"COMPLETE"* ]]; then
                print_info "Stack is already up to date"
            else
                print_error "Stack update failed with status: $stack_status"
                exit 1
            fi
        }
    fi
    
    # Check final stack status
    local stack_status=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query 'Stacks[0].StackStatus' \
        --output text)
    
    if [[ "$stack_status" == *"COMPLETE"* ]]; then
        print_info "Stack operation completed successfully: $stack_status"
    else
        print_error "Stack operation failed: $stack_status"
        exit 1
    fi
    
    echo "$stack_name"
}

# Function to get stack outputs
get_stack_outputs() {
    local stack_name=$1
    
    print_info "Retrieving stack outputs..."
    
    local outputs=$(aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query 'Stacks[0].Outputs' \
        --output json)
    
    echo "$outputs"
}

# Function to generate .env configuration
generate_env_config() {
    local outputs=$1
    
    print_section "Configuration Output"
    
    # Parse outputs
    local identity_pool_id=$(echo "$outputs" | grep -A 2 '"OutputKey": "IdentityPoolId"' | grep '"OutputValue"' | cut -d'"' -f4)
    local guest_role_arn=$(echo "$outputs" | grep -A 2 '"OutputKey": "GuestRoleArn"' | grep '"OutputValue"' | cut -d'"' -f4)
    local manager_role_arn=$(echo "$outputs" | grep -A 2 '"OutputKey": "ManagerRoleArn"' | grep '"OutputValue"' | cut -d'"' -f4)
    local housekeeping_role_arn=$(echo "$outputs" | grep -A 2 '"OutputKey": "HousekeepingRoleArn"' | grep '"OutputValue"' | cut -d'"' -f4)
    local maintenance_role_arn=$(echo "$outputs" | grep -A 2 '"OutputKey": "MaintenanceRoleArn"' | grep '"OutputValue"' | cut -d'"' -f4)
    local region=$(echo "$outputs" | grep -A 2 '"OutputKey": "Region"' | grep '"OutputValue"' | cut -d'"' -f4)
    
    echo ""
    echo "CloudFormation Stack Outputs:"
    echo "------------------------------"
    echo "$outputs" | grep -E '"OutputKey"|"OutputValue"' | sed 's/^[ \t]*//'
    echo ""
    echo ""
    echo ".env Configuration:"
    echo "-------------------"
    echo ""
    echo "# Add these variables to your .env file:"
    echo ""
    echo "# Bedrock Integration Configuration"
    echo "COGNITO_IDENTITY_POOL_ID=$identity_pool_id"
    echo "BEDROCK_MODEL_ID=$BEDROCK_MODEL_ID"
    echo "AWS_REGION=$region"
    echo ""
    echo "# IAM Role ARNs (for reference)"
    echo "# GUEST_ROLE_ARN=$guest_role_arn"
    echo "# MANAGER_ROLE_ARN=$manager_role_arn"
    echo "# HOUSEKEEPING_ROLE_ARN=$housekeeping_role_arn"
    echo "# MAINTENANCE_ROLE_ARN=$maintenance_role_arn"
    echo ""
    
    # Save to file
    local env_file="${SCRIPT_DIR}/../.env.identity-pool-${ENVIRONMENT}"
    cat > "$env_file" << EOF
# Bedrock Integration Configuration
COGNITO_IDENTITY_POOL_ID=$identity_pool_id
BEDROCK_MODEL_ID=$BEDROCK_MODEL_ID
AWS_REGION=$region

# IAM Role ARNs (for reference)
# GUEST_ROLE_ARN=$guest_role_arn
# MANAGER_ROLE_ARN=$manager_role_arn
# HOUSEKEEPING_ROLE_ARN=$housekeeping_role_arn
# MAINTENANCE_ROLE_ARN=$maintenance_role_arn
EOF
    
    print_info "Configuration saved to: .env.identity-pool-${ENVIRONMENT}"
    echo ""
}

# Function to display next steps
display_next_steps() {
    print_section "Next Steps"
    echo ""
    echo "1. Add the configuration variables to your .env file"
    echo "   (See the output above or check .env.identity-pool-${ENVIRONMENT})"
    echo ""
    echo "2. Ensure your Cognito User Pool has the custom:role attribute"
    echo "   Valid values: guest, manager, housekeeping, maintenance"
    echo ""
    echo "3. Test the integration by:"
    echo "   - Logging in as a user with a custom:role attribute"
    echo "   - Accessing the chat interface"
    echo "   - Verifying Bedrock responses are streaming correctly"
    echo ""
    echo "4. Monitor CloudWatch Logs for any errors"
    echo ""
    print_warning "IMPORTANT: Ensure Bedrock model access is enabled in your AWS account"
    print_warning "Visit: https://console.aws.amazon.com/bedrock/home#/modelaccess"
    echo ""
}

# Main execution
main() {
    print_section "Cognito Identity Pool Deployment for Bedrock"
    echo ""
    
    # Parse arguments
    ENVIRONMENT=$1
    USER_POOL_ID=$2
    CLIENT_ID=$3
    BEDROCK_MODEL_ID=${4:-"anthropic.claude-3-sonnet-20240229-v1:0"}
    AWS_PROFILE=${5:-default}
    AWS_REGION=${6:-}
    STACK_NAME="hotel-mgmt-identity-pool-${ENVIRONMENT}"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TEMPLATE_FILE="${SCRIPT_DIR}/../templates/cognito-identity-pool.yaml"
    
    # Set AWS profile if provided
    if [ "$AWS_PROFILE" != "default" ]; then
        export AWS_PROFILE
        print_info "Using AWS Profile: $AWS_PROFILE"
    fi
    
    # Set AWS region if provided
    if [ -n "$AWS_REGION" ]; then
        export AWS_DEFAULT_REGION=$AWS_REGION
        print_info "Using AWS Region: $AWS_REGION"
    fi
    
    # Validate prerequisites
    validate_aws_cli
    validate_aws_credentials
    validate_parameters
    
    echo ""
    
    # Check Bedrock access
    check_bedrock_access "$BEDROCK_MODEL_ID"
    
    echo ""
    
    # Deploy stack
    STACK_NAME=$(deploy_stack)
    
    echo ""
    
    # Get outputs
    OUTPUTS=$(get_stack_outputs "$STACK_NAME")
    
    # Generate .env configuration
    generate_env_config "$OUTPUTS"
    
    # Display next steps
    display_next_steps
    
    print_section "Deployment Complete"
    print_info "Stack Name: $STACK_NAME"
    print_info "Identity Pool deployed successfully!"
}

# Run main function
main "$@"
