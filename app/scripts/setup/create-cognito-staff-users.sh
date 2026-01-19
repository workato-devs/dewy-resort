#!/bin/bash

# Script to create housekeeping and maintenance users in Cognito User Pool
# Usage: ./create-cognito-staff-users.sh <user-pool-id> [aws-profile] [aws-region]

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
    if [ -z "$USER_POOL_ID" ]; then
        print_error "User Pool ID parameter is required"
        echo "Usage: $0 <user-pool-id> [aws-profile] [aws-region]"
        exit 1
    fi
    
    # Validate User Pool ID format
    if [[ ! "$USER_POOL_ID" =~ ^[a-z0-9-]+_[a-zA-Z0-9]+$ ]]; then
        print_error "Invalid User Pool ID format. Expected format: region_id (e.g., us-west-2_abc123)"
        exit 1
    fi
}

# Function to check if user exists
user_exists() {
    local user_pool_id=$1
    local username=$2
    
    aws cognito-idp admin-get-user \
        --user-pool-id "$user_pool_id" \
        --username "$username" \
        &> /dev/null
    
    return $?
}

# Function to create a Cognito user
create_cognito_user() {
    local user_pool_id=$1
    local email=$2
    local name=$3
    local role=$4
    local temp_password=$5
    
    print_info "Creating $role user: $email"
    
    # Check if user already exists
    if user_exists "$user_pool_id" "$email"; then
        print_warning "User $email already exists, skipping"
        return 0
    fi
    
    # Create user
    aws cognito-idp admin-create-user \
        --user-pool-id "$user_pool_id" \
        --username "$email" \
        --user-attributes \
            Name=email,Value="$email" \
            Name=email_verified,Value=true \
            Name=name,Value="$name" \
            Name=custom:role,Value="$role" \
        --temporary-password "$temp_password" \
        --message-action SUPPRESS \
        --output json > /dev/null
    
    if [ $? -eq 0 ]; then
        print_info "✓ Created user: $email"
        echo "  Name: $name"
        echo "  Role: $role"
        echo "  Temporary Password: $temp_password"
        echo "  Note: User must change password on first login"
        return 0
    else
        print_error "Failed to create user: $email"
        return 1
    fi
}

# Function to set permanent password (optional)
set_permanent_password() {
    local user_pool_id=$1
    local username=$2
    local password=$3
    
    print_info "Setting permanent password for: $username"
    
    aws cognito-idp admin-set-user-password \
        --user-pool-id "$user_pool_id" \
        --username "$username" \
        --password "$password" \
        --permanent \
        --output json > /dev/null
    
    if [ $? -eq 0 ]; then
        print_info "✓ Password set for: $username"
        return 0
    else
        print_error "Failed to set password for: $username"
        return 1
    fi
}

# Function to display user information
display_user_info() {
    local user_pool_id=$1
    local username=$2
    
    print_info "User details for: $username"
    
    aws cognito-idp admin-get-user \
        --user-pool-id "$user_pool_id" \
        --username "$username" \
        --query '{Username:Username,Status:UserStatus,Enabled:Enabled,Attributes:UserAttributes}' \
        --output json
}

# Main execution
main() {
    print_section "Create Cognito Staff Users"
    echo ""
    
    # Parse arguments
    USER_POOL_ID=$1
    AWS_PROFILE=${2:-default}
    AWS_REGION=${3:-}
    
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
    print_section "Creating Users"
    echo ""
    
    # Define test users
    # Note: These are temporary passwords. Users will be prompted to change on first login.
    
    # Create housekeeping user
    create_cognito_user \
        "$USER_POOL_ID" \
        "housekeeping@hotel.local" \
        "Maria Housekeeping" \
        "housekeeping" \
        "TempHousekeeping123!"
    
    echo ""
    
    # Create maintenance user
    create_cognito_user \
        "$USER_POOL_ID" \
        "maintenance@hotel.local" \
        "John Maintenance" \
        "maintenance" \
        "TempMaintenance123!"
    
    echo ""
    print_section "Optional: Set Permanent Passwords"
    echo ""
    
    read -p "Do you want to set permanent passwords for these users? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Setting permanent passwords..."
        echo ""
        
        # Set permanent password for housekeeping
        set_permanent_password \
            "$USER_POOL_ID" \
            "housekeeping@hotel.local" \
            "Housekeeping123!"
        
        echo ""
        
        # Set permanent password for maintenance
        set_permanent_password \
            "$USER_POOL_ID" \
            "maintenance@hotel.local" \
            "Maintenance123!"
        
        echo ""
        print_info "Permanent passwords set"
    else
        print_info "Skipping permanent password setup"
        print_warning "Users will need to change their password on first login"
    fi
    
    echo ""
    print_section "Summary"
    echo ""
    
    echo "Staff users created successfully!"
    echo ""
    echo "Housekeeping User:"
    echo "  Email: housekeeping@hotel.local"
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "  Password: Housekeeping123!"
    else
        echo "  Temporary Password: TempHousekeeping123!"
        echo "  (Must be changed on first login)"
    fi
    echo ""
    echo "Maintenance User:"
    echo "  Email: maintenance@hotel.local"
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "  Password: Maintenance123!"
    else
        echo "  Temporary Password: TempMaintenance123!"
        echo "  (Must be changed on first login)"
    fi
    echo ""
    echo "Next Steps:"
    echo "1. Test login with these credentials"
    echo "2. Verify the custom:role attribute is set correctly"
    echo "3. Test Bedrock chat integration with staff roles"
    echo "4. Configure MCP servers for housekeeping and maintenance"
    echo ""
    
    print_info "Script completed successfully!"
}

# Run main function
main "$@"
