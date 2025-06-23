/**
 * This script extracts trading pairs from the JSON file
 * and generates SQL insert statements to be used directly with Supabase
 */

const fs = require('fs');
const path = require('path');

// Configuration
const FILE_PATH = path.resolve(__dirname, '../../assets/trading_pairs.json');
const OUTPUT_PATH = path.resolve(__dirname, './trading_pairs_migration.sql');
const BATCH_SIZE = 100;

// Read the JSON file
const fileData = fs.readFileSync(FILE_PATH, 'utf8');
const tradingPairs = JSON.parse(fileData);

console.log(`Found ${tradingPairs.length} trading pairs to process`);

// Start building the SQL file
let sqlContent = `-- Trading Pairs Migration Script
-- Generated on ${new Date().toISOString()}
-- Total pairs: ${tradingPairs.length}

-- First, ensure we truncate the table to start fresh
TRUNCATE TABLE public.trading_pairs RESTART IDENTITY CASCADE;

`;

// Process in batches
const totalBatches = Math.ceil(tradingPairs.length / BATCH_SIZE);

for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
  const start = batchIndex * BATCH_SIZE;
  const end = Math.min(start + BATCH_SIZE, tradingPairs.length);
  const batch = tradingPairs.slice(start, end);
  
  console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (items ${start + 1}-${end})`);
  
  // Start batch insert
  sqlContent += `-- Batch ${batchIndex + 1}/${totalBatches} (${batch.length} pairs)\n`;
  sqlContent += `INSERT INTO public.trading_pairs (symbol, name, description, market_id, type, category, broker_name, is_active, metadata, last_updated, created_at) VALUES\n`;
  
  const values = batch.map(pair => {
    // Format the metadata as proper PostgreSQL JSON
    const metadata = pair.metadata !== null ? `'${JSON.stringify(pair.metadata).replace(/'/g, "''")}'::jsonb` : 'NULL';
    
    // Handle NULL values and escape strings
    const description = pair.description !== null ? `'${pair.description.replace(/'/g, "''")}'` : 'NULL';
    const marketId = pair.market_id !== null ? `'${pair.market_id.replace(/'/g, "''")}'` : 'NULL';
    
    // Return the formatted value
    return `('${pair.symbol}', '${pair.name.replace(/'/g, "''")}', ${description}, ${marketId}, '${pair.type}', '${pair.category}', '${pair.broker_name}', ${pair.is_active}, ${metadata}, '${pair.last_updated}', '${pair.created_at}')`;
  });
  
  // Join values with commas and end with semicolon
  sqlContent += values.join(',\n');
  sqlContent += `\nON CONFLICT (symbol) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    market_id = EXCLUDED.market_id,
    type = EXCLUDED.type,
    category = EXCLUDED.category,
    broker_name = EXCLUDED.broker_name,
    is_active = EXCLUDED.is_active,
    metadata = EXCLUDED.metadata,
    last_updated = EXCLUDED.last_updated;\n\n`;
}

// Add final statement to count rows
sqlContent += '-- Count the rows to verify import\nSELECT COUNT(*) FROM public.trading_pairs;\n';

// Write the SQL file
fs.writeFileSync(OUTPUT_PATH, sqlContent);

console.log(`SQL migration file created at: ${OUTPUT_PATH}`);
console.log(`Total batches: ${totalBatches}`);
console.log('Run this SQL directly with Supabase MCP to import all trading pairs');
