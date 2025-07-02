import { PrismaClient } from "@prisma/client";
import { logger } from "../logger";
import {
  IntelligentTradeManagementAgent,
  TradeManagementContext,
  TradeManagementDecision,
} from "../agents/trading/intelligent-trade-management.agent";
import { CapitalMainService } from "../modules/capital/services/capital-main.service";

export interface ActiveTrade {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  entryPrice: number;
  currentPrice: number;
  currentStopLoss: number;
  currentTakeProfit: number;
  positionSize: number;
  currentPL: number;
  openedAt: Date;
  botId: string;
  userId: string;
  brokerTradeId: string;
}

export interface TradeMonitoringResult {
  tradesProcessed: number;
  decisionsExecuted: number;
  errors: string[];
  summary: {
    totalTrades: number;
    profitableTrades: number;
    losingTrades: number;
    totalPL: number;
  };
}

export class TradeMonitoringService {
  private prisma: PrismaClient;
  private tradeManagementAgent: IntelligentTradeManagementAgent;
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.prisma = new PrismaClient();
    this.tradeManagementAgent = new IntelligentTradeManagementAgent();
  }

  /**
   * Start monitoring all active trades
   */
  async startMonitoring(intervalMinutes: number = 5): Promise<void> {
    if (this.isMonitoring) {
      logger.warn("[TRADE-MONITOR] Monitoring already active");
      return;
    }

    logger.info(`[TRADE-MONITOR] Starting trade monitoring every ${intervalMinutes} minutes`);
    this.isMonitoring = true;

    // Monitor immediately
    await this.monitorAllTrades();

    // Set up recurring monitoring
    this.monitoringInterval = setInterval(
      async () => {
        try {
          await this.monitorAllTrades();
        } catch (error) {
          logger.error("[TRADE-MONITOR] Error in monitoring cycle:", error);
        }
      },
      intervalMinutes * 60 * 1000,
    );
  }

  /**
   * Stop monitoring trades
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    logger.info("[TRADE-MONITOR] Trade monitoring stopped");
  }

  /**
   * Monitor all active trades and apply intelligent management
   */
  async monitorAllTrades(): Promise<TradeMonitoringResult> {
    try {
      logger.info("[TRADE-MONITOR] Starting trade monitoring cycle");

      // Get all active trades
      const activeTrades = await this.getActiveTrades();

      if (activeTrades.length === 0) {
        logger.info("[TRADE-MONITOR] No active trades to monitor");
        return {
          tradesProcessed: 0,
          decisionsExecuted: 0,
          errors: [],
          summary: {
            totalTrades: 0,
            profitableTrades: 0,
            losingTrades: 0,
            totalPL: 0,
          },
        };
      }

      logger.info(`[TRADE-MONITOR] Monitoring ${activeTrades.length} active trades`);

      let tradesProcessed = 0;
      let decisionsExecuted = 0;
      const errors: string[] = [];
      let totalPL = 0;
      let profitableTrades = 0;
      let losingTrades = 0;

      // Process each trade
      for (const trade of activeTrades) {
        try {
          // Get current market data
          const marketData = await this.getCurrentMarketData(trade.symbol, trade.botId);
          if (!marketData) {
            errors.push(`Failed to get market data for ${trade.symbol}`);
            continue;
          }

          // Build trade management context
          const context = await this.buildTradeContext(trade, marketData.price);

          // Get trade management decision
          const decision = await this.tradeManagementAgent.analyzeTradeManagement(context);

          // Execute decision if needed
          if (decision.action !== "HOLD") {
            const executed = await this.executeTradeDecision(trade, decision);
            if (executed) {
              decisionsExecuted++;
              logger.info(
                `[TRADE-MONITOR] Executed ${decision.action} for ${trade.symbol} trade ${trade.id}`,
              );
            }
          }

          // Update statistics
          tradesProcessed++;
          totalPL += trade.currentPL;
          if (trade.currentPL > 0) profitableTrades++;
          else if (trade.currentPL < 0) losingTrades++;
        } catch (error) {
          const errorMsg = `Error monitoring trade ${trade.id}: ${error instanceof Error ? error.message : "Unknown error"}`;
          errors.push(errorMsg);
          logger.error(`[TRADE-MONITOR] ${errorMsg}`);
        }
      }

      const result: TradeMonitoringResult = {
        tradesProcessed,
        decisionsExecuted,
        errors,
        summary: {
          totalTrades: activeTrades.length,
          profitableTrades,
          losingTrades,
          totalPL,
        },
      };

      logger.info(
        `[TRADE-MONITOR] Cycle complete: ${tradesProcessed} processed, ${decisionsExecuted} decisions executed`,
      );

      return result;
    } catch (error) {
      logger.error("[TRADE-MONITOR] Critical error in monitoring cycle:", error);
      throw error;
    }
  }

  /**
   * Get all active trades from database
   */
  private async getActiveTrades(): Promise<ActiveTrade[]> {
    const trades = await this.prisma.trade.findMany({
      where: {
        status: "FILLED", // Active trades
      },
      include: {
        bot: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    return trades
      .filter((trade) => trade.botId && trade.bot?.userId) // Filter out trades without botId or userId
      .map((trade) => ({
        id: trade.id,
        symbol: trade.symbol,
        side: trade.side as "BUY" | "SELL",
        entryPrice: trade.entryPrice || 0,
        currentPrice: trade.entryPrice || 0, // Will be updated with live data
        currentStopLoss: trade.stopLoss || 0,
        currentTakeProfit: trade.takeProfit || 0,
        positionSize: trade.size,
        currentPL: trade.profitLoss || 0,
        openedAt: trade.openedAt || new Date(),
        botId: trade.botId!, // Non-null assertion after filter
        userId: trade.bot!.userId, // Non-null assertion after filter
        brokerTradeId: trade.brokerTradeId || "",
      }));
  }

  /**
   * Get current market data for a symbol
   */
  private async getCurrentMarketData(
    symbol: string,
    botId: string,
  ): Promise<{ price: number } | null> {
    try {
      // Get Capital.com API instance for this bot
      const bot = await this.prisma.bot.findUnique({
        where: { id: botId },
        include: { user: true },
      });

      if (!bot) {
        logger.error(`[TRADE-MONITOR] Bot ${botId} not found`);
        return null;
      }

      // TODO: Implement proper Capital API instance management
      // For now, return mock data to get the system working
      logger.info(`[TRADE-MONITOR] Getting mock market data for ${symbol}`);

      return {
        price: 50000, // Mock price - replace with actual API call
      };
    } catch (error) {
      logger.error(`[TRADE-MONITOR] Error getting market data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Build comprehensive trade management context
   */
  private async buildTradeContext(
    trade: ActiveTrade,
    currentPrice: number,
  ): Promise<TradeManagementContext> {
    const timeInTrade = Date.now() - trade.openedAt.getTime();
    const currentPL = (currentPrice - trade.entryPrice) * trade.positionSize;
    const currentPLPercent = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;

    // Basic context (can be enhanced with more sophisticated analysis)
    return {
      tradeId: trade.id,
      symbol: trade.symbol,
      side: trade.side,
      entryPrice: trade.entryPrice,
      currentPrice,
      currentStopLoss: trade.currentStopLoss,
      currentTakeProfit: trade.currentTakeProfit,
      positionSize: trade.positionSize,
      currentPL,
      currentPLPercent,
      maxFavorableExcursion: Math.max(0, currentPL), // Simplified
      maxAdverseExcursion: Math.min(0, currentPL), // Simplified
      timeInTrade: timeInTrade / (1000 * 60), // Convert to minutes

      // Market context (simplified - can be enhanced)
      marketConditions: currentPLPercent > 2 ? "TRENDING" : "RANGING",
      trendStrength: Math.abs(currentPLPercent) > 1 ? 7 : 5,
      volatilityRank: "NORMAL",
      supportResistanceLevels: [trade.entryPrice * 0.99, trade.entryPrice * 1.01],
      volumeProfile: "NORMAL",
      sessionTime: this.getCurrentTradingSession(),

      // Portfolio context (simplified)
      totalPortfolioRisk: 5.0, // TODO: Calculate actual portfolio risk
      correlatedPositions: 0, // TODO: Count correlated positions
      accountBalance: 10000, // TODO: Get actual account balance
      accountDrawdown: 0, // TODO: Calculate actual drawdown

      // Technical indicators (simplified)
      technicalIndicators: {
        rsi: 50,
        macd: currentPLPercent > 0 ? "BULLISH" : "BEARISH",
        bollinger: "MIDDLE",
        atr: Math.abs(trade.entryPrice * 0.02), // 2% ATR estimate
      },

      // News/Events (placeholder)
      upcomingEvents: [],
      recentNews: [],
    };
  }

  /**
   * Execute trade management decision
   */
  private async executeTradeDecision(
    trade: ActiveTrade,
    decision: TradeManagementDecision,
  ): Promise<boolean> {
    try {
      logger.info(
        `[TRADE-MONITOR] Executing ${decision.action} for trade ${trade.id}: ${decision.reasoning.join(", ")}`,
      );

      // For now, just log the decision (actual execution would need Capital.com API integration)
      switch (decision.action) {
        case "ADJUST_STOP":
          logger.info(
            `[TRADE-MONITOR] Would update stop loss to ${decision.newStopLoss} for trade ${trade.id}`,
          );
          break;
        case "ADJUST_TARGET":
          logger.info(
            `[TRADE-MONITOR] Would update take profit to ${decision.newTakeProfit} for trade ${trade.id}`,
          );
          break;
        case "PARTIAL_CLOSE":
          logger.info(
            `[TRADE-MONITOR] Would close ${decision.closePercentage}% of trade ${trade.id}`,
          );
          break;
        case "FULL_CLOSE":
          logger.info(`[TRADE-MONITOR] Would close full position for trade ${trade.id}`);
          break;
      }

      return true; // Placeholder - would return actual execution result
    } catch (error) {
      logger.error(`[TRADE-MONITOR] Error executing decision for trade ${trade.id}:`, error);
      return false;
    }
  }

  private convertSymbolToEpic(symbol: string): string {
    const symbolMapping: { [key: string]: string } = {
      "BTC/USD": "BITCOIN",
      BTCUSD: "BITCOIN",
      "ETH/USD": "ETHEREUM",
      ETHUSD: "ETHEREUM",
      "EUR/USD": "EURUSD",
      EURUSD: "EURUSD",
      "GBP/USD": "GBPUSD",
      GBPUSD: "GBPUSD",
    };

    return symbolMapping[symbol] || symbol;
  }

  private getCurrentTradingSession(): "ASIAN" | "LONDON" | "NY" | "OVERLAP" {
    const now = new Date();
    const hour = now.getUTCHours();

    if (hour >= 0 && hour < 8) return "ASIAN";
    if (hour >= 8 && hour < 13) return "LONDON";
    if (hour >= 13 && hour < 21) return "NY";
    return "OVERLAP";
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus(): { isActive: boolean; intervalMinutes?: number } {
    return {
      isActive: this.isMonitoring,
      intervalMinutes: this.monitoringInterval ? 5 : undefined,
    };
  }
}

// Export singleton instance
export const tradeMonitoringService = new TradeMonitoringService();
