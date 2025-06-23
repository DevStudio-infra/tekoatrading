/**
 * Trading Pairs Import Script (Fixed Version)
 * 
 * Run with: npx ts-node scripts/import-trading-pairs-fixed.ts
 */

import fs from 'fs';
import path from 'path';
import { prisma } from '../utils/prisma'; // Using the project's existing prisma import

// Configuration
const BATCH_SIZE = 100; // Number of records to import in a single batch
const FILE_PATH = path.resolve(__dirname, '../../assets/trading_pairs.json');

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
 * Transform JSON data to match Prisma schema
 */
function transformTradingPair(pair: TradingPairJson) {
  return {
    symbol: pair.symbol,
    name: pair.name,
    description: pair.description,
    marketId: pair.market_id,
    type: pair.type,
    category: pair.category,
    brokerName: pair.broker_name,
    isActive: pair.is_active,
    metadata: pair.metadata, // Prisma will handle JSON serialization
    lastUpdated: new Date(pair.last_updated),
    createdAt: new Date(pair.created_at),
  };
}

/**
 * Imports trading pairs in batches
 */
async function importTradingPairs() {
  console.log('Starting trading pairs import...');

  try {
    // Read the JSON file
    const fileData = fs.readFileSync(FILE_PATH, 'utf8');
    const tradingPairs: TradingPairJson[] = JSON.parse(fileData);

    console.log(`Found ${tradingPairs.length} trading pairs to import`);

    // First, check if we already have data to avoid duplicates
    const existingCount = await prisma.tradingPair.count();
    if (existingCount > 0) {
      console.log(`Database already has ${existingCount} trading pairs.`);
    }

    // Processing stats
    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Process in batches
    const totalBatches = Math.ceil(tradingPairs.length / BATCH_SIZE);
    
    // Group by broker name for faster processing and reporting
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
        
        // Use transactions for better performance and data integrity
        await prisma.$transaction(async (tx) => {
          for (const pair of batch) {
            const data = transformTradingPair(pair);
            
            try {
              // Use upsert to handle duplicates
              await tx.tradingPair.upsert({
                where: { symbol: pair.symbol },
                update: data,
                create: data,
              });
              
              if (await tx.tradingPair.findUnique({ where: { symbol: pair.symbol } })) {
                totalUpdated++;
              } else {
                totalImported++;
              }
            } catch (error) {
              console.error(`Error processing pair ${pair.symbol}:`, error);
              totalErrors++;
            }
          }
        });
        
        console.log(`Completed batch ${batchIndex + 1} for broker ${broker}`);
      }
    }

    console.log(`
Trading pairs import completed:
- ${totalImported} new pairs imported
- ${totalUpdated} existing pairs updated
- ${totalSkipped} pairs skipped
- ${totalErrors} errors encountered
    `);

  } catch (error) {
    console.error('Error importing trading pairs:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
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
