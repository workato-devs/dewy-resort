# Generic CLI Setup Orchestrator
# Dispatches to tool-specific setup scripts
# Usage: .\setup-cli.ps1 -Tool <name>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("workato", "salesforce")]
    [string]$Tool
)

$ErrorActionPreference = "Stop"

# Get project root directory (go up from app/scripts/setup to project root)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..\..\..") | Select-Object -ExpandProperty Path

# Map tool names to their setup script locations
$ToolScripts = @{
    "workato" = Join-Path $ProjectRoot "workato\scripts\cli\workato-setup.ps1"
    "salesforce" = Join-Path $ProjectRoot "vendor\salesforce\scripts\salesforce-setup.ps1"
}

$ToolScript = $ToolScripts[$Tool]

# Check if tool-specific setup script exists
if (-not (Test-Path $ToolScript)) {
    Write-Host "[ERROR] Setup script not found: $ToolScript" -ForegroundColor Red
    Write-Host ""
    Write-Host "Available tools:"
    Write-Host "  - workato"
    Write-Host "  - salesforce"
    exit 1
}

# Check if wrapper already exists OR global command available (skip if already installed)
$WrapperScripts = @{
    "workato" = Join-Path $ProjectRoot "bin\workato.ps1"
    "salesforce" = Join-Path $ProjectRoot "bin\sf.ps1"
}

$GlobalCommands = @{
    "workato" = "workato"
    "salesforce" = "sf"
}

$WrapperScript = $WrapperScripts[$Tool]
$GlobalCmd = $GlobalCommands[$Tool]
$globalAvailable = Get-Command $GlobalCmd -ErrorAction SilentlyContinue

if ((Test-Path $WrapperScript) -or $globalAvailable) {
    Write-Host "[WARN] $Tool CLI appears to be already installed" -ForegroundColor Yellow
    if ($globalAvailable) {
        Write-Host "Global command '$GlobalCmd' is available"
    } else {
        Write-Host "Wrapper found at: $WrapperScript"
    }
    Write-Host ""
    
    $reply = Read-Host "Reinstall anyway? [y/N]"
    if ($reply -notmatch '^[Yy]$') {
        Write-Host "Skipping installation."
        exit 0
    }
}

# Execute tool-specific setup script
Write-Host "========================================" -ForegroundColor Blue
Write-Host "Setting up $Tool CLI" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

Push-Location $ProjectRoot
try {
    & $ToolScript
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Setup script failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}

# Verify installation - check for wrapper script OR global command
$globalAvailable = Get-Command $GlobalCmd -ErrorAction SilentlyContinue

if ((Test-Path $WrapperScript) -or $globalAvailable) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "[OK] $Tool CLI successfully installed!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    if ($globalAvailable) {
        Write-Host "Installed globally. To verify:"
        Write-Host "  $GlobalCmd --version"
    } else {
        Write-Host "To verify installation:"
        Write-Host "  .\bin\$Tool.ps1 --version"
    }
    Write-Host ""
    exit 0
} else {
    Write-Host "[ERROR] Installation failed: CLI not available" -ForegroundColor Red
    exit 1
}
