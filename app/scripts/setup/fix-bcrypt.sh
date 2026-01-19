#!/bin/bash
# Fix bcrypt architecture mismatch issues

echo "Fixing bcrypt architecture mismatch..."
echo ""

# Remove node_modules and package-lock.json
echo "1. Removing node_modules and package-lock.json..."
rm -rf node_modules package-lock.json

# Clear npm cache
echo "2. Clearing npm cache..."
npm cache clean --force

# Reinstall dependencies
echo "3. Reinstalling dependencies..."
npm install

# Rebuild bcrypt specifically
echo "4. Rebuilding bcrypt for current architecture..."
npm rebuild bcrypt --build-from-source

echo ""
echo "✅ Done! Try starting the server again."
