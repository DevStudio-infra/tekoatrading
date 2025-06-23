/**
 * Advanced diagnostic script for debugging the chart engine
 * This script provides detailed information about the chart engine and tests
 * various configurations to identify what's causing timeouts
 */
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Configuration
const CHART_ENGINE_URL = process.env.CHART_ENGINE_URL || 'http://localhost:5001';
const TEST_FILE_PATH = path.join(__dirname, 'chart-engine-test-result.json');

console.log('CHART ENGINE ADVANCED DIAGNOSTICS');
console.log('================================');
console.log(`Chart Engine URL: ${CHART_ENGINE_URL}`);

/**
 * Check if the chart engine process is running
 */
function checkChartEngineProcess() {
  console.log('\nChecking if chart engine process is running...');
  try {
    // Try different commands based on OS
    let processInfo;
    if (process.platform === 'win32') {
      // Windows
      processInfo = execSync('tasklist | findstr python').toString();
    } else {
      // Unix-like
      processInfo = execSync('ps aux | grep python | grep -v grep').toString();
    }
    
    console.log('Found related processes:');
    console.log(processInfo);
    return true;
  } catch (error) {
    console.log('No Python process found that might be running the chart engine');
    return false;
  }
}

/**
 * Test basic connectivity to the chart engine
 */
async function testConnectivity() {
  console.log('\nTesting basic connectivity to chart engine...');
  try {
    const response = await axios.get(CHART_ENGINE_URL, { 
      timeout: 5000,
      validateStatus: () => true // Accept any status code
    });
    
    console.log(`✅ Connected to chart engine. Status: ${response.status}`);
    console.log(`Response: ${JSON.stringify(response.data || {})}`);
    return true;
  } catch (error) {
    console.log(`❌ Failed to connect to chart engine: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('The chart engine server is not running or refusing connections');
    } else if (error.code === 'ECONNABORTED') {
      console.log('Connection timed out - the server might be overloaded or hung');
    } else if (error.response) {
      console.log(`Server responded with status ${error.response.status}`);
    }
    
    return false;
  }
}

/**
 * Generate sample candle data of specified size
 */
function generateSampleCandles(count) {
  const candles = [];
  let startTime = new Date().getTime() - (count * 60 * 1000); // 1 minute candles
  let price = 100;
  
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 2; // Random price movement
    const high = price + Math.abs(change);
    const low = price - Math.abs(change);
    const open = price;
    const close = price + change;
    
    candles.push({
      timestamp: startTime,
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 1000) + 100
    });
    
    startTime += 60 * 1000; // Add 1 minute
    price = close;
  }
  
  return candles;
}

/**
 * Test chart generation with different candle sizes and indicator configs
 */
async function testChartConfigurations() {
  console.log('\nTesting chart generation with different configurations...');
  
  // Test different candle counts
  const candleCounts = [50, 100, 200];
  // Test with different indicator combinations
  const indicatorConfigs = [
    { name: 'No indicators', indicators: {} },
    { name: 'Simple SMA only', indicators: { 'SMA': { 'window': 20, 'color': 'blue' } } },
    { name: 'Multiple indicators', indicators: {
      'SMA': { 'window': 20, 'color': 'blue' },
      'EMA': { 'window': 50, 'color': 'orange' }
    }}
  ];
  
  const results = [];
  
  // Loop through all combinations
  for (const candleCount of candleCounts) {
    const sampleCandles = generateSampleCandles(candleCount);
    
    for (const config of indicatorConfigs) {
      console.log(`\nTesting with ${candleCount} candles and ${config.name}...`);
      
      const requestData = {
        candles: sampleCandles,
        indicators: config.indicators,
        width: 800,
        height: 600,
        chart_type: 'candle'
      };
      
      const startTime = Date.now();
      let success = false;
      let errorMessage = '';
      
      try {
        const response = await axios.post(`${CHART_ENGINE_URL}/generate-chart`, requestData, {
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' }
        });
        
        const duration = Date.now() - startTime;
        
        if (response.data && response.data.chart_image) {
          console.log(`✅ SUCCESS! Chart generated in ${duration}ms`);
          success = true;
        } else {
          console.log(`❌ ERROR: Got response but no chart image data`);
          errorMessage = 'No chart image in response';
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        
        if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
          console.log(`❌ TIMEOUT: Request timed out after ${duration}ms`);
          errorMessage = 'Request timed out';
        } else if (axios.isAxiosError(error) && error.response) {
          console.log(`❌ ERROR: Server responded with status ${error.response.status}`);
          errorMessage = `HTTP ${error.response.status}: ${error.message}`;
        } else {
          console.log(`❌ ERROR: ${error.message}`);
          errorMessage = error.message;
        }
      }
      
      results.push({
        candleCount,
        indicators: config.name,
        success,
        error: errorMessage
      });
    }
  }
  
  // Save results for review
  fs.writeFileSync(TEST_FILE_PATH, JSON.stringify(results, null, 2));
  console.log(`\nTest results saved to ${TEST_FILE_PATH}`);
  
  // Analyze results
  console.log('\nTest summary:');
  const successCount = results.filter(r => r.success).length;
  console.log(`- Total tests: ${results.length}`);
  console.log(`- Successful: ${successCount}`);
  console.log(`- Failed: ${results.length - successCount}`);
  
  // Find patterns
  if (results.length > 0) {
    const succeedWithoutIndicators = results.some(r => r.success && r.indicators === 'No indicators');
    const succeedWithFewCandles = results.some(r => r.success && r.candleCount === 50);
    
    console.log('\nPatterns identified:');
    if (succeedWithoutIndicators) {
      console.log('✅ Charts without indicators worked - complex indicators might be causing timeouts');
    }
    if (succeedWithFewCandles) {
      console.log('✅ Charts with fewer candles worked - high candle counts might be causing timeouts');
    }
    
    // Find threshold (if any)
    const maxWorkingCandleCount = Math.max(...results.filter(r => r.success).map(r => r.candleCount), 0);
    if (maxWorkingCandleCount > 0) {
      console.log(`\nRecommendation: Limit to ${maxWorkingCandleCount} candles for reliable operation`);
    }
  }
  
  return results;
}

/**
 * Simple request to check if the endpoint is responding at all
 */
async function simplePingTest() {
  console.log('\nSending a simple ping to /ping endpoint...');
  
  try {
    // Many FastAPI apps have a /ping or /health endpoint
    const endpoints = ['/', '/ping', '/health', '/status'];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${CHART_ENGINE_URL}${endpoint}`, { 
          timeout: 3000,
          validateStatus: () => true
        });
        console.log(`✅ Endpoint ${endpoint} responded with status ${response.status}`);
      } catch (error) {
        console.log(`❌ Endpoint ${endpoint} failed: ${error.message}`);
      }
    }
  } catch (error) {
    console.log(`❌ All ping attempts failed: ${error.message}`);
  }
}

/**
 * Check the chart engine code to see if we're running the right URL
 */
function checkChartEngineCode() {
  // Look for the chart engine code
  const possiblePaths = [
    path.join(__dirname, '..', 'chart-engine'),
    path.join(__dirname, '..', '..', 'chart-engine'),
  ];
  
  console.log('\nLooking for chart engine code...');
  
  for (const enginePath of possiblePaths) {
    if (fs.existsSync(enginePath)) {
      console.log(`✅ Found chart engine at: ${enginePath}`);
      
      // Check for app.py or main.py
      const pyFiles = ['app.py', 'main.py', 'server.py'].filter(f => 
        fs.existsSync(path.join(enginePath, f))
      );
      
      if (pyFiles.length > 0) {
        console.log(`✅ Found Python files: ${pyFiles.join(', ')}`);
        
        // Try to read the file to see the port configuration
        try {
          const mainFile = path.join(enginePath, pyFiles[0]);
          const content = fs.readFileSync(mainFile, 'utf8');
          
          // Simple regex to find port in Python code
          const portMatches = content.match(/port\s*=\s*(\d+)/i) || 
                             content.match(/PORT\s*=\s*(\d+)/i) ||
                             content.match(/host="[^"]*:(\d+)"/i);
                             
          if (portMatches && portMatches[1]) {
            console.log(`✅ Chart engine appears to be using port: ${portMatches[1]}`);
            
            // Check if this matches our URL
            const urlPort = CHART_ENGINE_URL.match(/:(\d+)/);
            if (urlPort && urlPort[1] !== portMatches[1]) {
              console.log(`⚠️ WARNING: Chart engine code uses port ${portMatches[1]} but we're connecting to port ${urlPort[1]}`);
            }
          }
        } catch (error) {
          console.log(`❌ Error reading Python file: ${error.message}`);
        }
      } else {
        console.log(`❌ No Python files found in chart engine directory`);
      }
      
      return;
    }
  }
  
  console.log(`❌ Could not find chart engine code in expected locations`);
}

/**
 * Run the full diagnostic
 */
async function runDiagnostic() {
  console.log(`Running diagnostics at: ${new Date().toLocaleString()}\n`);

  // First check the chart engine process
  checkChartEngineProcess();
  
  // Check the code for configuration issues
  checkChartEngineCode();
  
  // Test basic connectivity
  const connected = await testConnectivity();
  
  // If not even connecting, try simple ping
  if (!connected) {
    await simplePingTest();
    
    console.log('\n❌ Cannot connect to chart engine server.');
    console.log('Recommendations:');
    console.log('1. Check if the Python chart engine service is running');
    console.log('2. Verify the CHART_ENGINE_URL in your .env file is correct');
    console.log('3. Make sure there are no firewall issues blocking connections');
    console.log('4. Try restarting the chart engine service');
    
    return false;
  }
  
  // Test different chart configurations
  await testChartConfigurations();
  
  console.log('\nDiagnostic complete!');
  return true;
}

// Run the diagnostic
runDiagnostic().catch(error => {
  console.error(`Unexpected error during diagnostic: ${error.message}`);
});
