# Trade Tracker v2.0 Startup Script
Write-Host "Starting Trade Tracker v2.0..." -ForegroundColor Green
Write-Host "This will start both the frontend and backend servers." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop all servers." -ForegroundColor Yellow
Write-Host ""

# Install dependencies if they don't exist
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing root dependencies..." -ForegroundColor Cyan
    npm install
}

if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
    Set-Location -Path "frontend"
    npm install
    Set-Location -Path ".."
}

if (-not (Test-Path "backend\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
    Set-Location -Path "backend"
    npm install
    Set-Location -Path ".."
}

# Run the database migrations if needed
$runMigration = Read-Host "Do you want to run database migrations first? (y/n)"

if ($runMigration -eq "y" -or $runMigration -eq "Y") {
    Write-Host "Running database operations..." -ForegroundColor Cyan
    
    $migrationOption = Read-Host "Select database operation (1=generate, 2=migrate, 3=push, 4=pull)"
    
    switch ($migrationOption) {
        "1" {
            Write-Host "Running drizzle-kit generate..." -ForegroundColor Cyan
            Set-Location -Path "backend"
            npx drizzle-kit generate
            Set-Location -Path ".."
        }
        "2" {
            Write-Host "Running migration with apply-migration script..." -ForegroundColor Cyan
            Set-Location -Path "backend"
            npx tsx db/apply-migration.ts
            Set-Location -Path ".."
        }
        "3" {
            Write-Host "Running drizzle-kit push..." -ForegroundColor Cyan
            Set-Location -Path "backend"
            npx drizzle-kit push
            Set-Location -Path ".."
        }
        "4" {
            Write-Host "Running drizzle-kit pull..." -ForegroundColor Cyan
            Set-Location -Path "backend"
            npx drizzle-kit pull
            Set-Location -Path ".."
        }
        default {
            Write-Host "Skipping database operations..." -ForegroundColor Yellow
        }
    }
}

# Start the application
Write-Host "Starting servers..." -ForegroundColor Green
Write-Host ""
npm run dev
