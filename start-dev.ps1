# Start Development Environment for Tekoa Trading
Write-Host "🚀 Starting Tekoa Trading Development Environment..." -ForegroundColor Green
Write-Host ""

# Function to start a service in a new window
function Start-Service {
    param($Name, $Path, $Command, $Color)
    Write-Host "Starting $Name..." -ForegroundColor $Color
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Path'; Write-Host '$Name started' -ForegroundColor $Color; $Command"
}

# Get the current directory
$RootPath = Get-Location

# Start Backend
Start-Service "Backend" "$RootPath\backend" "npm run dev" "Blue"

# Start Frontend
Start-Service "Frontend" "$RootPath\frontend" "npm run dev" "Magenta"

# Start Chart Engine
Start-Service "Chart Engine" "$RootPath\chart-engine" "python main.py" "Yellow"

Write-Host ""
Write-Host "✅ All services started!" -ForegroundColor Green
Write-Host "📊 Backend: http://localhost:4000" -ForegroundColor Blue
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Magenta
Write-Host "📈 Chart Engine: http://localhost:5001" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to close all services..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Stop all services
Write-Host "🛑 Stopping all services..." -ForegroundColor Red
taskkill /F /IM node.exe 2>$null
taskkill /F /IM python.exe 2>$null
taskkill /F /IM python3.11.exe 2>$null
Write-Host "✅ All services stopped!" -ForegroundColor Green
