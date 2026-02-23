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
if (-not (Test-Path "tools")) {
    New-Item -ItemType Directory -Path "tools" | Out-Null
}

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

# Create temp directory
$tempDir = Join-Path $env:TEMP "sf-cli-install-$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
$downloadFile = Join-Path $tempDir "sf-cli.tar.xz"

try {
    # Download the file
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $downloadUrl -OutFile $downloadFile -UseBasicParsing
    
    if (-not (Test-Path $downloadFile)) {
        throw "Download file not created"
    }
    
    Write-Host "[OK] Download complete" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Download failed: $($_.Exception.Message)" -ForegroundColor Red
    Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
    exit 1
}

Write-Host ""
Write-Host "Extracting Salesforce CLI to $sfInstallDir..."

# Create the install directory
New-Item -ItemType Directory -Path $sfInstallDir -Force | Out-Null

# Get absolute paths for tar (avoid path issues)
$absoluteDownloadFile = Resolve-Path $downloadFile | Select-Object -ExpandProperty Path
$absoluteInstallDir = Resolve-Path $sfInstallDir | Select-Object -ExpandProperty Path

# Extract using tar
try {
    # Change to install directory and extract
    Push-Location $absoluteInstallDir
    try {
        # Use forward slashes for tar compatibility
        $tarFile = $absoluteDownloadFile -replace '\\', '/'
        & tar -xf $tarFile --strip-components=1 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "tar extraction failed with exit code $LASTEXITCODE"
        }
    } finally {
        Pop-Location
    }
    Write-Host "[OK] Salesforce CLI extracted" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Extraction failed: $($_.Exception.Message)" -ForegroundColor Red
    Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
    exit 1
}

# Clean up temp files
Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue

Write-Host ""

# Create bin directory
if (-not (Test-Path "bin")) {
    New-Item -ItemType Directory -Path "bin" | Out-Null
}

# Create wrapper script
Write-Host "Creating wrapper script at bin\sf.ps1..."

$wrapperContent = @'
# Salesforce CLI wrapper script
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$SfCli = Join-Path $ProjectRoot "tools\sf-cli\bin\sf.cmd"

if (-not (Test-Path $SfCli)) {
    Write-Host "[ERROR] Salesforce CLI installation not found." -ForegroundColor Red
    Write-Host "Please run '.\setup.ps1 -Tool salesforce' to install."
    exit 1
}

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
$sfExe = Join-Path $sfInstallDir "bin\sf.cmd"
if (Test-Path $sfExe) {
    try {
        $version = & $sfExe --version 2>&1
        Write-Host "[OK] Salesforce CLI successfully installed!" -ForegroundColor Green
        Write-Host ""
        Write-Host $version
        Write-Host ""
        Write-Host "You can now use the CLI via:"
        Write-Host "  .\bin\sf.ps1 <command>"
        Write-Host ""
        Write-Host "To authenticate to a Salesforce org:"
        Write-Host "  .\bin\sf.ps1 org login web --alias myDevOrg"
        Write-Host ""
        exit 0
    } catch {
        Write-Host "[ERROR] Installation verification failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[ERROR] sf.cmd not found at expected location: $sfExe" -ForegroundColor Red
    exit 1
}
