@echo off
echo Starting Trade Tracker v2.0...
echo.
echo This will start both the frontend and backend servers.
echo Press Ctrl+C twice to stop all servers.
echo.

:: Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
  echo Installing root dependencies...
  call npm install
)

if not exist "frontend\node_modules" (
  echo Installing frontend dependencies...
  cd frontend
  call npm install
  cd ..
)

if not exist "backend\node_modules" (
  echo Installing backend dependencies...
  cd backend
  call npm install
  cd ..
)

:: Run the application
echo Starting servers...
echo.
call npm run dev
