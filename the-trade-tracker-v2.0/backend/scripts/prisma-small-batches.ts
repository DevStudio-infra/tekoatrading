/**
 * Import trading pairs using Prisma in very small batches
 * This script uses tiny batch sizes to avoid timeouts and connection issues
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

// Define trading pair type from JSON
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

// Initialize Prisma client
const prisma = new PrismaClient();

// Configuration
const JSON_FILE_PATH = path.resolve(__dirname, "../../assets/trading_pairs.json");
const BATCH_SIZE = 10; // Keep batches very small to prevent timeout issues
const DELAY_BETWEEN_BATCHES = 500; // ms delay between batches

// Transform a trading pair for insertion
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

// Wait for a specified number of milliseconds
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Main import function
async function importTradingPairs() {
  try {
    console.log("Starting import process...");

    // Read the trading pairs from JSON
    console.log("Reading trading pairs from JSON file...");
    const data = fs.readFileSync(JSON_FILE_PATH, "utf8");
    const tradingPairs: TradingPairJson[] = JSON.parse(data);
    console.log(`Found ${tradingPairs.length} trading pairs`);

    // First, clear existing data
    console.log("Clearing existing trading pairs...");
    await prisma.tradingPair.deleteMany({});

    // Divide into very small batches
    const batches: TradingPairJson[][] = [];
    for (let i = 0; i < tradingPairs.length; i += BATCH_SIZE) {
      batches.push(tradingPairs.slice(i, i + BATCH_SIZE));
    }

    console.log(`Split into ${batches.length} micro-batches of ${BATCH_SIZE} pairs each`);

    // Process each batch sequentially with delays
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} pairs)...`);

      try {
        // Transform and create all items in this batch in a single transaction
        await prisma.$transaction(
          batch.map((pair) =>
            prisma.tradingPair.upsert({
              where: { symbol: pair.symbol },
              update: transformTradingPair(pair),
              create: transformTradingPair(pair),
            })
          )
        );

        // Update success count
        successCount += batch.length;
        console.log(`  ✓ Batch ${i + 1} successfully imported (${successCount}/${tradingPairs.length} total)`);

        // Add a delay between batches to avoid overwhelming the database
        await sleep(DELAY_BETWEEN_BATCHES);
      } catch (error) {
        console.error(`  ✗ Error in batch ${i + 1}:`, error);
        errorCount += batch.length;

        // Slightly longer delay after an error
        await sleep(DELAY_BETWEEN_BATCHES * 2);
      }
    }

    // Final verification
    const finalCount = await prisma.tradingPair.count();

    console.log("\nImport process completed!");
    console.log(`Successfully imported: ${successCount} pairs`);
    console.log(`Failed to import: ${errorCount} pairs`);
    console.log(`Final count in database: ${finalCount} pairs`);
  } catch (error) {
    console.error("Fatal error during import:", error);
  } finally {
    // Always disconnect from Prisma
    await prisma.$disconnect();
  }
}

// Run the import
importTradingPairs()
  .then(() => console.log("Script execution completed."))
  .catch((error) => console.error("Script execution failed:", error));
