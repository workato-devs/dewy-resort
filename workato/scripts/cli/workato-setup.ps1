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
Write-Host ""

# Temporarily allow errors so pip warnings don't terminate the script
$ErrorActionPreference = "Continue"

# Capture output - redirect stderr to stdout to capture warnings
$pipOutput = & $pythonCmd -m pip install --user workato-platform-cli 2>&1 | Out-String

# Restore error handling
$ErrorActionPreference = "Stop"

# Display output
Write-Host $pipOutput

# Check if workato was actually installed (pip warnings about PATH are not failures)
$installSuccess = $false
if ($pipOutput -match "Successfully installed.*workato-platform-cli") {
    $installSuccess = $true
} elseif ($pipOutput -match "Requirement already satisfied.*workato-platform-cli") {
    $installSuccess = $true
}

# Also check if the executable exists
$possibleExePaths = @(
    "$env:APPDATA\Python\Python311\Scripts\workato.exe",
    "$env:APPDATA\Python\Python312\Scripts\workato.exe",
    "$env:APPDATA\Python\Python313\Scripts\workato.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python311\Scripts\workato.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python312\Scripts\workato.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python313\Scripts\workato.exe"
)

foreach ($exePath in $possibleExePaths) {
    if (Test-Path $exePath) {
        $installSuccess = $true
        $workatoExePath = $exePath
        break
    }
}

if (-not $installSuccess) {
    Write-Host ""
    Write-Host "[ERROR] Failed to install workato-platform-cli" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[OK] workato-platform-cli installed" -ForegroundColor Green

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

# Check known locations (both Roaming and Local)
$possiblePaths = @(
    "$env:APPDATA\Python\Python311\Scripts\workato.exe",
    "$env:APPDATA\Python\Python312\Scripts\workato.exe",
    "$env:APPDATA\Python\Python313\Scripts\workato.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python311\Scripts\workato.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python312\Scripts\workato.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python313\Scripts\workato.exe",
    "$env:USERPROFILE\AppData\Roaming\Python\Python311\Scripts\workato.exe",
    "$env:USERPROFILE\AppData\Roaming\Python\Python312\Scripts\workato.exe",
    "$env:USERPROFILE\AppData\Roaming\Python\Python313\Scripts\workato.exe"
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
Write-Host ""
Write-Host "Verifying installation..."

# Try to find workato executable
$workatoExe = $null

# Check if already found during install
if ($workatoExePath -and (Test-Path $workatoExePath)) {
    $workatoExe = $workatoExePath
}

# Otherwise search common locations
if (-not $workatoExe) {
    $searchPaths = @(
        "$env:APPDATA\Python\Python311\Scripts\workato.exe",
        "$env:APPDATA\Python\Python312\Scripts\workato.exe",
        "$env:APPDATA\Python\Python313\Scripts\workato.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\Scripts\workato.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python312\Scripts\workato.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python313\Scripts\workato.exe",
        "$env:USERPROFILE\AppData\Roaming\Python\Python311\Scripts\workato.exe",
        "$env:USERPROFILE\AppData\Roaming\Python\Python312\Scripts\workato.exe",
        "$env:USERPROFILE\AppData\Roaming\Python\Python313\Scripts\workato.exe"
    )
    
    foreach ($path in $searchPaths) {
        if (Test-Path $path) {
            $workatoExe = $path
            break
        }
    }
}

# Also check PATH
if (-not $workatoExe) {
    $pathCmd = Get-Command workato -ErrorAction SilentlyContinue
    if ($pathCmd) {
        $workatoExe = $pathCmd.Source
    }
}

if ($workatoExe) {
    try {
        $version = & $workatoExe --version 2>&1
        Write-Host "[OK] Workato CLI successfully installed!" -ForegroundColor Green
        Write-Host ""
        Write-Host $version
        Write-Host ""
        Write-Host "Executable location: $workatoExe"
        Write-Host ""
        Write-Host "You can now use the CLI via:"
        Write-Host "  .\bin\workato.ps1 <command>"
        Write-Host ""
        Write-Host "To authenticate, set your API key in app\.env or run:"
        Write-Host "  .\bin\workato.ps1 login"
        exit 0
    } catch {
        Write-Host "[WARN] Installation completed but verification failed" -ForegroundColor Yellow
        Write-Host "Executable found at: $workatoExe"
        Write-Host "You may need to restart PowerShell for the PATH to update."
        exit 0
    }
} else {
    Write-Host "[WARN] Installation completed but workato.exe not found" -ForegroundColor Yellow
    Write-Host "You may need to restart PowerShell for the PATH to update."
    Write-Host ""
    Write-Host "After restarting, verify with: .\bin\workato.ps1 --version"
    exit 0
}
