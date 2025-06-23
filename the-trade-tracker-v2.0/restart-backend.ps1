#!/usr/bin/env pwsh

Write-Host "🔄 Restarting Trade Tracker Backend..." -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Stop any existing backend processes
Write-Host "🛑 Stopping existing backend processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*backend*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Wait a moment for processes to fully stop
Start-Sleep -Seconds 2

# Change to backend directory
Write-Host "📁 Changing to backend directory..." -ForegroundColor Yellow
Set-Location backend

# Check if package.json exists
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found in backend directory" -ForegroundColor Red
    Write-Host "Make sure you're running this script from the project root" -ForegroundColor Red
    exit 1
}

# Install dependencies if needed
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Check environment file
Write-Host "🔧 Checking environment configuration..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Warning: .env file not found" -ForegroundColor Yellow
    Write-Host "Make sure to create .env file with required variables" -ForegroundColor Yellow
} else {
    Write-Host "✅ Environment file found" -ForegroundColor Green
}

# Clear any existing logs
Write-Host "🧹 Clearing old logs..." -ForegroundColor Yellow
if (Test-Path "logs") {
    Remove-Item "logs\*" -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "🚀 Starting backend server..." -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the backend with development settings
try {
    npm run dev
} catch {
    Write-Host "❌ Error starting backend: $_" -ForegroundColor Red
    exit 1
}
