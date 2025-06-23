const { PrismaClient } = require("../generated/prisma");

async function fixBTCConfidenceThreshold() {
  const prisma = new PrismaClient();

  try {
    console.log("🔧 Fixing BTC bot confidence thresholds...\n");

    // Find all bots trading BTC/USD
    const btcBots = await prisma.bots.findMany({
      where: {
        tradingPairSymbol: "BTC/USD",
      },
      include: {
        strategy: true,
      },
    });

    console.log(`Found ${btcBots.length} BTC/USD bots:`);

    for (const bot of btcBots) {
      console.log(`\n📊 Bot: ${bot.name} (${bot.id})`);
      console.log(`   Current strategy confidence threshold: ${bot.strategy?.confidenceThreshold || 70}%`);

      if (bot.strategy && bot.strategy.confidenceThreshold > 50) {
        // Update the strategy to have a lower confidence threshold for BTC
        await prisma.strategies.update({
          where: { id: bot.strategyId },
          data: { confidenceThreshold: 45 }, // Set to 45% for BTC trading
        });

        console.log(`   ✅ Updated confidence threshold to 45% for better BTC trading`);
      } else {
        console.log(`   ✅ Confidence threshold already optimized`);
      }
    }

    console.log("\n🎉 All BTC bots updated! Your BTC trades should now execute.");
    console.log("💡 Note: 45% confidence is still conservative for crypto trading.");
  } catch (error) {
    console.error("❌ Error updating confidence thresholds:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBTCConfidenceThreshold();
