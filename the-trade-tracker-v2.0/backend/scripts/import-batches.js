/**
 * Import trading pairs in sequential batches using the Supabase REST API
 * This script directly calls the Supabase SQL endpoint to run imports in small batches
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuration
const JSON_FILE_PATH = path.resolve(__dirname, '../../assets/trading_pairs.json');
const BATCH_SIZE = 30; // Keep batches small to avoid timeouts
const SUPABASE_PROJECT_ID = 'fjraryjhmsjmplbpmafw'; // Your Supabase project ID

// Check for SUPABASE_SERVICE_KEY in .env
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Update this with your actual key or provide in .env

// Function to execute SQL on Supabase
async function executeSql(sql) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${SUPABASE_PROJECT_ID}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc/execute_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`Status ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(JSON.stringify({
      query: sql,
      params: {}
    }));
    
    req.end();
  });
}

// Main import function
async function importTradingPairs() {
  try {
    console.log('Reading trading pairs from JSON file...');
    const jsonData = fs.readFileSync(JSON_FILE_PATH, 'utf8');
    const tradingPairs = JSON.parse(jsonData);
    console.log(`Found ${tradingPairs.length} trading pairs`);
    
    // Clear existing data first
    console.log('Truncating trading_pairs table...');
    await executeSql('TRUNCATE TABLE public.trading_pairs RESTART IDENTITY CASCADE;');
    
    // Process in batches
    const batches = [];
    for (let i = 0; i < tradingPairs.length; i += BATCH_SIZE) {
      batches.push(tradingPairs.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`Split into ${batches.length} batches of approximately ${BATCH_SIZE} pairs each`);
    
    // Process each batch sequentially
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} pairs)...`);
      
      try {
        // Generate SQL for this batch
        let batchSql = `INSERT INTO public.trading_pairs (
          symbol, name, description, market_id, type, category, 
          broker_name, is_active, metadata, last_updated, created_at
        )\nVALUES\n`;
        
        const values = batch.map(pair => {
          // Handle null fields and proper escaping
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
        });
        
        batchSql += values.join(',\n');
        batchSql += `
        ON CONFLICT (symbol) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          market_id = EXCLUDED.market_id,
          type = EXCLUDED.type,
          category = EXCLUDED.category,
          broker_name = EXCLUDED.broker_name,
          is_active = EXCLUDED.is_active,
          metadata = EXCLUDED.metadata,
          last_updated = EXCLUDED.last_updated;`;
        
        // Execute this batch
        await executeSql(batchSql);
        successCount += batch.length;
        console.log(`  ✓ Batch ${i + 1} successfully processed (${successCount}/${tradingPairs.length} total)`);
        
        // Add a small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`  ✗ Error processing batch ${i + 1}:`, error.message);
        errorCount += batch.length;
      }
    }
    
    // Verify final count
    console.log('\nVerifying import...');
    const result = await executeSql('SELECT COUNT(*) FROM public.trading_pairs;');
    const finalCount = result[0].count || 0;
    
    console.log(`\nImport completed!`);
    console.log(`Successfully imported: ${successCount} pairs`);
    console.log(`Errors: ${errorCount} pairs`);
    console.log(`Database count: ${finalCount} pairs`);
    
    // Create indices if needed
    console.log('\nCreating indices for performance...');
    await executeSql(`
      CREATE INDEX IF NOT EXISTS idx_trading_pairs_broker_name ON public.trading_pairs(broker_name);
      CREATE INDEX IF NOT EXISTS idx_trading_pairs_type ON public.trading_pairs(type);
      CREATE INDEX IF NOT EXISTS idx_trading_pairs_category ON public.trading_pairs(category);
      CREATE INDEX IF NOT EXISTS idx_trading_pairs_is_active ON public.trading_pairs(is_active);
    `);
    
  } catch (error) {
    console.error('Global error:', error);
  }
}

// Run the import
importTradingPairs()
  .then(() => console.log('Script completed.'))
  .catch(error => console.error('Script failed:', error));
