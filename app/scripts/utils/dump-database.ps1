# Database Dump Script
# 
# Creates a backup of the SQLite database with timestamp
# 
# Usage:
#   .\dump-database.ps1                    # Dump to default location
#   .\dump-database.ps1 -BackupDir C:\backups  # Dump to specific location

param(
    [string]$BackupDir
)

$ErrorActionPreference = "Stop"

# Get the app directory (parent of scripts\utils)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppDir = (Get-Item "$ScriptDir\..\..").FullName

# Database location
$DbPath = "$AppDir\var\hotel.db"
if (-not $BackupDir) {
    $BackupDir = "$AppDir\var\backups"
}
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupDir\hotel_$Timestamp.db"

# Check if database exists
if (-not (Test-Path $DbPath)) {
    Write-Host "❌ Error: Database not found at $DbPath" -ForegroundColor Red
    exit 1
}

# Create backup directory if it doesn't exist
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

# Create backup using SQLite's backup command
Write-Host "📦 Creating database backup..."
Write-Host "   Source: $DbPath"
Write-Host "   Destination: $BackupFile"

# Check if sqlite3 is available
$sqlite3 = Get-Command sqlite3 -ErrorAction SilentlyContinue
if ($sqlite3) {
    & sqlite3 $DbPath ".backup '$BackupFile'"
} else {
    # Fallback to simple file copy
    Copy-Item $DbPath -Destination $BackupFile -Force
}

# Verify backup was created
if (Test-Path $BackupFile) {
    $backupSize = (Get-Item $BackupFile).Length
    $backupSizeFormatted = "{0:N2} KB" -f ($backupSize / 1KB)
    Write-Host "✅ Backup created successfully!" -ForegroundColor Green
    Write-Host "   Size: $backupSizeFormatted"
    Write-Host "   Location: $BackupFile"
    
    # Show recent backups
    Write-Host ""
    Write-Host "📋 Recent backups:"
    Get-ChildItem $BackupDir -Filter "*.db" | Sort-Object LastWriteTime -Descending | Select-Object -First 5 | ForEach-Object {
        $size = "{0:N2} KB" -f ($_.Length / 1KB)
        Write-Host "   $($_.Name) - $size - $($_.LastWriteTime)"
    }
} else {
    Write-Host "❌ Error: Backup failed" -ForegroundColor Red
    exit 1
}
