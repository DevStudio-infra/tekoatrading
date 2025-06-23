# PowerShell script to run the trading pairs import

# Navigate to the project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $scriptPath "..")

# Ensure dependencies are installed
Write-Host "Checking dependencies..." -ForegroundColor Cyan
npm install --silent

# Compile the TypeScript file
Write-Host "Compiling TypeScript..." -ForegroundColor Cyan
npx tsc scripts/import-trading-pairs.ts --esModuleInterop

# Run the compiled JavaScript
Write-Host "Running import script..." -ForegroundColor Cyan
node scripts/import-trading-pairs.js

Write-Host "Import process completed." -ForegroundColor Green
