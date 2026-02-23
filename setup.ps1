# Dewy Resort Workshop - Windows Setup Script
# 
# This is the main entry point for Windows users to set up the workshop environment.
#
# Usage:
#   .\setup.ps1                           # Interactive setup (installs prerequisites + all tools)
#   .\setup.ps1 -Tool workato             # Setup specific tool
#   .\setup.ps1 -Tool salesforce          # Setup specific tool
#   .\setup.ps1 -Tool all                 # Setup all tools
#   .\setup.ps1 -SkipPrerequisites        # Skip prerequisite installation

param(
    [ValidateSet("workato", "salesforce", "all")]
    [string]$Tool = "all",
    
    [switch]$SkipPrerequisites
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
    Write-Host "[WARN] PowerShell 5.0 or later is recommended" -ForegroundColor Yellow
}
Write-Host ""

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Install-Winget {
    Write-Host "Checking for winget..." -ForegroundColor Yellow
    
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        Write-Host "[OK] winget is available" -ForegroundColor Green
        return $true
    }
    
    Write-Host "winget not found. Attempting to install..." -ForegroundColor Yellow
    
    # Check if running as admin
    if (-not (Test-Administrator)) {
        Write-Host "[ERROR] Administrator privileges required to install winget" -ForegroundColor Red
        Write-Host "Please run PowerShell as Administrator and try again, or install winget manually:"
        Write-Host "  https://aka.ms/getwinget"
        return $false
    }
    
    # Try to install App Installer (which includes winget) from Microsoft Store
    try {
        # Download and install the latest App Installer
        $progressPreference = 'SilentlyContinue'
        $latestWingetUrl = "https://aka.ms/getwinget"
        $installerPath = "$env:TEMP\Microsoft.DesktopAppInstaller.msixbundle"
        
        Write-Host "Downloading winget installer..."
        Invoke-WebRequest -Uri $latestWingetUrl -OutFile $installerPath -UseBasicParsing
        
        Write-Host "Installing winget..."
        Add-AppxPackage -Path $installerPath
        
        Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
        
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        $winget = Get-Command winget -ErrorAction SilentlyContinue
        if ($winget) {
            Write-Host "[OK] winget installed successfully" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "[ERROR] Failed to install winget: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host "[ERROR] Could not install winget automatically" -ForegroundColor Red
    Write-Host "Please install manually from: https://aka.ms/getwinget"
    return $false
}

function Install-Python {
    Write-Host ""
    Write-Host "Checking for Python 3.11+..." -ForegroundColor Yellow
    
    # Check for Python
    $pythonCmd = $null
    foreach ($cmd in @("python", "python3", "py")) {
        try {
            $versionOutput = & $cmd --version 2>&1
            if ($versionOutput -match "Python (\d+)\.(\d+)") {
                $major = [int]$matches[1]
                $minor = [int]$matches[2]
                if ($major -ge 3 -and $minor -ge 11) {
                    $pythonCmd = $cmd
                    Write-Host "[OK] Python $major.$minor detected (using '$cmd')" -ForegroundColor Green
                    return $true
                } else {
                    Write-Host "[INFO] Python $major.$minor found but 3.11+ required" -ForegroundColor Yellow
                }
            }
        } catch { }
    }
    
    Write-Host "Python 3.11+ not found. Installing via winget..." -ForegroundColor Yellow
    
    try {
        winget install Python.Python.3.11 --accept-source-agreements --accept-package-agreements
        if ($LASTEXITCODE -ne 0) {
            throw "winget install failed with exit code $LASTEXITCODE"
        }
        
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        Write-Host "[OK] Python 3.11 installed successfully" -ForegroundColor Green
        Write-Host "[INFO] You may need to restart PowerShell for Python to be available in PATH" -ForegroundColor Yellow
        return $true
    } catch {
        Write-Host "[ERROR] Failed to install Python: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Install-Git {
    Write-Host ""
    Write-Host "Checking for Git..." -ForegroundColor Yellow
    
    $git = Get-Command git -ErrorAction SilentlyContinue
    if ($git) {
        $gitVersion = & git --version
        Write-Host "[OK] $gitVersion" -ForegroundColor Green
        return $true
    }
    
    Write-Host "Git not found. Installing via winget..." -ForegroundColor Yellow
    
    try {
        winget install Git.Git --accept-source-agreements --accept-package-agreements
        if ($LASTEXITCODE -ne 0) {
            throw "winget install failed with exit code $LASTEXITCODE"
        }
        
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        
        Write-Host "[OK] Git installed successfully" -ForegroundColor Green
        Write-Host "[INFO] You may need to restart PowerShell for Git to be available in PATH" -ForegroundColor Yellow
        return $true
    } catch {
        Write-Host "[ERROR] Failed to install Git: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Install-Prerequisites {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Checking Prerequisites" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Step 1: Check/Install winget
    if (-not (Install-Winget)) {
        Write-Host ""
        Write-Host "[ERROR] Cannot proceed without winget" -ForegroundColor Red
        return $false
    }
    
    # Step 2: Check/Install Git
    if (-not (Install-Git)) {
        Write-Host ""
        Write-Host "[ERROR] Cannot proceed without Git" -ForegroundColor Red
        return $false
    }
    
    # Step 3: Check/Install Python
    if (-not (Install-Python)) {
        Write-Host ""
        Write-Host "[ERROR] Cannot proceed without Python 3.11+" -ForegroundColor Red
        return $false
    }
    
    Write-Host ""
    Write-Host "[OK] All prerequisites satisfied" -ForegroundColor Green
    Write-Host ""
    return $true
}

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
    Write-Host ""
    Write-Host "Salesforce Commands:"
    Write-Host "  .\vendor\salesforce\scripts\deploy.ps1 -TargetOrg <alias>  Deploy to Salesforce"
    Write-Host ""
    Write-Host "Dev Server Commands:"
    Write-Host "  .\app\scripts\dev-tools\server.ps1 -Action start    Start dev server"
    Write-Host "  .\app\scripts\dev-tools\server.ps1 -Action stop     Stop dev server"
    Write-Host ""
}

# Main execution
if (-not $SkipPrerequisites) {
    if (-not (Install-Prerequisites)) {
        Write-Host ""
        Write-Host "[ERROR] Prerequisite installation failed. Cannot continue." -ForegroundColor Red
        exit 1
    }
}

# Run setup based on tool parameter
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Installing CLI Tools" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

switch ($Tool) {
    "all" {
        Write-Host "Setting up all vendor CLIs..." -ForegroundColor Green
        Write-Host ""
        
        Write-Host "--- Setting up Workato CLI ---" -ForegroundColor Cyan
        & "$PSScriptRoot\app\scripts\setup\setup-cli.ps1" -Tool workato
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] Workato CLI setup failed" -ForegroundColor Red
            exit 1
        }
        
        Write-Host ""
        Write-Host "--- Setting up Salesforce CLI ---" -ForegroundColor Cyan
        & "$PSScriptRoot\app\scripts\setup\setup-cli.ps1" -Tool salesforce
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] Salesforce CLI setup failed" -ForegroundColor Red
            exit 1
        }
    }
    "workato" {
        Write-Host "Setting up Workato CLI..." -ForegroundColor Green
        & "$PSScriptRoot\app\scripts\setup\setup-cli.ps1" -Tool workato
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] Workato CLI setup failed" -ForegroundColor Red
            exit 1
        }
    }
    "salesforce" {
        Write-Host "Setting up Salesforce CLI..." -ForegroundColor Green
        & "$PSScriptRoot\app\scripts\setup\setup-cli.ps1" -Tool salesforce
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] Salesforce CLI setup failed" -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Show-Help
