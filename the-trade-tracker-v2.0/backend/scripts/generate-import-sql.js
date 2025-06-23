/**
 * Generate a single SQL file that can be directly executed in Supabase SQL Editor
 * This approach doesn't require any dependencies and works reliably
 */

const fs = require('fs');
const path = require('path');

// Configuration
const JSON_FILE_PATH = path.resolve(__dirname, '../../assets/trading_pairs.json');
const SQL_FILE_PATH = path.resolve(__dirname, './import_all_trading_pairs.sql');
const BATCH_SIZE = 50; // Keep batches small for SQL editor

// Main function
function generateSqlFile() {
  try {
    console.log('Reading JSON file...');
    const jsonData = fs.readFileSync(JSON_FILE_PATH, 'utf8');
    const tradingPairs = JSON.parse(jsonData);
    
    console.log(`Found ${tradingPairs.length} trading pairs`);
    
    // Start building SQL content
    let sqlContent = `-- Trading Pairs Import SQL
-- Generated on ${new Date().toISOString()}
-- Total pairs: ${tradingPairs.length}

-- First, truncate the table to start fresh
TRUNCATE TABLE public.trading_pairs RESTART IDENTITY CASCADE;

`;
    
    // Process in batches
    const batches = [];
    for (let i = 0; i < tradingPairs.length; i += BATCH_SIZE) {
      batches.push(tradingPairs.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`Split data into ${batches.length} batches`);
    
    // Generate SQL for each batch
    batches.forEach((batch, batchIndex) => {
      sqlContent += `-- Batch ${batchIndex + 1}/${batches.length}\n`;
      sqlContent += `INSERT INTO public.trading_pairs (symbol, name, description, market_id, type, category, broker_name, is_active, metadata, last_updated, created_at)\nVALUES\n`;
      
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
      
      sqlContent += values.join(',\n');
      sqlContent += ';\n\n';
    });
    
    // Add final verification queries
    sqlContent += `-- Verify the import
SELECT COUNT(*) AS total_pairs FROM public.trading_pairs;

-- View counts by category
SELECT category, COUNT(*) 
FROM public.trading_pairs 
GROUP BY category 
ORDER BY COUNT(*) DESC;

-- Create helpful indices if they don't exist
CREATE INDEX IF NOT EXISTS idx_trading_pairs_broker_name ON public.trading_pairs(broker_name);
CREATE INDEX IF NOT EXISTS idx_trading_pairs_type ON public.trading_pairs(type);
CREATE INDEX IF NOT EXISTS idx_trading_pairs_category ON public.trading_pairs(category);
`;
    
    // Write to file
    fs.writeFileSync(SQL_FILE_PATH, sqlContent);
    
    console.log(`SQL file generated at: ${SQL_FILE_PATH}`);
    console.log('\nInstructions:');
    console.log('1. Open the Supabase SQL Editor');
    console.log('2. Copy and paste the generated SQL file content');
    console.log('3. Run the SQL to import all trading pairs');
    console.log('\nAlternatively, you can run it directly in psql:');
    console.log(`psql "postgresql://postgres:password@db.fjraryjhmsjmplbpmafw.supabase.co:5432/postgres" -f "${SQL_FILE_PATH}"`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the generation
generateSqlFile();
