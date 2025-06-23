/**
 * Import Trading Pairs using Supabase JavaScript Client
 * 
 * This approach uses the official Supabase client which has better handling for
 * large datasets compared to direct SQL migrations.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Supabase connection details
const SUPABASE_URL = process.env.DIRECT_URL || "postgresql://postgres.fjraryjhmsjmplbpmafw:Laquie8501%23@aws-0-eu-central-1.pooler.supabase.com:5432/postgres";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Replace with your anon key if needed

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Configuration
const FILE_PATH = path.resolve(__dirname, '../../assets/trading_pairs.json');
const BATCH_SIZE = 50; // Smaller batch size for more reliable processing

// Transform a trading pair for insertion
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
    last_updated: new Date(pair.last_updated),
    created_at: new Date(pair.created_at)
  };
}

// Process trading pairs in batches
async function importTradingPairs() {
  try {
    console.log('Starting trading pairs import...');
    
    // Read trading pairs from JSON file
    const data = fs.readFileSync(FILE_PATH, 'utf8');
    const tradingPairs = JSON.parse(data);
    console.log(`Found ${tradingPairs.length} trading pairs to import`);
    
    // Check existing count before import
    const { count: existingCount, error: countError } = await supabase
      .from('trading_pairs')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('Error getting current count:', countError);
      return;
    }
    console.log(`Current trading pairs in database: ${existingCount || 0}`);
    
    // Group pairs by type for better reporting
    const pairsByType = {};
    tradingPairs.forEach(pair => {
      if (!pairsByType[pair.type]) {
        pairsByType[pair.type] = [];
      }
      pairsByType[pair.type].push(pair);
    });
    
    // Output types summary
    console.log('\nTrading pairs by type:');
    Object.keys(pairsByType).forEach(type => {
      console.log(`${type}: ${pairsByType[type].length} pairs`);
    });
    
    // First clear existing data if needed
    console.log('\nClearing existing trading pairs...');
    const { error: deleteError } = await supabase
      .from('trading_pairs')
      .delete()
      .neq('id', 0); // Delete all rows
      
    if (deleteError) {
      console.error('Error clearing data:', deleteError);
      return;
    }
    
    // Process in batches
    const totalBatches = Math.ceil(tradingPairs.length / BATCH_SIZE);
    let totalProcessed = 0;
    let importErrors = 0;
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, tradingPairs.length);
      const batch = tradingPairs.slice(start, end).map(transformTradingPair);
      
      console.log(`\nProcessing batch ${batchIndex + 1}/${totalBatches} (items ${start + 1}-${end})`);
      
      // Insert batch
      const { error } = await supabase
        .from('trading_pairs')
        .upsert(batch, { 
          onConflict: 'symbol',
          ignoreDuplicates: false
        });
        
      if (error) {
        console.error(`Error in batch ${batchIndex + 1}:`, error);
        importErrors++;
      } else {
        totalProcessed += batch.length;
        console.log(`Batch ${batchIndex + 1} processed successfully`);
      }
      
      // Add a small delay between batches to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Check final count
    const { count: finalCount, error: finalCountError } = await supabase
      .from('trading_pairs')
      .select('*', { count: 'exact', head: true });
      
    if (finalCountError) {
      console.error('Error getting final count:', finalCountError);
    } else {
      console.log(`\nImport complete. Final trading pairs in database: ${finalCount || 0}`);
      console.log(`Total processed: ${totalProcessed}`);
      console.log(`Batches with errors: ${importErrors}`);
    }
    
  } catch (error) {
    console.error('Unhandled error during import:', error);
  }
}

// Run the import
importTradingPairs()
  .then(() => console.log('Script complete'))
  .catch(error => console.error('Script error:', error));
