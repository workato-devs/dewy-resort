# Dewy Resort Workshop - Windows Setup Script
# 
# This is the main entry point for Windows users to set up the workshop environment.
#
# Usage:
#   .\setup.ps1                           # Interactive setup
#   .\setup.ps1 -Tool workato             # Setup specific tool
#   .\setup.ps1 -Tool salesforce          # Setup specific tool
#   .\setup.ps1 -Tool all                 # Setup all tools

param(
    [ValidateSet("workato", "salesforce", "all")]
    [string]$Tool = "all"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Dewy Resort Workshop Setup (Windows)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check PowerShell version
$psVersion = $PSVersionTable.PSVersion
Write-Host "PowerShell Version: $psVersion"
if ($psVersion.Major -lt 5) {
    Write-Host "Warning: PowerShell 5.0 or later is recommended" -ForegroundColor Yellow
}
Write-Host ""

function Show-Help {
    Write-Host "Available Commands:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Setup Commands:"
    Write-Host "  .\setup.ps1 -Tool all         Setup all CLIs (workato + salesforce)"
    Write-Host "  .\setup.ps1 -Tool workato     Setup only Workato CLI"
    Write-Host "  .\setup.ps1 -Tool salesforce  Setup only Salesforce CLI"
    Write-Host ""
    Write-Host "Workato Commands:"
    Write-Host "  .\workato\scripts\cli\start_workato_recipes.ps1     Start all recipes"
    Write-Host "  .\workato\scripts\cli\stop_workato_recipes.ps1      Stop all recipes"
    Write-Host "  .\workato\scripts\cli\enable_api_endpoints.ps1      Enable API endpoints"
    Write-Host "  .\workato\scripts\cli\create_api_collection_client.ps1  Create API client"
    Write-Host ""
    Write-Host "Salesforce Commands:"
    Write-Host "  .\vendor\salesforce\scripts\deploy.ps1 -TargetOrg <alias>  Deploy to Salesforce"
    Write-Host ""
    Write-Host "Dev Server Commands:"
    Write-Host "  .\app\scripts\dev-tools\server.ps1 -Action start    Start dev server"
    Write-Host "  .\app\scripts\dev-tools\server.ps1 -Action stop     Stop dev server"
    Write-Host "  .\app\scripts\dev-tools\server.ps1 -Action status   Check server status"
    Write-Host ""
    Write-Host "Utility Commands:"
    Write-Host "  .\app\scripts\utils\dump-database.ps1               Backup database"
    Write-Host "  .\app\scripts\setup\fix-bcrypt.ps1                  Fix bcrypt issues"
    Write-Host ""
}

# Run setup based on tool parameter
switch ($Tool) {
    "all" {
        Write-Host "Setting up all vendor CLIs..." -ForegroundColor Green
        Write-Host ""
        
        Write-Host "--- Setting up Workato CLI ---" -ForegroundColor Cyan
        & "$PSScriptRoot\app\scripts\setup\setup-cli.ps1" -Tool workato
        
        Write-Host ""
        Write-Host "--- Setting up Salesforce CLI ---" -ForegroundColor Cyan
        & "$PSScriptRoot\app\scripts\setup\setup-cli.ps1" -Tool salesforce
    }
    "workato" {
        Write-Host "Setting up Workato CLI..." -ForegroundColor Green
        & "$PSScriptRoot\app\scripts\setup\setup-cli.ps1" -Tool workato
    }
    "salesforce" {
        Write-Host "Setting up Salesforce CLI..." -ForegroundColor Green
        & "$PSScriptRoot\app\scripts\setup\setup-cli.ps1" -Tool salesforce
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Show-Help
