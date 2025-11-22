#!/bin/bash

# Export application files to ../dewy-resort
# Excludes docs, tests, cloudformation, git files, and build artifacts

set -e

SOURCE_DIR="."
DEST_DIR="../dewy-resort"

echo "Exporting application to ${DEST_DIR}..."

# Create destination directory if it doesn't exist
mkdir -p "${DEST_DIR}"

# Copy root files
echo "Copying root files..."
cp .env.example "${DEST_DIR}/"
cp .eslintrc.json "${DEST_DIR}/"
cp .gitignore "${DEST_DIR}/"
cp .workato-ignore "${DEST_DIR}/"
cp components.json "${DEST_DIR}/"
cp jest.config.js "${DEST_DIR}/"
cp LICENSE "${DEST_DIR}/"
cp Makefile "${DEST_DIR}/"
cp middleware.ts "${DEST_DIR}/"
cp next-env.d.ts "${DEST_DIR}/"
cp next.config.js "${DEST_DIR}/"
cp package.json "${DEST_DIR}/"
cp package-lock.json "${DEST_DIR}/"
cp postcss.config.js "${DEST_DIR}/"
cp README.md "${DEST_DIR}/"
cp tailwind.config.ts "${DEST_DIR}/"
cp tsconfig.json "${DEST_DIR}/"
cp verify-mock-mode.js "${DEST_DIR}/"

# Copy directories
echo "Copying application directories..."
cp -r app "${DEST_DIR}/"
cp -r components "${DEST_DIR}/"
cp -r config "${DEST_DIR}/"
cp -r contexts "${DEST_DIR}/"
cp -r database "${DEST_DIR}/"
cp -r hooks "${DEST_DIR}/"
cp -r lib "${DEST_DIR}/"
cp -r public "${DEST_DIR}/"
cp -r salesforce "${DEST_DIR}/"
cp -r scripts "${DEST_DIR}/"
cp -r types "${DEST_DIR}/"
cp -r workato "${DEST_DIR}/"

# Create var directory if it exists
if [ -d "var" ]; then
  cp -r var "${DEST_DIR}/"
fi

echo "Export complete!"
echo "Destination: ${DEST_DIR}"
echo ""
echo "Next steps:"
echo "1. cd ${DEST_DIR}"
echo "2. Copy .env.example to .env and configure"
echo "3. npm install"
echo "4. npm run dev"
