# Salesforce CLI Setup for Windows
$ErrorActionPreference = "Stop"

Write-Host "Salesforce CLI Setup" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan
Write-Host ""

# Detect architecture
$arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
Write-Host "Detected platform: Windows $arch"
Write-Host ""

# Check for npm (preferred installation method on Windows)
$npmAvailable = Get-Command npm -ErrorAction SilentlyContinue

if ($npmAvailable) {
    Write-Host "Installing Salesforce CLI via npm (recommended for Windows)..."
    Write-Host ""
    
    try {
        # Install globally via npm
        $ErrorActionPreference = "Continue"
        $output = & npm install --global @salesforce/cli 2>&1
        $exitCode = $LASTEXITCODE
        $ErrorActionPreference = "Stop"
        
        # Check for success
        if ($exitCode -eq 0) {
            Write-Host "[OK] Salesforce CLI installed via npm" -ForegroundColor Green
            Write-Host ""
            
            # Verify installation
            $sfCmd = Get-Command sf -ErrorAction SilentlyContinue
            if ($sfCmd) {
                $version = & sf --version 2>&1
                Write-Host "[OK] Salesforce CLI successfully installed!" -ForegroundColor Green
                Write-Host ""
                Write-Host $version
                Write-Host ""
                Write-Host "You can now use the CLI via:"
                Write-Host "  sf <command>"
                Write-Host ""
                Write-Host "To authenticate to a Salesforce org:"
                Write-Host "  sf org login web --alias myDevOrg"
                Write-Host ""
                exit 0
            }
        }
        
        # If we get here, npm install had issues
        Write-Host "[WARN] npm installation may have had issues, checking..." -ForegroundColor Yellow
        $sfCmd = Get-Command sf -ErrorAction SilentlyContinue
        if ($sfCmd) {
            Write-Host "[OK] Salesforce CLI is available despite warnings" -ForegroundColor Green
            exit 0
        }
        
        Write-Host "[WARN] npm installation failed, trying alternative method..." -ForegroundColor Yellow
        Write-Host ""
    } catch {
        Write-Host "[WARN] npm installation failed: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "Trying alternative installation method..." -ForegroundColor Yellow
        Write-Host ""
    }
}

# Alternative: Download and extract manually
Write-Host "Installing Salesforce CLI via direct download..."
Write-Host ""

$sfInstallDir = "tools\sf-cli"
$downloadUrl = "https://developer.salesforce.com/media/salesforce-cli/sf/channels/stable/sf-win32-$arch.tar.xz"

# Check for 7-Zip (better xz support than Windows tar)
$sevenZip = $null
$sevenZipPaths = @(
    "C:\Program Files\7-Zip\7z.exe",
    "C:\Program Files (x86)\7-Zip\7z.exe",
    (Join-Path $env:LOCALAPPDATA "Programs\7-Zip\7z.exe")
)
foreach ($path in $sevenZipPaths) {
    if (Test-Path $path) {
        $sevenZip = $path
        break
    }
}

# Check if tar is available (Windows 10 1803+ has built-in tar)
$tarAvailable = Get-Command tar -ErrorAction SilentlyContinue

if (-not $sevenZip -and -not $tarAvailable) {
    Write-Host "[ERROR] No extraction tool available." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Salesforce CLI using one of these methods:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Option 1: Install Node.js and npm, then run this script again"
    Write-Host "    winget install OpenJS.NodeJS.LTS"
    Write-Host ""
    Write-Host "  Option 2: Install 7-Zip for extraction support"
    Write-Host "    winget install 7zip.7zip"
    Write-Host ""
    Write-Host "  Option 3: Download Windows installer directly"
    Write-Host "    https://developer.salesforce.com/tools/salesforcecli"
    Write-Host ""
    exit 1
}

# Create tools directory
if (-not (Test-Path "tools")) {
    New-Item -ItemType Directory -Path "tools" | Out-Null
}

# Remove existing installation if present
if (Test-Path $sfInstallDir) {
    Write-Host "Removing existing Salesforce CLI installation..."
    Remove-Item -Recurse -Force $sfInstallDir
}

# Download Salesforce CLI
Write-Host "Downloading Salesforce CLI from:"
Write-Host "  $downloadUrl"
Write-Host ""
Write-Host "This may take a few minutes..."

# Create temp directory
$tempDir = Join-Path $env:TEMP "sf-cli-install-$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
$downloadFile = Join-Path $tempDir "sf-cli.tar.xz"

try {
    # Download the file with progress
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    
    # Use WebClient for better progress on large files
    $webClient = New-Object System.Net.WebClient
    $webClient.DownloadFile($downloadUrl, $downloadFile)
    
    if (-not (Test-Path $downloadFile)) {
        throw "Download file not created"
    }
    
    $fileSize = (Get-Item $downloadFile).Length / 1MB
    Write-Host "[OK] Download complete ($([math]::Round($fileSize, 1)) MB)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Download failed: $($_.Exception.Message)" -ForegroundColor Red
    Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
    exit 1
}

Write-Host ""
Write-Host "Extracting Salesforce CLI to $sfInstallDir..."
Write-Host "(This may take 1-2 minutes, please wait...)"

# Create the install directory
New-Item -ItemType Directory -Path $sfInstallDir -Force | Out-Null

# Get absolute paths
$absoluteDownloadFile = Resolve-Path $downloadFile | Select-Object -ExpandProperty Path
$absoluteInstallDir = Resolve-Path $sfInstallDir | Select-Object -ExpandProperty Path

try {
    if ($sevenZip) {
        # Use 7-Zip for extraction (more reliable with .tar.xz)
        Write-Host "Using 7-Zip for extraction..."
        
        # First extract .xz to get .tar
        $tarFile = Join-Path $tempDir "sf-cli.tar"
        & $sevenZip x $absoluteDownloadFile -o"$tempDir" -y | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "7-Zip xz extraction failed"
        }
        
        # Then extract .tar
        & $sevenZip x $tarFile -o"$absoluteInstallDir" -y | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "7-Zip tar extraction failed"
        }
        
        # Move contents from nested sf folder if it exists
        $nestedDir = Join-Path $absoluteInstallDir "sf"
        if (Test-Path $nestedDir) {
            Get-ChildItem $nestedDir | Move-Item -Destination $absoluteInstallDir -Force
            Remove-Item $nestedDir -Force
        }
    } else {
        # Use Windows tar (may be slow with xz)
        Write-Host "Using Windows tar for extraction..."
        Write-Host "[INFO] If this hangs, press Ctrl+C and install via npm instead:" -ForegroundColor Yellow
        Write-Host "       npm install --global @salesforce/cli" -ForegroundColor Yellow
        Write-Host ""
        
        # Change to install directory
        Push-Location $absoluteInstallDir
        try {
            # Use forward slashes for tar compatibility
            # Run tar without capturing stderr to avoid buffering issues
            $tarFile = $absoluteDownloadFile -replace '\\', '/'
            
            # Start tar as a job with timeout
            $job = Start-Job -ScriptBlock {
                param($tarPath, $workDir)
                Set-Location $workDir
                & tar -xf $tarPath --strip-components=1
                return $LASTEXITCODE
            } -ArgumentList $tarFile, $absoluteInstallDir
            
            # Wait with timeout (5 minutes max)
            $completed = Wait-Job $job -Timeout 300
            
            if (-not $completed) {
                Write-Host ""
                Write-Host "[ERROR] Extraction timed out after 5 minutes" -ForegroundColor Red
                Stop-Job $job
                Remove-Job $job
                throw "tar extraction timed out"
            }
            
            $exitCode = Receive-Job $job
            Remove-Job $job
            
            if ($exitCode -ne 0) {
                throw "tar extraction failed with exit code $exitCode"
            }
        } finally {
            Pop-Location
        }
    }
    
    Write-Host "[OK] Salesforce CLI extracted" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Extraction failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative installation method:" -ForegroundColor Yellow
    Write-Host "  1. Install Node.js: winget install OpenJS.NodeJS.LTS"
    Write-Host "  2. Restart your terminal"
    Write-Host "  3. Run: npm install --global @salesforce/cli"
    Write-Host ""
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
