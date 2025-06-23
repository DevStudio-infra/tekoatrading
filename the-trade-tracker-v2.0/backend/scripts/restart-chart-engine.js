/**
 * Script to restart the chart engine
 * This will kill any running chart engine processes and start a new one
 */
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Configuration
const CHART_ENGINE_PATH = path.join(__dirname, '..', 'chart-engine');
const LOG_PATH = path.join(__dirname, '..', 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_PATH)) {
  fs.mkdirSync(LOG_PATH, { recursive: true });
}

const logFile = path.join(LOG_PATH, 'chart-engine.log');

console.log('CHART ENGINE RESTART UTILITY');
console.log('===========================');

/**
 * Kill existing chart engine processes
 */
function killExistingProcesses() {
  console.log('Stopping any running chart engine processes...');
  
  try {
    if (process.platform === 'win32') {
      // Windows - kill Python processes
      execSync('taskkill /f /im python.exe', { stdio: 'ignore' });
      console.log('✅ Sent kill signal to Python processes');
    } else {
      // Unix-like - use ps and grep to find and kill Python processes
      const psOutput = execSync('ps aux | grep -i "python.*chart-engine" | grep -v grep').toString();
      const processes = psOutput.split('\n').filter(line => line.trim());
      
      if (processes.length > 0) {
        processes.forEach(process => {
          const pid = process.trim().split(/\s+/)[1];
          if (pid) {
            execSync(`kill -9 ${pid}`);
            console.log(`✅ Killed process with PID ${pid}`);
          }
        });
      } else {
        console.log('No chart engine processes found to kill');
      }
    }
  } catch (error) {
    console.log('No existing chart engine processes found or could not kill');
  }
}

/**
 * Start the chart engine
 */
function startChartEngine() {
  console.log('\nStarting chart engine...');
  
  // Check if the chart engine directory exists
  if (!fs.existsSync(CHART_ENGINE_PATH)) {
    console.error(`❌ Chart engine directory not found at: ${CHART_ENGINE_PATH}`);
    return false;
  }
  
  // Find the main Python file
  const pyFiles = ['main.py', 'app.py', 'server.py'].filter(f => 
    fs.existsSync(path.join(CHART_ENGINE_PATH, f))
  );
  
  if (pyFiles.length === 0) {
    console.error('❌ No Python entry point file found (main.py, app.py, or server.py)');
    return false;
  }
  
  const mainFile = pyFiles[0];
  console.log(`Found entry point: ${mainFile}`);
  
  // Create output streams for logs
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  
  // Add timestamp to log
  logStream.write(`\n\n--- CHART ENGINE STARTED AT ${new Date().toISOString()} ---\n\n`);
  
  try {
    // Start the Python process
    const pythonProcess = spawn('python', [path.join(CHART_ENGINE_PATH, mainFile)], {
      cwd: CHART_ENGINE_PATH,
      detached: true, // Run in the background
      stdio: ['ignore', 'pipe', 'pipe'] // redirect stdout and stderr
    });
    
    // Log stdout and stderr to file
    pythonProcess.stdout.pipe(logStream);
    pythonProcess.stderr.pipe(logStream);
    
    // Unref the process to let it run after this script exits
    pythonProcess.unref();
    
    console.log(`✅ Chart engine started with PID ${pythonProcess.pid}`);
    console.log(`✅ Logs will be written to: ${logFile}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to start chart engine: ${error.message}`);
    return false;
  }
}

// Run the restart process
try {
  killExistingProcesses();
  
  console.log('\nWaiting for processes to fully terminate...');
  setTimeout(() => {
    const success = startChartEngine();
    
    if (success) {
      console.log('\n✅ Chart engine restart completed successfully!');
      console.log('The service should be available shortly.');
    } else {
      console.error('\n❌ Chart engine restart failed. Check the logs for details.');
    }
  }, 2000); // Wait 2 seconds before starting the new process
} catch (error) {
  console.error(`❌ Error during restart process: ${error.message}`);
}
