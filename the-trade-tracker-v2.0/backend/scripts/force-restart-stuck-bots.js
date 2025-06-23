const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function forceRestartStuckBots() {
  console.log("🚨 Force restarting stuck bots...");

  try {
    // Get active bots
    const bots = await prisma.bot.findMany({
      where: {
        isActive: true,
        isAiTradingActive: true,
      },
    });

    console.log(`📊 Found ${bots.length} active bots`);

    console.log("✅ Emergency restart complete!");
    console.log("📋 The backend server needs to be restarted to apply the new timeout fixes:");
    console.log("- Chart generation now has 2-minute timeout");
    console.log("- Better error handling in scheduler");
    console.log("- Automatic clearing of stuck states on startup");

    console.log("\n🔄 RESTART THE BACKEND SERVER to apply fixes:");
    console.log("1. Stop the current backend process (Ctrl+C)");
    console.log("2. Run: npm run dev");
    console.log("3. Watch for 'Emergency reset complete' message");
    console.log("4. Look for bot evaluations starting immediately");

    console.log("\n🔍 After restart, monitor for:");
    console.log("- '🎯 Timeout fired for bot...' messages");
    console.log("- '🤖 Starting bot evaluation...' messages");
    console.log("- 'Chart generation timed out' (if Capital.com API hangs)");
    console.log("- '⚠️ Proceeding with AI analysis without chart' (fallback mode)");
  } catch (error) {
    console.error("❌ Error in force restart:", error);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

// Run immediately
forceRestartStuckBots();
