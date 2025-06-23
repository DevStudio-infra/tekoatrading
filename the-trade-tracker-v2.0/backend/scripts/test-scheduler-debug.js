console.log("🔍 Testing scheduler debug logging...");

try {
  // Import the scheduler service
  const { schedulerService } = require("../services/scheduler.service.ts");

  console.log("✅ Scheduler service imported successfully");
  console.log("📋 Scheduler service methods:");
  console.log("- forceRestartOverdueBots:", typeof schedulerService.forceRestartOverdueBots);
  console.log("- isRunning:", schedulerService.isRunning);
  console.log("- jobs size:", schedulerService.jobs?.size || "undefined");

  // Check if the service has our debug methods
  if (typeof schedulerService.forceRestartOverdueBots === "function") {
    console.log("✅ forceRestartOverdueBots method exists - debug code is loaded!");

    // Try to call it to trigger debug logs
    console.log("🚨 Calling forceRestartOverdueBots to trigger debug logs...");
    schedulerService.forceRestartOverdueBots();
  } else {
    console.log("❌ forceRestartOverdueBots method missing - old code is still running!");
  }
} catch (error) {
  console.error("❌ Error testing scheduler:", error.message);
  console.error("Stack:", error.stack);
}
