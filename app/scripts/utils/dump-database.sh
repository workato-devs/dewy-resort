#!/bin/bash
# Database Dump Script
# 
# Creates a backup of the SQLite database with timestamp
# 
# Usage:
#   bash scripts/dump-database.sh                    # Dump to default location
#   bash scripts/dump-database.sh /path/to/backup    # Dump to specific location

set -e

# Get the app directory (parent of scripts)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

# Database location
DB_PATH="$APP_DIR/var/hotel.db"
BACKUP_DIR="${1:-$APP_DIR/var/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/hotel_${TIMESTAMP}.db"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
  echo "❌ Error: Database not found at $DB_PATH"
  exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup using SQLite's backup command
echo "📦 Creating database backup..."
echo "   Source: $DB_PATH"
echo "   Destination: $BACKUP_FILE"

sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Verify backup was created
if [ -f "$BACKUP_FILE" ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "✅ Backup created successfully!"
  echo "   Size: $BACKUP_SIZE"
  echo "   Location: $BACKUP_FILE"
  
  # Show recent backups
  echo ""
  echo "📋 Recent backups:"
  ls -lht "$BACKUP_DIR" | head -6
else
  echo "❌ Error: Backup failed"
  exit 1
fi
