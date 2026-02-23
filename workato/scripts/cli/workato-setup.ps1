# Workato CLI Setup for Windows
$ErrorActionPreference = "Stop"

Write-Host "Workato CLI Setup" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host ""

# Check Python version (require 3.11+)
Write-Host "Checking Python version..."
$pythonCmd = $null
$pythonVersion = $null

foreach ($cmd in @("python", "python3", "py")) {
    try {
        $versionOutput = & $cmd --version 2>&1
        if ($versionOutput -match "Python (\d+)\.(\d+)") {
            $major = [int]$matches[1]
            $minor = [int]$matches[2]
            if ($major -ge 3 -and $minor -ge 11) {
                $pythonCmd = $cmd
                $pythonVersion = "$major.$minor"
                break
            }
        }
    } catch { }
}

if (-not $pythonCmd) {
    Write-Host "[ERROR] Python 3.11 or higher is required but not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Python 3.11+ using one of these methods:" -ForegroundColor Yellow
    Write-Host "  winget install Python.Python.3.11"
    Write-Host "  Or download from: https://www.python.org/downloads/"
    Write-Host ""
    Write-Host "After installing, restart PowerShell and run setup again."
    exit 1
}

Write-Host "[OK] Python $pythonVersion detected (using '$pythonCmd')" -ForegroundColor Green
Write-Host ""

# Install workato-platform-cli using pip
Write-Host "Installing workato-platform-cli using pip..."
try {
    & $pythonCmd -m pip install --user workato-platform-cli 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "pip install failed with exit code $LASTEXITCODE"
    }
    Write-Host "[OK] workato-platform-cli installed" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to install workato-platform-cli: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Create bin directory
if (-not (Test-Path "bin")) {
    New-Item -ItemType Directory -Path "bin" | Out-Null
}

# Create wrapper script
Write-Host "Creating wrapper script at bin\workato.ps1..."

$wrapperContent = @'
# Workato CLI wrapper script
$ErrorActionPreference = "Stop"

# Try to find workato in PATH first
$workatoCmd = Get-Command workato -ErrorAction SilentlyContinue
if ($workatoCmd) {
    & workato @args
    exit $LASTEXITCODE
}

# Check known locations
$possiblePaths = @(
    "$env:APPDATA\Python\Scripts\workato.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python311\Scripts\workato.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python312\Scripts\workato.exe",
    "$env:USERPROFILE\.local\bin\workato.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        & $path @args
        exit $LASTEXITCODE
    }
}

Write-Host "[ERROR] Workato CLI not found." -ForegroundColor Red
Write-Host "Please run '.\setup.ps1 -Tool workato' to install."
exit 1
'@

$wrapperContent | Out-File -FilePath "bin\workato.ps1" -Encoding UTF8

# Also create a batch file wrapper for cmd.exe compatibility
$batchContent = @"
@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0workato.ps1" %*
"@
$batchContent | Out-File -FilePath "bin\workato.cmd" -Encoding ASCII

Write-Host "[OK] Wrapper scripts created" -ForegroundColor Green
Write-Host ""

# Verify installation
Write-Host "Verifying installation..."

# Try to find workato executable
$workatoExe = Get-Command workato -ErrorAction SilentlyContinue
if (-not $workatoExe) {
    # Check common pip install locations
    $possiblePaths = @(
        "$env:APPDATA\Python\Scripts\workato.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\Scripts\workato.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python312\Scripts\workato.exe"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $workatoExe = $path
            break
        }
    }
}

if ($workatoExe) {
    try {
        if ($workatoExe -is [System.Management.Automation.CommandInfo]) {
            $version = & workato --version 2>&1
        } else {
            $version = & $workatoExe --version 2>&1
        }
        Write-Host "[OK] Workato CLI successfully installed!" -ForegroundColor Green
        Write-Host ""
        Write-Host $version
        Write-Host ""
        Write-Host "You can now use the CLI via:"
        Write-Host "  .\bin\workato.ps1 <command>"
        Write-Host ""
        Write-Host "To authenticate, set your API key in app\.env or run:"
        Write-Host "  .\bin\workato.ps1 login"
        exit 0
    } catch {
        Write-Host "[WARN] Installation completed but verification failed" -ForegroundColor Yellow
        Write-Host "You may need to restart PowerShell for the PATH to update."
        exit 0
    }
} else {
    Write-Host "[WARN] Installation completed but workato not found in PATH" -ForegroundColor Yellow
    Write-Host "You may need to restart PowerShell for the PATH to update."
    Write-Host ""
    Write-Host "After restarting, verify with: .\bin\workato.ps1 --version"
    exit 0
}
