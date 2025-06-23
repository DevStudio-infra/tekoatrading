/**
 * Trading Pairs Import Script Using Prisma Batch Processing
 *
 * This script uses Prisma's createMany method to efficiently import all trading pairs
 * from the JSON file into the database in batches.
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

// Initialize Prisma client
const prisma = new PrismaClient();

// Define trading pair types
interface TradingPairJson {
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

// Configuration
const JSON_FILE_PATH = path.resolve(__dirname, "../../assets/trading_pairs.json");
const BATCH_SIZE = 500; // Adjust based on your DB performance

// Function to transform a trading pair from JSON format to Prisma model format
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
    metadata: pair.metadata,
    lastUpdated: new Date(pair.last_updated),
    createdAt: new Date(pair.created_at),
  };
}

// Main import function
async function importTradingPairs() {
  try {
    console.log("Starting trading pairs import process...");

    // Read trading pairs from JSON file
    console.log("Reading trading pairs from JSON file...");
    const data = fs.readFileSync(JSON_FILE_PATH, "utf8");
    const tradingPairs: TradingPairJson[] = JSON.parse(data);
    console.log(`Found ${tradingPairs.length} trading pairs to import`);

    // First, delete all existing trading pairs to start fresh
    console.log("Deleting existing trading pairs...");
    await prisma.tradingPair.deleteMany({});
    console.log("Existing data cleared.");

    // Transform trading pairs for Prisma format
    console.log("Transforming data for import...");
    const transformedPairs = tradingPairs.map(transformTradingPair);

    // Split into batches for efficient processing
    const totalPairs = transformedPairs.length;
    const batches = [];
    for (let i = 0; i < totalPairs; i += BATCH_SIZE) {
      batches.push(transformedPairs.slice(i, i + BATCH_SIZE));
    }

    console.log(`Split into ${batches.length} batches of up to ${BATCH_SIZE} pairs each`);

    // Process each batch
    let importedCount = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} pairs)...`);

      try {
        // Use createMany to efficiently insert the batch
        const result = await prisma.tradingPair.createMany({
          data: batch,
          skipDuplicates: true, // Skip any duplicates based on unique constraints
        });

        importedCount += result.count;
        console.log(`✓ Batch ${i + 1} imported successfully (${result.count} pairs)`);
        console.log(`Progress: ${importedCount}/${totalPairs} total pairs imported`);
      } catch (error) {
        console.error(`✗ Error importing batch ${i + 1}:`, error);
      }
    }

    // Verify final count
    const finalCount = await prisma.tradingPair.count();

    console.log("\nImport process completed!");
    console.log(`Successfully imported: ${importedCount} pairs`);
    console.log(`Final count in database: ${finalCount} pairs`);

    // Creating indices for better performance (if not already created by Prisma)
    console.log("\nCreating indices for better performance...");
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_trading_pairs_broker_name ON "TradingPair"("brokerName");
      CREATE INDEX IF NOT EXISTS idx_trading_pairs_type ON "TradingPair"("type");
      CREATE INDEX IF NOT EXISTS idx_trading_pairs_category ON "TradingPair"("category");
      CREATE INDEX IF NOT EXISTS idx_trading_pairs_is_active ON "TradingPair"("isActive");
    `;
  } catch (error) {
    console.error("Fatal error during import:", error);
  } finally {
    // Always disconnect from Prisma
    await prisma.$disconnect();
  }
}

// Execute the import
console.log("=== Trading Pairs Prisma Batch Import ===");
importTradingPairs()
  .then(() => console.log("Script execution completed."))
  .catch((error) => console.error("Script execution failed:", error));
