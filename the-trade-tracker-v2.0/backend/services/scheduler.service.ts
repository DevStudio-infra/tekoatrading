import { EventEmitter } from "events";
import { prisma } from "../utils/prisma";
import { BotService } from "./bot.service";
import { TradeManagementAI } from "./trade-management-ai.service";
import { PositionManagementService } from "./position-management.service";
import { loggerService } from "./logger.service";
import { positionSyncService } from "./adapters/position-sync.adapter";
import { PerformanceCalculationService } from "./PerformanceCalculationService";

interface ScheduledJob {
  botId: string; // Using string type for UUID format
  interval: string;
  lastRun?: Date | null;
  timeoutId?: NodeJS.Timeout;
}

/**
 * SchedulerService handles the scheduling of bot evaluations at regular intervals.
 * It maintains a list of active bots and schedules their evaluation based on their timeframe.
 * It also actively manages existing trades for proper trade management.
 */
export class SchedulerService extends EventEmitter {
  // Map of bot ID to scheduled job
  protected jobs = new Map<string, ScheduledJob>();
  protected botService: any;
  protected tradeManagementAI: TradeManagementAI;
  protected positionManagementService: PositionManagementService;
  protected performanceCalculationService: PerformanceCalculationService;
  protected isRunning: boolean = false;
  protected tradeMonitoringInterval: NodeJS.Timeout | null = null;
  private performanceInterval: NodeJS.Timeout | null = null;
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private statusInterval: NodeJS.Timeout | null = null;

  // Map of timeframe to interval in milliseconds
  private readonly intervalMap: { [key: string]: number } = {
    M1: 60 * 1000, // 1 minute
    M5: 5 * 60 * 1000, // 5 minutes
    M15: 15 * 60 * 1000, // 15 minutes
    M30: 30 * 60 * 1000, // 30 minutes
    H1: 60 * 60 * 1000, // 1 hour
    H4: 4 * 60 * 60 * 1000, // 4 hours
    D1: 24 * 60 * 60 * 1000, // 1 day
  };

  // Trade monitoring interval (every 30 seconds for active management)
  private readonly TRADE_MONITORING_INTERVAL = 30 * 1000;

  // Emergency mode flags and settings
  private EMERGENCY_MODE = true; // ENABLED for Capital.com API protection
  private CONSERVATIVE_MODE = true; // ENABLED for Capital.com API protection
  private EMERGENCY_STAGGER_OFFSET = 120000; // 2 minutes (reduced from 5 minutes)
  private EMERGENCY_INITIAL_DELAY = 10000; // 10 seconds (reduced from 1 minute)
  private CONSERVATIVE_STAGGER_OFFSET = 90000; // 1.5 minutes (reduced from 4 minutes)
  private CONSERVATIVE_INITIAL_DELAY = 5000; // 5 seconds (reduced from 30 seconds)
  private MAX_CONCURRENT_BOTS = 1; // Only 1 bot at a time (was 5)
  private currentlyRunningBots = new Set<string>();

  constructor() {
    super();
    // We'll initialize botService later to avoid circular dependency
    this.botService = null;
    this.tradeManagementAI = new TradeManagementAI();
    this.positionManagementService = new PositionManagementService();
    this.performanceCalculationService = new PerformanceCalculationService();
    loggerService.info("[SCHEDULER] Scheduler service initialized");

    // Setup event listeners when the service is created
    this.setupListeners();
  }

  /**
   * Run diagnostic checks on the scheduler
   */
  public async runDiagnostics(): Promise<void> {
    try {
      console.log("==================================================");
      console.log("[SCHEDULER DIAGNOSTICS] 🔍 Starting bot scheduler diagnostics");
      console.log("==================================================");

      // 1. Check if scheduler is running
      console.log(`[SCHEDULER DIAGNOSTICS] Scheduler running status: ${this.isRunning ? "RUNNING ✅" : "STOPPED ❌"}`);

      // 2. Get active bots from database
      const activeBots = await prisma.bot.findMany({
        where: {
          isActive: true,
          isAiTradingActive: true,
        },
      });
      console.log(`[SCHEDULER DIAGNOSTICS] Active bots in database: ${activeBots.length}`);

      // 3. Check scheduled jobs
      console.log(`[SCHEDULER DIAGNOSTICS] Currently scheduled jobs: ${this.jobs.size}`);

      // 4. Compare database bots with scheduled jobs
      const scheduledBotIds = Array.from(this.jobs.keys());
      const databaseBotIds = activeBots.map((bot) => bot.id);

      console.log("[SCHEDULER DIAGNOSTICS] Checking for mismatches between database and scheduler:");

      // Bots in database but not scheduled
      const notScheduledBots = databaseBotIds.filter((id) => !scheduledBotIds.includes(id));
      if (notScheduledBots.length > 0) {
        console.log(`[SCHEDULER DIAGNOSTICS] ⚠️ Found ${notScheduledBots.length} active bots not scheduled:`);
        for (const botId of notScheduledBots) {
          const bot = activeBots.find((b) => b.id === botId);
          console.log(`[SCHEDULER DIAGNOSTICS]   - Bot ${botId} (${bot?.timeframe || "unknown timeframe"})`);
        }
      } else {
        console.log("[SCHEDULER DIAGNOSTICS] ✅ All active bots are properly scheduled");
      }

      // Bots scheduled but not in database
      const orphanedJobs = scheduledBotIds.filter((id) => !databaseBotIds.includes(id));
      if (orphanedJobs.length > 0) {
        console.log(`[SCHEDULER DIAGNOSTICS] ⚠️ Found ${orphanedJobs.length} scheduled jobs for bots not active in database:`);
        for (const botId of orphanedJobs) {
          const job = this.jobs.get(botId);
          console.log(`[SCHEDULER DIAGNOSTICS]   - Job for bot ${botId} (${job?.interval || "unknown interval"})`);
        }
      } else {
        console.log("[SCHEDULER DIAGNOSTICS] ✅ No orphaned scheduled jobs found");
      }

      // 5. Check for any invalid intervals
      let invalidIntervals = 0;
      for (const [botId, job] of this.jobs.entries()) {
        if (!this.intervalMap[job.interval]) {
          console.log(`[SCHEDULER DIAGNOSTICS] ⚠️ Bot ${botId} has invalid interval: ${job.interval}`);
          invalidIntervals++;
        }
      }

      if (invalidIntervals === 0) {
        console.log("[SCHEDULER DIAGNOSTICS] ✅ All jobs have valid intervals");
      }

      console.log("==================================================");
      console.log("[SCHEDULER DIAGNOSTICS] 📊 Diagnostics complete");
      console.log("==================================================");
    } catch (error) {
      console.error("[SCHEDULER DIAGNOSTICS] ❌ Error running diagnostics:", error);
    }
  }

  /**
   * Start the scheduler service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      loggerService.warn("[SCHEDULER] Scheduler is already running");
      return;
    }

    try {
      this.isRunning = true;
      loggerService.info("[SCHEDULER] Starting scheduler service");
      console.log("[SCHEDULER DEBUG] 🚀 Scheduler start() method called");

      // Emergency reset: Clear any stuck bot coordination states
      console.log("[SCHEDULER DEBUG] 🧹 Importing bot coordination service...");
      const { botCoordinationService } = require("./bot-coordination.service");
      console.log("[SCHEDULER DEBUG] ✅ Bot coordination service imported successfully");

      console.log("[SCHEDULER DEBUG] 🚨 Calling emergencyResetAllBots()...");
      botCoordinationService.emergencyResetAllBots();
      console.log("[SCHEDULER DEBUG] ✅ Emergency reset completed");

      // Initialize BotService
      console.log("[SCHEDULER DEBUG] 🤖 Initializing BotService...");
      if (!this.botService) {
        const { BotService } = require("./bot.service");
        this.botService = new BotService();
        console.log("[SCHEDULER DEBUG] ✅ BotService created successfully");
      } else {
        console.log("[SCHEDULER DEBUG] ✅ BotService already exists");
      }

      // Start position synchronization service
      console.log("[SCHEDULER DEBUG] 📊 Starting position sync service...");
      positionSyncService.start();
      console.log("[SCHEDULER DEBUG] ✅ Position sync service started");

      // Load and schedule all active bots
      console.log("[SCHEDULER DEBUG] 📋 Loading active bots...");
      await this.loadActiveBots();
      console.log("[SCHEDULER DEBUG] ✅ Active bots loaded and scheduled");

      // Emergency fix: Force restart any overdue bots after loading
      console.log("[SCHEDULER DEBUG] ⚡ Setting up emergency bot restart in 5 seconds...");
      setTimeout(() => {
        console.log("[SCHEDULER DEBUG] 🚨 Running emergency restart of overdue bots...");
        this.forceRestartOverdueBots();
        console.log("[SCHEDULER DEBUG] ✅ Emergency restart completed");
      }, 5000);

      // Start trade monitoring
      console.log("[SCHEDULER DEBUG] 📈 Starting trade monitoring...");
      this.startTradeMonitoring();
      console.log("[SCHEDULER DEBUG] ✅ Trade monitoring started");

      // Start status reporting
      console.log("[SCHEDULER DEBUG] 📊 Starting status reporting...");
      this.startStatusReporting();
      console.log("[SCHEDULER DEBUG] ✅ Status reporting started");

      // Start performance calculations
      console.log("[SCHEDULER DEBUG] 📈 Starting performance calculations...");
      this.startPerformanceCalculations();
      console.log("[SCHEDULER DEBUG] ✅ Performance calculations started");

      // Set up event listeners
      console.log("[SCHEDULER DEBUG] 🎧 Setting up event listeners...");
      this.setupListeners();
      console.log("[SCHEDULER DEBUG] ✅ Event listeners set up");

      loggerService.info("[SCHEDULER] Scheduler service started successfully");
      console.log("[SCHEDULER DEBUG] 🎉 Scheduler start() method completed successfully");
    } catch (error) {
      console.error("[SCHEDULER DEBUG] ❌ CRITICAL ERROR in start() method:", error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the scheduler service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      loggerService.warn("[SCHEDULER] Scheduler is not running");
      return;
    }

    try {
      this.isRunning = false;
      loggerService.info("[SCHEDULER] Stopping scheduler service");

      // Stop position synchronization service
      positionSyncService.stop();

      // Clear all scheduled jobs
      for (const [botId, timeoutId] of this.scheduledJobs) {
        clearTimeout(timeoutId);
        loggerService.info(`[SCHEDULER] Cleared job for bot ${botId}`);
      }
      this.scheduledJobs.clear();

      // Stop status reporting
      if (this.statusInterval) {
        clearInterval(this.statusInterval);
        this.statusInterval = null;
      }

      // Stop performance calculations
      this.stopPerformanceCalculations();

      loggerService.info("[SCHEDULER] ✅ Scheduler service stopped successfully");
      this.emit("stopped");
    } catch (error) {
      loggerService.error("[SCHEDULER] Error stopping scheduler service", error);
      throw error;
    }
  }

  /**
   * Start monitoring active trades for management
   */
  private startTradeMonitoring(): void {
    if (this.tradeMonitoringInterval) {
      clearInterval(this.tradeMonitoringInterval);
    }

    this.tradeMonitoringInterval = setInterval(async () => {
      try {
        await this.monitorActiveTrades();
      } catch (error) {
        console.error("[SCHEDULER] ❌ Error in trade monitoring:", error);
      }
    }, this.TRADE_MONITORING_INTERVAL);

    console.log(`[SCHEDULER] ✅ Trade monitoring started (checking every ${this.TRADE_MONITORING_INTERVAL / 1000} seconds)`);
  }

  /**
   * Stop trade monitoring
   */
  private stopTradeMonitoring(): void {
    if (this.tradeMonitoringInterval) {
      clearInterval(this.tradeMonitoringInterval);
      this.tradeMonitoringInterval = null;
      console.log("[SCHEDULER] Trade monitoring stopped");
    }
  }

  /**
   * Monitor all active trades and apply AI trade management
   */
  private async monitorActiveTrades(): Promise<void> {
    try {
      // Get all open trades
      const openTrades = await prisma.trade.findMany({
        where: {
          status: "OPEN",
        },
        include: {
          bot: {
            include: {
              strategy: true,
            },
          },
        },
      });

      if (openTrades.length === 0) {
        return; // No trades to monitor
      }

      console.log(`[SCHEDULER] 📊 Monitoring ${openTrades.length} active trades`);

      for (const trade of openTrades) {
        await this.manageTrade(trade);
      }
    } catch (error) {
      console.error("[SCHEDULER] ❌ Error monitoring active trades:", error);
    }
  }

  /**
   * Manage individual trade using AI trade management
   */
  private async manageTrade(trade: any): Promise<void> {
    try {
      // Analyze trade for management decisions
      const managementDecision = await this.tradeManagementAI.analyzeTradeManagement(
        trade.id,
        undefined, // No chart image for now - could be added later
        trade.bot?.strategy?.description || "Default strategy"
      );

      // Execute management decision based on AI analysis
      switch (managementDecision.action) {
        case "CLOSE":
          console.log(`[SCHEDULER] 🔴 AI recommends closing trade ${trade.id}: ${managementDecision.rationale}`);
          if (managementDecision.confidence > 70) {
            // Only close if high confidence
            await this.executeTradeClosure(trade, managementDecision.rationale);
          }
          break;

        case "MODIFY_SL":
          if (managementDecision.newStopLoss && managementDecision.confidence > 60) {
            console.log(`[SCHEDULER] 🛡️ AI recommends updating stop loss for trade ${trade.id} to ${managementDecision.newStopLoss}: ${managementDecision.rationale}`);
            await this.updateTradeStopLoss(trade.id, managementDecision.newStopLoss);
          }
          break;

        case "MODIFY_TP":
          if (managementDecision.newTakeProfit && managementDecision.confidence > 60) {
            console.log(`[SCHEDULER] 🎯 AI recommends updating take profit for trade ${trade.id} to ${managementDecision.newTakeProfit}: ${managementDecision.rationale}`);
            await this.updateTradeTakeProfit(trade.id, managementDecision.newTakeProfit);
          }
          break;

        case "PARTIAL_CLOSE":
          if (managementDecision.closePercentage && managementDecision.confidence > 65) {
            console.log(`[SCHEDULER] 📈 AI recommends partial close of ${managementDecision.closePercentage}% for trade ${trade.id}: ${managementDecision.rationale}`);
            await this.executePartialClose(trade, managementDecision.closePercentage);
          }
          break;

        case "HOLD":
          // No action needed, just log for very low confidence situations
          if (managementDecision.confidence < 30) {
            console.log(`[SCHEDULER] ⚠️ Low confidence AI analysis for trade ${trade.id}: ${managementDecision.rationale}`);
          }
          break;
      }

      // Implement trailing stops if enabled
      if (managementDecision.urgency === "HIGH" || this.shouldImplementTrailingStop(trade)) {
        await this.implementTrailingStop(trade);
      }
    } catch (error) {
      console.error(`[SCHEDULER] ❌ Error managing trade ${trade.id}:`, error);
    }
  }

  /**
   * Execute trade closure
   */
  private async executeTradeClosure(trade: any, reason: string): Promise<void> {
    try {
      // Lazy-load TradingService to avoid circular dependency
      if (!this.botService) {
        const { BotService } = require("./bot.service");
        this.botService = new BotService();
      }

      await this.botService.tradingService.closeTrade(trade.id, reason);
      console.log(`[SCHEDULER] ✅ Successfully closed trade ${trade.id}`);
    } catch (error) {
      console.error(`[SCHEDULER] ❌ Error closing trade ${trade.id}:`, error);
    }
  }

  /**
   * Update trade stop loss
   */
  private async updateTradeStopLoss(tradeId: string, newStopLoss: number): Promise<void> {
    try {
      if (!this.botService) {
        const { BotService } = require("./bot.service");
        this.botService = new BotService();
      }

      await this.botService.tradingService.updateTrade(tradeId, { stopLoss: newStopLoss });
      console.log(`[SCHEDULER] ✅ Updated stop loss for trade ${tradeId} to ${newStopLoss}`);
    } catch (error) {
      console.error(`[SCHEDULER] ❌ Error updating stop loss for trade ${tradeId}:`, error);
    }
  }

  /**
   * Update trade take profit
   */
  private async updateTradeTakeProfit(tradeId: string, newTakeProfit: number): Promise<void> {
    try {
      if (!this.botService) {
        const { BotService } = require("./bot.service");
        this.botService = new BotService();
      }

      await this.botService.tradingService.updateTrade(tradeId, { takeProfit: newTakeProfit });
      console.log(`[SCHEDULER] ✅ Updated take profit for trade ${tradeId} to ${newTakeProfit}`);
    } catch (error) {
      console.error(`[SCHEDULER] ❌ Error updating take profit for trade ${tradeId}:`, error);
    }
  }

  /**
   * Execute partial close of a trade
   */
  private async executePartialClose(trade: any, closePercentage: number): Promise<void> {
    try {
      // For now, we'll implement this as a simple position size reduction
      // In a full implementation, this would partially close the position
      const newQuantity = trade.quantity * (1 - closePercentage / 100);

      if (!this.botService) {
        const { BotService } = require("./bot.service");
        this.botService = new BotService();
      }

      await this.botService.tradingService.updateTrade(trade.id, { quantity: newQuantity });
      console.log(`[SCHEDULER] ✅ Partially closed ${closePercentage}% of trade ${trade.id}`);
    } catch (error) {
      console.error(`[SCHEDULER] ❌ Error partially closing trade ${trade.id}:`, error);
    }
  }

  /**
   * Check if trailing stop should be implemented
   */
  private shouldImplementTrailingStop(trade: any): boolean {
    // Implement trailing stop if trade is profitable by more than 1%
    if (!trade.currentPrice || !trade.entryPrice) return false;

    const priceDiff = trade.direction === "BUY" ? trade.currentPrice - trade.entryPrice : trade.entryPrice - trade.currentPrice;

    const profitPercent = (priceDiff / trade.entryPrice) * 100;
    return profitPercent > 1.0; // 1% profit threshold
  }

  /**
   * Implement trailing stop for a trade
   */
  private async implementTrailingStop(trade: any): Promise<void> {
    try {
      const trailingConfig = {
        enabled: true,
        trailDistance: trade.bot?.timeframe === "M1" ? 0.5 : trade.bot?.timeframe === "M5" ? 0.8 : trade.bot?.timeframe === "M15" ? 1.2 : 2.0, // ATR-based distances
        minProfit: 1.0, // 1% minimum profit
        stepSize: 0.2,
      };

      const result = await this.tradeManagementAI.implementTrailingStop(trade.id, trailingConfig);

      if (result.updated) {
        console.log(`[SCHEDULER] 📈 Trailing stop updated for trade ${trade.id}: ${result.rationale}`);
      }
    } catch (error) {
      console.error(`[SCHEDULER] ❌ Error implementing trailing stop for trade ${trade.id}:`, error);
    }
  }

  /**
   * Add a bot to the scheduler
   */
  addBot(botId: string, interval: string, staggerOffset: number = 0): void {
    // Check if bot is already scheduled
    if (this.jobs.has(botId)) {
      const existingJob = this.jobs.get(botId);
      // If interval changed, update it and reschedule
      if (existingJob && existingJob.interval !== interval) {
        console.log(`[SCHEDULER] 🔄 Bot ${botId} interval changed from ${existingJob.interval} to ${interval}, rescheduling`);
        this.removeBot(botId); // Remove existing schedule
        // Then continue to add with new interval
      } else {
        console.log(`[SCHEDULER] ℹ️ Bot ${botId} already scheduled with interval ${interval}`);
        return; // Already scheduled with same interval, no changes needed
      }
    }

    // Map timeframe format (M1, H1) to our interval map
    const intervalMs = this.intervalMap[interval];
    if (!intervalMs) {
      console.error(`[SCHEDULER] ⚠️ Invalid interval: ${interval}, defaulting to H1`);
      // Default to hourly if invalid timeframe

      // Create a new job with default interval
      const job: ScheduledJob = {
        botId,
        interval: "H1",
        lastRun: null, // Initialize as null to indicate it hasn't run yet
      };
      this.jobs.set(botId, job);

      // Schedule with conservative delay to prevent immediate burst
      const conservativeDelay = Math.max(60000, staggerOffset); // At least 1 minute delay
      console.log(`[SCHEDULER] Scheduling first run for bot ${botId} with default interval H1 (conservative delay: ${conservativeDelay / 1000}s)`);
      this.scheduleNextRun(botId, conservativeDelay);
      return;
    }

    // Create a new job
    const job: ScheduledJob = {
      botId,
      interval,
      lastRun: null, // Initialize as null to indicate it hasn't run yet
    };
    this.jobs.set(botId, job);

    // Apply conservative delay to prevent rate limiting
    const conservativeDelay = Math.max(60000, staggerOffset); // At least 1 minute delay for all bots
    console.log(
      `[SCHEDULER] 🗓️ Bot ${botId} added to scheduler with interval ${interval} (${Math.round(intervalMs / 1000)} seconds, conservative delay: ${conservativeDelay / 1000}s)`
    );
    this.scheduleNextRun(botId, conservativeDelay);
  }

  /**
   * Remove a bot from the scheduler
   */
  removeBot(botId: string): void {
    const job = this.jobs.get(botId);
    if (!job) {
      console.log(`[SCHEDULER] Bot ${botId} not scheduled, nothing to remove`);
      return;
    }

    if (job.timeoutId) {
      clearTimeout(job.timeoutId);
    }

    this.jobs.delete(botId);
    console.log(`[SCHEDULER] 🗑️ Removed bot ${botId} from scheduler`);
  }

  /**
   * Update a bot's schedule
   */
  updateBot(botId: string, interval: string): void {
    console.log(`[SCHEDULER] 🔄 Updating schedule for bot ${botId} to interval ${interval}`);
    this.removeBot(botId);
    this.addBot(botId, interval);
  }

  /**
   * Run a specific job
   */
  async runJob(botId: string): Promise<void> {
    console.log(`[SCHEDULER DEBUG] 🚀 runJob() called for bot ${botId}`);

    // Check if bot is already running
    if (this.currentlyRunningBots.has(botId)) {
      console.log(`[SCHEDULER] ⏭️ Bot ${botId} is already running, skipping this execution`);
      return;
    }

    console.log(`[SCHEDULER DEBUG] ✅ Bot ${botId} not already running, proceeding with execution`);

    // Add bot to currently running set
    this.currentlyRunningBots.add(botId);
    console.log(`[SCHEDULER DEBUG] 📝 Added bot ${botId} to currentlyRunningBots set (size: ${this.currentlyRunningBots.size})`);

    try {
      // Get the job from the map
      const job = this.jobs.get(botId);
      if (!job) {
        console.error(`[SCHEDULER] ❌ No job found for bot ${botId}`);
        return;
      }

      console.log(`[SCHEDULER DEBUG] 📋 Job found for bot ${botId}: interval=${job.interval}, lastRun=${job.lastRun?.toISOString() || "Never"}`);

      // Update last run time immediately
      job.lastRun = new Date();
      this.jobs.set(botId, job);
      console.log(`[SCHEDULER DEBUG] 🕐 Updated lastRun time for bot ${botId} to ${job.lastRun.toISOString()}`);

      console.log(`[SCHEDULER] 🏃 Running job for bot ${botId} with interval ${job.interval}`);
      console.log(`[SCHEDULER DEBUG] 🔧 About to call this.botService.evaluateBot(${botId})`);

      // Check if botService exists
      if (!this.botService) {
        console.error(`[SCHEDULER DEBUG] ❌ CRITICAL: botService is null/undefined!`);
        throw new Error("BotService is not initialized");
      }

      console.log(`[SCHEDULER DEBUG] ✅ botService exists, calling evaluateBot method`);

      // Call the bot service to evaluate the bot
      await this.botService.evaluateBot(botId);

      console.log(`[SCHEDULER] ✅ Job completed successfully for bot ${botId}`);
      console.log(`[SCHEDULER DEBUG] 🎉 Bot ${botId} evaluation completed without errors`);
    } catch (error: any) {
      console.error(`[SCHEDULER] ❌ Error running job for bot ${botId}:`, error);
      console.error(`[SCHEDULER DEBUG] 💥 Error details:`, {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      // Log the specific error type for debugging
      if (error.name === "TimeoutError") {
        console.error(`[SCHEDULER DEBUG] ⏰ Bot ${botId} timed out during execution`);
      } else if (error.message?.includes("rate limit")) {
        console.error(`[SCHEDULER DEBUG] 🚫 Bot ${botId} hit rate limit during execution`);
      } else if (error.message?.includes("session")) {
        console.error(`[SCHEDULER DEBUG] 🔐 Bot ${botId} had session/authentication issues`);
      } else {
        console.error(`[SCHEDULER DEBUG] 🔥 Bot ${botId} had unexpected error: ${error.message}`);
      }
    } finally {
      // Always remove bot from currently running set
      this.currentlyRunningBots.delete(botId);
      console.log(`[SCHEDULER DEBUG] 🧹 Removed bot ${botId} from currentlyRunningBots set (size: ${this.currentlyRunningBots.size})`);
      console.log(`[SCHEDULER DEBUG] 🔚 runJob() completed for bot ${botId}`);
    }
  }

  /**
   * Schedule the next run for a bot
   */
  private scheduleNextRun(botId: string, staggerOffset: number = 0): void {
    console.log(`[SCHEDULER DEBUG] 🔧 scheduleNextRun called for bot ${botId} with staggerOffset ${staggerOffset}ms`);

    // Get the job from the map
    const job = this.jobs.get(botId);
    if (!job) {
      console.error(`[SCHEDULER] ⚠️ No job found for bot ${botId}, cannot schedule next run`);
      return;
    }

    console.log(`[SCHEDULER DEBUG] 📋 Job found for bot ${botId}: interval=${job.interval}, lastRun=${job.lastRun?.toISOString() || "Never"}`);

    const intervalMs = this.intervalMap[job.interval] || this.intervalMap.H1;
    console.log(`[SCHEDULER DEBUG] ⏱️ Interval for ${job.interval}: ${intervalMs}ms`);

    // Calculate next run time
    let nextRunMs = intervalMs;

    // If the job has run before, calculate the delay based on the last run time
    if (job.lastRun) {
      const now = Date.now();
      const nextRunTime = job.lastRun.getTime() + intervalMs;
      const timeDiff = nextRunTime - now;

      console.log(`[SCHEDULER DEBUG] 🕐 Time calculation for bot ${botId}:`);
      console.log(`[SCHEDULER DEBUG]   - Now: ${new Date(now).toISOString()}`);
      console.log(`[SCHEDULER DEBUG]   - Last run: ${job.lastRun.toISOString()}`);
      console.log(`[SCHEDULER DEBUG]   - Next run time: ${new Date(nextRunTime).toISOString()}`);
      console.log(`[SCHEDULER DEBUG]   - Time diff: ${timeDiff}ms`);

      // If the bot is overdue (negative time), run immediately
      if (timeDiff <= 0) {
        console.log(`[SCHEDULER] ⚡ Bot ${botId} is overdue by ${Math.abs(timeDiff)}ms, running immediately`);
        nextRunMs = 100; // Run almost immediately
      } else {
        nextRunMs = Math.max(100, timeDiff); // Min delay of 100ms to avoid immediate runs
      }
    } else {
      // For first run, apply stagger offset
      nextRunMs = Math.max(100, staggerOffset);
      console.log(`[SCHEDULER DEBUG] 🆕 First run for bot ${botId}, using stagger offset: ${nextRunMs}ms`);
    }

    console.log(`[SCHEDULER] 🕒 Scheduling next run for bot ${botId} with interval ${job.interval} in ${Math.round(nextRunMs / 1000)}s`);

    // Clear any existing timeout first
    if (job.timeoutId) {
      console.log(`[SCHEDULER DEBUG] 🧹 Clearing existing timeout ${job.timeoutId} for bot ${botId}`);
      clearTimeout(job.timeoutId);
    }

    // Schedule the job with better error handling
    console.log(`[SCHEDULER DEBUG] 🎯 Creating new timeout for bot ${botId} with delay ${nextRunMs}ms`);
    const timeoutId = setTimeout(async () => {
      try {
        console.log(`[SCHEDULER] 🎯 Timeout fired for bot ${botId}, starting execution...`);
        console.log(`[SCHEDULER DEBUG] 🏃 About to call runJob for bot ${botId}`);

        // Run the job
        await this.runJob(botId);

        console.log(`[SCHEDULER] ✅ Bot ${botId} execution completed, scheduling next run...`);

        // Re-schedule the job after it runs (if it still exists)
        // Note: Don't apply stagger offset to subsequent runs, only the first one
        if (this.jobs.has(botId) && this.isRunning) {
          console.log(`[SCHEDULER DEBUG] 🔄 Re-scheduling bot ${botId} after completion`);
          this.scheduleNextRun(botId, 0);
        } else {
          console.log(`[SCHEDULER DEBUG] ❌ Not re-scheduling bot ${botId}: jobExists=${this.jobs.has(botId)}, schedulerRunning=${this.isRunning}`);
        }
      } catch (timeoutError: any) {
        console.error(`[SCHEDULER] ❌ Critical error in timeout callback for bot ${botId}:`, timeoutError);
        console.error(`[SCHEDULER DEBUG] 💥 Error stack:`, timeoutError.stack);

        // Try to reschedule even if there was an error
        if (this.jobs.has(botId) && this.isRunning) {
          console.log(`[SCHEDULER] 🔄 Attempting to reschedule bot ${botId} after error...`);
          setTimeout(() => {
            this.scheduleNextRun(botId, 0);
          }, 5000); // Wait 5 seconds before rescheduling
        }
      }
    }, nextRunMs);

    console.log(`[SCHEDULER DEBUG] ✅ Timeout created with ID: ${timeoutId} for bot ${botId}`);

    // Store the timeout ID
    job.timeoutId = timeoutId;
    this.jobs.set(botId, job);

    console.log(`[SCHEDULER] 📋 Timeout ${timeoutId} set for bot ${botId} (${nextRunMs}ms)`);
    console.log(`[SCHEDULER DEBUG] 🔚 scheduleNextRun completed for bot ${botId}`);
  }

  /**
   * Get diagnostics information about the scheduler
   */
  getDiagnostics(): { isRunning: boolean; jobs: { [key: string]: any }[] } {
    // Create a safe jobs array for diagnostics
    const jobs = [];
    for (const [botId, job] of this.jobs.entries()) {
      jobs.push({
        botId: job.botId,
        interval: job.interval,
        lastRun: job.lastRun,
        nextRunEstimate: job.lastRun ? new Date(job.lastRun.getTime() + this.intervalMap[job.interval]).toISOString() : "unknown",
      });
    }

    return {
      isRunning: this.isRunning,
      jobs,
    };
  }

  /**
   * Get a list of active jobs
   */
  getActiveJobs(): string[] {
    return Array.from(this.jobs.keys());
  }

  /**
   * Check if a bot is scheduled
   */
  isBotScheduled(botId: string): boolean {
    return this.jobs.has(botId);
  }

  /**
   * Return a list of all jobs
   */
  getJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Load active bots from the database with emergency throttling for high bot counts
   */
  private async loadActiveBots(): Promise<void> {
    try {
      console.log("[SCHEDULER] 🔍 Searching for active bots in database...");

      // Get all active bots with AI trading enabled
      const activeBots = await prisma.bot.findMany({
        where: {
          isActive: true,
          isAiTradingActive: true,
        },
        include: {
          brokerCredential: true,
        },
      });

      console.log(`[SCHEDULER] Found ${activeBots.length} active bot(s) with AI trading enabled`);

      if (activeBots.length === 0) {
        console.log("[SCHEDULER] ⚠️ No active bots found to schedule. Please ensure at least one bot has both isActive and isAiTradingActive set to true.");
        return;
      }

      // Analyze bot distribution by credentials
      const credentialGroups = new Map<string, any[]>();
      activeBots.forEach((bot) => {
        if (bot.brokerCredential && bot.brokerCredential.credentials) {
          // Extract credentials from JSON field
          const creds = bot.brokerCredential.credentials as any;
          const credKey = `${creds.identifier || creds.username || bot.brokerCredential.id}_${creds.apiKey || "unknown"}`;
          if (!credentialGroups.has(credKey)) {
            credentialGroups.set(credKey, []);
          }
          credentialGroups.get(credKey)!.push(bot);
        }
      });

      // Check for overloaded credentials and enable emergency mode
      let emergencyMode = false;
      let maxBotsPerCredential = 0;

      credentialGroups.forEach((bots, credentialKey) => {
        const botCount = bots.length;
        maxBotsPerCredential = Math.max(maxBotsPerCredential, botCount);

        console.log(`[SCHEDULER] 📊 Credential ${credentialKey.substring(0, 8)}... has ${botCount} bots`);

        if (botCount >= 15) {
          console.log(`[SCHEDULER] 🚨 EMERGENCY MODE: Credential ${credentialKey.substring(0, 8)}... has ${botCount} bots (15+ triggers emergency mode)`);
          emergencyMode = true;
        } else if (botCount >= 10) {
          console.log(`[SCHEDULER] ⚠️ WARNING: Credential ${credentialKey.substring(0, 8)}... has ${botCount} bots (approaching limits)`);
        }
      });

      // Set emergency mode parameters
      if (emergencyMode) {
        console.log(`[SCHEDULER] 🚨 EMERGENCY THROTTLING ENABLED: ${maxBotsPerCredential} max bots per credential detected`);
        this.EMERGENCY_MODE = true;
        this.EMERGENCY_STAGGER_OFFSET = 120000; // 2 minutes between bots
        this.EMERGENCY_INITIAL_DELAY = 300000; // 5 minutes initial delay
        this.MAX_CONCURRENT_BOTS = 2; // Only 2 bots can evaluate simultaneously
      } else if (maxBotsPerCredential >= 8) {
        console.log(`[SCHEDULER] ⚠️ CONSERVATIVE MODE: ${maxBotsPerCredential} max bots per credential detected`);
        this.CONSERVATIVE_MODE = true;
        this.CONSERVATIVE_STAGGER_OFFSET = 90000; // 1.5 minutes between bots
        this.CONSERVATIVE_INITIAL_DELAY = 180000; // 3 minutes initial delay
        this.MAX_CONCURRENT_BOTS = 3; // Only 3 bots can evaluate simultaneously
      }

      // Schedule bots with appropriate throttling
      let staggerOffset = this.EMERGENCY_MODE ? this.EMERGENCY_INITIAL_DELAY : this.CONSERVATIVE_MODE ? this.CONSERVATIVE_INITIAL_DELAY : 5000; // Default 5 seconds instead of 2 minutes

      for (const bot of activeBots) {
        const interval = bot.timeframe || "M5"; // Use timeframe from bot model
        console.log(`[SCHEDULER] ⏰ Scheduling bot ${bot.id} with ${interval} interval, stagger offset: ${staggerOffset}ms`);

        this.addBot(bot.id, interval, staggerOffset);

        // Increase stagger offset for next bot
        const staggerIncrement = this.EMERGENCY_MODE ? this.EMERGENCY_STAGGER_OFFSET : this.CONSERVATIVE_MODE ? this.CONSERVATIVE_STAGGER_OFFSET : 30000; // 30 seconds between bots
        staggerOffset += staggerIncrement;
      }

      console.log(`[SCHEDULER] ✅ Successfully scheduled ${activeBots.length} bots`);

      // Log emergency mode status
      if (this.EMERGENCY_MODE) {
        console.log(`[SCHEDULER] 🚨 EMERGENCY MODE ACTIVE:`);
        console.log(`  - Stagger offset: ${this.EMERGENCY_STAGGER_OFFSET}ms between bots`);
        console.log(`  - Initial delay: ${this.EMERGENCY_INITIAL_DELAY}ms`);
        console.log(`  - Max concurrent: ${this.MAX_CONCURRENT_BOTS} bots`);
        console.log(`  - Recommendation: Use multiple Capital.com credentials to distribute load`);
      } else if (this.CONSERVATIVE_MODE) {
        console.log(`[SCHEDULER] ⚠️ CONSERVATIVE MODE ACTIVE:`);
        console.log(`  - Stagger offset: ${this.CONSERVATIVE_STAGGER_OFFSET}ms between bots`);
        console.log(`  - Initial delay: ${this.CONSERVATIVE_INITIAL_DELAY}ms`);
        console.log(`  - Max concurrent: ${this.MAX_CONCURRENT_BOTS} bots`);
      }
    } catch (error) {
      console.error("[SCHEDULER] ❌ Error loading active bots:", error);
    }
  }

  /**
   * Log active jobs - provides a snapshot of currently scheduled bots
   */
  private logActiveJobs(): void {
    const activeJobCount = this.jobs.size;

    if (activeJobCount === 0) {
      console.log("[SCHEDULER]  No active jobs");
      return;
    }

    console.log(`[SCHEDULER] Active jobs: ${activeJobCount}`);

    for (const [botId, job] of this.jobs.entries()) {
      const nextRunTime = job.lastRun ? new Date(job.lastRun.getTime() + this.intervalMap[job.interval]) : new Date(Date.now() + 10000);
      const timeUntilNextRun = Math.max(0, nextRunTime.getTime() - Date.now());
      const minutesUntilNextRun = Math.round(timeUntilNextRun / 1000 / 60);

      console.log(
        `[SCHEDULER]   - Bot ${botId} (${job.interval}): ` + `Last run: ${job.lastRun ? job.lastRun.toISOString() : "Never"}, ` + `Next run in: ~${minutesUntilNextRun} minute(s)`
      );
    }
  }

  /**
   * Set up event listeners for bot-related events
   */
  private setupListeners(): void {
    // Listen for bot creation events
    this.on("botCreated", (botId: string, interval: string, isActive: boolean, isAiTradingActive: boolean) => {
      console.log(`[SCHEDULER] Bot created: ${botId} with interval ${interval}`);

      // Only add to scheduler if the bot is active and AI trading is enabled
      if (isActive && isAiTradingActive) {
        this.addBot(botId, interval);
      }
    });

    // Listen for bot deletion events
    this.on("botDeleted", (botId: string) => {
      console.log(`[SCHEDULER] Bot deleted: ${botId}`);
      this.removeBot(botId);
    });

    // Listen for bot update events
    this.on("botUpdated", (botId: string, interval: string, isActive: boolean, isAiTradingActive: boolean) => {
      console.log(`[SCHEDULER] Bot updated: ${botId} with new interval ${interval}`);

      if (!isActive || !isAiTradingActive) {
        // If bot is no longer active or AI trading disabled, remove from scheduler
        console.log(`[SCHEDULER] Bot ${botId} is no longer active or AI trading disabled, removing from scheduler`);
        this.removeBot(botId);
      } else {
        // Update the bot's schedule
        this.updateBot(botId, interval);
      }
    });

    // Listen for bot toggle active events
    this.on("botToggleActive", (botId: string, isActive: boolean, isAiTradingActive: boolean, timeframe: string) => {
      console.log(`[SCHEDULER] Bot toggle active: ${botId}, active: ${isActive}`);

      if (!isActive || !isAiTradingActive) {
        // If bot is no longer active or AI trading disabled, remove from scheduler
        console.log(`[SCHEDULER] Bot ${botId} was deactivated, removing from scheduler`);
        this.removeBot(botId);
      } else {
        // Add to scheduler
        console.log(`[SCHEDULER] Bot ${botId} was activated, adding to scheduler`);
        this.addBot(botId, timeframe);
      }
    });

    // Listen for bot toggle AI trading events
    this.on("botToggleAiTrading", (botId: string, isActive: boolean, isAiTradingActive: boolean, timeframe: string) => {
      console.log(`[SCHEDULER DEBUG] ===== BOT TOGGLE AI TRADING EVENT =====`);
      console.log(`[SCHEDULER DEBUG] Bot ID: ${botId}`);
      console.log(`[SCHEDULER DEBUG] Bot Active: ${isActive}`);
      console.log(`[SCHEDULER DEBUG] AI Trading Active: ${isAiTradingActive}`);
      console.log(`[SCHEDULER DEBUG] Timeframe: ${timeframe}`);

      if (!isActive || !isAiTradingActive) {
        // If bot is no longer active or AI trading disabled, remove from scheduler
        console.log(`[SCHEDULER DEBUG] ❌ Bot ${botId} AI trading was disabled, removing from scheduler`);
        this.removeBot(botId);
      } else {
        // Add to scheduler
        console.log(`[SCHEDULER DEBUG] ✅ Bot ${botId} AI trading was enabled, adding to scheduler`);
        this.addBot(botId, timeframe);
      }

      // Log current scheduler state
      console.log(`[SCHEDULER DEBUG] Current scheduled jobs: ${this.jobs.size}`);
      console.log(`[SCHEDULER DEBUG] Scheduled bot IDs: [${Array.from(this.jobs.keys()).join(", ")}]`);
    });
  }

  /**
   * Start status reporting
   */
  private startStatusReporting(): void {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }

    this.statusInterval = setInterval(() => {
      this.logActiveJobs();
    }, 60000); // Every minute

    console.log(`[SCHEDULER] ✅ Status reporting started (logging every ${60000 / 1000} seconds)`);
  }

  /**
   * Start performance calculation scheduling
   */
  private startPerformanceCalculations(): void {
    loggerService.info("[SCHEDULER] Starting performance calculation scheduling");

    // Calculate performance metrics every hour
    this.performanceInterval = setInterval(async () => {
      try {
        loggerService.info("[SCHEDULER] Running scheduled performance calculation...");
        await this.performanceCalculationService.calculateAllBotsPerformance();
        await this.performanceCalculationService.updateMissingTradeAnalytics();
      } catch (error) {
        loggerService.error("[SCHEDULER] Error in scheduled performance calculation", error);
      }
    }, 60 * 60 * 1000); // 1 hour

    // Run initial calculations
    setTimeout(async () => {
      try {
        loggerService.info("[SCHEDULER] Running initial performance calculations...");
        await this.performanceCalculationService.calculateAllBotsPerformance();
        await this.performanceCalculationService.updateMissingTradeAnalytics();
        loggerService.info("[SCHEDULER] Initial performance calculations completed");
      } catch (error) {
        loggerService.error("[SCHEDULER] Error in initial performance calculations", error);
      }
    }, 5000); // Run after 5 seconds to allow system to fully start
  }

  /**
   * Stop performance calculation scheduling
   */
  private stopPerformanceCalculations(): void {
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
      this.performanceInterval = null;
      loggerService.info("[SCHEDULER] Performance calculation scheduling stopped");
    }
  }

  /**
   * Force restart all overdue bots - emergency fix for stuck scheduler
   */
  public forceRestartOverdueBots(): void {
    console.log("[SCHEDULER] 🚨 Force restarting all overdue bots...");

    const now = Date.now();
    let restartedCount = 0;

    for (const [botId, job] of this.jobs.entries()) {
      if (job.lastRun) {
        const intervalMs = this.intervalMap[job.interval] || this.intervalMap.H1;
        const nextRunTime = job.lastRun.getTime() + intervalMs;
        const timeDiff = nextRunTime - now;

        // If bot is overdue by more than 1 minute
        if (timeDiff < -60000) {
          console.log(`[SCHEDULER] 🔄 Restarting overdue bot ${botId} (overdue by ${Math.abs(timeDiff)}ms)`);

          // Clear existing timeout
          if (job.timeoutId) {
            clearTimeout(job.timeoutId);
          }

          // Reset last run time to force immediate execution
          job.lastRun = new Date(now - intervalMs - 1000); // Make it overdue by 1 second
          this.jobs.set(botId, job);

          // Reschedule immediately
          this.scheduleNextRun(botId, 0);
          restartedCount++;
        }
      }
    }

    console.log(`[SCHEDULER] ✅ Force restarted ${restartedCount} overdue bots`);
  }
}

// Create singleton instance without passing BotService
export const schedulerService = new SchedulerService();
