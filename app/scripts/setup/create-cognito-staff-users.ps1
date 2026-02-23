# Script to create housekeeping and maintenance users in Cognito User Pool
# Usage: .\create-cognito-staff-users.ps1 -UserPoolId <user-pool-id> [-AwsProfile <profile>] [-AwsRegion <region>]

param(
    [Parameter(Mandatory=$true)]
    [string]$UserPoolId,
    
    [string]$AwsProfile = "default",
    
    [string]$AwsRegion
)

$ErrorActionPreference = "Stop"

function Write-Info { param([string]$Message) Write-Host "[INFO] $Message" -ForegroundColor Green }
function Write-Error { param([string]$Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }
function Write-Warning { param([string]$Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Section { param([string]$Message) 
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
}

function Test-AwsCli {
    if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
        Write-Error "AWS CLI is not installed. Please install it first."
        Write-Host "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    }
    Write-Info "AWS CLI version: $(aws --version)"
}

function Test-AwsCredentials {
    try {
        $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
        Write-Info "AWS Account: $($identity.Account)"
        Write-Info "AWS Identity: $($identity.Arn)"
    } catch {
        Write-Error "AWS credentials are not configured or invalid."
        Write-Host "Run 'aws configure' to set up your credentials."
        exit 1
    }
}

function Test-UserExists {
    param([string]$PoolId, [string]$Username)
    try {
        aws cognito-idp admin-get-user --user-pool-id $PoolId --username $Username 2>$null | Out-Null
        return $true
    } catch {
        return $false
    }
}

function New-CognitoUser {
    param(
        [string]$PoolId,
        [string]$Email,
        [string]$Name,
        [string]$Role,
        [string]$TempPassword
    )
    
    Write-Info "Creating $Role user: $Email"
    
    if (Test-UserExists -PoolId $PoolId -Username $Email) {
        Write-Warning "User $Email already exists, skipping"
        return $true
    }
    
    try {
        aws cognito-idp admin-create-user `
            --user-pool-id $PoolId `
            --username $Email `
            --user-attributes "Name=email,Value=$Email" "Name=email_verified,Value=true" "Name=name,Value=$Name" "Name=custom:role,Value=$Role" `
            --temporary-password $TempPassword `
            --message-action SUPPRESS `
            --output json | Out-Null
        
        Write-Info "✓ Created user: $Email"
        Write-Host "  Name: $Name"
        Write-Host "  Role: $Role"
        Write-Host "  Temporary Password: $TempPassword"
        Write-Host "  Note: User must change password on first login"
        return $true
    } catch {
        Write-Error "Failed to create user: $Email"
        return $false
    }
}

function Set-PermanentPassword {
    param(
        [string]$PoolId,
        [string]$Username,
        [string]$Password
    )
    
    Write-Info "Setting permanent password for: $Username"
    
    try {
        aws cognito-idp admin-set-user-password `
            --user-pool-id $PoolId `
            --username $Username `
            --password $Password `
            --permanent `
            --output json | Out-Null
        
        Write-Info "✓ Password set for: $Username"
        return $true
    } catch {
        Write-Error "Failed to set password for: $Username"
        return $false
    }
}

# Main execution
Write-Section "Create Cognito Staff Users"
Write-Host ""

# Validate User Pool ID format
if ($UserPoolId -notmatch '^[a-z0-9-]+_[a-zA-Z0-9]+$') {
    Write-Error "Invalid User Pool ID format. Expected format: region_id (e.g., us-west-2_abc123)"
    exit 1
}

# Set AWS profile if provided
if ($AwsProfile -ne "default") {
    $env:AWS_PROFILE = $AwsProfile
    Write-Info "Using AWS Profile: $AwsProfile"
}

# Set AWS region if provided
if ($AwsRegion) {
    $env:AWS_DEFAULT_REGION = $AwsRegion
    Write-Info "Using AWS Region: $AwsRegion"
}

# Validate prerequisites
Test-AwsCli
Test-AwsCredentials

Write-Host ""
Write-Section "Creating Users"
Write-Host ""

# Create housekeeping user
New-CognitoUser -PoolId $UserPoolId -Email "housekeeping@hotel.local" -Name "Maria Housekeeping" -Role "housekeeping" -TempPassword "TempHousekeeping123!"

Write-Host ""

# Create maintenance user
New-CognitoUser -PoolId $UserPoolId -Email "maintenance@hotel.local" -Name "John Maintenance" -Role "maintenance" -TempPassword "TempMaintenance123!"

Write-Host ""
Write-Section "Optional: Set Permanent Passwords"
Write-Host ""

$reply = Read-Host "Do you want to set permanent passwords for these users? (y/N)"

$setPermanent = $reply -match '^[Yy]$'

if ($setPermanent) {
    Write-Info "Setting permanent passwords..."
    Write-Host ""
    
    Set-PermanentPassword -PoolId $UserPoolId -Username "housekeeping@hotel.local" -Password "Housekeeping123!"
    Write-Host ""
    Set-PermanentPassword -PoolId $UserPoolId -Username "maintenance@hotel.local" -Password "Maintenance123!"
    
    Write-Host ""
    Write-Info "Permanent passwords set"
} else {
    Write-Info "Skipping permanent password setup"
    Write-Warning "Users will need to change their password on first login"
}

Write-Host ""
Write-Section "Summary"
Write-Host ""

Write-Host "Staff users created successfully!"
Write-Host ""
Write-Host "Housekeeping User:"
Write-Host "  Email: housekeeping@hotel.local"
if ($setPermanent) {
    Write-Host "  Password: Housekeeping123!"
} else {
    Write-Host "  Temporary Password: TempHousekeeping123!"
    Write-Host "  (Must be changed on first login)"
}
Write-Host ""
Write-Host "Maintenance User:"
Write-Host "  Email: maintenance@hotel.local"
if ($setPermanent) {
    Write-Host "  Password: Maintenance123!"
} else {
    Write-Host "  Temporary Password: TempMaintenance123!"
    Write-Host "  (Must be changed on first login)"
}
Write-Host ""
Write-Host "Next Steps:"
Write-Host "1. Test login with these credentials"
Write-Host "2. Verify the custom:role attribute is set correctly"
Write-Host "3. Test Bedrock chat integration with staff roles"
Write-Host "4. Configure MCP servers for housekeeping and maintenance"
Write-Host ""

Write-Info "Script completed successfully!"
