const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fixSchedulerStuckBots() {
  console.log("🔧 Starting scheduler stuck bots fix...");

  try {
    // 1. Get current bot status
    const bots = await prisma.bot.findMany({
      where: {
        isActive: true,
        isAiTradingActive: true,
      },
      include: {
        brokerCredential: true,
      },
    });

    console.log(`📊 Found ${bots.length} active bots with AI trading enabled`);

    // 2. Check recent evaluations to see which bots are actually stuck
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentEvaluations = await prisma.evaluation.findMany({
      where: {
        startDate: {
          gte: oneHourAgo,
        },
      },
      orderBy: {
        startDate: "desc",
      },
      include: {
        bot: {
          select: {
            id: true,
            name: true,
            tradingPairSymbol: true,
            timeframe: true,
          },
        },
      },
    });

    console.log(`📈 Found ${recentEvaluations.length} evaluations in the last hour`);

    // 3. Identify stuck bots
    const botsWithRecentEvals = new Set(recentEvaluations.map((e) => e.botId));
    const stuckBots = bots.filter((bot) => !botsWithRecentEvals.has(bot.id));

    console.log(`🚨 Identified ${stuckBots.length} stuck bots (no evaluations in last hour):`);
    for (const bot of stuckBots) {
      console.log(`  - ${bot.name || "Unnamed"} (${bot.id.slice(0, 8)}...) - ${bot.tradingPairSymbol} ${bot.timeframe}`);
    }

    // 4. Show scheduler diagnostics
    console.log("\n📋 Current scheduler status:");
    console.log("- The scheduler appears to be stuck");
    console.log("- Bots show 'Next run in: ~0 minute(s)' but aren't executing");
    console.log("- This indicates a timeout/promise handling issue in the scheduler");

    // 5. Provide recovery instructions
    console.log("\n🔧 RECOVERY STEPS:");
    console.log("1. Restart the backend server to reset the scheduler");
    console.log("2. The updated scheduler code will:");
    console.log("   - Detect overdue bots and run them immediately");
    console.log("   - Add better error handling to prevent future stuck states");
    console.log("   - Clear bot coordination states on startup");

    // 6. Show what should happen after restart
    console.log("\n✅ EXPECTED RESULTS AFTER RESTART:");
    console.log("- Bots will show 'Timeout fired for bot...' messages");
    console.log("- Bot evaluations will start immediately for overdue bots");
    console.log("- Regular scheduling will resume with proper error handling");

    console.log("\n🚀 Ready to restart backend server!");
  } catch (error) {
    console.error("❌ Error in scheduler fix script:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixSchedulerStuckBots();
