import { loggerService } from "./logger.service";

interface BotExecution {
  botId: string;
  credentialId: string;
  startTime: number;
  status: "running" | "completed" | "failed";
  priority: number;
}

/**
 * Bot Coordination Service
 * Manages bot execution to prevent API overload and coordinate resource usage
 */
export class BotCoordinationService {
  private static instance: BotCoordinationService;
  private runningBots = new Map<string, BotExecution>();
  private botQueue: BotExecution[] = [];
  private credentialUsage = new Map<string, Set<string>>(); // credentialId -> Set of botIds

  // Configuration - ULTRA-CONSERVATIVE for Capital.com API limits
  private readonly MAX_CONCURRENT_BOTS = 1; // Only 1 bot per credential (was 3)
  private readonly MAX_GLOBAL_CONCURRENT_BOTS = 1; // Maximum 1 bot globally (was 5)
  private readonly BOT_EXECUTION_TIMEOUT = 900000; // 15 minutes max execution time
  private readonly MIN_INTERVAL_BETWEEN_BOTS = 60000; // 1 minute between bot executions (reduced from 2 minutes)

  private lastBotEndTime = 0;

  // DISABLE bypass mode - enforce strict coordination to prevent API overload
  private readonly BYPASS_COORDINATION = false; // DISABLED to prevent API overload

  static getInstance(): BotCoordinationService {
    if (!BotCoordinationService.instance) {
      BotCoordinationService.instance = new BotCoordinationService();
    }
    return BotCoordinationService.instance;
  }

  /**
   * Emergency reset and clear all stuck bots - more aggressive than forceClearAll
   */
  emergencyResetAllBots(): void {
    loggerService.warn("🚨 EMERGENCY: Clearing ALL bot coordination states and allowing immediate execution");

    // Log current state before clearing
    console.log(`[BOT-COORDINATION] Before reset: ${this.runningBots.size} running bots, ${this.botQueue.length} queued bots`);
    for (const [botId, execution] of this.runningBots.entries()) {
      const duration = Date.now() - execution.startTime;
      console.log(`[BOT-COORDINATION] - Running bot ${botId}: ${duration}ms duration`);
    }

    // Clear everything
    this.runningBots.clear();
    this.botQueue = [];
    this.credentialUsage.clear();
    this.lastBotEndTime = Date.now() - this.MIN_INTERVAL_BETWEEN_BOTS - 10000; // Allow immediate execution

    console.log("[BOT-COORDINATION] ✅ Emergency reset complete - all bots can now execute immediately");
  }

  /**
   * Force allow immediate execution for startup
   */
  forceAllowImmediateExecution(): void {
    this.lastBotEndTime = Date.now() - this.MIN_INTERVAL_BETWEEN_BOTS - 60000; // Allow execution 1 minute ago
    loggerService.info("🚀 Forced immediate execution allowance for bot startup");
  }

  /**
   * Check if a bot is actually running or just stuck in the coordination system
   */
  private isBotActuallyRunning(botId: string): boolean {
    const execution = this.runningBots.get(botId);
    if (!execution) return false;

    // If bot has been "running" for more than 5 minutes, consider it stuck
    const duration = Date.now() - execution.startTime;
    const maxRunTime = 5 * 60 * 1000; // 5 minutes

    if (duration > maxRunTime) {
      loggerService.warn(`Bot ${botId} has been running for ${duration}ms (>${maxRunTime}ms), considering it stuck`);
      this.forceStopBot(botId);
      return false;
    }

    return true;
  }

  /**
   * Force clear all bot states - more aggressive reset
   */
  forceClearAll(): void {
    loggerService.warn("🚨 Force clearing ALL bot coordination states");
    this.runningBots.clear();
    this.botQueue = [];
    this.credentialUsage.clear();
    this.lastBotEndTime = Date.now() - this.MIN_INTERVAL_BETWEEN_BOTS - 1000; // Allow immediate execution
    loggerService.info("✅ All bot states force cleared - immediate execution allowed");
  }

  /**
   * Request permission to run a bot
   */
  async requestBotExecution(botId: string, credentialId: string, priority: number = 50): Promise<boolean> {
    const now = Date.now();

    // BYPASS MODE: Allow immediate execution for testing
    if (this.BYPASS_COORDINATION) {
      loggerService.info(`🚀 BYPASS MODE: Allowing immediate execution of bot ${botId}`);
      this.startBotExecution(botId, credentialId, priority);
      return true;
    }

    // Check if bot is already running (with stuck bot detection)
    if (this.runningBots.has(botId)) {
      if (this.isBotActuallyRunning(botId)) {
        loggerService.warn(`Bot ${botId} is already running, skipping execution`);
        return false;
      }
      // If bot was stuck, it's been cleared by isBotActuallyRunning, so continue
    }

    // Check global concurrent limit
    if (this.runningBots.size >= this.MAX_GLOBAL_CONCURRENT_BOTS) {
      loggerService.info(`Global concurrent bot limit reached (${this.runningBots.size}/${this.MAX_GLOBAL_CONCURRENT_BOTS}), queuing bot ${botId}`);
      this.queueBot(botId, credentialId, priority);
      return false;
    }

    // Check credential-specific concurrent limit
    const botsUsingCredential = this.credentialUsage.get(credentialId) || new Set();
    if (botsUsingCredential.size >= this.MAX_CONCURRENT_BOTS) {
      loggerService.info(`Credential ${credentialId.slice(0, 8)}.. concurrent limit reached, queuing bot ${botId}`);
      this.queueBot(botId, credentialId, priority);
      return false;
    }

    // Check minimum interval between bot executions
    const timeSinceLastBot = now - this.lastBotEndTime;
    if (timeSinceLastBot < this.MIN_INTERVAL_BETWEEN_BOTS) {
      const waitTime = this.MIN_INTERVAL_BETWEEN_BOTS - timeSinceLastBot;
      loggerService.info(`Minimum interval not met, waiting ${waitTime}ms before starting bot ${botId}`);

      // Wait and then try again
      setTimeout(() => {
        this.requestBotExecution(botId, credentialId, priority);
      }, waitTime);
      return false;
    }

    // Start bot execution
    this.startBotExecution(botId, credentialId, priority);
    return true;
  }

  /**
   * Mark bot execution as completed
   */
  completeBotExecution(botId: string, success: boolean = true): void {
    const execution = this.runningBots.get(botId);
    if (!execution) {
      loggerService.warn(`Attempted to complete non-running bot ${botId}`);
      return;
    }

    // Update status
    execution.status = success ? "completed" : "failed";

    // Remove from running bots
    this.runningBots.delete(botId);

    // Remove from credential usage
    const botsUsingCredential = this.credentialUsage.get(execution.credentialId);
    if (botsUsingCredential) {
      botsUsingCredential.delete(botId);
      if (botsUsingCredential.size === 0) {
        this.credentialUsage.delete(execution.credentialId);
      }
    }

    this.lastBotEndTime = Date.now();

    const duration = this.lastBotEndTime - execution.startTime;
    loggerService.info(`Bot ${botId} ${success ? "completed" : "failed"} after ${duration}ms`);

    // Process queue
    this.processQueue();
  }

  /**
   * Get current system status
   */
  getStatus(): {
    runningBots: number;
    queuedBots: number;
    credentialUsage: Record<string, number>;
    canAcceptNewBot: boolean;
  } {
    const credentialUsageRecord: Record<string, number> = {};
    for (const [credentialId, bots] of this.credentialUsage.entries()) {
      credentialUsageRecord[credentialId.slice(0, 8) + ".."] = bots.size;
    }

    return {
      runningBots: this.runningBots.size,
      queuedBots: this.botQueue.length,
      credentialUsage: credentialUsageRecord,
      canAcceptNewBot: this.runningBots.size < this.MAX_GLOBAL_CONCURRENT_BOTS,
    };
  }

  /**
   * Force stop a bot (emergency)
   */
  forceStopBot(botId: string): void {
    loggerService.warn(`Force stopping bot ${botId}`);
    this.completeBotExecution(botId, false);
  }

  /**
   * Clear all running bots (emergency reset)
   */
  emergencyReset(): void {
    loggerService.warn("Emergency reset: clearing all running bots");
    this.runningBots.clear();
    this.credentialUsage.clear();
    this.botQueue = [];
    this.lastBotEndTime = Date.now();
  }

  private queueBot(botId: string, credentialId: string, priority: number): void {
    // Check if already queued
    if (this.botQueue.some((bot) => bot.botId === botId)) {
      return;
    }

    this.botQueue.push({
      botId,
      credentialId,
      startTime: 0,
      status: "running",
      priority,
    });

    // Sort queue by priority (lower number = higher priority)
    this.botQueue.sort((a, b) => a.priority - b.priority);
  }

  private startBotExecution(botId: string, credentialId: string, priority: number): void {
    const execution: BotExecution = {
      botId,
      credentialId,
      startTime: Date.now(),
      status: "running",
      priority,
    };

    this.runningBots.set(botId, execution);

    // Track credential usage
    if (!this.credentialUsage.has(credentialId)) {
      this.credentialUsage.set(credentialId, new Set());
    }
    this.credentialUsage.get(credentialId)!.add(botId);

    loggerService.info(`Started bot execution: ${botId} using credential ${credentialId.slice(0, 8)}..`);

    // Set timeout for bot execution with better logging
    setTimeout(() => {
      if (this.runningBots.has(botId)) {
        const execution = this.runningBots.get(botId);
        const duration = Date.now() - (execution?.startTime || Date.now());
        loggerService.error(`⏰ Bot ${botId} timed out after ${duration}ms (limit: ${this.BOT_EXECUTION_TIMEOUT}ms), force stopping`);
        console.log(`[01:${new Date().toISOString().slice(14, 19)}] Bot ${botId} timed out after ${this.BOT_EXECUTION_TIMEOUT}ms, force stopping`);
        console.log(`[01:${new Date().toISOString().slice(14, 19)}] Force stopping bot ${botId}`);
        console.log(`[01:${new Date().toISOString().slice(14, 19)}] Bot ${botId} failed after ${duration}ms`);
        this.forceStopBot(botId);
      }
    }, this.BOT_EXECUTION_TIMEOUT);
  }

  private processQueue(): void {
    if (this.botQueue.length === 0) {
      return;
    }

    // Try to start queued bots
    for (let i = this.botQueue.length - 1; i >= 0; i--) {
      const queuedBot = this.botQueue[i];

      // Check if we can start this bot now
      if (this.canStartBot(queuedBot.credentialId)) {
        // Remove from queue
        this.botQueue.splice(i, 1);

        // Start execution
        this.startBotExecution(queuedBot.botId, queuedBot.credentialId, queuedBot.priority);

        loggerService.info(`Started queued bot ${queuedBot.botId} from queue`);
        break; // Only start one bot at a time
      }
    }
  }

  private canStartBot(credentialId: string): boolean {
    // Check global limit
    if (this.runningBots.size >= this.MAX_GLOBAL_CONCURRENT_BOTS) {
      return false;
    }

    // Check credential limit
    const botsUsingCredential = this.credentialUsage.get(credentialId) || new Set();
    if (botsUsingCredential.size >= this.MAX_CONCURRENT_BOTS) {
      return false;
    }

    // Check minimum interval
    const timeSinceLastBot = Date.now() - this.lastBotEndTime;
    if (timeSinceLastBot < this.MIN_INTERVAL_BETWEEN_BOTS) {
      return false;
    }

    return true;
  }
}

export const botCoordinationService = BotCoordinationService.getInstance();
