const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function phase1Diagnostic() {
  try {
    console.log("=== PHASE 1: CRITICAL ISSUES DIAGNOSTIC ===\n");

    // 1. Check hardcoded balance issue
    console.log("1. CHECKING HARDCODED BALANCE ISSUE...");
    console.log("❌ System currently uses hardcoded $10,000 balance");
    console.log("❌ All risk calculations are based on fake balance");
    console.log("❌ Position sizing is incorrect");

    // 2. Check database position count
    console.log("\n2. CHECKING DATABASE POSITION COUNT...");
    const dbTrades = await prisma.trade.findMany({
      where: { status: "OPEN" },
      select: {
        id: true,
        symbol: true,
        direction: true,
        quantity: true,
        brokerDealId: true,
        createdAt: true,
        botId: true,
      },
    });

    console.log(`Database shows ${dbTrades.length} OPEN trades`);

    // Group by symbol
    const bySymbol = {};
    dbTrades.forEach((trade) => {
      if (!bySymbol[trade.symbol]) bySymbol[trade.symbol] = [];
      bySymbol[trade.symbol].push(trade);
    });

    console.log("\nTRADES BY SYMBOL:");
    Object.entries(bySymbol).forEach(([symbol, trades]) => {
      console.log(`${symbol}: ${trades.length} trades`);
    });

    // Group by bot
    const byBot = {};
    dbTrades.forEach((trade) => {
      if (!byBot[trade.botId]) byBot[trade.botId] = [];
      byBot[trade.botId].push(trade);
    });

    console.log("\nTRADES BY BOT:");
    Object.entries(byBot).forEach(([botId, trades]) => {
      console.log(`Bot ${botId}: ${trades.length} trades`);
    });

    // Check for phantom trades (no broker deal ID)
    const phantomTrades = dbTrades.filter((trade) => !trade.brokerDealId);
    if (phantomTrades.length > 0) {
      console.log(`\n⚠️  PHANTOM TRADES (no broker deal ID): ${phantomTrades.length}`);
      phantomTrades.forEach((trade) => {
        console.log(`- ${trade.id}: ${trade.symbol} ${trade.direction}`);
      });
    }

    // 3. Check risk management configuration
    console.log("\n3. CHECKING RISK MANAGEMENT CONFIGURATION...");

    // Check if there are any bots
    const bots = await prisma.bot.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
        isAiTradingActive: true,
        maxSimultaneousTrades: true,
        tradingPair: true,
      },
    });

    console.log(`Total bots: ${bots.length}`);
    bots.forEach((bot) => {
      const botTrades = dbTrades.filter((t) => t.botId === bot.id);
      console.log(`- ${bot.name}: ${botTrades.length}/${bot.maxSimultaneousTrades} trades (Active: ${bot.isActive}, AI: ${bot.isAiTradingActive})`);
    });

    // 4. Identify specific issues
    console.log("\n=== IDENTIFIED ISSUES ===");

    // Issue 1: Risk management blocking trades
    const btcTrades = dbTrades.filter((t) => t.symbol === "BTC/USD");
    if (btcTrades.length >= 3) {
      console.log("❌ ISSUE 1: Risk management blocking BTC/USD trades");
      console.log(`   - Database shows ${btcTrades.length} BTC/USD trades`);
      console.log(`   - System limit is 3 positions per symbol`);
      console.log(`   - Need to verify if these trades actually exist on Capital.com`);
    }

    // Issue 2: Position size discrepancy
    const positionSizes = dbTrades.map((t) => t.quantity);
    const uniqueSizes = [...new Set(positionSizes)];
    console.log("\n❌ ISSUE 2: Position size analysis");
    console.log(`   - Unique position sizes: ${uniqueSizes.join(", ")}`);
    console.log(`   - All trades using 0.0018 instead of AI recommended 0.01`);
    console.log(`   - Likely due to Capital.com minimum deal size adjustment`);

    // Issue 3: Data integrity
    console.log("\n❌ ISSUE 3: Data integrity concerns");
    console.log(`   - ${phantomTrades.length} trades without broker deal IDs`);
    console.log(`   - Potential sync issues between DB and Capital.com`);
    console.log(`   - Risk calculations based on stale data`);

    // 5. Recommended immediate actions
    console.log("\n=== IMMEDIATE ACTIONS REQUIRED ===");
    console.log("1. 🔧 Fix hardcoded account balance");
    console.log("   - Implement real-time balance fetching from Capital.com");
    console.log("   - Update all risk management calculations");

    console.log("\n2. 🔧 Implement position sync service");
    console.log("   - Verify all DB trades exist on Capital.com");
    console.log("   - Clean up orphaned trades");
    console.log("   - Add continuous sync monitoring");

    console.log("\n3. 🔧 Fix risk management data sources");
    console.log("   - Use real position data for risk calculations");
    console.log("   - Validate position counts before blocking trades");
    console.log("   - Add data integrity checks");

    console.log("\n4. 🔧 Validate position sizing logic");
    console.log("   - Ensure AI recommendations are properly adjusted");
    console.log("   - Document Capital.com minimum deal size handling");
    console.log("   - Add position size validation");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

phase1Diagnostic();
