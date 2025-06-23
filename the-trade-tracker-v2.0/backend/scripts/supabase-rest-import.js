/**
 * Import trading pairs using the Supabase REST API directly
 * This approach doesn't rely on SQL execution and should be more reliable
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Configuration
const JSON_FILE_PATH = path.resolve(__dirname, '../../assets/trading_pairs.json');
const BATCH_SIZE = 10; // Very small batches
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fjraryjhmsjmplbpmafw.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-service-key-here';

// Check if required modules are installed
try {
  require.resolve('node-fetch');
} catch (e) {
  console.error('Error: node-fetch is not installed. Run: npm install node-fetch@2');
  process.exit(1);
}

// Transform function
function transformTradingPair(pair) {
  return {
    symbol: pair.symbol,
    name: pair.name,
    description: pair.description,
    market_id: pair.market_id,
    type: pair.type,
    category: pair.category,
    broker_name: pair.broker_name,
    is_active: pair.is_active,
    metadata: pair.metadata,
    last_updated: pair.last_updated,
    created_at: pair.created_at
  };
}

// Helper to wait between requests
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main import function
async function importTradingPairs() {
  try {
    console.log('Starting import process...');
    
    // Read trading pairs data
    console.log('Reading trading pairs from JSON file...');
    const data = fs.readFileSync(JSON_FILE_PATH, 'utf8');
    const tradingPairs = JSON.parse(data);
    console.log(`Found ${tradingPairs.length} trading pairs to import`);
    
    // First, clear existing data using a DELETE request
    console.log('Clearing existing trading pairs...');
    
    try {
      const deleteResponse = await fetch(`${SUPABASE_URL}/rest/v1/trading_pairs?select=id`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal'
        }
      });
      
      if (!deleteResponse.ok) {
        throw new Error(`Failed to delete: ${deleteResponse.status} ${deleteResponse.statusText}`);
      }
      
      console.log('Existing data cleared successfully');
    } catch (error) {
      console.error('Error clearing existing data:', error.message);
      console.log('Continuing with import...');
    }
    
    // Process in very small batches
    const batches = [];
    for (let i = 0; i < tradingPairs.length; i += BATCH_SIZE) {
      batches.push(tradingPairs.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`Split into ${batches.length} micro-batches of ${BATCH_SIZE} pairs each`);
    
    // Process each batch
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} pairs)...`);
      
      try {
        // Transform batch for insertion
        const transformedBatch = batch.map(transformTradingPair);
        
        // Insert using the REST API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/trading_pairs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'return=minimal,resolution=merge-duplicates'
          },
          body: JSON.stringify(transformedBatch)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }
        
        // Update success count
        successCount += batch.length;
        console.log(`  ✓ Batch ${i + 1} imported successfully (${successCount}/${tradingPairs.length} total)`);
        
        // Add delay between batches
        await sleep(500);
        
      } catch (error) {
        console.error(`  ✗ Error in batch ${i + 1}:`, error.message);
        errorCount += batch.length;
        
        // Longer delay after error
        await sleep(1000);
      }
    }
    
    // Final verification - get count from the API
    console.log('\nVerifying import...');
    try {
      const countResponse = await fetch(`${SUPABASE_URL}/rest/v1/trading_pairs?select=id&limit=1`, {
        method: 'HEAD',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'count=exact'
        }
      });
      
      const finalCount = parseInt(countResponse.headers.get('content-range')?.split('/')[1] || '0', 10);
      
      console.log(`\nImport process completed!`);
      console.log(`Successfully imported: ${successCount} pairs`);
      console.log(`Failed to import: ${errorCount} pairs`);
      console.log(`Final count in database: ${finalCount} pairs`);
      
    } catch (error) {
      console.error('Error verifying final count:', error.message);
    }
    
  } catch (error) {
    console.error('Fatal error during import:', error);
  }
}

// Run the import
importTradingPairs()
  .then(() => console.log('Script completed.'))
  .catch(error => console.error('Script failed:', error));
