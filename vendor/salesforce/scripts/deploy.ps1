# Salesforce Metadata Deployment Script for Dewy Resort Hotel
# This script deploys all custom objects, fields, and validation rules to Salesforce

param(
    [Parameter(Mandatory=$true)]
    [string]$TargetOrg
)

$ErrorActionPreference = "Stop"

# Resolve directories relative to the script location so this works
# regardless of the caller's working directory (e.g., Make from project root).
$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$SfProjectDir = (Get-Item "$ScriptDir\..").FullName
$ProjectRoot  = (Get-Item "$ScriptDir\..\..").FullName

# Ensure HOME points to the real Windows user profile.
# MSYS2/MinGW Make may set HOME to a Unix-style path (/c/Users/foo),
# which prevents the SF CLI from finding its credential store at $HOME/.sf/.
if ($env:HOME -and $env:HOME -match '^/') {
    $env:HOME = $env:USERPROFILE
}

# Change to the Salesforce project directory (where force-app/ lives)
Push-Location $SfProjectDir

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Dewy Resort Hotel - Salesforce Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Salesforce CLI is installed
$sfCli = $null
$wrapperPath = Join-Path $ProjectRoot "bin\sf.ps1"
if (Test-Path $wrapperPath) {
    $sfCli = $wrapperPath
}

if (-not $sfCli) {
    $sfCmd = Get-Command sf -ErrorAction SilentlyContinue
    if ($sfCmd) {
        $sfCli = "sf"
    } else {
        Write-Host "[ERROR] Salesforce CLI (sf) is not installed." -ForegroundColor Red
        Write-Host "Please install it via: make setup tool=salesforce"
        Pop-Location
        exit 1
    }
}

Write-Host "[OK] Salesforce CLI is installed" -ForegroundColor Green
Write-Host ""

Write-Host "Target org: $TargetOrg"
Write-Host ""

try {
    # Native CLI commands (sf) write warnings to stderr (e.g., "this command will
    # expose sensitive information..."). With ErrorActionPreference=Stop, PowerShell
    # converts every stderr line into a terminating error — killing the script on
    # harmless warnings. Switch to Continue and use $LASTEXITCODE for real failures.
    $ErrorActionPreference = "Continue"

    # Verify org connection
    Write-Host "Verifying connection to $TargetOrg..."
    & $sfCli org display --target-org $TargetOrg 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Unable to authenticate to org '$TargetOrg'" -ForegroundColor Red
        Write-Host ""
        Write-Host "This usually means the access token has expired." -ForegroundColor Yellow
        Write-Host "Re-authenticate from your terminal (not from Make):" -ForegroundColor Yellow
        Write-Host "  sf org login web --alias $TargetOrg"
        Write-Host ""
        Write-Host "Then retry:  make sf-deploy org=$TargetOrg"
        exit 1
    }

    Write-Host "[OK] Connected to $TargetOrg" -ForegroundColor Green
    Write-Host ""

    # Deploy metadata
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "Step 1: Deploying Metadata" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Deploying custom objects, fields, and validation rules..."

    & $sfCli project deploy start `
        --source-dir force-app/main/default `
        --target-org $TargetOrg `
        --wait 10

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Metadata deployment failed" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "[OK] Metadata deployed successfully" -ForegroundColor Green
    Write-Host ""

    # Assign permission set
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "Step 2: Assigning Permission Set" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Assigning 'Hotel Management Admin' permission set to current user..."

    & $sfCli org assign permset `
        --name Hotel_Management_Admin `
        --target-org $TargetOrg

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Permission set assignment failed" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "[OK] Permission set assigned" -ForegroundColor Green
    Write-Host ""

    # Import seed data
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "Step 3: Importing Seed Data" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Importing Accounts, Contacts, and Hotel Rooms..."

    & $sfCli data import tree `
        --plan data/data-plan.json `
        --target-org $TargetOrg

    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Seed data import failed" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "[OK] Seed data imported successfully" -ForegroundColor Green
    Write-Host ""

    # Summary
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "Deployment Complete!" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Summary:"
    Write-Host "  - 4 custom objects created"
    Write-Host "  - Custom fields added to Case, Contact, Opportunity"
    Write-Host "  - 4 validation rules deployed"
    Write-Host "  - 1 permission set assigned"
    Write-Host "  - Sample data imported"
    Write-Host ""
    Write-Host "To open the org:"
    Write-Host "  sf org open --target-org $TargetOrg"
    Write-Host ""
} finally {
    Pop-Location
}
