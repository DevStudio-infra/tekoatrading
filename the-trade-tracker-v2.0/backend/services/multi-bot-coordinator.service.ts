/**
 * Multi-Bot Coordinator Service
 * Intelligently manages multiple bots using the same Capital.com credentials
 * Prevents API overwhelm through smart scheduling and load balancing
 */

import { loggerService } from "../agents/core/services/logging/logger.service";

interface BotRequest {
  botId: string;
  requestType: "market_data" | "trade" | "account" | "session";
  priority: number; // 0 = highest, 100 = lowest
  operation: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

interface CredentialGroup {
  credentialId: string;
  activeBots: Set<string>;
  requestQueue: BotRequest[];
  isProcessing: boolean;
  lastRequestTime: number;
  requestCount: number;
  windowStart: number;
  rateLimitHits: number;
  emergencyMode: boolean;
}

export class MultiBotCoordinatorService {
  private static instance: MultiBotCoordinatorService;
  private credentialGroups = new Map<string, CredentialGroup>();

  // Dynamic rate limiting based on bot count
  private readonly BASE_REQUESTS_PER_MINUTE = 10;
  private readonly EMERGENCY_REQUESTS_PER_MINUTE = 2;
  private readonly BASE_INTERVAL_MS = 3000;
  private readonly EMERGENCY_INTERVAL_MS = 15000;

  static getInstance(): MultiBotCoordinatorService {
    if (!MultiBotCoordinatorService.instance) {
      MultiBotCoordinatorService.instance = new MultiBotCoordinatorService();
    }
    return MultiBotCoordinatorService.instance;
  }

  /**
   * Register a bot with specific credentials
   */
  registerBot(botId: string, credentialId: string): void {
    if (!this.credentialGroups.has(credentialId)) {
      this.credentialGroups.set(credentialId, {
        credentialId,
        activeBots: new Set(),
        requestQueue: [],
        isProcessing: false,
        lastRequestTime: 0,
        requestCount: 0,
        windowStart: Date.now(),
        rateLimitHits: 0,
        emergencyMode: false,
      });
    }

    const group = this.credentialGroups.get(credentialId)!;
    group.activeBots.add(botId);

    loggerService.info(`🤖 Bot ${botId} registered with credential group ${credentialId.substring(0, 8)}... (${group.activeBots.size} total bots)`);

    // Check if we need emergency mode
    this.checkEmergencyMode(group);
  }

  /**
   * Unregister a bot from credentials
   */
  unregisterBot(botId: string, credentialId: string): void {
    const group = this.credentialGroups.get(credentialId);
    if (group) {
      group.activeBots.delete(botId);
      loggerService.info(`🤖 Bot ${botId} unregistered from credential group ${credentialId.substring(0, 8)}... (${group.activeBots.size} remaining bots)`);

      // Remove empty groups
      if (group.activeBots.size === 0) {
        this.credentialGroups.delete(credentialId);
        loggerService.info(`🗑️ Removed empty credential group ${credentialId.substring(0, 8)}...`);
      } else {
        this.checkEmergencyMode(group);
      }
    }
  }

  /**
   * Queue a request for a bot with intelligent prioritization
   */
  async queueRequest<T>(
    botId: string,
    credentialId: string,
    requestType: "market_data" | "trade" | "account" | "session",
    operation: () => Promise<T>,
    priority: number = 50
  ): Promise<T> {
    const group = this.credentialGroups.get(credentialId);
    if (!group) {
      throw new Error(`Credential group ${credentialId} not found. Register bot first.`);
    }

    return new Promise((resolve, reject) => {
      const request: BotRequest = {
        botId,
        requestType,
        priority,
        operation,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      // Insert based on priority and request type
      this.insertRequestByPriority(group, request);

      loggerService.info(`📥 Queued ${requestType} request for bot ${botId} (queue: ${group.requestQueue.length}, bots: ${group.activeBots.size})`);

      // Start processing if not already running
      if (!group.isProcessing) {
        this.processQueue(group);
      }
    });
  }

  /**
   * Insert request into queue based on priority and type
   */
  private insertRequestByPriority(group: CredentialGroup, request: BotRequest): void {
    // Priority order: session > trade > account > market_data
    const typePriority = {
      session: 0,
      trade: 10,
      account: 20,
      market_data: 30,
    };

    const effectivePriority = typePriority[request.requestType] + request.priority;

    const insertIndex = group.requestQueue.findIndex((existing) => typePriority[existing.requestType] + existing.priority > effectivePriority);

    if (insertIndex === -1) {
      group.requestQueue.push(request);
    } else {
      group.requestQueue.splice(insertIndex, 0, request);
    }
  }

  /**
   * Process the request queue for a credential group
   */
  private async processQueue(group: CredentialGroup): Promise<void> {
    if (group.isProcessing || group.requestQueue.length === 0) {
      return;
    }

    group.isProcessing = true;
    loggerService.info(`⚙️ [${group.credentialId.substring(0, 8)}] Processing queue: ${group.requestQueue.length} requests, ${group.activeBots.size} bots`);

    while (group.requestQueue.length > 0) {
      const now = Date.now();

      // Reset rate limiting window
      if (now - group.windowStart >= 60000) {
        group.windowStart = now;
        group.requestCount = 0;
        loggerService.info(`🔄 [${group.credentialId.substring(0, 8)}] New rate limit window`);
      }

      // Calculate dynamic limits based on bot count and emergency mode
      const maxRequests = this.getMaxRequestsPerMinute(group);
      const minInterval = this.getMinInterval(group);

      // Check rate limits
      if (group.requestCount >= maxRequests) {
        const waitTime = 60000 - (now - group.windowStart);
        loggerService.warn(
          `🛑 [${group.credentialId.substring(0, 8)}] Rate limit reached (${group.requestCount}/${maxRequests}) for ${group.activeBots.size} bots, waiting ${waitTime}ms`
        );
        await this.delay(waitTime);
        group.windowStart = Date.now();
        group.requestCount = 0;
      }

      // Ensure minimum interval
      const timeSinceLastRequest = now - group.lastRequestTime;
      if (timeSinceLastRequest < minInterval) {
        const delayTime = minInterval - timeSinceLastRequest;
        loggerService.info(`⏱️ [${group.credentialId.substring(0, 8)}] Interval delay: ${delayTime}ms (${group.activeBots.size} bots)`);
        await this.delay(delayTime);
      }

      const request = group.requestQueue.shift();
      if (!request) continue;

      try {
        loggerService.info(`📊 [${group.credentialId.substring(0, 8)}] Executing ${request.requestType} for bot ${request.botId} (${group.requestCount + 1}/${maxRequests})`);

        const result = await request.operation();
        group.lastRequestTime = Date.now();
        group.requestCount++;
        request.resolve(result);

        // Dynamic post-request delay based on bot count
        const postDelay = this.getPostRequestDelay(group);
        await this.delay(postDelay);
      } catch (error: any) {
        loggerService.error(`❌ [${group.credentialId.substring(0, 8)}] Request failed for bot ${request.botId}:`, error.message);

        // Handle rate limiting
        if (error.response?.status === 429) {
          group.rateLimitHits++;
          loggerService.warn(`🛑 [${group.credentialId.substring(0, 8)}] Rate limit hit #${group.rateLimitHits} with ${group.activeBots.size} bots`);

          // Enable emergency mode after multiple rate limit hits
          if (group.rateLimitHits >= 3) {
            this.enableEmergencyMode(group);
          }

          // Longer delay after rate limit
          const rateLimitDelay = 20000 + group.activeBots.size * 2000;
          await this.delay(rateLimitDelay);

          // Reset counters
          group.requestCount = 0;
          group.windowStart = Date.now();
          group.lastRequestTime = Date.now();
        }

        request.reject(error);
      }
    }

    group.isProcessing = false;
    loggerService.info(`✅ [${group.credentialId.substring(0, 8)}] Queue processing completed`);
  }

  /**
   * Calculate max requests per minute based on bot count and mode
   */
  private getMaxRequestsPerMinute(group: CredentialGroup): number {
    const baseLimit = group.emergencyMode ? this.EMERGENCY_REQUESTS_PER_MINUTE : this.BASE_REQUESTS_PER_MINUTE;
    const botCount = group.activeBots.size;

    if (botCount <= 5) return baseLimit;
    if (botCount <= 10) return Math.max(1, Math.floor(baseLimit * 0.7));
    if (botCount <= 20) return Math.max(1, Math.floor(baseLimit * 0.4));
    return 1; // Extremely conservative for 20+ bots
  }

  /**
   * Calculate minimum interval based on bot count and mode
   */
  private getMinInterval(group: CredentialGroup): number {
    const baseInterval = group.emergencyMode ? this.EMERGENCY_INTERVAL_MS : this.BASE_INTERVAL_MS;
    const botCount = group.activeBots.size;

    if (botCount <= 5) return baseInterval;
    if (botCount <= 10) return baseInterval * 2;
    if (botCount <= 20) return baseInterval * 4;
    return baseInterval * 8; // Very long intervals for 20+ bots
  }

  /**
   * Calculate post-request delay
   */
  private getPostRequestDelay(group: CredentialGroup): number {
    const botCount = group.activeBots.size;
    const baseDelay = group.emergencyMode ? 3000 : 1000;

    return baseDelay + botCount * 200; // Extra 200ms per bot
  }

  /**
   * Check if emergency mode should be enabled
   */
  private checkEmergencyMode(group: CredentialGroup): void {
    const botCount = group.activeBots.size;

    if (botCount >= 15 && !group.emergencyMode) {
      this.enableEmergencyMode(group);
    } else if (botCount < 10 && group.emergencyMode) {
      this.disableEmergencyMode(group);
    }
  }

  /**
   * Enable emergency mode for a credential group
   */
  private enableEmergencyMode(group: CredentialGroup): void {
    group.emergencyMode = true;
    group.rateLimitHits = 0; // Reset counter
    loggerService.warn(`🚨 [${group.credentialId.substring(0, 8)}] EMERGENCY MODE ENABLED for ${group.activeBots.size} bots`);
  }

  /**
   * Disable emergency mode for a credential group
   */
  private disableEmergencyMode(group: CredentialGroup): void {
    group.emergencyMode = false;
    loggerService.info(`✅ [${group.credentialId.substring(0, 8)}] Emergency mode disabled for ${group.activeBots.size} bots`);
  }

  /**
   * Get comprehensive status for all credential groups
   */
  getStatus(): Array<{
    credentialId: string;
    activeBots: number;
    queueLength: number;
    requestCount: number;
    emergencyMode: boolean;
    rateLimitHits: number;
    currentLimits: {
      maxRequestsPerMinute: number;
      minInterval: number;
    };
  }> {
    const status: Array<any> = [];

    this.credentialGroups.forEach((group, credentialId) => {
      status.push({
        credentialId: credentialId.substring(0, 8) + "...",
        activeBots: group.activeBots.size,
        queueLength: group.requestQueue.length,
        requestCount: group.requestCount,
        emergencyMode: group.emergencyMode,
        rateLimitHits: group.rateLimitHits,
        currentLimits: {
          maxRequestsPerMinute: this.getMaxRequestsPerMinute(group),
          minInterval: this.getMinInterval(group),
        },
      });
    });

    return status;
  }

  /**
   * Force emergency mode for all credential groups
   */
  enableGlobalEmergencyMode(): void {
    loggerService.warn(`🚨 GLOBAL EMERGENCY MODE ENABLED`);
    this.credentialGroups.forEach((group) => {
      this.enableEmergencyMode(group);
    });
  }

  /**
   * Get recommendations for bot distribution
   */
  getRecommendations(): Array<{
    credentialId: string;
    botCount: number;
    status: "optimal" | "crowded" | "overloaded";
    recommendation: string;
  }> {
    const recommendations: Array<any> = [];

    this.credentialGroups.forEach((group, credentialId) => {
      const botCount = group.activeBots.size;
      let status: "optimal" | "crowded" | "overloaded";
      let recommendation: string;

      if (botCount <= 5) {
        status = "optimal";
        recommendation = "Good bot distribution. System running efficiently.";
      } else if (botCount <= 15) {
        status = "crowded";
        recommendation = "Consider using additional Capital.com credentials to distribute load.";
      } else {
        status = "overloaded";
        recommendation = "URGENT: Use multiple credentials or reduce bot count. System may be unreliable.";
      }

      recommendations.push({
        credentialId: credentialId.substring(0, 8) + "...",
        botCount,
        status,
        recommendation,
      });
    });

    return recommendations;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
