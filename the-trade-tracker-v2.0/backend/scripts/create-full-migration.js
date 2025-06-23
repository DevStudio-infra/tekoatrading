/**
 * This script creates a SQL migration file to import all trading pairs
 * from the JSON file to the Supabase database
 */

const fs = require('fs');
const path = require('path');

// Configuration
const FILE_PATH = path.resolve(__dirname, '../../assets/trading_pairs.json');
const OUTPUT_PATH = path.resolve(__dirname, './full_trading_pairs_migration.sql');
const CHUNK_SIZE = 200; // Size of each chunk for inserts

// Read the JSON file
const fileData = fs.readFileSync(FILE_PATH, 'utf8');
const tradingPairs = JSON.parse(fileData);

console.log(`Found ${tradingPairs.length} trading pairs to process`);

// Start building the SQL file
let sqlContent = `-- Trading Pairs Full Migration Script
-- Generated on ${new Date().toISOString()}
-- Total pairs: ${tradingPairs.length}

-- Create a temporary table to hold all trading pairs
CREATE TEMP TABLE temp_trading_pairs (
  symbol VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  market_id VARCHAR(50),
  type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  broker_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB,
  last_updated TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL
);

-- Create indexes on the temporary table for faster processing
CREATE INDEX idx_temp_symbol ON temp_trading_pairs (symbol);
CREATE INDEX idx_temp_broker ON temp_trading_pairs (broker_name);
CREATE INDEX idx_temp_type ON temp_trading_pairs (type);
`;

// Process trading pairs in chunks to avoid too large SQL statements
const chunks = [];
for (let i = 0; i < tradingPairs.length; i += CHUNK_SIZE) {
  chunks.push(tradingPairs.slice(i, i + CHUNK_SIZE));
}

console.log(`Split into ${chunks.length} chunks of approximately ${CHUNK_SIZE} pairs each`);

// Process each chunk
chunks.forEach((chunk, index) => {
  console.log(`Processing chunk ${index + 1}/${chunks.length}`);
  
  sqlContent += `\n-- Chunk ${index + 1}/${chunks.length} (${chunk.length} pairs)\n`;
  sqlContent += `INSERT INTO temp_trading_pairs (symbol, name, description, market_id, type, category, broker_name, is_active, metadata, last_updated, created_at)\nVALUES\n`;
  
  const values = chunk.map(pair => {
    // Format the metadata as proper PostgreSQL JSON, or NULL if not present
    const metadata = pair.metadata !== null ? 
      `'${JSON.stringify(pair.metadata).replace(/'/g, "''")}'::jsonb` : 
      'NULL';
    
    // Handle NULL values and escape strings to prevent SQL injection
    const description = pair.description !== null ? 
      `'${(pair.description || '').replace(/'/g, "''")}'` : 
      'NULL';
    
    const marketId = pair.market_id !== null ? 
      `'${(pair.market_id || '').replace(/'/g, "''")}'` : 
      'NULL';
    
    // Return the formatted value
    return `('${pair.symbol.replace(/'/g, "''")}', '${pair.name.replace(/'/g, "''")}', ${description}, ${marketId}, '${pair.type.replace(/'/g, "''")}', '${pair.category.replace(/'/g, "''")}', '${pair.broker_name.replace(/'/g, "''")}', ${pair.is_active}, ${metadata}, '${pair.last_updated}'::timestamp, '${pair.created_at}'::timestamp)`;
  });
  
  // Join values with commas and end with semicolon
  sqlContent += values.join(',\n');
  sqlContent += ';\n';
});

// Final step: insert all the data from the temporary table into the main table
sqlContent += `
-- Now, insert all the data from the temporary table into the main table
INSERT INTO public.trading_pairs (
  symbol, name, description, market_id, type, category, 
  broker_name, is_active, metadata, last_updated, created_at
)
SELECT 
  symbol, name, description, market_id, type, category, 
  broker_name, is_active, metadata, last_updated, created_at
FROM temp_trading_pairs
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

-- Drop the temporary table
DROP TABLE temp_trading_pairs;

-- Check the count after bulk import
SELECT COUNT(*) AS total_trading_pairs FROM public.trading_pairs;

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

-- Add useful indices for performance
CREATE INDEX IF NOT EXISTS idx_trading_pairs_category ON public.trading_pairs (category);
CREATE INDEX IF NOT EXISTS idx_trading_pairs_broker_name ON public.trading_pairs (broker_name);
CREATE INDEX IF NOT EXISTS idx_trading_pairs_type ON public.trading_pairs (type);
CREATE INDEX IF NOT EXISTS idx_trading_pairs_is_active ON public.trading_pairs (is_active);
`;

// Write the SQL file
fs.writeFileSync(OUTPUT_PATH, sqlContent);

console.log(`SQL migration file created at: ${OUTPUT_PATH}`);
console.log(`Total chunks: ${chunks.length}`);
console.log(`Run this SQL directly against your Supabase database to import all ${tradingPairs.length} trading pairs`);
