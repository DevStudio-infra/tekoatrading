/**
 * Automated Trading Pairs Import Script
 * 
 * This script uses the Supabase REST API to import trading pairs in small batches.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const JSON_FILE_PATH = path.resolve(__dirname, '../../assets/trading_pairs.json');
const BATCH_SIZE = 20; // Tested and proven to work reliably
const DELAY_BETWEEN_BATCHES = 500; // ms delay between batches

// Supabase project ID - already confirmed working in our tests
const SUPABASE_PROJECT_ID = 'fjraryjhmsjmplbpmafw';

// Wait function for adding delays between operations
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to transform a trading pair for SQL INSERT
function formatTradingPairForSQL(pair) {
  // Handle null values and proper escaping for SQL
  const description = pair.description !== null ? 
    `'${(pair.description || '').replace(/'/g, "''")}'` : 
    'NULL';
    
  const marketId = pair.market_id !== null ? 
    `'${(pair.market_id || '').replace(/'/g, "''")}'` : 
    'NULL';
    
  const metadata = pair.metadata !== null ? 
    `'${JSON.stringify(pair.metadata).replace(/'/g, "''")}'::jsonb` : 
    'NULL';
    
  return `('${pair.symbol.replace(/'/g, "''")}', '${pair.name.replace(/'/g, "''")}', ${description}, ${marketId}, '${pair.type.replace(/'/g, "''")}', '${pair.category.replace(/'/g, "''")}', '${pair.broker_name.replace(/'/g, "''")}', ${pair.is_active}, ${metadata}, '${pair.last_updated}'::timestamp, '${pair.created_at}'::timestamp)`;
}

// Main import function
async function importTradingPairs() {
  let client = null;
  
  try {
    console.log('Starting automated import process...');
    
    // Read the trading pairs from JSON
    console.log('Reading trading pairs from JSON file...');
    const data = fs.readFileSync(JSON_FILE_PATH, 'utf8');
    const tradingPairs = JSON.parse(data);
    console.log(`Found ${tradingPairs.length} trading pairs`);
    
    // Get a client from the pool
    client = await pool.connect();
    console.log('Connected to Supabase PostgreSQL database');
    
    // First, truncate the table to start fresh
    console.log('Truncating trading_pairs table...');
    await client.query('TRUNCATE TABLE public.trading_pairs RESTART IDENTITY CASCADE');
    
    // Create indices for better performance
    console.log('Creating indices for better performance...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_trading_pairs_broker_name ON public.trading_pairs(broker_name);
      CREATE INDEX IF NOT EXISTS idx_trading_pairs_type ON public.trading_pairs(type);
      CREATE INDEX IF NOT EXISTS idx_trading_pairs_category ON public.trading_pairs(category);
      CREATE INDEX IF NOT EXISTS idx_trading_pairs_is_active ON public.trading_pairs(is_active);
    `);
    
    // Calculate number of batches
    const batches = [];
    for (let i = 0; i < tradingPairs.length; i += BATCH_SIZE) {
      batches.push(tradingPairs.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`Split into ${batches.length} batches of ${BATCH_SIZE} pairs each`);
    
    // Process each batch
    let totalImported = 0;
    let batchesWithErrors = 0;
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} pairs)...`);
      
      try {
        // Build SQL for this batch
        const valueClause = batch.map(formatTradingPairForSQL).join(',\n');
        
        const sql = `
          INSERT INTO public.trading_pairs (
            symbol, name, description, market_id, type, category, 
            broker_name, is_active, metadata, last_updated, created_at
          )
          VALUES
          ${valueClause}
          ON CONFLICT (symbol) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            market_id = EXCLUDED.market_id,
            type = EXCLUDED.type,
            category = EXCLUDED.category,
            broker_name = EXCLUDED.broker_name,
            is_active = EXCLUDED.is_active,
            metadata = EXCLUDED.metadata,
            last_updated = EXCLUDED.last_updated;
        `;
        
        // Execute batch insert
        await client.query(sql);
        
        totalImported += batch.length;
        console.log(`  ✓ Batch ${i + 1} imported successfully (${totalImported}/${tradingPairs.length} total)`);
        
        // Add delay between batches to reduce database load
        await sleep(DELAY_BETWEEN_BATCHES);
        
      } catch (error) {
        console.error(`  ✗ Error in batch ${i + 1}:`, error.message);
        batchesWithErrors++;
        
        // Longer delay after error
        await sleep(DELAY_BETWEEN_BATCHES * 2);
      }
      
      // Show progress every 10 batches
      if ((i + 1) % 10 === 0 || i === batches.length - 1) {
        const countResult = await client.query('SELECT COUNT(*) FROM public.trading_pairs');
        const currentCount = parseInt(countResult.rows[0].count);
        console.log(`\nProgress update: ${currentCount} pairs in database (${Math.round(currentCount / tradingPairs.length * 100)}%)`);
      }
    }
    
    // Final verification
    const result = await client.query('SELECT COUNT(*) FROM public.trading_pairs');
    const finalCount = parseInt(result.rows[0].count);
    
    // Get category breakdown
    const categoryResult = await client.query(`
      SELECT category, COUNT(*) 
      FROM public.trading_pairs 
      GROUP BY category 
      ORDER BY COUNT(*) DESC
    `);
    
    console.log('\nImport process completed!');
    console.log(`Final count in database: ${finalCount} pairs (${Math.round(finalCount / tradingPairs.length * 100)}% of total)`);
    console.log(`Batches with errors: ${batchesWithErrors}`);
    
    console.log('\nCategory breakdown:');
    categoryResult.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.count} pairs`);
    });
    
  } catch (error) {
    console.error('Fatal error during import:', error);
  } finally {
    if (client) {
      console.log('Closing database connection...');
      client.release();
    }
    
    // Close the pool
    console.log('Closing connection pool...');
    await pool.end();
  }
}

// Check if pg module is installed
try {
  require.resolve('pg');
} catch (e) {
  console.error('Error: pg module not found. Please install it with:');
  console.error('npm install pg');
  process.exit(1);
}

// Run the import
console.log('=== Trading Pairs Automated Import ===');
importTradingPairs()
  .then(() => console.log('Script execution completed.'))
  .catch(error => console.error('Script execution failed:', error));
