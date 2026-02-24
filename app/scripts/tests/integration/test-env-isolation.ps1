# Test Environment Variable Isolation
# This script verifies that the server only uses .env variables

$ErrorActionPreference = "Stop"

# Get the app directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppDir = (Get-Item "$ScriptDir\..\..").FullName

Write-Host "=== Testing Environment Variable Isolation ===" -ForegroundColor Cyan
Write-Host ""

# Set test environment variables that should NOT be inherited
$env:TEST_SHELL_VAR = "this_should_not_be_in_server"
$env:AWS_ACCESS_KEY_ID = "FAKE_KEY_FROM_SHELL"

Write-Host "Shell environment variables set:"
Write-Host "  TEST_SHELL_VAR=$env:TEST_SHELL_VAR"
Write-Host "  AWS_ACCESS_KEY_ID=$env:AWS_ACCESS_KEY_ID"
Write-Host ""

# Check what's in .env
Write-Host "Variables in .env file:"
$envFile = "$AppDir\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match "^AWS_ACCESS_KEY_ID=" } | Select-Object -First 1
}
Write-Host ""

# Restart server with these shell variables set
Write-Host "Restarting server..."
& "$AppDir\scripts\dev-tools\server.ps1" -Action restart 2>&1 | Out-Null

Start-Sleep -Seconds 3

# Check server logs to see what credentials it's using
Write-Host "Checking server logs for credential usage..."
Write-Host ""

$logFile = "$AppDir\var\logs\node\dev.log"
if (Test-Path $logFile) {
    Get-Content $logFile -Tail 50 | Where-Object { $_ -match "access.*key|credential|authentication" } | Select-Object -First 5
}

Write-Host ""
Write-Host "If the server is using credentials from .env (starting with ASIA), the isolation is working."
Write-Host "If it's using FAKE_KEY_FROM_SHELL, the isolation is NOT working."
Write-Host ""

# Clean up
Remove-Item Env:TEST_SHELL_VAR -ErrorAction SilentlyContinue
Remove-Item Env:AWS_ACCESS_KEY_ID -ErrorAction SilentlyContinue

Write-Host "Test complete. Check the logs above to verify isolation."
