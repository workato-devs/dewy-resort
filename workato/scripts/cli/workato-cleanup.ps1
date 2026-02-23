# Workato CLI Cleanup for Windows
$ErrorActionPreference = "SilentlyContinue"

Write-Host "🧹 Workato CLI Cleanup" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

# Find Python command
$pythonCmd = $null
foreach ($cmd in @("python", "python3", "py")) {
    try {
        $version = & $cmd --version 2>&1
        if ($version -match "Python") {
            $pythonCmd = $cmd
            break
        }
    } catch { }
}

# Uninstall workato-platform-cli via pip
if ($pythonCmd) {
    Write-Host "Removing workato-platform-cli via pip..."
    & $pythonCmd -m pip uninstall -y workato-platform-cli 2>&1 | Out-Null
    Write-Host "✓ Removed workato-platform-cli from pip" -ForegroundColor Green
}

# Remove wrapper scripts
if (Test-Path "bin\workato.ps1") {
    Remove-Item "bin\workato.ps1" -Force
    Write-Host "✓ Removed bin\workato.ps1" -ForegroundColor Green
}

if (Test-Path "bin\workato.cmd") {
    Remove-Item "bin\workato.cmd" -Force
    Write-Host "✓ Removed bin\workato.cmd" -ForegroundColor Green
}

# Remove legacy virtual environment if it exists
if (Test-Path "tools\workato-cli-env") {
    Remove-Item -Recurse -Force "tools\workato-cli-env"
    Write-Host "✓ Removed legacy virtual environment" -ForegroundColor Green
}

Write-Host "✓ Workato CLI cleanup completed" -ForegroundColor Green
