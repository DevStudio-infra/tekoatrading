#!/usr/bin/env pwsh

Write-Host "🔧 TRADE TRACKER - BACKEND RESTART WITH TIMEOUT FIXES" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# Change to backend directory
Set-Location backend

Write-Host "📋 Applied Fixes:" -ForegroundColor Green
Write-Host "  ✅ Increased historical data fetch timeout: 30s → 60s" -ForegroundColor Yellow
Write-Host "  ✅ Increased Capital.com API timeout: 30s → 60s" -ForegroundColor Yellow
Write-Host "  ✅ Reduced session creation timeout: 10s → 5s" -ForegroundColor Yellow
Write-Host "  ✅ Improved rate limiting: 3s interval, 6 req/min" -ForegroundColor Yellow
Write-Host "  ✅ Chart generation timeout: 45s (was 2 minutes)" -ForegroundColor Yellow
Write-Host "  ✅ AI analysis timeout: 60s" -ForegroundColor Yellow
Write-Host ""

# Kill any existing backend processes
Write-Host "🛑 Stopping existing backend processes..." -ForegroundColor Red
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*backend*" -or $_.CommandLine -like "*backend*" } | Stop-Process -Force
Start-Sleep -Seconds 2

# Clear any stuck processes
taskkill /F /IM "node.exe" 2>$null
Start-Sleep -Seconds 1

Write-Host "🚀 Starting backend with timeout fixes..." -ForegroundColor Green
Write-Host "📊 Monitor these improvements:" -ForegroundColor Cyan
Write-Host "  • Faster historical data fetching (60s timeout)" -ForegroundColor White
Write-Host "  • Reduced session creation delays (5s timeout)" -ForegroundColor White
Write-Host "  • Better rate limiting (3s interval, 6 req/min)" -ForegroundColor White
Write-Host "  • Faster chart generation (45s timeout)" -ForegroundColor White
Write-Host "  • Faster AI analysis (60s timeout)" -ForegroundColor White
Write-Host ""

# Start the backend
npm run dev
