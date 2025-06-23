#!/usr/bin/env pwsh

Write-Host "🚀 Enhanced Backend Restart with Bot System Fixes" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Green

# Change to backend directory
Set-Location backend

Write-Host "📍 Current directory: $(Get-Location)" -ForegroundColor Yellow

# Step 1: Stop existing processes
Write-Host "`n🛑 Step 1: Stopping existing backend processes..." -ForegroundColor Cyan
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Found $($nodeProcesses.Count) Node.js process(es). Stopping..." -ForegroundColor Yellow
    $nodeProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Host "✅ Node.js processes stopped" -ForegroundColor Green
} else {
    Write-Host "✅ No Node.js processes found" -ForegroundColor Green
}

# Step 2: Run bot system reset
Write-Host "`n🔧 Step 2: Running bot system reset..." -ForegroundColor Cyan
try {
    node scripts/reset-bot-system.js
    Write-Host "✅ Bot system reset completed" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Bot system reset failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Step 3: Clear any stuck processes
Write-Host "`n🧹 Step 3: Clearing stuck processes and caches..." -ForegroundColor Cyan

# Clear npm cache
Write-Host "Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force 2>$null

# Clear any stuck evaluation records
Write-Host "Database cleanup will be handled by reset script..." -ForegroundColor Yellow

Write-Host "✅ Cleanup completed" -ForegroundColor Green

# Step 4: Install dependencies (if needed)
Write-Host "`n📦 Step 4: Checking dependencies..." -ForegroundColor Cyan
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "✅ Dependencies already installed" -ForegroundColor Green
}

# Step 5: Start the backend with enhanced monitoring
Write-Host "`n🚀 Step 5: Starting backend with enhanced monitoring..." -ForegroundColor Cyan
Write-Host "Bot System Configuration:" -ForegroundColor Yellow
Write-Host "  - Bot Coordination: BYPASS MODE (immediate execution)" -ForegroundColor Yellow
Write-Host "  - Bot Timeout: 15 minutes (was 5 minutes)" -ForegroundColor Yellow
Write-Host "  - Chart Generation: Real charts with 2-minute timeout" -ForegroundColor Yellow
Write-Host "  - AI Analysis: 60-second timeout added" -ForegroundColor Yellow
Write-Host "  - Rate Limiting: Conservative (4 req/min)" -ForegroundColor Yellow

Write-Host "`n🔍 Monitor these indicators for success:" -ForegroundColor Cyan
Write-Host "  ✅ '🤖 Starting bot evaluation' - Bot evaluation starts" -ForegroundColor White
Write-Host "  ✅ '🚀 BYPASS MODE: Allowing immediate execution' - Coordination bypass working" -ForegroundColor White
Write-Host "  ✅ '📊 Starting chart generation' - Chart generation starts" -ForegroundColor White
Write-Host "  ✅ '🧠 Starting AI analysis' - AI analysis starts" -ForegroundColor White
Write-Host "  ✅ '✅ Bot evaluation completed' - Full cycle complete" -ForegroundColor White

Write-Host "`n⚠️ Watch for these warning signs:" -ForegroundColor Yellow
Write-Host "  ❌ 'Bot timed out after 900000ms' - Bot taking too long" -ForegroundColor White
Write-Host "  ❌ 'Chart generation timed out' - Chart API timeout" -ForegroundColor White
Write-Host "  ❌ 'AI analysis timed out' - Gemini API timeout" -ForegroundColor White
Write-Host "  ❌ 'Rate limit hit' - API limits reached" -ForegroundColor White

Write-Host "`n🎯 Expected timeline:" -ForegroundColor Cyan
Write-Host "  - 0-30s: Service initialization" -ForegroundColor White
Write-Host "  - 30-60s: Bot scheduling and first evaluations" -ForegroundColor White
Write-Host "  - 60s+: Regular bot cycles every minute" -ForegroundColor White

Write-Host "`nStarting backend now..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host "=" * 60 -ForegroundColor Green

# Start the backend
npm run dev
