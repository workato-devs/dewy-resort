# Export application files to ..\dewy-resort
# Excludes docs, tests, cloudformation, git files, and build artifacts

$ErrorActionPreference = "Stop"

$SourceDir = "."
$DestDir = "..\dewy-resort"

Write-Host "Exporting application to $DestDir..."

# Create destination directory if it doesn't exist
New-Item -ItemType Directory -Force -Path $DestDir | Out-Null

# Copy root files
Write-Host "Copying root files..."
$rootFiles = @(
    ".env.example",
    ".eslintrc.json",
    ".gitignore",
    ".workato-ignore",
    "components.json",
    "jest.config.js",
    "LICENSE",
    "Makefile",
    "middleware.ts",
    "next-env.d.ts",
    "next.config.js",
    "package.json",
    "package-lock.json",
    "postcss.config.js",
    "README.md",
    "tailwind.config.ts",
    "tsconfig.json",
    "verify-mock-mode.js"
)

foreach ($file in $rootFiles) {
    if (Test-Path $file) {
        Copy-Item $file -Destination $DestDir -Force
    }
}

# Copy directories
Write-Host "Copying application directories..."
$directories = @(
    "app",
    "components",
    "config",
    "contexts",
    "database",
    "hooks",
    "lib",
    "public",
    "salesforce",
    "scripts",
    "types",
    "workato"
)

foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Copy-Item -Path $dir -Destination $DestDir -Recurse -Force
    }
}

# Create var directory if it exists
if (Test-Path "var") {
    Copy-Item -Path "var" -Destination $DestDir -Recurse -Force
}

Write-Host "[OK] Export complete!" -ForegroundColor Green
Write-Host "Destination: $DestDir"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. cd $DestDir"
Write-Host "2. Copy .env.example to .env and configure"
Write-Host "3. npm install"
Write-Host "4. npm run dev"
