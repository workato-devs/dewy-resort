# Salesforce CLI Setup for Windows
$ErrorActionPreference = "Stop"

Write-Host "Salesforce CLI Setup" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan
Write-Host ""

# Detect architecture
$arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
Write-Host "Detected platform: Windows $arch"
Write-Host ""

# Determine download URL
$sfInstallDir = "tools\sf-cli"
$downloadUrl = "https://developer.salesforce.com/media/salesforce-cli/sf/channels/stable/sf-win32-$arch.tar.xz"

# Check for required tools
Write-Host "Checking for required tools..."

# Check if tar is available (Windows 10 1803+ has built-in tar)
$tarAvailable = Get-Command tar -ErrorAction SilentlyContinue
if (-not $tarAvailable) {
    Write-Host "[ERROR] tar is not available. Windows 10 version 1803 or later is required." -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative installation methods:" -ForegroundColor Yellow
    Write-Host "  Option 1: Using npm (recommended)"
    Write-Host "    npm install --global @salesforce/cli"
    Write-Host ""
    Write-Host "  Option 2: Using Windows installer"
    Write-Host "    Download from: https://developer.salesforce.com/tools/salesforcecli"
    exit 1
}

Write-Host "[OK] Required tools available" -ForegroundColor Green
Write-Host ""

# Create tools directory
New-Item -ItemType Directory -Force -Path "tools" | Out-Null

# Remove existing installation if present
if (Test-Path $sfInstallDir) {
    Write-Host "Removing existing Salesforce CLI installation..."
    Remove-Item -Recurse -Force $sfInstallDir
}

# Download and extract Salesforce CLI
Write-Host "Downloading Salesforce CLI from:"
Write-Host "  $downloadUrl"
Write-Host ""
Write-Host "This may take a few minutes..."

$tempDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
$downloadFile = Join-Path $tempDir "sf-cli.tar.xz"

try {
    # Download the file
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $downloadUrl -OutFile $downloadFile -UseBasicParsing
    Write-Host "[OK] Download complete" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Download failed: $($_.Exception.Message)" -ForegroundColor Red
    Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
    exit 1
}

Write-Host ""
Write-Host "Extracting Salesforce CLI to $sfInstallDir..."
New-Item -ItemType Directory -Force -Path $sfInstallDir | Out-Null

# Extract using tar (handles .tar.xz on Windows 10+)
Push-Location $sfInstallDir
try {
    tar -xf $downloadFile --strip-components=1
} finally {
    Pop-Location
}

# Clean up temp files
Remove-Item -Recurse -Force $tempDir

Write-Host "[OK] Salesforce CLI extracted" -ForegroundColor Green
Write-Host ""

# Create bin directory
New-Item -ItemType Directory -Force -Path "bin" | Out-Null

# Create wrapper script
Write-Host "Creating wrapper script at bin\sf.ps1..."

$wrapperContent = @'
# Salesforce CLI wrapper script
# This script executes the Salesforce CLI from the isolated installation

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$SfCli = Join-Path $ProjectRoot "tools\sf-cli\bin\sf.cmd"

if (-not (Test-Path $SfCli)) {
    Write-Host "[ERROR] Salesforce CLI installation not found." -ForegroundColor Red
    Write-Host "Please run '.\setup-cli.ps1 -Tool salesforce' to install the Salesforce CLI."
    exit 1
}

# Execute sf CLI with all arguments
& $SfCli @args
exit $LASTEXITCODE
'@

$wrapperContent | Out-File -FilePath "bin\sf.ps1" -Encoding UTF8

# Also create a batch file wrapper for cmd.exe compatibility
$batchContent = @"
@echo off
powershell -ExecutionPolicy Bypass -File "%~dp0sf.ps1" %*
"@
$batchContent | Out-File -FilePath "bin\sf.cmd" -Encoding ASCII

Write-Host "[OK] Wrapper scripts created" -ForegroundColor Green
Write-Host ""

# Verify installation
Write-Host "Verifying installation..."
try {
    $version = & "bin\sf.ps1" --version 2>&1
    Write-Host "[OK] Salesforce CLI successfully installed!" -ForegroundColor Green
    Write-Host ""
    Write-Host $version
    Write-Host ""
    Write-Host "You can now use the CLI via:"
    Write-Host "  - .\bin\sf.ps1 <command>"
    Write-Host "  - bin\sf <command> (from cmd.exe)"
    Write-Host ""
    Write-Host "To authenticate to a Salesforce org:"
    Write-Host "  .\bin\sf.ps1 org login web --alias myDevOrg"
    Write-Host ""
    Write-Host "To list authenticated orgs:"
    Write-Host "  .\bin\sf.ps1 org list"
    Write-Host ""
} catch {
    Write-Host "[ERROR] Installation verification failed" -ForegroundColor Red
    exit 1
}
