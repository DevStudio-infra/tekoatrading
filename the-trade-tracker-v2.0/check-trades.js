const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkTrades() {
  try {
    console.log("=== CHECKING CURRENT TRADE STATE ===\n");

    // Check all open trades by symbol
    console.log("1. Open trades by symbol:");
    const openTradesBySymbol = await prisma.trade.groupBy({
      by: ["symbol"],
      where: {
        status: "OPEN",
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    openTradesBySymbol.forEach((trade) => {
      console.log(`   ${trade.symbol}: ${trade._count.id} open trades`);
    });

    console.log("\n2. Open trades by bot and symbol:");
    const openTradesByBot = await prisma.trade.groupBy({
      by: ["botId", "symbol"],
      where: {
        status: "OPEN",
      },
      _count: {
        id: true,
      },
      orderBy: [{ symbol: "asc" }, { _count: { id: "desc" } }],
    });

    openTradesByBot.forEach((trade) => {
      console.log(`   Bot ${trade.botId.substring(0, 8)} - ${trade.symbol}: ${trade._count.id} trades`);
    });

    console.log("\n3. Bot configurations:");
    const bots = await prisma.bot.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        tradingPairSymbol: true,
        maxSimultaneousTrades: true,
        isActive: true,
        isAiTradingActive: true,
      },
    });

    bots.forEach((bot) => {
      console.log(`   ${bot.name} (${bot.id.substring(0, 8)}): ${bot.tradingPairSymbol}, Max: ${bot.maxSimultaneousTrades}, Active: ${bot.isActive}, AI: ${bot.isAiTradingActive}`);
    });

    console.log("\n4. Recent AAPL trades (last 10):");
    const recentAAPlTrades = await prisma.trade.findMany({
      where: {
        symbol: "AAPL",
        status: "OPEN",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      select: {
        id: true,
        botId: true,
        symbol: true,
        direction: true,
        quantity: true,
        status: true,
        createdAt: true,
        brokerDealId: true,
      },
    });

    recentAAPlTrades.forEach((trade) => {
      console.log(
        `   ${trade.id.substring(0, 8)} - Bot: ${trade.botId.substring(0, 8)}, ${trade.direction} ${trade.quantity}, Created: ${trade.createdAt.toISOString()}, Deal: ${
          trade.brokerDealId || "None"
        }`
      );
    });

    console.log("\n5. Total trades per bot:");
    const tradesByBot = await prisma.trade.groupBy({
      by: ["botId"],
      where: {
        status: "OPEN",
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    for (const botGroup of tradesByBot) {
      const bot = await prisma.bot.findUnique({
        where: { id: botGroup.botId },
        select: { name: true, maxSimultaneousTrades: true, tradingPairSymbol: true },
      });
      console.log(
        `   ${bot?.name || "Unknown"} (${botGroup.botId.substring(0, 8)}): ${botGroup._count.id}/${bot?.maxSimultaneousTrades || "Unknown"} trades on ${
          bot?.tradingPairSymbol || "Unknown"
        }`
      );
    }
  } catch (error) {
    console.error("Error checking trades:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTrades();
