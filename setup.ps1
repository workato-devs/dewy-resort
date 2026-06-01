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

function Check-WkCli {
    Write-Host ""
    Write-Host "Checking for wk CLI..." -ForegroundColor Yellow

    if (Get-Command wk -ErrorAction SilentlyContinue) {
        $version = & wk version 2>$null
        Write-Host "[OK] wk CLI available: $version" -ForegroundColor Green
        return $true
    }

    Write-Host "wk CLI not found." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Install it:" -ForegroundColor Yellow
    Write-Host "  scoop install wk"
    Write-Host ""
    Write-Host "Then authenticate:" -ForegroundColor Yellow
    Write-Host "  wk auth login"
    return $false
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

function Install-Make {
    Write-Host ""
    Write-Host "Checking for make..." -ForegroundColor Yellow
    
    $makeCmd = Get-Command make -ErrorAction SilentlyContinue
    if ($makeCmd) {
        $makeVersion = & make --version 2>&1 | Select-Object -First 1
        Write-Host "[OK] $makeVersion" -ForegroundColor Green
        return $true
    }
    
    Write-Host "make not found. Installing via winget..." -ForegroundColor Yellow
    
    try {
        winget install -e --id GnuWin32.Make --accept-source-agreements --accept-package-agreements
        if ($LASTEXITCODE -ne 0) {
            throw "winget install failed with exit code $LASTEXITCODE"
        }
        
        # GnuWin32 Make installs to C:\Program Files (x86)\GnuWin32\bin
        $makePath = "${env:ProgramFiles(x86)}\GnuWin32\bin"
        
        # Refresh PATH from registry
        $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
        
        # Check if make is now available
        $makeCmd = Get-Command make -ErrorAction SilentlyContinue
        if (-not $makeCmd) {
            # Add GnuWin32 to PATH if not already there
            if (Test-Path $makePath) {
                Write-Host "Adding GnuWin32 to system PATH..." -ForegroundColor Yellow
                
                $currentMachinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
                if ($currentMachinePath -notlike "*$makePath*") {
                    # Need admin to modify machine PATH
                    if (Test-Administrator) {
                        $newPath = "$currentMachinePath;$makePath"
                        [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
                        $env:Path = "$env:Path;$makePath"
                        Write-Host "[OK] Added $makePath to system PATH" -ForegroundColor Green
                    } else {
                        # Try user PATH instead
                        $currentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
                        $newUserPath = "$currentUserPath;$makePath"
                        [Environment]::SetEnvironmentVariable("Path", $newUserPath, "User")
                        $env:Path = "$env:Path;$makePath"
                        Write-Host "[OK] Added $makePath to user PATH" -ForegroundColor Green
                    }
                }
            }
        }
        
        # Verify
        $makeCmd = Get-Command make -ErrorAction SilentlyContinue
        if ($makeCmd) {
            Write-Host "[OK] make installed successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "[WARN] make installed but not in PATH yet" -ForegroundColor Yellow
            Write-Host "[INFO] You may need to restart PowerShell for make to be available" -ForegroundColor Yellow
            return $true
        }
    } catch {
        Write-Host "[ERROR] Failed to install make: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Alternative: Install Chocolatey and run: choco install make" -ForegroundColor Yellow
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
        
        # Node.js installs to Program Files by default - add explicitly if not in PATH
        $nodePaths = @(
            "$env:ProgramFiles\nodejs",
            "${env:ProgramFiles(x86)}\nodejs",
            "$env:LOCALAPPDATA\Programs\nodejs"
        )
        foreach ($nodePath in $nodePaths) {
            if ((Test-Path $nodePath) -and ($env:Path -notlike "*$nodePath*")) {
                $env:Path = "$env:Path;$nodePath"
                Write-Host "[INFO] Added $nodePath to current session PATH" -ForegroundColor Yellow
            }
        }
        
        # Verify installation
        $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
        if ($nodeCmd) {
            $versionOutput = & node --version 2>&1
            Write-Host "[OK] Node.js $versionOutput installed successfully" -ForegroundColor Green
            
            $npmVersion = & npm --version 2>&1
            Write-Host "[OK] npm v$npmVersion available" -ForegroundColor Green
        } else {
            # Still not found - provide manual path info
            Write-Host "[WARN] Node.js installed but not found in PATH" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Please restart PowerShell and run setup.ps1 again." -ForegroundColor Yellow
            Write-Host "Or manually add Node.js to your PATH:" -ForegroundColor Yellow
            foreach ($nodePath in $nodePaths) {
                if (Test-Path $nodePath) {
                    Write-Host "  $nodePath" -ForegroundColor Cyan
                }
            }
            Write-Host ""
            return $false
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
    
    # Step 3: Check/Install make
    if (-not (Install-Make)) {
        Write-Host ""
        Write-Host "[WARN] make installation failed, some workshop commands may not work" -ForegroundColor Yellow
        # Don't fail - make is optional for basic setup
    }
    
    # Step 4: Check wk CLI
    if (-not (Check-WkCli)) {
        Write-Host "[WARN] wk CLI not found. Workato setup will require it." -ForegroundColor Yellow
    }

    # Step 5: Check/Install Node.js v20
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
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  1. wk auth login                    # Authenticate with Workato"
    Write-Host "  2. make workato-init                # Initialize wk project"
    Write-Host "  3. make start-recipes               # Start all recipes"
    Write-Host "  4. cd app; cp .env.example .env     # Configure app"
    Write-Host "  5. npm install; npm run dev          # Start dev server"
    Write-Host ""
    Write-Host "Other commands:" -ForegroundColor Cyan
    Write-Host "  make help                           # Show all available commands"
    Write-Host "  make sf-deploy org=<alias>          # Deploy Salesforce metadata"
    Write-Host "  make doctor                         # Verify CLI installations"
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
