const { PrismaClient } = require("@prisma/client");

async function fixBTCThreshold() {
  const prisma = new PrismaClient();

  try {
    console.log("🔧 Fixing BTC bot confidence threshold...\n");

    // Find all bots trading BTC
    const allBots = await prisma.bots.findMany({
      include: {
        strategy: true,
      },
    });

    console.log(`📊 Found ${allBots.length} total bots`);

    // Filter BTC bots
    const btcBots = allBots.filter((bot) => bot.tradingPairSymbol && (bot.tradingPairSymbol.includes("BTC") || bot.tradingPairSymbol.includes("Bitcoin")));

    console.log(`🪙 Found ${btcBots.length} BTC bots:`);
    btcBots.forEach((bot) => {
      console.log(`   - ${bot.name}: ${bot.tradingPairSymbol} (Current threshold: ${bot.strategy?.confidenceThreshold || "N/A"}%)`);
    });

    if (btcBots.length === 0) {
      console.log("❌ No BTC bots found. Current bots:");
      allBots.forEach((bot) => {
        console.log(`   - ${bot.name}: ${bot.tradingPairSymbol}`);
      });
      return;
    }

    // Update strategies for BTC bots
    let updatedCount = 0;
    for (const bot of btcBots) {
      if (bot.strategy && bot.strategy.confidenceThreshold > 50) {
        await prisma.strategies.update({
          where: { id: bot.strategyId },
          data: { confidenceThreshold: 45 },
        });

        console.log(`✅ Updated ${bot.name} strategy threshold from ${bot.strategy.confidenceThreshold}% to 45%`);
        updatedCount++;
      } else {
        console.log(`⚠️  ${bot.name} already has optimal threshold: ${bot.strategy?.confidenceThreshold || "N/A"}%`);
      }
    }

    console.log(`\n🎉 Updated ${updatedCount} BTC bot strategies!`);
    console.log("💡 Your BTC trades should now execute with 50% confidence (threshold is 45%)");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBTCThreshold();
