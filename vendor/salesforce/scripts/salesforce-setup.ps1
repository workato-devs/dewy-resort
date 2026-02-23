# Salesforce CLI Setup for Windows
# Installs via npm (recommended) or provides manual instructions
$ErrorActionPreference = "Stop"

Write-Host "Salesforce CLI Setup" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan
Write-Host ""

# Check for npm (required for installation)
$npmAvailable = Get-Command npm -ErrorAction SilentlyContinue

if (-not $npmAvailable) {
    Write-Host "[ERROR] npm is not available." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js v20 first:" -ForegroundColor Yellow
    Write-Host "  winget install OpenJS.NodeJS.LTS"
    Write-Host ""
    Write-Host "Then restart PowerShell and run this script again."
    Write-Host ""
    Write-Host "Alternative: Download the Windows installer directly from:"
    Write-Host "  https://developer.salesforce.com/tools/salesforcecli"
    Write-Host ""
    exit 1
}

# Check Node.js version
$nodeVersion = & node --version 2>&1
Write-Host "Detected Node.js: $nodeVersion"
Write-Host ""

Write-Host "Installing Salesforce CLI via npm..." -ForegroundColor Yellow
Write-Host ""

try {
    # Install globally via npm
    # Use Continue to avoid stderr warnings killing the script
    $ErrorActionPreference = "Continue"
    & npm install --global @salesforce/cli 2>&1 | ForEach-Object { Write-Host $_ }
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = "Stop"
    
    # Check if sf command is now available
    # Refresh PATH to pick up newly installed global packages
    $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
    
    $sfCmd = Get-Command sf -ErrorAction SilentlyContinue
    
    if ($sfCmd) {
        Write-Host ""
        Write-Host "[OK] Salesforce CLI installed successfully!" -ForegroundColor Green
        Write-Host ""
        
        $version = & sf --version 2>&1
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
    
    # npm succeeded but sf not in PATH yet
    if ($exitCode -eq 0) {
        Write-Host ""
        Write-Host "[OK] Salesforce CLI installed!" -ForegroundColor Green
        Write-Host "[WARN] You may need to restart PowerShell for 'sf' to be available in PATH" -ForegroundColor Yellow
        Write-Host ""
        exit 0
    }
    
    throw "npm install failed with exit code $exitCode"
    
} catch {
    Write-Host ""
    Write-Host "[ERROR] Installation failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "  1. Ensure you have Node.js v20 installed: node --version"
    Write-Host "  2. Try running as Administrator"
    Write-Host "  3. Check npm is working: npm --version"
    Write-Host ""
    Write-Host "Manual installation:"
    Write-Host "  npm install --global @salesforce/cli"
    Write-Host ""
    Write-Host "Or download the Windows installer from:"
    Write-Host "  https://developer.salesforce.com/tools/salesforcecli"
    Write-Host ""
    exit 1
}
