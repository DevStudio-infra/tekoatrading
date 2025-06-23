/**
 * Trade Tracker combined starter script
 * Launches the Node.js backend, Python chart engine, and other required services
 * Handles proper startup, shutdown and dependency management
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Global tracking of processes for proper shutdown
let chartEngineProcess = null;
let backendProcess = null;

// Log with timestamp and color using console colors
function log(message, type = 'info') {
  const date = new Date().toISOString().split('T')[1].slice(0, 8);
  const prefix = `[${date}]`;
  
  switch (type) {
    case 'info':
      console.log(`\x1b[34m${prefix}\x1b[0m`, message); // Blue
      break;
    case 'success':
      console.log(`\x1b[32m${prefix}\x1b[0m`, message); // Green
      break;
    case 'error':
      console.log(`\x1b[31m${prefix}\x1b[0m`, message); // Red
      break;
    case 'warning':
      console.log(`\x1b[33m${prefix}\x1b[0m`, message); // Yellow
      break;
    default:
      console.log(`\x1b[37m${prefix}\x1b[0m`, message); // White
  }
}

// Start Python chart engine
function startChartEngine() {
  log('Starting Python chart engine...', 'info');
  
  const chartEnginePath = path.resolve(__dirname, 'chart-engine');
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  
  // Install Python requirements first
  log('Installing Python dependencies...', 'info');
  try {
    const pipInstall = spawn(pythonCmd, ['-m', 'pip', 'install', '-r', path.join(chartEnginePath, 'requirements.txt')], {
      stdio: 'pipe',
      shell: true
    });
    
    pipInstall.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach(line => log(`[PIP] ${line}`, 'info'));
    });
    
    pipInstall.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      lines.forEach(line => log(`[PIP ERROR] ${line}`, 'warning'));
    });
    
    pipInstall.on('close', (code) => {
      if (code !== 0) {
        log(`Python dependencies installation exited with code ${code}`, 'warning');
      } else {
        log('Python dependencies installed successfully', 'success');
      }
      // Start all services in parallel
      try {
        startAll();
      } catch (error) {
        log(`Failed to start all services: ${error.message}`, 'error');
        process.exit(1);
      }
    });
  } catch (error) {
    log(`Failed to install Python dependencies: ${error.message}`, 'error');
    // Try to start chart engine anyway
    startAll();
  }
}

async function startPythonChartEngine() {
  const chartEnginePath = path.resolve(__dirname, 'chart-engine');
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  
  // Set environment variables for the chart engine
  const env = {
    ...process.env,
    CHART_ENGINE_PORT: '5001',
    CHART_ENGINE_HOST: '0.0.0.0',
    PYTHONUNBUFFERED: '1' // Important for real-time logging
  };
  
  // Return the process so we can track it for proper shutdown
  const pythonProcess = spawn(pythonCmd, ['main.py'], {
    cwd: chartEnginePath,
    shell: true,
    stdio: 'pipe',
    env
  });
  
  pythonProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach(line => log(`[CHART ENGINE] ${line}`, 'info'));
  });
  
  pythonProcess.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach(line => log(`[CHART ENGINE ERROR] ${line}`, 'error'));
  });
  
  pythonProcess.on('error', (error) => {
    log(`Failed to start chart engine: ${error.message}`, 'error');
  });
  
  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      log(`Chart engine process exited with code ${code}`, 'error');
      // Restart the chart engine if it crashes
      setTimeout(startChartEngine, 5000);
    }
  });
  
  return pythonProcess;
}

// Start Node.js backend
function startBackend() {
  log('Starting Node.js backend...', 'info');
  
  const backendProcess = spawn('npx', ['ts-node', 'index.ts'], {
    shell: true,
    stdio: 'pipe'
  });
  
  backendProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach(line => log(`[BACKEND] ${line}`, 'info'));
  });
  
  backendProcess.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach(line => log(`[BACKEND] ${line}`, 'error'));
  });
  
  backendProcess.on('close', (code) => {
    if (code === 0) {
      log('Backend process exited normally', 'success');
    } else {
      log(`Backend process exited with code ${code}`, 'error');
    }
  });
  
  // Return the process for proper shutdown tracking
  return backendProcess;
}

// Set up graceful shutdown
function setupGracefulShutdown() {
  // Ensure processes are killed on exit
  process.on('SIGINT', () => {
    log('Shutting down all services...', 'warning');
    
    // Safely kill processes if they exist
    if (chartEngineProcess) {
      try { 
        chartEngineProcess.kill(); 
        log('Chart engine process terminated', 'info');
      } catch (err) { 
        log(`Error terminating chart engine: ${err.message}`, 'error');
      }
    }
    
    if (backendProcess) {
      try { 
        backendProcess.kill(); 
        log('Backend process terminated', 'info');
      } catch (err) { 
        log(`Error terminating backend: ${err.message}`, 'error');
      }
    }
    
    log('All services stopped', 'success');
    process.exit(0);
  });
  
  // Keep the process alive
  setInterval(() => {}, 1000);
}

// Main function to start all services
async function startAll() {
  try {
    log('╔════════════════════════════════════════════════╗', 'success');
    log('║     Trade Tracker - Starting Services          ║', 'success');
    log('╚════════════════════════════════════════════════╝', 'success');
    
    // First start the chart engine
    chartEngineProcess = await startPythonChartEngine();
    
    // Wait a bit for the chart engine to initialize
    setTimeout(() => {
      // Then start the backend
      backendProcess = startBackend();
      
      // Set up graceful shutdown
      setupGracefulShutdown();
      
      log('All services started successfully', 'success');
    }, 2000);
  } catch (error) {
    log(`Failed to start services: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Start everything
startAll();
