/**
 * Scheduler Service - Bot Execution Management
 * Manages the execution of trading bots based on their timeframes
 */

import { logger } from "../logger";
import { prisma } from "../prisma";
import { botEvaluationService } from "./bot-evaluation.service";

interface BotJob {
  botId: string;
  interval: string;
  timeoutId?: NodeJS.Timeout;
  lastRun?: Date;
}

export class SchedulerService {
  private static instance: SchedulerService;
  private jobs: Map<string, BotJob> = new Map();
  private isRunning: boolean = false;
  private currentlyRunningBots: Set<string> = new Set();
  private tradeMonitoringInterval: NodeJS.Timeout | null = null;
  private statusInterval: NodeJS.Timeout | null = null;

  // Trade monitoring interval (every 30 seconds for active management)
  private readonly TRADE_MONITORING_INTERVAL = 30 * 1000;
  private readonly STATUS_REPORTING_INTERVAL = 60 * 1000; // 1 minute

  static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.info("Scheduler is already running");
      return;
    }

    this.isRunning = true;
    logger.info("🚀 Starting bot scheduler...");

    // Load and schedule active bots
    await this.loadAndScheduleActiveBots();

    // Start continuous trade monitoring
    this.startTradeMonitoring();

    // Start status reporting
    this.startStatusReporting();

    logger.info("✅ Bot scheduler started successfully");
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Clear all timeouts
    for (const [botId, job] of this.jobs.entries()) {
      if (job.timeoutId) {
        clearTimeout(job.timeoutId);
      }
    }

    // Stop monitoring intervals
    if (this.tradeMonitoringInterval) {
      clearInterval(this.tradeMonitoringInterval);
      this.tradeMonitoringInterval = null;
    }

    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }

    this.jobs.clear();
    this.currentlyRunningBots.clear();

    logger.info("🛑 Bot scheduler stopped");
  }

  addBot(botId: string, interval: string): void {
    if (this.jobs.has(botId)) {
      logger.info(`Bot ${botId} already scheduled, updating interval to ${interval}`);
      this.updateBotSchedule(botId, interval);
      return;
    }

    const job: BotJob = {
      botId,
      interval,
    };

    this.jobs.set(botId, job);

    if (this.isRunning) {
      this.scheduleNextRun(botId, 5000); // Start in 5 seconds
    }

    logger.info(`📅 Bot ${botId} scheduled with interval ${interval}`);
  }

  removeBot(botId: string): void {
    const job = this.jobs.get(botId);
    if (!job) {
      return;
    }

    if (job.timeoutId) {
      clearTimeout(job.timeoutId);
    }

    this.jobs.delete(botId);
    this.currentlyRunningBots.delete(botId);

    logger.info(`🗑️ Removed bot ${botId} from scheduler`);
  }

  updateBotSchedule(botId: string, interval: string): void {
    const job = this.jobs.get(botId);
    if (!job) {
      this.addBot(botId, interval);
      return;
    }

    if (job.interval !== interval) {
      job.interval = interval;

      // Reschedule with new interval
      if (job.timeoutId) {
        clearTimeout(job.timeoutId);
      }

      this.scheduleNextRun(botId, 0);
      logger.info(`🔄 Updated bot ${botId} schedule to ${interval}`);
    }
  }

  private async runJob(botId: string): Promise<void> {
    const job = this.jobs.get(botId);
    if (!job) {
      logger.error(`No job found for bot ${botId}`);
      return;
    }

    if (this.currentlyRunningBots.has(botId)) {
      logger.info(`Bot ${botId} is already running, skipping execution`);
      return;
    }

    this.currentlyRunningBots.add(botId);
    job.lastRun = new Date();

    try {
      logger.info(`🏃 Running evaluation for bot ${botId} with interval ${job.interval}`);

      // Use the existing bot evaluation service
      const result = await botEvaluationService.evaluateBot(botId);

      if (result.success) {
        logger.info(`✅ Bot ${botId} evaluation completed successfully`);
      } else {
        logger.error(`❌ Bot ${botId} evaluation failed: ${result.error}`);
      }
    } catch (error) {
      logger.error(`❌ Error running bot ${botId}:`, error);
    } finally {
      this.currentlyRunningBots.delete(botId);

      // CRITICAL FIX: Always reschedule (success OR error) for continuous operation
      if (this.jobs.has(botId) && this.isRunning) {
        logger.info(`🔄 Rescheduling bot ${botId} for next run (continuous operation)`);
        this.scheduleNextRun(botId, 0);
      }
    }
  }

  private scheduleNextRun(botId: string, staggerOffset: number = 0): void {
    const job = this.jobs.get(botId);
    if (!job) {
      return;
    }

    const intervalMs = this.getIntervalInMs(job.interval);
    let nextRunMs = intervalMs + staggerOffset;

    // If this is the first run, use stagger offset
    if (!job.lastRun) {
      nextRunMs = staggerOffset || 5000; // 5 seconds default
    } else {
      // Calculate time since last run
      const timeSinceLastRun = Date.now() - job.lastRun.getTime();
      const timeUntilNext = Math.max(0, intervalMs - timeSinceLastRun);
      nextRunMs = timeUntilNext + staggerOffset;
    }

    // Clear existing timeout
    if (job.timeoutId) {
      clearTimeout(job.timeoutId);
    }

    // Schedule next run
    job.timeoutId = setTimeout(async () => {
      await this.runJob(botId);
    }, nextRunMs);

    logger.debug(
      `⏰ Next run for bot ${botId} scheduled in ${Math.round(nextRunMs / 1000)} seconds`,
    );
  }

  private async loadAndScheduleActiveBots(): Promise<void> {
    try {
      const activeBots = await prisma.bot.findMany({
        where: {
          isActive: true,
          isAiTradingActive: true, // Only bots with AI trading enabled
        },
        select: {
          id: true,
          timeframe: true,
        },
      });

      logger.info(`Found ${activeBots.length} active AI-enabled bots to schedule`);

      for (const bot of activeBots) {
        const interval = bot.timeframe || "1H"; // Default to 1 hour
        this.addBot(bot.id, interval);
      }

      logger.info(`✅ Successfully scheduled ${activeBots.length} bots`);
    } catch (error) {
      logger.error("❌ Error loading active bots:", error);
    }
  }

  private getIntervalInMs(interval: string): number {
    const intervalMap: Record<string, number> = {
      // Standard formats
      "1m": 60 * 1000, // 1 minute
      "5m": 5 * 60 * 1000, // 5 minutes
      "15m": 15 * 60 * 1000, // 15 minutes
      "30m": 30 * 60 * 1000, // 30 minutes
      "1H": 60 * 60 * 1000, // 1 hour
      "4H": 4 * 60 * 60 * 1000, // 4 hours
      "1D": 24 * 60 * 60 * 1000, // 1 day
      // TradingView/Capital.com formats (M1, M5, etc.)
      M1: 60 * 1000, // 1 minute
      M5: 5 * 60 * 1000, // 5 minutes
      M15: 15 * 60 * 1000, // 15 minutes
      M30: 30 * 60 * 1000, // 30 minutes
      H1: 60 * 60 * 1000, // 1 hour
      H4: 4 * 60 * 60 * 1000, // 4 hours
      D1: 24 * 60 * 60 * 1000, // 1 day
    };

    return intervalMap[interval] || intervalMap["1H"]; // Default to 1 hour
  }

  // Bot lifecycle event handlers - call these from bot management
  onBotCreated(botId: string, interval: string): void {
    if (this.isRunning) {
      this.addBot(botId, interval);
    }
  }

  onBotDeleted(botId: string): void {
    this.removeBot(botId);
  }

  onBotUpdated(
    botId: string,
    interval: string,
    isActive: boolean,
    isAiTradingActive: boolean,
  ): void {
    if (isActive && isAiTradingActive) {
      this.addBot(botId, interval);
    } else {
      this.removeBot(botId);
    }
  }

  // Status methods
  getScheduledBots(): string[] {
    return Array.from(this.jobs.keys());
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getRunningBots(): string[] {
    return Array.from(this.currentlyRunningBots);
  }

  getBotJobInfo(botId: string): BotJob | undefined {
    return this.jobs.get(botId);
  }

  logActiveJobs(): void {
    logger.info(`📊 Active bot jobs: ${this.jobs.size}`);
    for (const [botId, job] of this.jobs.entries()) {
      const lastRun = job.lastRun ? job.lastRun.toISOString() : "Never";
      const nextRun = job.timeoutId ? "Scheduled" : "Not scheduled";
      logger.info(`  - Bot ${botId} (${job.interval}): Last run: ${lastRun}, Next: ${nextRun}`);
    }
  }

  /**
   * Start trade monitoring for continuous operation
   */
  private startTradeMonitoring(): void {
    if (this.tradeMonitoringInterval) {
      return; // Already monitoring
    }

    logger.info("🔍 Starting trade monitoring...");

    this.tradeMonitoringInterval = setInterval(async () => {
      try {
        // Simple check to ensure scheduler is still responsive
        if (this.isRunning && this.jobs.size > 0) {
          logger.debug(
            `📊 Trade monitoring: ${this.jobs.size} bots scheduled, ${this.currentlyRunningBots.size} running`,
          );
        }
      } catch (error) {
        logger.error("❌ Trade monitoring error:", error);
      }
    }, this.TRADE_MONITORING_INTERVAL);

    logger.info("✅ Trade monitoring started");
  }

  /**
   * Start status reporting for continuous operation
   */
  private startStatusReporting(): void {
    if (this.statusInterval) {
      return; // Already reporting
    }

    logger.info("📊 Starting status reporting...");

    this.statusInterval = setInterval(() => {
      try {
        if (this.isRunning) {
          const activeJobs = this.jobs.size;
          const runningBots = this.currentlyRunningBots.size;

          if (activeJobs > 0 || runningBots > 0) {
            logger.info(`🤖 Scheduler Status: ${activeJobs} scheduled, ${runningBots} running`);

            // Log detailed status every 5 minutes
            const now = new Date();
            if (now.getMinutes() % 5 === 0) {
              this.logActiveJobs();
            }
          }
        }
      } catch (error) {
        logger.error("❌ Status reporting error:", error);
      }
    }, this.STATUS_REPORTING_INTERVAL);

    logger.info("✅ Status reporting started");
  }
}

export const schedulerService = SchedulerService.getInstance();
