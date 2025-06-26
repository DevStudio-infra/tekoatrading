const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function seedTradingPairs() {
  console.log("🌱 Seeding trading pairs...");

  try {
    // Read trading pairs JSON file
    const tradingPairsPath = path.join(__dirname, "../../assets/trading_pairs.json");

    if (!fs.existsSync(tradingPairsPath)) {
      console.log("❌ Trading pairs file not found at:", tradingPairsPath);
      console.log("Please make sure the trading_pairs.json file exists in the assets folder");
      return;
    }

    const rawData = fs.readFileSync(tradingPairsPath, "utf8");
    const tradingPairs = JSON.parse(rawData);

    console.log(`📊 Found ${tradingPairs.length} trading pairs to seed`);

    // Check current count in database
    const currentCount = await prisma.tradingPair.count();
    console.log(`📈 Current trading pairs in database: ${currentCount}`);

    // Process in smaller batches for better performance and progress tracking
    const batchSize = 50;
    let processed = 0;
    let successful = 0;
    let skipped = 0;

    for (let i = 0; i < tradingPairs.length; i += batchSize) {
      const batch = tradingPairs.slice(i, i + batchSize);

      // Process each item individually to handle duplicates gracefully
      for (const pair of batch) {
        try {
          // Skip if no symbol
          if (!pair.symbol) {
            console.warn(`⚠️  Skipping pair without symbol`);
            processed++;
            skipped++;
            continue;
          }

          const transformedPair = {
            symbol: pair.symbol,
            name: pair.name || pair.symbol || "Unknown",
            description: pair.description || null,
            marketId: pair.market_id || null,
            type: pair.type || "UNKNOWN",
            category: pair.category || "Unknown",
            brokerName: pair.broker_name || "Capital.com",
            isActive: pair.is_active !== undefined ? pair.is_active : true,
            metadata: pair.metadata ? JSON.stringify(pair.metadata) : null,
            lastUpdated: pair.last_updated ? new Date(pair.last_updated) : new Date(),
            createdAt: pair.created_at ? new Date(pair.created_at) : new Date(),
          };

          // Check if symbol already exists
          const existing = await prisma.tradingPair.findUnique({
            where: { symbol: transformedPair.symbol },
          });

          if (!existing) {
            await prisma.tradingPair.create({
              data: transformedPair,
            });
            successful++;

            // Show progress for newly added pairs
            if (successful % 10 === 0) {
              console.log(`✅ Added ${successful} new trading pairs...`);
            }
          } else {
            skipped++;
          }

          processed++;

          // Progress update every 100 items processed
          if (processed % 100 === 0) {
            console.log(
              `📊 Processed ${processed}/${tradingPairs.length} trading pairs (${successful} new, ${skipped} skipped)`,
            );
          }
        } catch (error) {
          console.warn(`⚠️  Error processing pair ${pair.symbol || "unknown"}: ${error.message}`);
          processed++;
          skipped++;
        }
      }
    }

    // Final statistics
    const finalCount = await prisma.tradingPair.count();
    console.log(`\n🎉 Seeding completed!`);
    console.log(`📊 Statistics:`);
    console.log(`   - Total processed: ${processed}`);
    console.log(`   - Successfully added: ${successful}`);
    console.log(`   - Skipped (duplicates/errors): ${skipped}`);
    console.log(`   - Total in database: ${finalCount}`);

    // Show some sample trading pairs by category
    console.log(`\n📈 Sample trading pairs by category:`);

    const categories = ["FOREX", "SHARES", "CRYPTOCURRENCIES", "COMMODITIES", "INDICES"];

    for (const category of categories) {
      const samplePairs = await prisma.tradingPair.findMany({
        where: { type: category },
        take: 3,
        orderBy: { symbol: "asc" },
      });

      if (samplePairs.length > 0) {
        console.log(`   ${category}:`);
        samplePairs.forEach((pair) => {
          console.log(`     - ${pair.symbol}: ${pair.name}`);
        });
      }
    }
  } catch (error) {
    console.error("❌ Error seeding trading pairs:", error);
    throw error;
  }
}

async function main() {
  console.log("🚀 Starting trading pairs seeding process...\n");

  try {
    await seedTradingPairs();
    console.log("\n✅ Trading pairs seeding completed successfully!");
  } catch (error) {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { seedTradingPairs };
