@echo off
echo Starting Trade Tracker Chart Engine
echo ------------------------------

REM Set Python executable based on availability
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  set PYTHON_CMD=python
) else (
  where python3 >nul 2>nul
  if %ERRORLEVEL% EQU 0 (
    set PYTHON_CMD=python3
  ) else (
    echo Python not found. Please install Python 3.x
    exit /b 1
  )
)

echo Using Python command: %PYTHON_CMD%

REM Check if chart-engine directory exists
if not exist "chart-engine" (
  echo Chart engine directory not found
  exit /b 1
)

REM Check if requirements.txt exists
if not exist "chart-engine\requirements.txt" (
  echo requirements.txt not found in chart-engine directory
  exit /b 1
)

REM Install requirements
echo Installing Python requirements...
%PYTHON_CMD% -m pip install -r chart-engine\requirements.txt

REM Set environment variables
set CHART_ENGINE_PORT=5001
set CHART_ENGINE_HOST=0.0.0.0
set PYTHONUNBUFFERED=1

echo Starting chart engine on http://localhost:5001
cd chart-engine
%PYTHON_CMD% main.py

echo Chart engine service stopped
exit /b 0
