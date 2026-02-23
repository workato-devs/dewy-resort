# Quick diagnostic script for maintenance tasks issue

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          Quick Maintenance Tasks Diagnostic                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if dev server is running
Write-Host "1. Checking if dev server is running..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/manager/maintenance" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✓ Dev server is running" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Dev server is NOT running" -ForegroundColor Red
    Write-Host "   → Start it with: cd app; npm run dev"
    exit 1
}

# Check environment variables
Write-Host ""
Write-Host "2. Checking environment configuration..."

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppDir = (Get-Item "$ScriptDir\..\..").FullName
$envFile = "$AppDir\.env"

if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    
    if ($envContent -match "SALESFORCE_ENABLED=true") {
        Write-Host "   ✓ Salesforce is enabled" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Salesforce is disabled" -ForegroundColor Yellow
    }
    
    if ($envContent -match "WORKATO_MOCK_MODE=true") {
        Write-Host "   ✓ Mock mode is enabled (using mock data)" -ForegroundColor Green
    } else {
        Write-Host "   ✓ Mock mode is disabled (using real Salesforce)" -ForegroundColor Green
    }
} else {
    Write-Host "   ✗ .env file not found" -ForegroundColor Red
}

# Test the API
Write-Host ""
Write-Host "3. Testing maintenance API..."
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/manager/maintenance" -UseBasicParsing
    
    if ($response.tasks -and $response.tasks.Count -gt 0) {
        $numTasks = $response.tasks.Count
        Write-Host "   ✓ API is working - Found $numTasks tasks" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ API returned no tasks" -ForegroundColor Yellow
        Write-Host "   → You may need to create some maintenance tasks"
    }
} catch {
    Write-Host "   ✗ API request failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "4. Next steps:"
Write-Host "   • Run: npx tsx scripts/check-salesforce-data.ts"
Write-Host "   • Or create tasks via UI: http://localhost:3000/manager/maintenance"
Write-Host ""
