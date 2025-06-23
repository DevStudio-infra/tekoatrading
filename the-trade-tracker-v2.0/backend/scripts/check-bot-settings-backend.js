const { PrismaClient } = require("@prisma/client");

async function checkBotSettings() {
  const prisma = new PrismaClient();

  try {
    console.log("🤖 Checking Bot Advanced Settings...\n");

    // Get all bots with their advanced settings
    const bots = await prisma.bots.findMany({
      include: {
        strategies: true,
      },
    });

    console.log(`📊 Found ${bots.length} bots total\n`);

    if (bots.length === 0) {
      console.log("❌ No bots found in database");
      return;
    }

    bots.forEach((bot, index) => {
      console.log(`🤖 Bot ${index + 1}: ${bot.name}`);
      console.log(`   - ID: ${bot.id}`);
      console.log(`   - Trading Pair: ${bot.tradingPairSymbol || "Not set"}`);
      console.log(`   - Max Simultaneous Trades: ${bot.maxSimultaneousTrades}`);
      console.log(`   - Active: ${bot.isActive}`);
      console.log(`   - AI Trading: ${bot.isAiTradingActive}`);
      console.log(`   - Timeframe: ${bot.timeframe}`);

      // Check advanced settings
      console.log(`\n   📋 Advanced Settings:`);

      if (bot.aiConfig) {
        console.log(`   ✅ AI Config: Present`);
        console.log(`      ${JSON.stringify(bot.aiConfig, null, 2).substring(0, 200)}...`);
      } else {
        console.log(`   ❌ AI Config: NULL`);
      }

      if (bot.riskParams) {
        console.log(`   ✅ Risk Params: Present`);
        console.log(`      ${JSON.stringify(bot.riskParams, null, 2).substring(0, 200)}...`);
      } else {
        console.log(`   ❌ Risk Params: NULL`);
      }

      if (bot.tradingConstraints) {
        console.log(`   ✅ Trading Constraints: Present`);
        console.log(`      ${JSON.stringify(bot.tradingConstraints, null, 2).substring(0, 200)}...`);
      } else {
        console.log(`   ❌ Trading Constraints: NULL`);
      }

      if (bot.perfOptimization) {
        console.log(`   ✅ Performance Optimization: Present`);
        console.log(`      ${JSON.stringify(bot.perfOptimization, null, 2).substring(0, 200)}...`);
      } else {
        console.log(`   ❌ Performance Optimization: NULL`);
      }

      console.log("\n" + "─".repeat(80) + "\n");
    });

    // Summary
    const botsWithAiConfig = bots.filter((bot) => bot.aiConfig).length;
    const botsWithRiskParams = bots.filter((bot) => bot.riskParams).length;
    const botsWithConstraints = bots.filter((bot) => bot.tradingConstraints).length;
    const botsWithPerfOptim = bots.filter((bot) => bot.perfOptimization).length;

    console.log(`📈 Summary:`);
    console.log(`   - Bots with AI Config: ${botsWithAiConfig}/${bots.length}`);
    console.log(`   - Bots with Risk Params: ${botsWithRiskParams}/${bots.length}`);
    console.log(`   - Bots with Trading Constraints: ${botsWithConstraints}/${bots.length}`);
    console.log(`   - Bots with Performance Optimization: ${botsWithPerfOptim}/${bots.length}`);

    const utilizationScore = ((botsWithAiConfig + botsWithRiskParams + botsWithConstraints + botsWithPerfOptim) / (bots.length * 4)) * 100;
    console.log(`\n🎯 Advanced Settings Utilization: ${utilizationScore.toFixed(1)}%`);

    if (utilizationScore < 25) {
      console.log(`❌ LOW UTILIZATION - Advanced settings are mostly unused!`);
      console.log(`\n💡 RECOMMENDATIONS:`);
      console.log(`   1. Add advanced settings to bot creation forms`);
      console.log(`   2. Implement logic to read these settings in trading service`);
      console.log(`   3. Update position management to use risk parameters`);
    } else if (utilizationScore < 75) {
      console.log(`⚠️  Medium utilization - Some advanced settings are being used`);
    } else {
      console.log(`✅ High utilization - Advanced settings are well utilized`);
    }
  } catch (error) {
    console.error("❌ Error checking bot settings:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkBotSettings();
