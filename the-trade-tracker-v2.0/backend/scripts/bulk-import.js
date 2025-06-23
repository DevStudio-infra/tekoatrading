/**
 * Bulk Import Trading Pairs using pg-copy-streams
 * This approach uses native PostgreSQL COPY which is orders of magnitude faster than INSERT
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { pipeline } = require('stream');
const { Transform } = require('stream');
const copyFrom = require('pg-copy-streams').from;
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Get database connection from .env
const connectionString = process.env.DIRECT_URL || 
  "postgresql://postgres.fjraryjhmsjmplbpmafw:Laquie8501@aws-0-eu-central-1.pooler.supabase.com:5432/postgres";

// File path for trading pairs
const FILE_PATH = path.resolve(__dirname, '../../assets/trading_pairs.json');

// Transform function to convert JSON objects to PostgreSQL COPY format
function createTransformStream() {
  return new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      try {
        // Format the fields properly for PostgreSQL COPY
        const symbol = chunk.symbol.replace(/\t/g, ' ');
        const name = chunk.name.replace(/\t/g, ' ');
        const description = chunk.description ? chunk.description.replace(/\t/g, ' ') : '\\N'; // NULL value in COPY
        const marketId = chunk.market_id ? chunk.market_id.replace(/\t/g, ' ') : '\\N';
        const type = chunk.type.replace(/\t/g, ' ');
        const category = chunk.category.replace(/\t/g, ' ');
        const brokerName = chunk.broker_name.replace(/\t/g, ' ');
        const isActive = chunk.is_active ? 'true' : 'false';
        const metadata = chunk.metadata ? JSON.stringify(chunk.metadata) : '\\N';
        const lastUpdated = chunk.last_updated || new Date().toISOString();
        const createdAt = chunk.created_at || new Date().toISOString();
        
        // Tab-delimited format for COPY
        const copyLine = `${symbol}\t${name}\t${description}\t${marketId}\t${type}\t${category}\t${brokerName}\t${isActive}\t${metadata}\t${lastUpdated}\t${createdAt}\n`;
        callback(null, copyLine);
      } catch (err) {
        callback(err);
      }
    }
  });
}

async function importTradingPairs() {
  const client = new Client({ connectionString });
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    
    // Read trading pairs from file
    console.log('Reading trading pairs from JSON file...');
    const tradingPairsData = fs.readFileSync(FILE_PATH, 'utf8');
    const tradingPairs = JSON.parse(tradingPairsData);
    console.log(`Found ${tradingPairs.length} trading pairs to import`);
    
    // First, truncate the table to start fresh
    console.log('Truncating existing table...');
    await client.query('TRUNCATE TABLE public.trading_pairs RESTART IDENTITY CASCADE');
    
    // Create a readable stream from the trading pairs
    const tradingPairsStream = new require('stream').Readable({
      objectMode: true,
      read() {
        if (this.currentIndex === undefined) {
          this.currentIndex = 0;
        }
        
        if (this.currentIndex < tradingPairs.length) {
          this.push(tradingPairs[this.currentIndex++]);
        } else {
          this.push(null); // End of stream
        }
      }
    });
    
    // Start the COPY process
    console.log('Starting bulk import...');
    const copyStream = client.query(copyFrom(`COPY public.trading_pairs(
      symbol, name, description, market_id, type, category, broker_name, 
      is_active, metadata, last_updated, created_at
    ) FROM STDIN WITH NULL AS '\\N'`));
    
    // Use pipeline to manage the stream flow
    await new Promise((resolve, reject) => {
      pipeline(
        tradingPairsStream,
        createTransformStream(),
        copyStream,
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
    
    // Verify the import
    console.log('Import completed. Verifying counts...');
    const res = await client.query('SELECT COUNT(*) FROM public.trading_pairs');
    console.log(`Database now has ${res.rows[0].count} trading pairs`);
    
    // Create indices for better performance
    console.log('Creating indices for better performance...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_trading_pairs_broker_name ON public.trading_pairs(broker_name);
      CREATE INDEX IF NOT EXISTS idx_trading_pairs_type ON public.trading_pairs(type);
      CREATE INDEX IF NOT EXISTS idx_trading_pairs_category ON public.trading_pairs(category);
      CREATE INDEX IF NOT EXISTS idx_trading_pairs_is_active ON public.trading_pairs(is_active);
    `);
    
    console.log('Import process completed successfully!');
    
  } catch (error) {
    console.error('Error during import:', error);
  } finally {
    console.log('Closing database connection...');
    await client.end();
  }
}

// Check for required dependencies
try {
  require.resolve('pg');
  require.resolve('pg-copy-streams');
} catch (err) {
  console.error('Required dependencies not installed. Please run:');
  console.error('npm install pg pg-copy-streams');
  process.exit(1);
}

// Run the import process
importTradingPairs()
  .then(() => console.log('Script completed.'))
  .catch(err => console.error('Script failed:', err));
