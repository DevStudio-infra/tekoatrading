const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function resetBotSystem() {
  console.log("🔄 Starting bot system reset...");

  try {
    // Get current bot status
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

    // Show bot details
    for (const bot of bots) {
      console.log(`  - Bot ${bot.id.slice(0, 8)}... (${bot.name || "Unnamed"}) - ${bot.tradingPairSymbol} ${bot.timeframe}`);
    }

    // Clear any stuck evaluations older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const stuckEvaluations = await prisma.evaluation.deleteMany({
      where: {
        startDate: {
          lt: thirtyMinutesAgo,
        },
        endDate: {
          equals: null,
        },
      },
    });

    if (stuckEvaluations.count > 0) {
      console.log(`🧹 Cleaned up ${stuckEvaluations.count} stuck evaluation records`);
    }

    // Show recent activity
    const recentEvaluations = await prisma.evaluation.findMany({
      where: {
        startDate: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
      orderBy: {
        startDate: "desc",
      },
      take: 10,
      include: {
        bot: {
          select: {
            name: true,
            tradingPairSymbol: true,
          },
        },
      },
    });

    console.log(`📈 Recent evaluations (last hour): ${recentEvaluations.length}`);
    for (const eval of recentEvaluations.slice(0, 5)) {
      const time = eval.startDate.toISOString().slice(11, 19);
      console.log(`  - ${time}: ${eval.bot?.name || "Unknown"} (${eval.bot?.tradingPairSymbol}) - ${eval.prediction} (${eval.confidence}%)`);
    }

    console.log("✅ Bot system reset completed");
    console.log("");
    console.log("🚀 Next steps:");
    console.log("1. Restart the backend with: npm run dev");
    console.log("2. Check logs for bot execution");
    console.log("3. Monitor bot coordination service status");
  } catch (error) {
    console.error("❌ Error during bot system reset:", error);
  } finally {
    await prisma.$disconnect();
  }
}

resetBotSystem();
