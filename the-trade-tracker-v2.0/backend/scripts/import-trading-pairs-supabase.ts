/**
 * Trading Pairs Import Script for Supabase
 * 
 * This script imports trading pairs directly to Supabase using batched SQL queries
 * Run with: npx ts-node scripts/import-trading-pairs-supabase.ts
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const BATCH_SIZE = 50; // Smaller batch size for better reliability
const FILE_PATH = path.resolve(__dirname, '../../assets/trading_pairs.json');

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TradingPairJson {
  id: number;
  symbol: string;
  name: string;
  description: string | null;
  market_id: string | null;
  type: string;
  category: string;
  broker_name: string;
  is_active: boolean;
  metadata: any | null;
  last_updated: string;
  created_at: string;
}

/**
 * Transform JSON data to match database schema
 */
function transformTradingPair(pair: TradingPairJson) {
  return {
    id: pair.id,
    symbol: pair.symbol,
    name: pair.name,
    description: pair.description,
    market_id: pair.market_id,
    type: pair.type,
    category: pair.category,
    broker_name: pair.broker_name,
    is_active: pair.is_active,
    // Handle metadata as a proper JSON object
    metadata: pair.metadata || null,
    last_updated: new Date(pair.last_updated),
    created_at: new Date(pair.created_at),
  };
}

/**
 * Imports trading pairs in batches
 */
async function importTradingPairs() {
  console.log('Starting trading pairs import to Supabase...');

  try {
    // Read the JSON file
    const fileData = fs.readFileSync(FILE_PATH, 'utf8');
    const tradingPairs: TradingPairJson[] = JSON.parse(fileData);

    console.log(`Found ${tradingPairs.length} trading pairs to import`);

    // First, check if we already have data to avoid duplicates
    const { count: existingCount } = await supabase
      .from('trading_pairs')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Database already has ${existingCount || 0} trading pairs`);

    // Group by broker name for reporting
    console.log('Organizing data by broker...');
    const pairsByBroker: { [key: string]: TradingPairJson[] } = {};
    
    tradingPairs.forEach(pair => {
      if (!pairsByBroker[pair.broker_name]) {
        pairsByBroker[pair.broker_name] = [];
      }
      pairsByBroker[pair.broker_name].push(pair);
    });
    
    console.log(`Found pairs for ${Object.keys(pairsByBroker).length} different brokers:`);
    Object.keys(pairsByBroker).forEach(broker => {
      console.log(` - ${broker}: ${pairsByBroker[broker].length} pairs`);
    });
    
    // Processing stats
    let totalImported = 0;
    let totalErrors = 0;
    
    // Process each broker separately
    for (const broker of Object.keys(pairsByBroker)) {
      const brokerPairs = pairsByBroker[broker];
      console.log(`\nProcessing ${brokerPairs.length} pairs for broker: ${broker}`);
      
      // Process in batches for this broker
      const brokerBatches = Math.ceil(brokerPairs.length / BATCH_SIZE);
      
      for (let batchIndex = 0; batchIndex < brokerBatches; batchIndex++) {
        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, brokerPairs.length);
        const batch = brokerPairs.slice(start, end);
        
        console.log(`Processing batch ${batchIndex + 1}/${brokerBatches} (items ${start + 1}-${end})`);
        
        // Transform the data for each item in the batch
        const transformedBatch = batch.map(transformTradingPair);
        
        // Insert the batch using upsert to handle duplicates
        const { data, error } = await supabase
          .from('trading_pairs')
          .upsert(transformedBatch, {
            onConflict: 'symbol',
            ignoreDuplicates: false
          });
        
        if (error) {
          console.error(`Error importing batch ${batchIndex + 1} for broker ${broker}:`, error);
          totalErrors++;
        } else {
          totalImported += transformedBatch.length;
          console.log(`Successfully imported/updated batch ${batchIndex + 1} for broker ${broker}`);
        }
      }
    }

    console.log(`
Trading pairs import completed:
- ${totalImported} pairs processed (imported or updated)
- ${totalErrors} errors encountered
    `);

    // Double-check the count after import
    const { count: finalCount } = await supabase
      .from('trading_pairs')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Database now has ${finalCount || 0} trading pairs`);

  } catch (error) {
    console.error('Error importing trading pairs:', error);
    process.exit(1);
  }
}

// Run the import
importTradingPairs()
  .then(() => {
    console.log('Import completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
