const { botCoordinationService } = require("../services/bot-coordination.service");

console.log("🔧 Bot Coordination System Recovery");
console.log("=====================================");

async function fixBotCoordination() {
  try {
    console.log("📊 Current system status:");
    const status = botCoordinationService.getStatus();
    console.log("- Running bots:", status.runningBots);
    console.log("- Queued bots:", status.queuedBots);
    console.log("- Credential usage:", status.credentialUsage);
    console.log("- Can accept new bot:", status.canAcceptNewBot);

    if (status.runningBots > 0 || status.queuedBots > 0) {
      console.log("⚠️  Found stuck bots, performing emergency reset...");
      botCoordinationService.emergencyReset();
      console.log("✅ Emergency reset completed");
    } else {
      console.log("✅ Bot coordination system is clean");
    }

    console.log("📊 System status after reset:");
    const newStatus = botCoordinationService.getStatus();
    console.log("- Running bots:", newStatus.runningBots);
    console.log("- Queued bots:", newStatus.queuedBots);
    console.log("- Can accept new bot:", newStatus.canAcceptNewBot);

    console.log("🎉 Bot coordination system recovery completed");
  } catch (error) {
    console.error("❌ Recovery failed:", error.message);
  }
}

if (require.main === module) {
  fixBotCoordination();
}

module.exports = { fixBotCoordination };
