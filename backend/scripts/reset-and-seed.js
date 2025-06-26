const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log("🔄 Resetting database...");

  try {
    // Delete all data in correct order (respecting foreign key constraints)
    await prisma.evaluation.deleteMany();
    await prisma.trade.deleteMany();
    await prisma.position.deleteMany();
    await prisma.bot.deleteMany();
    await prisma.tradingPair.deleteMany();
    await prisma.strategy.deleteMany();
    await prisma.brokerCredential.deleteMany();
    await prisma.portfolio.deleteMany();
    await prisma.marketData.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.chartImage.deleteMany();
    await prisma.user.deleteMany();

    console.log("✅ Database reset complete");
  } catch (error) {
    console.error("❌ Error resetting database:", error);
    throw error;
  }
}

async function seedTradingPairs() {
  console.log("🌱 Seeding trading pairs...");

  try {
    // Read trading pairs JSON file
    const tradingPairsPath = path.join(__dirname, "../../assets/trading_pairs.json");

    if (!fs.existsSync(tradingPairsPath)) {
      console.log("⚠️  Trading pairs file not found, skipping seeding");
      return;
    }

    const rawData = fs.readFileSync(tradingPairsPath, "utf8");
    const tradingPairs = JSON.parse(rawData);

    console.log(`📊 Found ${tradingPairs.length} trading pairs to seed`);

    // Process in batches to avoid memory issues
    const batchSize = 50; // Reduced batch size for better performance
    let processed = 0;
    let successful = 0;

    for (let i = 0; i < tradingPairs.length; i += batchSize) {
      const batch = tradingPairs.slice(i, i + batchSize);

      // Process each item individually to handle duplicates
      for (const pair of batch) {
        try {
          const transformedPair = {
            symbol: pair.symbol || "UNKNOWN",
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
          }

          processed++;

          // Progress update every 100 items
          if (processed % 100 === 0) {
            console.log(
              `✅ Processed ${processed}/${tradingPairs.length} trading pairs (${successful} new)`,
            );
          }
        } catch (error) {
          console.warn(`⚠️  Skipping pair ${pair.symbol}: ${error.message}`);
          processed++;
        }
      }
    }

    const finalCount = await prisma.tradingPair.count();
    console.log(
      `🎉 Successfully seeded ${successful} new trading pairs (${finalCount} total in database)`,
    );
  } catch (error) {
    console.error("❌ Error seeding trading pairs:", error);
    throw error;
  }
}

async function createSampleData() {
  console.log("👤 Creating sample user and data...");

  try {
    // Create a sample user
    const user = await prisma.user.create({
      data: {
        email: "demo@tekoa.trading",
        name: "Demo User",
      },
    });

    // Create a sample strategy
    const strategy = await prisma.strategy.create({
      data: {
        userId: user.id,
        name: "Sample Strategy",
        description: "A sample trading strategy for testing",
        indicators: JSON.stringify(["RSI", "MACD", "EMA"]),
        parameters: JSON.stringify({
          rsi_period: 14,
          macd_fast: 12,
          macd_slow: 26,
          ema_period: 20,
        }),
      },
    });

    // Create sample broker credentials
    const brokerCred = await prisma.brokerCredential.create({
      data: {
        userId: user.id,
        name: "Demo Capital.com Account",
        broker: "capital.com",
        isDemo: true,
        credentials: JSON.stringify({
          apiKey: "demo_key",
          apiSecret: "demo_secret",
        }),
      },
    });

    // Get a sample trading pair for bot creation
    const samplePair = await prisma.tradingPair.findFirst({
      where: {
        type: "FOREX",
        isActive: true,
      },
    });

    if (!samplePair) {
      // If no FOREX pair, get any pair
      const anyPair = await prisma.tradingPair.findFirst({
        where: { isActive: true },
      });

      if (anyPair) {
        await prisma.bot.create({
          data: {
            userId: user.id,
            name: "Demo Trading Bot",
            description: "A sample trading bot for demonstration",
            tradingPairSymbol: anyPair.symbol,
            tradingPairId: anyPair.id,
            timeframe: "M15",
            maxPositionSize: 1000,
            riskPercentage: 1.5,
            strategyId: strategy.id,
            brokerCredentialId: brokerCred.id,
          },
        });
      }
    } else {
      // Create a sample bot with FOREX pair
      await prisma.bot.create({
        data: {
          userId: user.id,
          name: "Demo Trading Bot",
          description: "A sample trading bot for demonstration",
          tradingPairSymbol: samplePair.symbol,
          tradingPairId: samplePair.id,
          timeframe: "M15",
          maxPositionSize: 1000,
          riskPercentage: 1.5,
          strategyId: strategy.id,
          brokerCredentialId: brokerCred.id,
        },
      });
    }

    console.log("✅ Sample data created successfully");
  } catch (error) {
    console.error("❌ Error creating sample data:", error);
    throw error;
  }
}

async function main() {
  console.log("🚀 Starting database reset and seeding process...\n");

  try {
    await resetDatabase();
    console.log("");

    await seedTradingPairs();
    console.log("");

    await createSampleData();
    console.log("");

    console.log("🎉 Database reset and seeding completed successfully!");

    // Print summary
    const counts = {
      users: await prisma.user.count(),
      tradingPairs: await prisma.tradingPair.count(),
      strategies: await prisma.strategy.count(),
      brokerCredentials: await prisma.brokerCredential.count(),
      bots: await prisma.bot.count(),
    };

    console.log("\n📊 Database Summary:");
    console.log(`   Users: ${counts.users}`);
    console.log(`   Trading Pairs: ${counts.tradingPairs}`);
    console.log(`   Strategies: ${counts.strategies}`);
    console.log(`   Broker Credentials: ${counts.brokerCredentials}`);
    console.log(`   Bots: ${counts.bots}`);

    // Show some sample trading pairs
    const samplePairs = await prisma.tradingPair.findMany({
      take: 5,
      orderBy: { symbol: "asc" },
    });

    console.log("\n📈 Sample Trading Pairs:");
    samplePairs.forEach((pair) => {
      console.log(`   ${pair.symbol} - ${pair.name} (${pair.type})`);
    });
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

module.exports = { resetDatabase, seedTradingPairs, createSampleData };
