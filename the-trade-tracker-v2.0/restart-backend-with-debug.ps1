Write-Host "Restarting backend with enhanced scheduler debug logging..." -ForegroundColor Yellow

# Kill existing backend processes
Write-Host "Stopping existing backend processes..." -ForegroundColor Red
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*backend*" } | Stop-Process -Force
Start-Sleep -Seconds 3

# Navigate to backend directory
Set-Location -Path "backend"

Write-Host "Starting backend with debug logging..." -ForegroundColor Green

# Start the backend server
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow -PassThru

Write-Host "Waiting 10 seconds for server to fully start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "Backend started with debug logging enabled!" -ForegroundColor Green
Write-Host "Watch for these debug messages in the logs:" -ForegroundColor Cyan
Write-Host "  - [SCHEDULER DEBUG] scheduleNextRun called" -ForegroundColor White
Write-Host "  - [SCHEDULER DEBUG] Creating new timeout" -ForegroundColor White
Write-Host "  - [SCHEDULER] Timeout fired for bot" -ForegroundColor White
Write-Host "  - [SCHEDULER DEBUG] runJob() called" -ForegroundColor White

Write-Host "Backend restart complete! Monitor logs for scheduler debug messages." -ForegroundColor Green
