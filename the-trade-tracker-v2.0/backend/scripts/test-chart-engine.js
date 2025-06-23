/**
 * Test script to verify the chart engine is now working with our fixes
 */
const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Configuration
const CHART_ENGINE_URL = process.env.CHART_ENGINE_URL || 'http://localhost:5001';
const OUTPUT_DIR = path.join(__dirname, 'test-output');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('CHART ENGINE VERIFICATION TEST');
console.log('=============================');
console.log(`Chart Engine URL: ${CHART_ENGINE_URL}`);

// Generate sample data
function generateSampleData(count = 100) {
  const data = [];
  let time = Date.now() - (count * 60 * 60 * 1000); // Start 'count' hours ago
  let price = 100;
  
  for (let i = 0; i < count; i++) {
    // Random price movement
    const change = (Math.random() - 0.5) * 2;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random();
    const low = Math.min(open, close) - Math.random();
    const volume = Math.floor(Math.random() * 1000) + 100;
    
    data.push({
      datetime: new Date(time).toISOString(),
      open: open,
      high: high,
      low: low,
      close: close,
      volume: volume
    });
    
    time += 60 * 60 * 1000; // Add 1 hour
    price = close; // Use close as next open
  }
  
  return data;
}

// Test the chart engine endpoint
async function testChartEngine() {
  try {
    console.log('\nTesting basic connectivity...');
    
    // First test the health endpoint
    const healthResponse = await axios.get(`${CHART_ENGINE_URL}/ping`, { timeout: 5000 });
    console.log(`✅ Health check successful: ${JSON.stringify(healthResponse.data)}`);
    
    // Generate test data with 100 candles
    console.log('\nGenerating test chart with 100 candles...');
    const data = generateSampleData(100);
    
    // Create request data with simple indicators
    const requestData = {
      data: data,
      chart_type: 'candle',
      width: 800,
      height: 600,
      indicators: {
        'SMA': { 'period': 20, 'color': 'blue' }
      }
    };
    
    // Send request to chart engine
    console.log('Sending request to chart engine...');
    const startTime = Date.now();
    
    const response = await axios.post(`${CHART_ENGINE_URL}/generate-chart`, requestData, {
      timeout: 30000, // 30 second timeout
      headers: { 'Content-Type': 'application/json' }
    });
    
    const duration = Date.now() - startTime;
    
    // Check if we got a chart image
    if (response.data && response.data.chart_image) {
      console.log(`✅ Chart generated successfully in ${duration}ms!`);
      console.log(`Chart size: ${response.data.chart_image.length} bytes`);
      
      // Save the chart image to a file
      const imagePath = path.join(OUTPUT_DIR, 'test-chart.png');
      const imageBuffer = Buffer.from(response.data.chart_image, 'base64');
      fs.writeFileSync(imagePath, imageBuffer);
      
      console.log(`✅ Chart saved to: ${imagePath}`);
      return true;
    } else {
      console.log('❌ No chart image in response');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing chart engine:');
    
    if (error.response) {
      // The server responded with an error
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // No response received
      console.error('No response received from server');
      console.error(`Timeout: ${error.code === 'ECONNABORTED'}`);
    } else {
      // Error setting up the request
      console.error(`Error: ${error.message}`);
    }
    
    return false;
  }
}

// Run the test
testChartEngine().then(success => {
  if (success) {
    console.log('\n✅ Chart engine is working properly!');
    console.log('The implementation fixes have resolved the timeout issues.');
  } else {
    console.log('\n❌ Chart engine is still having issues.');
    console.log('Further debugging may be required.');
  }
});
