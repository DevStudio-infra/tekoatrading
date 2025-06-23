/**
 * Convert Trading Pairs JSON to CSV for efficient PostgreSQL COPY
 * 
 * This script converts the trading_pairs.json file to a CSV format
 * that can be directly imported using PostgreSQL's COPY command
 */

const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');

// Check if csv-writer is installed, if not, show installation instructions
try {
  require.resolve('csv-writer');
} catch (e) {
  console.error('Error: csv-writer module not found. Please install it with:');
  console.error('npm install csv-writer');
  process.exit(1);
}

// Configuration
const JSON_FILE_PATH = path.resolve(__dirname, '../../assets/trading_pairs.json');
const CSV_FILE_PATH = path.resolve(__dirname, '../../assets/trading_pairs.csv');
const SQL_FILE_PATH = path.resolve(__dirname, './import-trading-pairs-copy.sql');

// Main function
async function convertJsonToCsv() {
  try {
    console.log('Reading JSON file...');
    const jsonData = fs.readFileSync(JSON_FILE_PATH, 'utf8');
    const tradingPairs = JSON.parse(jsonData);
    
    console.log(`Found ${tradingPairs.length} trading pairs to convert`);
    
    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: CSV_FILE_PATH,
      header: [
        { id: 'symbol', title: 'symbol' },
        { id: 'name', title: 'name' },
        { id: 'description', title: 'description' },
        { id: 'market_id', title: 'market_id' },
        { id: 'type', title: 'type' },
        { id: 'category', title: 'category' },
        { id: 'broker_name', title: 'broker_name' },
        { id: 'is_active', title: 'is_active' },
        { id: 'metadata', title: 'metadata' },
        { id: 'last_updated', title: 'last_updated' },
        { id: 'created_at', title: 'created_at' }
      ]
    });
    
    // Transform trading pairs for CSV
    const transformedPairs = tradingPairs.map(pair => ({
      symbol: pair.symbol,
      name: pair.name,
      description: pair.description || '',
      market_id: pair.market_id || '',
      type: pair.type,
      category: pair.category,
      broker_name: pair.broker_name,
      is_active: pair.is_active ? 'true' : 'false',
      metadata: pair.metadata ? JSON.stringify(pair.metadata) : '',
      last_updated: pair.last_updated,
      created_at: pair.created_at
    }));
    
    // Write to CSV
    console.log('Writing CSV file...');
    await csvWriter.writeRecords(transformedPairs);
    
    // Create SQL file for import
    console.log('Creating SQL import file...');
    const sqlContent = `-- Trading Pairs Import using COPY command
-- Generated on ${new Date().toISOString()}
-- Total pairs: ${tradingPairs.length}

-- First, truncate the table
TRUNCATE TABLE public.trading_pairs RESTART IDENTITY CASCADE;

-- Import from CSV using COPY
\\COPY public.trading_pairs(symbol, name, description, market_id, type, category, broker_name, is_active, metadata, last_updated, created_at) 
FROM '${CSV_FILE_PATH.replace(/\\/g, '\\\\')}' 
WITH (FORMAT csv, HEADER true, NULL '', QUOTE '"');

-- Check the count
SELECT COUNT(*) FROM public.trading_pairs;

-- Add useful indices
CREATE INDEX IF NOT EXISTS idx_trading_pairs_broker_name ON public.trading_pairs(broker_name);
CREATE INDEX IF NOT EXISTS idx_trading_pairs_type ON public.trading_pairs(type);
CREATE INDEX IF NOT EXISTS idx_trading_pairs_category ON public.trading_pairs(category);
`;
    
    fs.writeFileSync(SQL_FILE_PATH, sqlContent);
    
    console.log(`CSV file created at: ${CSV_FILE_PATH}`);
    console.log(`SQL file created at: ${SQL_FILE_PATH}`);
    console.log('\nTo import the data:');
    console.log('1. Install the necessary npm package: npm install csv-writer');
    console.log('2. Run this script: node json-to-csv-converter.js');
    console.log('3. Use the generated SQL file with psql command:');
    console.log(`   psql -h db.fjraryjhmsjmplbpmafw.supabase.co -U postgres -d postgres -f ${SQL_FILE_PATH}`);
    console.log('   (You will be prompted for the database password)');

  } catch (error) {
    console.error('Error:', error);
  }
}

// Install required package if not present
if (!fs.existsSync(path.resolve(__dirname, '../node_modules/csv-writer'))) {
  console.log('csv-writer package not found. Installing...');
  console.log('Please run: npm install csv-writer');
  process.exit(1);
} else {
  // Run the conversion
  convertJsonToCsv();
}
