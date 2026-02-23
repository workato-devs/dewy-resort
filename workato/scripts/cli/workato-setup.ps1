# Workato CLI Setup for Windows
$ErrorActionPreference = "Stop"

Write-Host "Workato CLI Setup" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host ""

# Check Python version
Write-Host "Checking Python version..."
$pythonCmd = $null
foreach ($cmd in @("python", "python3", "py")) {
    try {
        $version = & $cmd --version 2>&1
        if ($version -match "Python (\d+\.\d+)") {
            $pythonCmd = $cmd
            break
        }
    } catch { }
}

if (-not $pythonCmd) {
    Write-Host "[ERROR] Python 3 is not installed. Please install Python 3.8 or higher." -ForegroundColor Red
    exit 1
}

$pythonVersion = & $pythonCmd -c "import sys; print('.'.join(map(str, sys.version_info[:2])))"
$requiredVersion = [version]"3.8"
$currentVersion = [version]$pythonVersion

if ($currentVersion -lt $requiredVersion) {
    Write-Host "[ERROR] Python $pythonVersion found, but Python 3.8 or higher is required." -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Python $pythonVersion detected" -ForegroundColor Green
Write-Host ""

# Install workato-platform-cli using pip
Write-Host "Installing workato-platform-cli using pip..."
& $pythonCmd -m pip install --user workato-platform-cli

Write-Host "[OK] workato-platform-cli installed" -ForegroundColor Green
Write-Host ""

# Find the workato executable
$workatoPath = $null
$possiblePaths = @(
    "$env:APPDATA\Python\Python$($pythonVersion -replace '\.', '')\Scripts\workato.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python$($pythonVersion -replace '\.', '')\Scripts\workato.exe",
    "$env:USERPROFILE\.local\bin\workato.exe",
    "$env:USERPROFILE\AppData\Roaming\Python\Scripts\workato.exe"
)

# Also check PATH
$pathWorkato = Get-Command workato -ErrorAction SilentlyContinue
if ($pathWorkato) {
    $workatoPath = $pathWorkato.Source
} else {
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $workatoPath = $path
            break
        }
    }
}

if (-not $workatoPath) {
    # Try to find it using pip show
    $pipShow = & $pythonCmd -m pip show workato-platform-cli 2>&1
    if ($pipShow -match "Location: (.+)") {
        $location = $matches[1].Trim()
        $scriptsPath = Join-Path (Split-Path $location -Parent) "Scripts\workato.exe"
        if (Test-Path $scriptsPath) {
            $workatoPath = $scriptsPath
        }
    }
}

# Create bin directory
$binDir = "bin"
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

# Create wrapper script
Write-Host "Creating wrapper script at bin\workato.ps1..."

$wrapperContent = @'
# Workato CLI wrapper script (pip installation)
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
    "$env:LOCALAPPDATA\Programs\Python\Scripts\workato.exe",
    "$env:USERPROFILE\.local\bin\workato.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        & $path @args
        exit $LASTEXITCODE
    }
}

Write-Host "[ERROR] Workato CLI not found." -ForegroundColor Red
Write-Host "Please run '.\setup-cli.ps1 -Tool workato' to install the Workato CLI."
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
try {
    $version = & "bin\workato.ps1" --version 2>&1
    Write-Host "[OK] Workato CLI successfully installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host $version
    Write-Host ""
    Write-Host "You can now use the CLI via:"
    Write-Host "  - .\bin\workato.ps1 <command>"
    Write-Host "  - bin\workato <command> (from cmd.exe)"
    Write-Host ""
    Write-Host "To authenticate, set your API key in .env or run:"
    Write-Host "  .\bin\workato.ps1 login"
} catch {
    Write-Host "[ERROR] Installation verification failed" -ForegroundColor Red
    Write-Host "You may need to add Python Scripts to your PATH"
    exit 1
}
