# Generic CLI Setup Orchestrator
# Dispatches to tool-specific setup scripts
# Usage: .\setup-cli.ps1 -Tool <name>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("workato", "salesforce")]
    [string]$Tool
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..\..\..") | Select-Object -ExpandProperty Path

switch ($Tool) {
    "workato" {
        Write-Host "========================================" -ForegroundColor Blue
        Write-Host "Verifying Workato CLI (wk)" -ForegroundColor Blue
        Write-Host "========================================" -ForegroundColor Blue
        Write-Host ""

        if (Get-Command wk -ErrorAction SilentlyContinue) {
            $version = & wk version 2>$null
            Write-Host "wk CLI available: $version" -ForegroundColor Green
            Write-Host ""
            Write-Host "To verify auth:"
            Write-Host "  make status tool=workato"
        } else {
            Write-Host "wk CLI not found." -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Install it:"
            Write-Host "  Windows:     scoop install wk"
            Write-Host "  macOS/Linux: brew install workato/tap/wk"
            Write-Host ""
            Write-Host "Then authenticate:"
            Write-Host "  wk auth login"
            exit 1
        }
    }
    "salesforce" {
        $ToolScript = Join-Path $ProjectRoot "vendor\salesforce\scripts\salesforce-setup.ps1"

        if (-not (Test-Path $ToolScript)) {
            Write-Host "Error: Salesforce setup script not found at $ToolScript" -ForegroundColor Red
            exit 1
        }

        $WrapperScript = Join-Path $ProjectRoot "bin\sf.ps1"
        $globalAvailable = Get-Command sf -ErrorAction SilentlyContinue

        if ((Test-Path $WrapperScript) -or $globalAvailable) {
            Write-Host "Salesforce CLI appears to be already installed" -ForegroundColor Yellow
            Write-Host ""
            $reply = Read-Host "Reinstall anyway? [y/N]"
            if ($reply -notmatch '^[Yy]$') {
                Write-Host "Skipping. To force reinstall: make clean tool=salesforce && make setup tool=salesforce"
                exit 0
            }
        }

        Write-Host "========================================" -ForegroundColor Blue
        Write-Host "Setting up Salesforce CLI" -ForegroundColor Blue
        Write-Host "========================================" -ForegroundColor Blue
        Write-Host ""

        Push-Location $ProjectRoot
        try {
            & $ToolScript
            if ($LASTEXITCODE -ne 0) {
                Write-Host "Setup script failed with exit code $LASTEXITCODE" -ForegroundColor Red
                exit $LASTEXITCODE
            }
        } finally {
            Pop-Location
        }

        $globalAvailable = Get-Command sf -ErrorAction SilentlyContinue
        if ((Test-Path $WrapperScript) -or $globalAvailable) {
            Write-Host ""
            Write-Host "Salesforce CLI successfully installed!" -ForegroundColor Green
            Write-Host "  Verify: make status tool=salesforce"
        } else {
            Write-Host "Installation failed: CLI not available" -ForegroundColor Red
            exit 1
        }
    }
}
