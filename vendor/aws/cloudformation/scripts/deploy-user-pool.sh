#!/bin/bash

# Cognito User Pool Deployment Script
# Usage: ./deploy.sh <environment> <callback-url> <logout-url> <domain-prefix> [aws-profile]

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
        echo "Usage: $0 <environment> <callback-url> <logout-url> <domain-prefix> [aws-profile]"
        exit 1
    fi
    
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
        print_error "Environment must be one of: dev, staging, prod"
        exit 1
    fi
    
    if [ -z "$CALLBACK_URL" ]; then
        print_error "Callback URL parameter is required"
        echo "Usage: $0 <environment> <callback-url> <logout-url> <domain-prefix> [aws-profile]"
        exit 1
    fi
    
    if [ -z "$LOGOUT_URL" ]; then
        print_error "Logout URL parameter is required"
        echo "Usage: $0 <environment> <callback-url> <logout-url> <domain-prefix> [aws-profile]"
        exit 1
    fi
    
    if [ -z "$DOMAIN_PREFIX" ]; then
        print_error "Domain prefix parameter is required"
        echo "Usage: $0 <environment> <callback-url> <logout-url> <domain-prefix> [aws-profile]"
        exit 1
    fi
    
    # Validate domain prefix format
    if [[ ! "$DOMAIN_PREFIX" =~ ^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$ ]]; then
        print_error "Domain prefix must be lowercase alphanumeric with hyphens, 1-63 characters"
        exit 1
    fi
}

# Function to deploy CloudFormation stack
deploy_stack() {
    local stack_name="$STACK_NAME"
    local template_file="${SCRIPT_DIR}/../templates/cognito-user-pool.yaml"
    
    print_info "Deploying CloudFormation stack: $stack_name"
    print_info "Environment: $ENVIRONMENT"
    print_info "Callback URL: $CALLBACK_URL"
    print_info "Logout URL: $LOGOUT_URL"
    print_info "Domain Prefix: $DOMAIN_PREFIX"
    
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
        --template-body "file://$template_file" \
        --parameters \
            ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
            ParameterKey=CallbackURL,ParameterValue="$CALLBACK_URL" \
            ParameterKey=LogoutURL,ParameterValue="$LOGOUT_URL" \
            ParameterKey=DomainPrefix,ParameterValue="$DOMAIN_PREFIX" \
        --capabilities CAPABILITY_IAM \
        --tags \
            Key=Environment,Value="$ENVIRONMENT" \
            Key=Application,Value=HotelManagementSystem \
            Key=ManagedBy,Value=CloudFormation
    
    if [ $? -eq 0 ]; then
        print_info "Stack deployment initiated successfully"
    else
        print_error "Stack deployment failed"
        exit 1
    fi
    
    # Wait for stack operation to complete
    print_info "Waiting for stack operation to complete..."
    
    if [ "$OPERATION" = "create-stack" ]; then
        aws cloudformation wait stack-create-complete --stack-name "$stack_name"
    else
        aws cloudformation wait stack-update-complete --stack-name "$stack_name" 2>/dev/null || true
    fi
    
    # Check stack status
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

# Function to get client secret
get_client_secret() {
    local user_pool_id=$1
    local client_id=$2
    
    print_info "Retrieving client secret..."
    
    local client_secret=$(aws cognito-idp describe-user-pool-client \
        --user-pool-id "$user_pool_id" \
        --client-id "$client_id" \
        --query 'UserPoolClient.ClientSecret' \
        --output text)
    
    echo "$client_secret"
}

# Function to generate .env configuration
generate_env_config() {
    local outputs=$1
    local client_secret=$2
    
    print_info "Generating .env configuration..."
    
    # Parse outputs
    local user_pool_id=$(echo "$outputs" | grep -A 2 '"OutputKey": "UserPoolId"' | grep '"OutputValue"' | cut -d'"' -f4)
    local client_id=$(echo "$outputs" | grep -A 2 '"OutputKey": "ClientId"' | grep '"OutputValue"' | cut -d'"' -f4)
    local cognito_domain=$(echo "$outputs" | grep -A 2 '"OutputKey": "CognitoDomain"' | grep '"OutputValue"' | cut -d'"' -f4)
    local region=$(echo "$outputs" | grep -A 2 '"OutputKey": "Region"' | grep '"OutputValue"' | cut -d'"' -f4)
    
    echo ""
    echo "=========================================="
    echo "CloudFormation Stack Outputs"
    echo "=========================================="
    echo ""
    echo "$outputs" | grep -E '"OutputKey"|"OutputValue"' | sed 's/^[ \t]*//'
    echo ""
    echo "=========================================="
    echo ".env Configuration"
    echo "=========================================="
    echo ""
    echo "# Add these variables to your .env file:"
    echo ""
    echo "# Authentication Provider"
    echo "AUTH_PROVIDER=cognito"
    echo ""
    echo "# Amazon Cognito Configuration"
    echo "COGNITO_USER_POOL_ID=$user_pool_id"
    echo "COGNITO_CLIENT_ID=$client_id"
    echo "COGNITO_CLIENT_SECRET=$client_secret"
    echo "COGNITO_REGION=$region"
    echo "COGNITO_REDIRECT_URI=$CALLBACK_URL"
    echo "COGNITO_DOMAIN=${cognito_domain#https://}"
    echo ""
    echo "=========================================="
    echo ""
    
    # Save to file
    local env_file="${SCRIPT_DIR}/../.env.user-pool-${ENVIRONMENT}"
    cat > "$env_file" << EOF
# Authentication Provider
AUTH_PROVIDER=cognito

# Amazon Cognito Configuration
COGNITO_USER_POOL_ID=$user_pool_id
COGNITO_CLIENT_ID=$client_id
COGNITO_CLIENT_SECRET=$client_secret
COGNITO_REGION=$region
COGNITO_REDIRECT_URI=$CALLBACK_URL
COGNITO_DOMAIN=${cognito_domain#https://}
EOF
    
    print_info "Configuration saved to: .env.user-pool-${ENVIRONMENT}"
}

# Main execution
main() {
    print_info "Starting Cognito User Pool deployment"
    echo ""
    
    # Parse arguments
    ENVIRONMENT=$1
    CALLBACK_URL=$2
    LOGOUT_URL=$3
    DOMAIN_PREFIX=$4
    AWS_PROFILE=${5:-default}
    STACK_NAME=${6:-"hotel-mgmt-cognito-${ENVIRONMENT}"}
    AWS_REGION=${7:-}
    
    # Get script directory
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    
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
    
    # Deploy stack
    STACK_NAME=$(deploy_stack)
    
    echo ""
    
    # Get outputs
    OUTPUTS=$(get_stack_outputs "$STACK_NAME")
    
    # Extract User Pool ID and Client ID for secret retrieval
    USER_POOL_ID=$(echo "$OUTPUTS" | grep -A 2 '"OutputKey": "UserPoolId"' | grep '"OutputValue"' | cut -d'"' -f4)
    CLIENT_ID=$(echo "$OUTPUTS" | grep -A 2 '"OutputKey": "ClientId"' | grep '"OutputValue"' | cut -d'"' -f4)
    
    # Get client secret
    CLIENT_SECRET=$(get_client_secret "$USER_POOL_ID" "$CLIENT_ID")
    
    # Generate .env configuration
    generate_env_config "$OUTPUTS" "$CLIENT_SECRET"
    
    echo ""
    print_info "Deployment completed successfully!"
    print_info "Stack Name: $STACK_NAME"
    print_info "User Pool ID: $USER_POOL_ID"
    print_info "Client ID: $CLIENT_ID"
    echo ""
    print_warning "IMPORTANT: Keep your CLIENT_SECRET secure and never commit it to version control!"
}

# Run main function
main "$@"
