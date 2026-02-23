# Fix bcrypt architecture mismatch issues

Write-Host "Fixing bcrypt architecture mismatch..."
Write-Host ""

# Remove node_modules and package-lock.json
Write-Host "1. Removing node_modules and package-lock.json..."
if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
if (Test-Path "package-lock.json") { Remove-Item -Force "package-lock.json" }

# Clear npm cache
Write-Host "2. Clearing npm cache..."
npm cache clean --force

# Reinstall dependencies
Write-Host "3. Reinstalling dependencies..."
npm install

# Rebuild bcrypt specifically
Write-Host "4. Rebuilding bcrypt for current architecture..."
npm rebuild bcrypt --build-from-source

Write-Host ""
Write-Host "[OK] Done! Try starting the server again." -ForegroundColor Green
