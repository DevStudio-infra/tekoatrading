const { PrismaClient } = require(".prisma/client");

async function checkRecentTrades() {
  const prisma = new PrismaClient();

  try {
    console.log("🔍 Checking recent trades in database...\n");

    // Get recent trades from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentTrades = await prisma.trades.findMany({
      where: {
        createdAt: {
          gte: oneHourAgo,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    console.log(`Found ${recentTrades.length} recent trades:\n`);

    recentTrades.forEach((trade, index) => {
      console.log(`${index + 1}. Trade ${trade.id}`);
      console.log(`   Bot: ${trade.botId}`);
      console.log(`   Symbol: ${trade.symbol}`);
      console.log(`   Direction: ${trade.direction}`);
      console.log(`   Status: ${trade.status}`);
      console.log(`   Entry Price: ${trade.entryPrice}`);
      console.log(`   Broker Deal ID: ${trade.brokerDealId}`);
      console.log(`   Created: ${trade.createdAt}`);
      console.log(`   Updated: ${trade.updatedAt}\n`);
    });

    // Check the specific trade we saw in the logs
    const specificTrade = await prisma.trades.findUnique({
      where: {
        id: "ff047fa2-0eca-48ad-8f3b-b6dbd0cfd7bb",
      },
    });

    if (specificTrade) {
      console.log("✅ Found the specific trade from logs:");
      console.log(`   ID: ${specificTrade.id}`);
      console.log(`   Status: ${specificTrade.status}`);
      console.log(`   Entry Price: ${specificTrade.entryPrice}`);
      console.log(`   Created: ${specificTrade.createdAt}`);
    } else {
      console.log("❌ Could not find the specific trade from logs");
    }

    // Check bot statistics
    const botStats = await prisma.trades.groupBy({
      by: ["botId"],
      _count: {
        id: true,
      },
      where: {
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    console.log("\n📊 Trades by Bot (last hour):");
    botStats.forEach((stat) => {
      console.log(`   Bot ${stat.botId}: ${stat._count.id} trades`);
    });
  } catch (error) {
    console.error("❌ Error checking trades:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentTrades();
