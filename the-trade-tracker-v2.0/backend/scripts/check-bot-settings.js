const { PrismaClient } = require("@prisma/client");

async function checkBotSettings() {
  const prisma = new PrismaClient();

  try {
    console.log("🤖 Checking Bot Advanced Settings...\n");

    // Get all bots with their advanced settings
    const bots = await prisma.bots.findMany({
      include: {
        strategy: true,
      },
    });

    console.log(`📊 Found ${bots.length} bots total\n`);

    bots.forEach((bot, index) => {
      console.log(`🤖 Bot ${index + 1}: ${bot.name}`);
      console.log(`   - ID: ${bot.id}`);
      console.log(`   - Trading Pair: ${bot.tradingPairSymbol}`);
      console.log(`   - Max Simultaneous Trades: ${bot.maxSimultaneousTrades}`);
      console.log(`   - Active: ${bot.isActive}`);
      console.log(`   - AI Trading: ${bot.isAiTradingActive}`);
      console.log(`   - Timeframe: ${bot.timeframe}`);

      // Check advanced settings
      console.log(`\n   📋 Advanced Settings:`);

      if (bot.aiConfig) {
        console.log(`   ✅ AI Config: ${JSON.stringify(bot.aiConfig, null, 2).substring(0, 100)}...`);
      } else {
        console.log(`   ❌ AI Config: NULL`);
      }

      if (bot.riskParams) {
        console.log(`   ✅ Risk Params: ${JSON.stringify(bot.riskParams, null, 2).substring(0, 100)}...`);
      } else {
        console.log(`   ❌ Risk Params: NULL`);
      }

      if (bot.tradingConstraints) {
        console.log(`   ✅ Trading Constraints: ${JSON.stringify(bot.tradingConstraints, null, 2).substring(0, 100)}...`);
      } else {
        console.log(`   ❌ Trading Constraints: NULL`);
      }

      if (bot.perfOptimization) {
        console.log(`   ✅ Performance Optimization: ${JSON.stringify(bot.perfOptimization, null, 2).substring(0, 100)}...`);
      } else {
        console.log(`   ❌ Performance Optimization: NULL`);
      }

      // Check strategy description for trade management rules
      if (bot.strategy?.description) {
        console.log(`\n   📝 Strategy Description: "${bot.strategy.description}"`);

        // Quick check for common rule patterns
        const desc = bot.strategy.description.toLowerCase();
        const hasCandles = desc.includes("candle");
        const hasTime = desc.includes("minute") || desc.includes("hour");
        const hasClose = desc.includes("close");

        if (hasCandles || hasTime || hasClose) {
          console.log(`   ⚡ Potential Trade Management Rules Detected!`);
          if (hasCandles) console.log(`      - Contains candle-based rules`);
          if (hasTime) console.log(`      - Contains time-based rules`);
          if (hasClose) console.log(`      - Contains close/exit rules`);
        } else {
          console.log(`   ⚠️  No obvious trade management rules found`);
        }
      } else {
        console.log(`\n   ❌ No Strategy Description`);
      }

      console.log("\n" + "─".repeat(80) + "\n");
    });

    // Summary
    const botsWithAiConfig = bots.filter((bot) => bot.aiConfig).length;
    const botsWithRiskParams = bots.filter((bot) => bot.riskParams).length;
    const botsWithConstraints = bots.filter((bot) => bot.tradingConstraints).length;
    const botsWithPerfOptim = bots.filter((bot) => bot.perfOptimization).length;
    const botsWithStrategyDesc = bots.filter((bot) => bot.strategy?.description).length;

    console.log(`📈 Summary:`);
    console.log(`   - Bots with AI Config: ${botsWithAiConfig}/${bots.length}`);
    console.log(`   - Bots with Risk Params: ${botsWithRiskParams}/${bots.length}`);
    console.log(`   - Bots with Trading Constraints: ${botsWithConstraints}/${bots.length}`);
    console.log(`   - Bots with Performance Optimization: ${botsWithPerfOptim}/${bots.length}`);
    console.log(`   - Bots with Strategy Descriptions: ${botsWithStrategyDesc}/${bots.length}`);

    const utilizationScore = ((botsWithAiConfig + botsWithRiskParams + botsWithConstraints + botsWithPerfOptim) / (bots.length * 4)) * 100;
    console.log(`\n🎯 Advanced Settings Utilization: ${utilizationScore.toFixed(1)}%`);

    if (utilizationScore < 25) {
      console.log(`❌ Low utilization - Advanced settings are mostly unused!`);
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
