# Salesforce Metadata Deployment Script for Dewy Resort Hotel
# This script deploys all custom objects, fields, and validation rules to Salesforce

param(
    [Parameter(Mandatory=$true)]
    [string]$TargetOrg
)

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Dewy Resort Hotel - Salesforce Deployment" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Salesforce CLI is installed
$sfCli = $null
$possiblePaths = @(
    "..\..\bin\sf.ps1",
    "..\bin\sf.ps1",
    "bin\sf.ps1"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $sfCli = $path
        break
    }
}

if (-not $sfCli) {
    $sfCmd = Get-Command sf -ErrorAction SilentlyContinue
    if ($sfCmd) {
        $sfCli = "sf"
    } else {
        Write-Host "[ERROR] Salesforce CLI (sf) is not installed." -ForegroundColor Red
        Write-Host "Please install it via: .\setup-cli.ps1 -Tool salesforce"
        exit 1
    }
}

Write-Host "[OK] Salesforce CLI is installed" -ForegroundColor Green
Write-Host ""

Write-Host "Target org: $TargetOrg"
Write-Host ""

# Verify org connection
Write-Host "Verifying connection to $TargetOrg..."
try {
    & $sfCli org display --target-org $TargetOrg 2>&1 | Out-Null
} catch {
    Write-Host "[ERROR] Unable to connect to org '$TargetOrg'" -ForegroundColor Red
    Write-Host "Please authenticate first: $sfCli org login web --alias $TargetOrg"
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
Write-Host "  .\bin\sf.ps1 org open --target-org $TargetOrg"
Write-Host ""
