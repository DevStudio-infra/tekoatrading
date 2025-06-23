/**
 * Trading Pairs Import Script (Simple Version)
 *
 * Run with: npx ts-node scripts/import-trading-pairs-simple.ts
 */

import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

// Initialize Prisma client
const prisma = new PrismaClient();

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
    metadata: pair.metadata, // Prisma will handle JSON serialization
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

    // First, check if we already have data to avoid duplicates
    const existingCount = await prisma.tradingPair.count();
    if (existingCount > 0) {
      console.log(`Database already has ${existingCount} trading pairs. Checking for new ones only.`);
    }

    // Create indices for faster queries
    console.log("Creating indices to optimize import...");
    const uniqueSymbols = new Set(tradingPairs.map((p) => p.symbol));
    console.log(`Found ${uniqueSymbols.size} unique symbols (${tradingPairs.length - uniqueSymbols.size} duplicates in source data)`);

    // Process in batches
    const totalBatches = Math.ceil(tradingPairs.length / BATCH_SIZE);
    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, tradingPairs.length);
      const batch = tradingPairs.slice(start, end);

      console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (items ${start + 1}-${end})`);

      // Process each pair in the batch
      for (const pair of batch) {
        const data = transformTradingPair(pair);

        // Check if the symbol already exists
        const existing = await prisma.tradingPair.findUnique({
          where: { symbol: pair.symbol },
        });

        if (existing) {
          // Update existing record
          await prisma.tradingPair.update({
            where: { symbol: pair.symbol },
            data: data,
          });
          totalUpdated++;
        } else {
          // Create new record
          await prisma.tradingPair.create({
            data: data,
          });
          totalImported++;
        }
      }

      console.log(`Completed batch ${batchIndex + 1}`);
    }

    console.log(`
Trading pairs import completed successfully:
- ${totalImported} new pairs imported
- ${totalUpdated} existing pairs updated
- ${totalSkipped} pairs skipped
    `);
  } catch (error) {
    console.error("Error importing trading pairs:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importTradingPairs()
  .then(() => {
    console.log("Import completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
