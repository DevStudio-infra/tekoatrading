/**
 * Trading Pairs Import Script
 *
 * This script imports trading pairs from a JSON file to the database.
 * It handles batch processing for efficient imports of large datasets.
 */

import fs from "fs";
import path from "path";
import { prisma } from "../utils/prisma";

// Configuration
const BATCH_SIZE = 100; // Number of records to import in a single batch
const FILE_PATH = path.resolve(__dirname, "../../assets/trading_pairs.json");

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
    metadata: pair.metadata || undefined,
    lastUpdated: new Date(pair.last_updated),
    createdAt: new Date(pair.created_at),
  };
}

/**
 * Imports trading pairs in batches
 */
async function importTradingPairs() {
  console.log("Starting trading pairs import...");

  try {
    // Read the JSON file
    const fileData = fs.readFileSync(FILE_PATH, "utf8");
    const tradingPairs: TradingPairJson[] = JSON.parse(fileData);

    console.log(`Found ${tradingPairs.length} trading pairs to import`);

    // Process in batches
    const totalBatches = Math.ceil(tradingPairs.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, tradingPairs.length);
      const batch = tradingPairs.slice(start, end);

      console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (items ${start + 1}-${end})`);

      // Create a transaction for the batch
      await prisma.$transaction(async (prismaClient) => {
        for (const pair of batch) {
          const data = transformTradingPair(pair);

          // Use upsert to handle duplicates (based on symbol which is unique)
          await prismaClient.tradingPair.upsert({
            where: { symbol: pair.symbol },
            update: data,
            create: data,
          });
        }
      });

      console.log(`Completed batch ${batchIndex + 1}`);
    }

    console.log("Trading pairs import completed successfully");
  } catch (error) {
    console.error("Error importing trading pairs:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importTradingPairs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
