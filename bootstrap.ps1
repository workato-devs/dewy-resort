# Dewy Resort Workshop - Windows Bootstrap Script
# 
# This script can be run standalone to set up the entire workshop environment.
# It installs prerequisites, clones the repo, and runs setup.
#
# Usage (run in PowerShell):
#   iwr -useb https://raw.githubusercontent.com/workato-devs/dewy-resort/main/bootstrap.ps1 | iex
#
# Or download and run:
#   .\bootstrap.ps1
#   .\bootstrap.ps1 -RepoUrl "https://github.com/your-fork/dewy-resort.git"
#   .\bootstrap.ps1 -Branch "feature-branch"
#   .\bootstrap.ps1 -TargetDir "C:\Projects\dewy-resort"

param(
    [string]$RepoUrl = "https://github.com/workato-devs/dewy-resort.git",
    [string]$Branch = "feature/windows-powershell-scripts",
    [string]$TargetDir = ""
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Dewy Resort Workshop Bootstrap" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
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
    
    if (-not (Test-Administrator)) {
        Write-Host "[ERROR] Administrator privileges required to install winget" -ForegroundColor Red
        Write-Host "Please either:"
        Write-Host "  1. Run PowerShell as Administrator and try again"
        Write-Host "  2. Install winget manually from: https://aka.ms/getwinget"
        return $false
    }
    
    try {
        $progressPreference = 'SilentlyContinue'
        $installerPath = "$env:TEMP\Microsoft.DesktopAppInstaller.msixbundle"
        
        Write-Host "Downloading winget installer..."
        Invoke-WebRequest -Uri "https://aka.ms/getwinget" -OutFile $installerPath -UseBasicParsing
        
        Write-Host "Installing winget..."
        Add-AppxPackage -Path $installerPath
        
        Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
        
        # Refresh PATH
        $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
        
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
        $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
        
        # Git installs to a known location, add it explicitly if not in PATH
        $gitPaths = @(
            "$env:ProgramFiles\Git\cmd",
            "${env:ProgramFiles(x86)}\Git\cmd"
        )
        foreach ($gitPath in $gitPaths) {
            if ((Test-Path $gitPath) -and ($env:Path -notlike "*$gitPath*")) {
                $env:Path = "$env:Path;$gitPath"
            }
        }
        
        $git = Get-Command git -ErrorAction SilentlyContinue
        if ($git) {
            Write-Host "[OK] Git installed successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "[WARN] Git installed but not in PATH. Restart PowerShell after setup." -ForegroundColor Yellow
            return $true
        }
    } catch {
        Write-Host "[ERROR] Failed to install Git: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Clone-Repository {
    param(
        [string]$Url,
        [string]$BranchName,
        [string]$Target
    )
    
    Write-Host ""
    Write-Host "Cloning repository..." -ForegroundColor Yellow
    Write-Host "  URL: $Url"
    Write-Host "  Branch: $BranchName"
    Write-Host "  Target: $Target"
    Write-Host ""
    
    # Check if target directory already exists
    if (Test-Path $Target) {
        Write-Host "[WARN] Directory already exists: $Target" -ForegroundColor Yellow
        $reply = Read-Host "Delete and re-clone? [y/N]"
        if ($reply -match '^[Yy]$') {
            Remove-Item -Recurse -Force $Target
        } else {
            Write-Host "Using existing directory"
            return $Target
        }
    }
    
    try {
        Write-Host "Running: git clone --branch $BranchName $Url $Target" -ForegroundColor Gray
        & git clone --branch $BranchName $Url $Target
        if ($LASTEXITCODE -ne 0) {
            throw "git clone failed with exit code $LASTEXITCODE"
        }
        Write-Host "[OK] Repository cloned successfully" -ForegroundColor Green
        return $Target
    } catch {
        Write-Host "[ERROR] Failed to clone repository: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Main execution
Write-Host "This script will:" -ForegroundColor Cyan
Write-Host "  1. Install winget (if needed)"
Write-Host "  2. Install Git (if needed)"
Write-Host "  3. Clone the Dewy Resort repository"
Write-Host "  4. Run the full setup (Python, Workato CLI, Salesforce CLI)"
Write-Host ""

$reply = Read-Host "Continue? [Y/n]"
if ($reply -match '^[Nn]$') {
    Write-Host "Aborted."
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Step 1: Prerequisites" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Install winget
if (-not (Install-Winget)) {
    Write-Host ""
    Write-Host "[ERROR] Cannot proceed without winget" -ForegroundColor Red
    exit 1
}

# Install Git
if (-not (Install-Git)) {
    Write-Host ""
    Write-Host "[ERROR] Cannot proceed without Git" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Step 2: Clone Repository" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Determine target directory
if (-not $TargetDir) {
    $TargetDir = Join-Path (Get-Location) "dewy-resort"
}

$clonedPath = Clone-Repository -Url $RepoUrl -BranchName $Branch -Target $TargetDir

if (-not $clonedPath) {
    Write-Host ""
    Write-Host "[ERROR] Failed to clone repository" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Step 3: Run Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to the cloned directory and run setup
Set-Location $clonedPath
Write-Host "Changed directory to: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

$setupScript = Join-Path $clonedPath "setup.ps1"
if (-not (Test-Path $setupScript)) {
    Write-Host "[ERROR] setup.ps1 not found at: $setupScript" -ForegroundColor Red
    exit 1
}

Write-Host "Running setup.ps1..." -ForegroundColor Yellow
Write-Host ""

& $setupScript

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Setup failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Bootstrap Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "The Dewy Resort workshop is ready at:"
Write-Host "  $clonedPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host "  cd `"$clonedPath`""
Write-Host "  cd app"
Write-Host "  Copy-Item .env.example .env"
Write-Host "  # Edit .env with your configuration"
Write-Host "  npm install"
Write-Host "  npm run dev"
Write-Host ""
