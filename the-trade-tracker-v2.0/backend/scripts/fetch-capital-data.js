/**
 * Standalone script to fetch market data from Capital.com API
 * and generate a chart using the chart engine
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
dotenv.config();

// Constants
const CHART_ENGINE_URL = process.env.CHART_ENGINE_URL || 'http://localhost:5001';
const CAPITAL_API_URL = process.env.CAPITAL_API_URL || 'https://demo-api-capital.backend-capital.com/';
const API_KEY = process.env.CAPITAL_API_KEY;
const IDENTIFIER = process.env.CAPITAL_IDENTIFIER;
const PASSWORD = process.env.CAPITAL_PASSWORD;

// Output directory for test results
const outputDir = path.join(__dirname, 'test-output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Logger helper
const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()}] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()}] ${msg}`),
  success: (msg) => console.log(`[SUCCESS] ${new Date().toISOString()}] ${msg}`)
};

// Create a Capital.com API client
const createCapitalClient = async () => {
  if (!API_KEY || !IDENTIFIER || !PASSWORD) {
    throw new Error('Missing Capital.com API credentials in .env file');
  }

  const apiClient = axios.create({
    baseURL: CAPITAL_API_URL,
    headers: {
      'X-CAP-API-KEY': API_KEY,
      'Content-Type': 'application/json',
    },
  });

  // Create a session
  const response = await apiClient.post('api/v1/session', {
    identifier: IDENTIFIER,
    password: PASSWORD,
  });

  // Extract authentication tokens
  const cst = response.headers['cst'];
  const securityToken = response.headers['x-security-token'];

  // Update API client with authentication headers
  apiClient.defaults.headers.common['CST'] = cst;
  apiClient.defaults.headers.common['X-SECURITY-TOKEN'] = securityToken;

  return apiClient;
};

// Fetch historical price data from Capital.com
const fetchHistoricalPrices = async (apiClient, epic, resolution = 'HOUR', max = 300) => {
  const response = await apiClient.get(`api/v1/prices/${epic}`, {
    params: {
      resolution,
      max,
    }
  });

  return response.data;
};

// Format the data for the chart engine
const formatDataForChartEngine = (priceData) => {
  if (!priceData || !priceData.prices || priceData.prices.length === 0) {
    throw new Error('No price data returned');
  }

  return priceData.prices.map(candle => ({
    datetime: candle.snapshotTimeUTC,
    open: (candle.openPrice.bid + candle.openPrice.ask) / 2, // Use mid price
    high: (candle.highPrice.bid + candle.highPrice.ask) / 2,
    low: (candle.lowPrice.bid + candle.lowPrice.ask) / 2,
    close: (candle.closePrice.bid + candle.closePrice.ask) / 2,
    volume: candle.lastTradedVolume || 0
  }));
};

// Generate a chart using the chart engine
const generateChart = async (ohlcvData) => {
  // Set chart options
  const options = {
    width: 1200,
    height: 800,
    chart_type: 'candle',
    indicators: {
      'SMA': { 'window': 20, 'color': 'blue' },
      'EMA': { 'window': 50, 'color': 'orange' },
      'MACD': { 'fast': 12, 'slow': 26, 'signal': 9 }
    }
  };

  // Prepare request data
  const requestData = {
    data: ohlcvData,
    ...options
  };

  // Call the chart engine service
  const response = await axios.post(`${CHART_ENGINE_URL}/generate-chart`, requestData, {
    timeout: 60000, // 60 second timeout
    headers: { 'Content-Type': 'application/json' }
  });

  return response.data;
};

// Save the chart to a file
const saveChart = (chartData, outputPath) => {
  if (!chartData.chart_image) {
    throw new Error('No chart image returned');
  }

  // Extract the base64 data (remove the prefix if exists)
  const base64Data = chartData.chart_image.replace(/^data:image\/png;base64,/, '');
  
  // Write the image to disk
  fs.writeFileSync(outputPath, base64Data, 'base64');
  
  return outputPath;
};

// Main function
const main = async () => {
  try {
    logger.info('Starting Capital.com API integration test');
    
    // Get command line arguments
    const args = process.argv.slice(2);
    const epic = args[0] || 'BTCUSD'; // Default to BTCUSD if not specified
    const resolution = args[1] || 'HOUR'; // Default to HOUR if not specified
    
    logger.info(`Using market: ${epic}, timeframe: ${resolution}`);
    
    // Initialize Capital.com API client
    logger.info('Initializing Capital.com API client...');
    const capitalClient = await createCapitalClient();
    logger.success('Successfully authenticated with Capital.com API');
    
    // Fetch historical price data
    logger.info(`Fetching historical price data for ${epic}...`);
    const priceData = await fetchHistoricalPrices(capitalClient, epic, resolution);
    logger.success(`Successfully fetched ${priceData.prices?.length || 0} candles`);
    
    // Format data for chart engine
    logger.info('Formatting data for chart engine...');
    const ohlcvData = formatDataForChartEngine(priceData);
    
    // Save raw data to file for debugging
    const rawDataPath = path.join(outputDir, `${epic}_${resolution}_data.json`);
    fs.writeFileSync(rawDataPath, JSON.stringify(ohlcvData, null, 2));
    logger.info(`Raw data saved to ${rawDataPath}`);
    
    // Generate chart
    logger.info('Generating chart...');
    const chartResult = await generateChart(ohlcvData);
    logger.success('Chart generated successfully');
    
    // Save chart to file
    const chartPath = path.join(outputDir, `${epic}_${resolution}_chart_${uuidv4().split('-')[0]}.png`);
    saveChart(chartResult, chartPath);
    logger.success(`Chart saved to ${chartPath}`);
    
    // Output summary
    logger.info('\nSummary:');
    logger.info(`- Market: ${epic}`);
    logger.info(`- Timeframe: ${resolution}`);
    logger.info(`- Candles: ${ohlcvData.length}`);
    logger.info(`- Chart saved to: ${chartPath}`);
    logger.info(`- Raw data saved to: ${rawDataPath}`);
    
    return {
      success: true,
      chartPath,
      rawDataPath,
      candlesCount: ohlcvData.length
    };
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    if (error.response) {
      logger.error(`Status: ${error.response.status}`);
      logger.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    logger.error(error.stack);
    
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
};

// Run the script if executed directly
if (require.main === module) {
  main()
    .then((result) => {
      if (result.success) {
        logger.success('Script completed successfully');
        process.exit(0);
      } else {
        logger.error('Script failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      logger.error(`Unhandled error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  fetchHistoricalPrices,
  formatDataForChartEngine,
  generateChart,
  saveChart
};
