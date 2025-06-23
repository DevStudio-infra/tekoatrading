#!/usr/bin/env pwsh

Write-Host "🔧 TRADE TRACKER - SIMPLIFIED BACKEND RESTART" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# Change to backend directory
Set-Location backend

Write-Host "🎯 SIMPLIFIED APPROACH:" -ForegroundColor Green
Write-Host "  ✅ Removed complex CredentialRateLimiter from session creation" -ForegroundColor Yellow
Write-Host "  ✅ Removed complex rate limiting from API requests" -ForegroundColor Yellow
Write-Host "  ✅ Simple 1-second interval between requests" -ForegroundColor Yellow
Write-Host "  ✅ Direct session creation (no queuing)" -ForegroundColor Yellow
Write-Host "  ✅ Simplified timeout handling" -ForegroundColor Yellow
Write-Host ""

Write-Host "🚫 REMOVED PROBLEMATIC FEATURES:" -ForegroundColor Red
Write-Host "  ❌ CredentialRateLimiter.addToQueue()" -ForegroundColor White
Write-Host "  ❌ GlobalRateLimiter complex logic" -ForegroundColor White
Write-Host "  ❌ SessionManager complex caching" -ForegroundColor White
Write-Host "  ❌ Multiple competing rate limiters" -ForegroundColor White
Write-Host "  ❌ Complex session creation locks" -ForegroundColor White
Write-Host ""

# Kill any existing backend processes
Write-Host "🛑 Stopping existing backend processes..." -ForegroundColor Red
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*backend*" -or $_.CommandLine -like "*backend*" } | Stop-Process -Force
Start-Sleep -Seconds 2

# Clear any stuck processes
taskkill /F /IM "node.exe" 2>$null
Start-Sleep -Seconds 1

Write-Host "🚀 Starting backend with SIMPLIFIED rate limiting..." -ForegroundColor Green
Write-Host "📊 What to expect:" -ForegroundColor Cyan
Write-Host "  • Much faster session creation (no complex queuing)" -ForegroundColor White
Write-Host "  • Direct API calls with simple 1s intervals" -ForegroundColor White
Write-Host "  • No competing rate limiters blocking each other" -ForegroundColor White
Write-Host "  • Faster bot evaluations overall" -ForegroundColor White
Write-Host ""

# Start the backend
npm run dev
