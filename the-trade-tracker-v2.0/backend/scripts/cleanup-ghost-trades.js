const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

/**
 * Clean up ghost trades - trades that exist in the database but were never actually executed
 */
async function cleanupGhostTrades() {
  try {
    console.log("🔍 Starting ghost trades cleanup...");

    // Find trades that are likely "ghost trades" (never executed with broker)
    const suspiciousTradesQuery = {
      OR: [
        // Trades with no broker deal ID (never went to broker)
        { brokerDealId: null },
        // Trades with no broker order ID (never went to broker)
        { brokerOrderId: null },
        // Trades with status PENDING for more than 1 hour (likely failed)
        {
          status: "PENDING",
          createdAt: {
            lt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          },
        },
        // Trades with CANCELLED status (these are confirmed failures)
        { status: "CANCELLED" },
      ],
    };

    const suspiciousTrades = await prisma.trade.findMany({
      where: suspiciousTradesQuery,
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`📊 Found ${suspiciousTrades.length} suspicious trades to review:`);

    // Group by status for reporting
    const groupedTrades = suspiciousTrades.reduce((acc, trade) => {
      const key = `${trade.status}_${trade.brokerDealId ? "withDealId" : "noDealId"}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    console.log("📋 Breakdown:");
    Object.entries(groupedTrades).forEach(([key, count]) => {
      console.log(`  - ${key}: ${count} trades`);
    });

    // Show some examples
    console.log("\n📝 Sample trades:");
    suspiciousTrades.slice(0, 5).forEach((trade) => {
      console.log(
        `  - ${trade.id}: ${trade.symbol} ${trade.direction} ${trade.quantity} (${trade.status}) - ${trade.brokerDealId ? "HAS" : "NO"} broker ID - Created: ${trade.createdAt}`
      );
    });

    // Interactive cleanup (or you can uncomment to auto-delete)
    console.log("\n⚠️  To delete these trades, uncomment the deletion code below and run again.");
    console.log("   Review the trades first to make sure they are indeed ghost trades.");

    /*
    // UNCOMMENT THIS SECTION TO ACTUALLY DELETE THE TRADES

    console.log('\n🗑️  Deleting ghost trades...');

    const deleteResult = await prisma.trade.deleteMany({
      where: suspiciousTradesQuery
    });

    console.log(`✅ Deleted ${deleteResult.count} ghost trades`);
    */

    // Show remaining trade count
    const totalTrades = await prisma.trade.count();
    console.log(`\n📈 Total trades remaining in database: ${totalTrades}`);

    // Show real trades (those with broker deal IDs)
    const realTrades = await prisma.trade.count({
      where: {
        brokerDealId: { not: null },
        status: { notIn: ["CANCELLED"] },
      },
    });

    console.log(`✅ Real trades (with broker deal ID): ${realTrades}`);
    console.log(`❌ Ghost/failed trades: ${totalTrades - realTrades}`);
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupGhostTrades();
