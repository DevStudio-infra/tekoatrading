/**
 * Diagnostic script to check the chart engine is functioning properly
 */
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Configuration for the test
const CHART_ENGINE_URL = process.env.CHART_ENGINE_URL || 'http://localhost:5001';
const SAMPLE_SIZE = 100; // Smaller sample size for quicker test

console.log('CHART ENGINE DIAGNOSTIC TEST');
console.log('===========================');
console.log(`Chart Engine URL: ${CHART_ENGINE_URL}`);

/**
 * Generate sample candle data for testing
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
 * Test chart generation with different timeouts
 */
async function testChartGeneration() {
  const sampleCandles = generateSampleCandles(SAMPLE_SIZE);
  
  const requestData = {
    candles: sampleCandles,
    indicators: {
      'SMA': { 'window': 20, 'color': 'blue' },
      'EMA': { 'window': 50, 'color': 'orange' }
    },
    width: 800,
    height: 600,
    chart_type: 'candle'
  };
  
  console.log(`\nTesting chart generation with ${SAMPLE_SIZE} candles and simple indicators...`);
  
  // Test with increasing timeouts
  const timeouts = [10000, 20000, 30000];
  
  for (const timeout of timeouts) {
    console.log(`\nAttempting chart generation with ${timeout}ms timeout...`);
    
    const startTime = Date.now();
    
    try {
      const response = await axios.post(`${CHART_ENGINE_URL}/generate-chart`, requestData, {
        timeout,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const duration = Date.now() - startTime;
      
      if (response.data && response.data.chart_image) {
        console.log(`✅ SUCCESS! Chart generated in ${duration}ms`);
        console.log(`Chart image base64 length: ${response.data.chart_image.length.toLocaleString()} characters`);
        
        // Save the test image for reference
        console.log(`\nChart engine is working correctly!`);
        return true;
      } else {
        console.log(`❌ ERROR: Got response but no chart image data`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        console.log(`❌ TIMEOUT: Request timed out after ${duration}ms`);
      } else if (axios.isAxiosError(error) && error.response) {
        console.log(`❌ ERROR: Server responded with status ${error.response.status}`);
        console.log(`Error details: ${error.message}`);
      } else {
        console.log(`❌ ERROR: ${error.message}`);
      }
    }
  }
  
  console.log(`\n⚠️ Chart engine is not responding properly.`);
  console.log(`Possible issues:`);
  console.log(`1. Chart engine server may not be running`);
  console.log(`2. Chart engine process might be crashed or frozen`);
  console.log(`3. Generating charts may take longer than the timeout period`);
  console.log(`\nSuggestions:`);
  console.log(`1. Restart the chart engine service`);
  console.log(`2. Check chart engine logs for errors`);
  console.log(`3. Increase timeouts in chart.service.ts`);
  console.log(`4. Reduce complexity of chart requests (fewer candles/indicators)`);
  
  return false;
}

// Run the test
testChartGeneration().catch(error => {
  console.error(`Unexpected error during test: ${error.message}`);
});
