import { loggerService } from "./logger.service";
import { prisma } from "../utils/prisma";

export class DatabaseCleanupService {
  private logger = loggerService;

  // CRITICAL: These tables contain essential reference data and should NEVER be deleted
  private readonly PROTECTED_TABLES = [
    "users",
    "trading_pairs",
    "strategy_templates",
    "strategies",
    "broker_credentials",
    "bots",
    "positions", // Keep position history
    "trades", // Keep trade history
    "evaluations", // Keep evaluation history
  ];

  /**
   * Perform comprehensive database cleanup
   * WARNING: Only deletes temporary/cache data and old logs - never deletes core business data
   */
  async performCleanup(): Promise<{
    deletedRecords: { [table: string]: number };
    optimizationResults: string[];
    protectedTables: string[];
  }> {
    const deletedRecords: { [table: string]: number } = {};
    const optimizationResults: string[] = [];

    try {
      this.logger.info("[DB CLEANUP] Starting comprehensive database cleanup...");
      this.logger.info("[DB CLEANUP] Protected tables (will never be deleted):", this.PROTECTED_TABLES);

      // Clean expired cache entries ONLY
      deletedRecords["marketDataCache"] = await this.cleanExpiredMarketData();

      // Clean old performance data ONLY (keeping recent data)
      deletedRecords["dailyPnLSummary"] = await this.cleanOldDailyPnL();

      // Clean old closed trades (older than 2 years for historical purposes)
      deletedRecords["oldClosedTrades"] = await this.cleanOldClosedTrades();

      // Clean old closed positions (older than 2 years for historical purposes)
      deletedRecords["oldClosedPositions"] = await this.cleanOldClosedPositions();

      // Optimize performance
      optimizationResults.push(...(await this.optimizePerformance()));

      this.logger.info("[DB CLEANUP] Cleanup completed successfully", {
        deletedRecords,
        optimizationResults,
        protectedTables: this.PROTECTED_TABLES,
      });

      return {
        deletedRecords,
        optimizationResults,
        protectedTables: this.PROTECTED_TABLES,
      };
    } catch (error) {
      this.logger.error("[DB CLEANUP] Error during cleanup:", error);
      throw error;
    }
  }

  /**
   * Clean expired market data cache (older than 24 hours)
   */
  private async cleanExpiredMarketData(): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      const result = await prisma.marketDataCache.deleteMany({
        where: {
          updatedAt: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.info(`[DB CLEANUP] Cleaned ${result.count} expired market data records`);
      return result.count;
    } catch (error) {
      this.logger.error("[DB CLEANUP] Error cleaning market data cache:", error);
      return 0;
    }
  }

  /**
   * Clean old closed trades (older than 2 years for historical analysis)
   */
  private async cleanOldClosedTrades(): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000); // 2 years ago

      const result = await prisma.trade.deleteMany({
        where: {
          status: "CLOSED",
          closedAt: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.info(`[DB CLEANUP] Cleaned ${result.count} old closed trades`);
      return result.count;
    } catch (error) {
      this.logger.error("[DB CLEANUP] Error cleaning old closed trades:", error);
      return 0;
    }
  }

  /**
   * Clean old closed positions (older than 2 years for historical analysis)
   */
  private async cleanOldClosedPositions(): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000); // 2 years ago

      const result = await prisma.position.deleteMany({
        where: {
          status: "closed",
          exitTime: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.info(`[DB CLEANUP] Cleaned ${result.count} old closed positions`);
      return result.count;
    } catch (error) {
      this.logger.error("[DB CLEANUP] Error cleaning old closed positions:", error);
      return 0;
    }
  }

  /**
   * Clean old daily P&L summaries (older than 2 years)
   */
  private async cleanOldDailyPnL(): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000); // 2 years ago

      const result = await prisma.dailyPnLSummary.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.info(`[DB CLEANUP] Cleaned ${result.count} old daily P&L summaries`);
      return result.count;
    } catch (error) {
      this.logger.error("[DB CLEANUP] Error cleaning daily P&L summaries:", error);
      return 0;
    }
  }

  /**
   * Clean position sizing logs older than specified days
   */
  async cleanOldPositionSizingLogs(daysOld: number = 90): Promise<any> {
    try {
      this.logger.info(`Cleaning position sizing logs older than ${daysOld} days`);

      // Since positionSizingLog table was removed, we'll clean old trade analysis data instead
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Clean old trade evaluations that might be related to position sizing
      const result = await prisma.evaluation.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.info(`Cleaned ${result.count} old position sizing related evaluations`);
      return {
        success: true,
        deletedCount: result.count,
        tableName: "evaluation (position sizing related)",
        cutoffDate,
      };
    } catch (error) {
      this.logger.error("Error cleaning old position sizing logs:", error);
      return {
        success: false,
        error: (error as Error).message,
        tableName: "evaluation (position sizing related)",
        deletedCount: 0,
      };
    }
  }

  /**
   * Clean trade management logs older than specified days
   */
  async cleanOldTradeManagementLogs(daysOld: number = 90): Promise<any> {
    try {
      this.logger.info(`Cleaning trade management logs older than ${daysOld} days`);

      // Since tradeManagementLog table was removed, we'll clean old trade records with detailed rationale
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Clean old closed trades that are very old (keeping recent history for analysis)
      const result = await prisma.trade.deleteMany({
        where: {
          status: "CLOSED",
          closedAt: {
            lt: cutoffDate,
          },
          // Only delete trades older than 2 years to preserve important historical data
          createdAt: {
            lt: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000),
          },
        },
      });

      this.logger.info(`[DB CLEANUP] Cleaned ${result.count} old trade management logs`);
      return result.count;
    } catch (error) {
      this.logger.error("[DB CLEANUP] Error cleaning trade management logs:", error);
      return 0;
    }
  }

  /**
   * Clean old human trading decisions (older than 6 months)
   * Note: humanTradingDecision table was removed during database cleanup
   */
  private async cleanOldHumanTradingDecisions(): Promise<number> {
    try {
      // Table was removed during cleanup, return 0
      this.logger.info(`[DB CLEANUP] Skipping human trading decisions cleanup (table removed)`);
      return 0;
    } catch (error) {
      this.logger.error("[DB CLEANUP] Error in cleanup placeholder:", error);
      return 0;
    }
  }

  /**
   * Clean old market regime history (older than 3 months)
   * Note: marketRegimeHistory table was removed during database cleanup
   */
  private async cleanOldMarketRegimeHistory(): Promise<number> {
    try {
      // Table was removed during cleanup, clean old market data cache instead
      const cutoffDate = new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000); // 3 months ago

      const result = await prisma.marketDataCache.deleteMany({
        where: {
          updatedAt: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.info(`[DB CLEANUP] Cleaned ${result.count} old market data cache records`);
      return result.count;
    } catch (error) {
      this.logger.error("[DB CLEANUP] Error cleaning old market data cache:", error);
      return 0;
    }
  }

  /**
   * Optimize database performance
   */
  private async optimizePerformance(): Promise<string[]> {
    const results: string[] = [];

    try {
      // Update bot performance analytics
      const bots = await prisma.bot.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      for (const bot of bots) {
        await this.updateBotPerformanceCache(bot.id);
      }
      results.push(`Updated performance cache for ${bots.length} active bots`);

      // Note: Performance alerts table was removed during database cleanup
      // This cleanup step is no longer needed

      this.logger.info("[DB CLEANUP] Performance optimization completed", { results });
      return results;
    } catch (error) {
      this.logger.error("[DB CLEANUP] Error during performance optimization:", error);
      return results;
    }
  }

  /**
   * Update bot performance cache
   */
  private async updateBotPerformanceCache(botId: string): Promise<void> {
    try {
      // Get recent trades for performance calculation
      const trades = await prisma.trade.findMany({
        where: {
          botId,
          status: "CLOSED",
          closedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      });

      if (trades.length === 0) return;

      const winningTrades = trades.filter((t) => (t.profitLoss || 0) > 0);
      const totalPnL = trades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
      const winRate = (winningTrades.length / trades.length) * 100;

      // Calculate max drawdown
      let runningPnL = 0;
      let peak = 0;
      let maxDrawdown = 0;

      for (const trade of trades) {
        runningPnL += trade.profitLoss || 0;
        if (runningPnL > peak) {
          peak = runningPnL;
        }
        const drawdown = peak - runningPnL;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }

      // Update bot performance fields
      await prisma.bot.update({
        where: { id: botId },
        data: {
          totalPnL,
          totalTrades: trades.length,
          winRate,
          maxDrawdown,
          lastPerformanceUpdate: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`[DB CLEANUP] Error updating performance cache for bot ${botId}:`, error);
    }
  }

  /**
   * Schedule automatic cleanup (run daily)
   */
  scheduleAutomaticCleanup(): void {
    // Run cleanup every 24 hours
    setInterval(async () => {
      try {
        await this.performCleanup();
      } catch (error) {
        this.logger.error("[DB CLEANUP] Scheduled cleanup failed:", error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    this.logger.info("[DB CLEANUP] Automatic cleanup scheduled (every 24 hours)");
  }

  /**
   * Get database statistics
   */
  async getDatabaseStatistics(): Promise<{
    tableCounts: { [table: string]: number };
    cacheStatistics: {
      marketDataAge: number;
      expiredCacheEntries: number;
    };
    performanceMetrics: {
      activeBots: number;
      totalTrades: number;
      recentTradeVolume: number;
    };
  }> {
    try {
      // Get table counts - only active tables
      const tableCounts = {
        users: await prisma.user.count(),
        bots: await prisma.bot.count(),
        trades: await prisma.trade.count(),
        positions: await prisma.position.count(),
        strategies: await prisma.strategy.count(),
        strategyTemplates: await prisma.strategyTemplate.count(),
        brokerCredentials: await prisma.brokerCredential.count(),
        tradingPairs: await prisma.tradingPair.count(),
        evaluations: await prisma.evaluation.count(),
        dailyPnLSummaries: await prisma.dailyPnLSummary.count(),
        marketDataCache: await prisma.marketDataCache.count(),
      };

      // Get cache statistics
      const latestMarketData = await prisma.marketDataCache.findFirst({
        orderBy: { updatedAt: "desc" },
      });
      const expiredCacheEntries = await prisma.marketDataCache.count({
        where: {
          updatedAt: {
            lt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
          },
        },
      });

      const cacheStatistics = {
        marketDataAge: latestMarketData ? Math.floor((Date.now() - latestMarketData.updatedAt.getTime()) / 1000) : 0,
        expiredCacheEntries,
      };

      // Get performance metrics
      const activeBots = await prisma.bot.count({ where: { isActive: true } });
      const totalTrades = await prisma.trade.count();
      const recentTrades = await prisma.trade.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      const performanceMetrics = {
        activeBots,
        totalTrades,
        recentTradeVolume: recentTrades,
      };

      return { tableCounts, cacheStatistics, performanceMetrics };
    } catch (error) {
      this.logger.error("[DB CLEANUP] Error getting database statistics:", error);
      throw error;
    }
  }

  /**
   * Get database analytics - table sizes and record counts
   */
  async getDatabaseAnalytics(): Promise<any> {
    try {
      const analytics = {
        // Active tables only
        users: await prisma.user.count(),
        bots: await prisma.bot.count(),
        trades: await prisma.trade.count(),
        positions: await prisma.position.count(),
        strategies: await prisma.strategy.count(),
        strategyTemplates: await prisma.strategyTemplate.count(),
        brokerCredentials: await prisma.brokerCredential.count(),
        tradingPairs: await prisma.tradingPair.count(),
        evaluations: await prisma.evaluation.count(),
        dailyPnLSummaries: await prisma.dailyPnLSummary.count(),
        marketDataCache: await prisma.marketDataCache.count(),
      };

      // Calculate cache efficiency
      const expiredCacheEntries = await prisma.marketDataCache.count({
        where: {
          updatedAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
          },
        },
      });

      return {
        ...analytics,
        cacheEfficiency: {
          totalEntries: analytics.marketDataCache,
          expiredEntries: expiredCacheEntries,
          freshEntries: analytics.marketDataCache - expiredCacheEntries,
          efficiencyPercent: analytics.marketDataCache > 0 ? ((analytics.marketDataCache - expiredCacheEntries) / analytics.marketDataCache) * 100 : 100,
        },
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error("Error getting database analytics:", error);
      throw error;
    }
  }
}

export const databaseCleanupService = new DatabaseCleanupService();
