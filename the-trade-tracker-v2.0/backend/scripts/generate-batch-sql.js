/**
 * Generate SQL batch files for importing trading pairs
 * This script creates manageable SQL files that can be run directly in the Supabase SQL Editor
 */

const fs = require('fs');
const path = require('path');

// Configuration
const JSON_FILE_PATH = path.resolve(__dirname, '../../assets/trading_pairs.json');
const OUTPUT_DIR = path.resolve(__dirname, './sql_batches');
const PAIRS_PER_BATCH = 20; // Small number that has been tested to work
const TOTAL_BATCHES = 50; // Limit how many batch files we generate for now (20 pairs × 50 = 1000 pairs)

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Main function
function generateBatchFiles() {
  try {
    console.log('Reading trading pairs from JSON file...');
    const jsonData = fs.readFileSync(JSON_FILE_PATH, 'utf8');
    const tradingPairs = JSON.parse(jsonData);
    console.log(`Found ${tradingPairs.length} trading pairs`);
    
    // Generate setup SQL (run first)
    const setupSQL = `-- Trading Pairs Setup SQL
-- Generated on ${new Date().toISOString()}
-- Run this file FIRST to prepare the database

-- First, truncate the table to start fresh
TRUNCATE TABLE public.trading_pairs RESTART IDENTITY CASCADE;

-- Create indices for better performance
CREATE INDEX IF NOT EXISTS idx_trading_pairs_broker_name ON public.trading_pairs(broker_name);
CREATE INDEX IF NOT EXISTS idx_trading_pairs_type ON public.trading_pairs(type);
CREATE INDEX IF NOT EXISTS idx_trading_pairs_category ON public.trading_pairs(category);
CREATE INDEX IF NOT EXISTS idx_trading_pairs_is_active ON public.trading_pairs(is_active);

-- Verify empty table
SELECT COUNT(*) FROM public.trading_pairs;
`;
    
    fs.writeFileSync(path.join(OUTPUT_DIR, '00_setup.sql'), setupSQL);
    console.log('Created setup file: 00_setup.sql');
    
    // Calculate how many batches we need
    const numBatches = Math.min(
      Math.ceil(tradingPairs.length / PAIRS_PER_BATCH),
      TOTAL_BATCHES
    );
    
    console.log(`Generating ${numBatches} batch files with ${PAIRS_PER_BATCH} pairs each`);
    
    // Generate batch files
    for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
      const start = batchIndex * PAIRS_PER_BATCH;
      const end = Math.min(start + PAIRS_PER_BATCH, tradingPairs.length);
      const batchPairs = tradingPairs.slice(start, end);
      
      // Create the SQL content for this batch
      let batchSQL = `-- Trading Pairs Import Batch ${batchIndex + 1}/${numBatches}
-- Generated on ${new Date().toISOString()}
-- Importing pairs ${start + 1} to ${end} (${batchPairs.length} pairs)

INSERT INTO public.trading_pairs (symbol, name, description, market_id, type, category, broker_name, is_active, metadata, last_updated, created_at)
VALUES
`;
      
      // Add each pair to the SQL
      const valueLines = batchPairs.map(pair => {
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
      });
      
      // Join values with commas
      batchSQL += valueLines.join(',\n');
      batchSQL += ';\n\n';
      
      // Add a count check 
      batchSQL += `-- Verify current count
SELECT COUNT(*) FROM public.trading_pairs;`;
      
      // Write the batch file
      const batchFileName = `${String(batchIndex + 1).padStart(2, '0')}_batch_${start + 1}_to_${end}.sql`;
      fs.writeFileSync(path.join(OUTPUT_DIR, batchFileName), batchSQL);
      console.log(`Created batch file: ${batchFileName}`);
    }
    
    // Generate a verification SQL file
    const verifySQL = `-- Trading Pairs Verification SQL
-- Generated on ${new Date().toISOString()}
-- Run this file LAST to verify all imports

-- Check total count
SELECT COUNT(*) AS total_pairs FROM public.trading_pairs;

-- Check counts by category
SELECT category, COUNT(*) AS count
FROM public.trading_pairs
GROUP BY category
ORDER BY count DESC;

-- Check counts by broker
SELECT broker_name, COUNT(*) AS count
FROM public.trading_pairs
GROUP BY broker_name
ORDER BY count DESC;

-- Check counts by type
SELECT type, COUNT(*) AS count
FROM public.trading_pairs
GROUP BY type
ORDER BY count DESC;

-- Sample data check - view some random records
SELECT * FROM public.trading_pairs
ORDER BY RANDOM()
LIMIT 10;
`;
    
    fs.writeFileSync(path.join(OUTPUT_DIR, '99_verify.sql'), verifySQL);
    console.log('Created verification file: 99_verify.sql');
    
    // Print instructions
    console.log('\nInstructions:');
    console.log('1. First run 00_setup.sql in the Supabase SQL Editor');
    console.log('2. Then run each batch file sequentially (01_*.sql, 02_*.sql, etc.)');
    console.log('3. Finally run 99_verify.sql to check the results');
    console.log(`\nAll files are in: ${OUTPUT_DIR}`);
    console.log(`\nThis will import ${numBatches * PAIRS_PER_BATCH} trading pairs out of ${tradingPairs.length} total`);
    
  } catch (error) {
    console.error('Error generating batch files:', error);
  }
}

// Run the generator
generateBatchFiles();
