# Mock Mode Test Script
# This script tests the mock mode functionality by calling the test API endpoint
# Usage: .\test-mock-mode.ps1

Write-Host "🧪 Testing Workato Mock Mode..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Make sure the dev server is running (npm run dev)"
Write-Host "Then run: Invoke-RestMethod http://localhost:3000/api/test/mock-mode | ConvertTo-Json"
Write-Host ""
Write-Host "Or visit: http://localhost:3000/api/test/mock-mode in your browser"
