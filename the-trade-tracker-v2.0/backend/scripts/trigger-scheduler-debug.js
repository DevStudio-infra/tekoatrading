const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function triggerSchedulerDebug() {
  console.log("🔍 Triggering scheduler debug and force restart...");

  try {
    // Get active bots
    const bots = await prisma.bot.findMany({
      where: {
        isActive: true,
        isAiTradingActive: true,
      },
    });

    console.log(`📊 Found ${bots.length} active bots`);

    // Import scheduler service
    const { schedulerService } = require("../services/scheduler.service");

    console.log("📋 Current scheduler status:");
    console.log(`- Is running: ${schedulerService.isRunning}`);
    console.log(`- Active jobs: ${schedulerService.jobs?.size || 0}`);

    if (schedulerService.jobs && schedulerService.jobs.size > 0) {
      console.log("🕐 Job details:");
      for (const [botId, job] of schedulerService.jobs.entries()) {
        const now = Date.now();
        const lastRun = job.lastRun ? job.lastRun.getTime() : 0;
        const timeSinceLastRun = now - lastRun;

        console.log(`  - Bot ${botId.slice(0, 8)}...:`);
        console.log(`    - Interval: ${job.interval}`);
        console.log(`    - Last run: ${job.lastRun ? job.lastRun.toISOString() : "Never"}`);
        console.log(`    - Time since last run: ${Math.round(timeSinceLastRun / 1000 / 60)} minutes`);
        console.log(`    - Has timeout ID: ${!!job.timeoutId}`);

        if (job.timeoutId) {
          console.log(`    - Timeout ID: ${job.timeoutId}`);
        }
      }
    }

    console.log("\n🚨 Forcing restart of overdue bots...");
    schedulerService.forceRestartOverdueBots();

    console.log("\n✅ Debug trigger complete!");
    console.log("📋 Watch the logs for [SCHEDULER DEBUG] messages to see what happens");
  } catch (error) {
    console.error("❌ Error during debug trigger:", error);
  }
}

triggerSchedulerDebug().catch(console.error);
