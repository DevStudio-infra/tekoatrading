#!/bin/bash
# Simple script to run the trading pairs import

# Navigate to the project root
cd "$(dirname "$0")/.."

# Ensure dependencies are installed
echo "Checking dependencies..."
npm install --silent

# Compile the TypeScript file
echo "Compiling TypeScript..."
npx tsc scripts/import-trading-pairs.ts --esModuleInterop

# Run the compiled JavaScript
echo "Running import script..."
node scripts/import-trading-pairs.js

echo "Import process completed."
