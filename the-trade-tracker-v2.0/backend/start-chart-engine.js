/**
 * Trade Tracker Chart Engine Launcher
 * This script starts the Python chart engine service separately from the main backend
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Log with timestamp and color
function log(message, type = 'info') {
  const date = new Date().toISOString().split('T')[1].slice(0, 8);
  const prefix = `[${date}]`;
  
  switch (type) {
    case 'info':
      console.log(`\x1b[36m${prefix} [CHART ENGINE]\x1b[0m`, message); // Cyan
      break;
    case 'success':
      console.log(`\x1b[32m${prefix} [CHART ENGINE]\x1b[0m`, message); // Green
      break;
    case 'error':
      console.log(`\x1b[31m${prefix} [CHART ENGINE]\x1b[0m`, message); // Red
      break;
    case 'warning':
      console.log(`\x1b[33m${prefix} [CHART ENGINE]\x1b[0m`, message); // Yellow
      break;
    default:
      console.log(`${prefix} [CHART ENGINE]`, message);
  }
}

// Function to check if Python is installed
async function checkPythonInstallation() {
  return new Promise((resolve) => {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const checkPython = spawn(pythonCmd, ['--version']);
    
    checkPython.on('error', () => {
      log(`${pythonCmd} not found. Please install Python 3.x`, 'error');
      resolve(false);
    });
    
    checkPython.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        log(`${pythonCmd} check failed with code ${code}`, 'error');
        resolve(false);
      }
    });
  });
}

// Function to check if required Python packages are installed
async function checkPythonRequirements() {
  return new Promise((resolve) => {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const chartEnginePath = path.resolve(__dirname, 'chart-engine');
    const requirementsPath = path.join(chartEnginePath, 'requirements.txt');
    
    if (!fs.existsSync(requirementsPath)) {
      log('requirements.txt not found', 'error');
      resolve(false);
      return;
    }
    
    // Check if pip is installed
    const pipCheck = spawn(pythonCmd, ['-m', 'pip', '--version']);
    
    pipCheck.on('error', () => {
      log('pip not found. Please install pip', 'error');
      resolve(false);
    });
    
    pipCheck.on('close', (code) => {
      if (code === 0) {
        // Install requirements
        log('Installing Python requirements...', 'info');
        const installProcess = spawn(pythonCmd, [
          '-m', 'pip', 'install', '-r', requirementsPath
        ], { stdio: 'pipe' });
        
        installProcess.stdout.on('data', (data) => {
          log(data.toString().trim());
        });
        
        installProcess.stderr.on('data', (data) => {
          log(data.toString().trim(), 'warning');
        });
        
        installProcess.on('close', (code) => {
          if (code === 0) {
            log('Requirements installed successfully', 'success');
            resolve(true);
          } else {
            log(`Failed to install requirements (exit code ${code})`, 'error');
            resolve(false);
          }
        });
      } else {
        log('pip check failed', 'error');
        resolve(false);
      }
    });
  });
}

// Start the Python chart engine
async function startChartEngine() {
  // Check Python installation
  const pythonInstalled = await checkPythonInstallation();
  if (!pythonInstalled) {
    log('Python is not properly installed. Cannot start the chart engine.', 'error');
    return false;
  }
  
  // Check and install Python requirements
  const requirementsInstalled = await checkPythonRequirements();
  if (!requirementsInstalled) {
    log('Python requirements installation failed. Trying to start anyway...', 'warning');
  }
  
  // Path to the chart engine
  const chartEnginePath = path.resolve(__dirname, 'chart-engine');
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  
  // Ensure the chart-engine directory exists
  if (!fs.existsSync(chartEnginePath)) {
    log(`Chart engine directory not found: ${chartEnginePath}`, 'error');
    return false;
  }
  
  // Check if the main.py file exists
  const mainPyPath = path.join(chartEnginePath, 'main.py');
  if (!fs.existsSync(mainPyPath)) {
    log(`Chart engine main.py not found: ${mainPyPath}`, 'error');
    return false;
  }
  
  // Start the Python process
  log('Starting Python chart engine...', 'info');
  
  const pythonProcess = spawn(pythonCmd, ['main.py'], {
    cwd: chartEnginePath,
    stdio: 'pipe',
    env: {
      ...process.env,
      CHART_ENGINE_PORT: '5001',
      CHART_ENGINE_HOST: '0.0.0.0',
      PYTHONUNBUFFERED: '1'  // Important for real-time logs
    }
  });
  
  pythonProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach(line => log(line));
  });
  
  pythonProcess.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach(line => log(line, 'error'));
  });
  
  pythonProcess.on('error', (error) => {
    log(`Failed to start Python process: ${error.message}`, 'error');
  });
  
  pythonProcess.on('close', (code) => {
    if (code === 0) {
      log('Chart engine process exited normally', 'success');
    } else {
      log(`Chart engine process exited with code ${code}`, 'error');
    }
  });
  
  // Add process handling for clean shutdown
  process.on('SIGINT', () => {
    log('Received SIGINT. Shutting down chart engine...', 'warning');
    pythonProcess.kill('SIGINT');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    log('Received SIGTERM. Shutting down chart engine...', 'warning');
    pythonProcess.kill('SIGTERM');
    process.exit(0);
  });
  
  return true;
}

// Start the chart engine
startChartEngine()
  .then(success => {
    if (success) {
      log('Chart engine started successfully. Listening at http://0.0.0.0:5001', 'success');
    } else {
      log('Failed to start chart engine', 'error');
      process.exit(1);
    }
  })
  .catch(error => {
    log(`Unexpected error: ${error.message}`, 'error');
    process.exit(1);
  });
