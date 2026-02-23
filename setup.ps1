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

function Get-PythonScriptsPath {
    # Find Python Scripts directory - check both Roaming and Local
    $possiblePaths = @(
        "$env:APPDATA\Python\Python313\Scripts",
        "$env:APPDATA\Python\Python312\Scripts",
        "$env:APPDATA\Python\Python311\Scripts",
        "$env:LOCALAPPDATA\Programs\Python\Python313\Scripts",
        "$env:LOCALAPPDATA\Programs\Python\Python312\Scripts",
        "$env:LOCALAPPDATA\Programs\Python\Python311\Scripts",
        "$env:USERPROFILE\AppData\Roaming\Python\Python313\Scripts",
        "$env:USERPROFILE\AppData\Roaming\Python\Python312\Scripts",
        "$env:USERPROFILE\AppData\Roaming\Python\Python311\Scripts",
        "$env:USERPROFILE\AppData\Local\Programs\Python\Python311\Scripts"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            return $path
        }
    }
    return $null
}

function Test-PathContains {
    param([string]$Directory)
    
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $fullPath = "$machinePath;$currentPath"
    
    return $fullPath -split ';' | Where-Object { $_ -eq $Directory }
}

function Add-ToUserPath {
    param([string]$Directory)
    
    Write-Host "Adding to user PATH: $Directory" -ForegroundColor Yellow
    
    try {
        $currentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
        if ($currentUserPath) {
            $newPath = "$currentUserPath;$Directory"
        } else {
            $newPath = $Directory
        }
        
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        
        # Also update current session
        $env:Path = "$env:Path;$Directory"
        
        Write-Host "[OK] Added to user PATH" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "[ERROR] Failed to update user PATH: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Add-ToMachinePath {
    param([string]$Directory)
    
    # This requires elevation - spawn a new elevated process
    Write-Host "Adding to system PATH requires Administrator privileges..." -ForegroundColor Yellow
    
    $scriptBlock = @"
        `$currentPath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
        `$newPath = "`$currentPath;$Directory"
        [Environment]::SetEnvironmentVariable('Path', `$newPath, 'Machine')
        Write-Host '[OK] Added to system PATH' -ForegroundColor Green
"@
    
    try {
        Start-Process powershell -Verb RunAs -ArgumentList "-Command", $scriptBlock -Wait
        
        # Refresh current session PATH
        $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
        
        return $true
    } catch {
        Write-Host "[ERROR] Failed to elevate privileges: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Ensure-PythonInPath {
    $scriptsPath = Get-PythonScriptsPath
    
    if (-not $scriptsPath) {
        Write-Host "[WARN] Could not find Python Scripts directory" -ForegroundColor Yellow
        return $true  # Continue anyway, might work
    }
    
    if (Test-PathContains -Directory $scriptsPath) {
        Write-Host "[OK] Python Scripts directory already in PATH" -ForegroundColor Green
        return $true
    }
    
    Write-Host ""
    Write-Host "Python Scripts directory not in PATH: $scriptsPath" -ForegroundColor Yellow
    Write-Host ""
    
    # Try user PATH first (no admin required)
    if (Add-ToUserPath -Directory $scriptsPath) {
        return $true
    }
    
    # If user PATH failed, offer to try machine PATH (requires admin)
    Write-Host ""
    $reply = Read-Host "Try adding to system PATH? (requires Administrator) [y/N]"
    if ($reply -match '^[Yy]$') {
        return Add-ToMachinePath -Directory $scriptsPath
    }
    
    Write-Host "[WARN] Python Scripts not in PATH. You may need to add it manually:" -ForegroundColor Yellow
    Write-Host "  $scriptsPath" -ForegroundColor Yellow
    return $true  # Continue anyway
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
                    
                    # Ensure Scripts directory is in PATH
                    Ensure-PythonInPath | Out-Null
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
        
        # Refresh PATH from registry
        $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
        
        Write-Host "[OK] Python 3.11 installed successfully" -ForegroundColor Green
        
        # Ensure Scripts directory is in PATH
        if (-not (Ensure-PythonInPath)) {
            Write-Host "[WARN] Could not add Python Scripts to PATH automatically" -ForegroundColor Yellow
            Write-Host "You may need to restart PowerShell or add it manually" -ForegroundColor Yellow
        }
        
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

function Install-NodeJS {
    Write-Host ""
    Write-Host "Checking for Node.js v20..." -ForegroundColor Yellow
    
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCmd) {
        try {
            $versionOutput = & node --version 2>&1
            if ($versionOutput -match "v(\d+)\.(\d+)") {
                $major = [int]$matches[1]
                $minor = [int]$matches[2]
                
                if ($major -eq 20) {
                    Write-Host "[OK] Node.js v$major.$minor detected" -ForegroundColor Green
                    
                    # Also verify npm is available
                    $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
                    if ($npmCmd) {
                        $npmVersion = & npm --version 2>&1
                        Write-Host "[OK] npm v$npmVersion detected" -ForegroundColor Green
                    }
                    return $true
                } elseif ($major -gt 20) {
                    Write-Host "[WARN] Node.js v$major.$minor detected, but v20.x is required" -ForegroundColor Yellow
                    Write-Host "[INFO] Some features may not work correctly with newer versions" -ForegroundColor Yellow
                    Write-Host ""
                    $reply = Read-Host "Install Node.js v20 alongside existing version? [y/N]"
                    if ($reply -notmatch '^[Yy]') {
                        Write-Host "[WARN] Continuing with Node.js v$major (not recommended)" -ForegroundColor Yellow
                        return $true
                    }
                } else {
                    Write-Host "[INFO] Node.js v$major.$minor found but v20.x required" -ForegroundColor Yellow
                }
            }
        } catch {
            Write-Host "[WARN] Could not determine Node.js version" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Node.js not found." -ForegroundColor Yellow
    }
    
    Write-Host "Installing Node.js v20 LTS via winget..." -ForegroundColor Yellow
    
    try {
        # Install Node.js 20 LTS specifically
        winget install OpenJS.NodeJS.LTS --version "20.19.2" --accept-source-agreements --accept-package-agreements
        if ($LASTEXITCODE -ne 0) {
            # Try without specific version if exact version not available
            Write-Host "[INFO] Specific version not available, trying latest v20 LTS..." -ForegroundColor Yellow
            winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
            if ($LASTEXITCODE -ne 0) {
                throw "winget install failed with exit code $LASTEXITCODE"
            }
        }
        
        # Refresh PATH from registry
        $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
        
        # Verify installation
        $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
        if ($nodeCmd) {
            $versionOutput = & node --version 2>&1
            Write-Host "[OK] Node.js $versionOutput installed successfully" -ForegroundColor Green
            
            $npmVersion = & npm --version 2>&1
            Write-Host "[OK] npm v$npmVersion available" -ForegroundColor Green
        } else {
            Write-Host "[WARN] Node.js installed but not in PATH yet" -ForegroundColor Yellow
            Write-Host "[INFO] You may need to restart PowerShell for Node.js to be available" -ForegroundColor Yellow
        }
        
        return $true
    } catch {
        Write-Host "[ERROR] Failed to install Node.js: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Alternative installation methods:" -ForegroundColor Yellow
        Write-Host "  1. Download from: https://nodejs.org/en/download/ (choose v20 LTS)"
        Write-Host "  2. Using nvm-windows: https://github.com/coreybutler/nvm-windows"
        Write-Host ""
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
    
    # Step 4: Check/Install Node.js v20
    if (-not (Install-NodeJS)) {
        Write-Host ""
        Write-Host "[ERROR] Cannot proceed without Node.js v20" -ForegroundColor Red
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
