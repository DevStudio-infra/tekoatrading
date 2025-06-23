import { PrismaClient } from "@prisma/client";

export class PerformanceCalculationService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Calculate and cache performance metrics for a specific bot
   */
  async calculateBotPerformance(botId: string): Promise<void> {
    try {
      // Get all closed trades for the bot
      const trades = await this.prisma.trade.findMany({
        where: {
          botId,
          status: "CLOSED",
          profitLoss: { not: null },
        },
        orderBy: { closedAt: "asc" },
      });

      if (trades.length === 0) {
        // No trades to calculate metrics from
        await this.prisma.bot.update({
          where: { id: botId },
          data: {
            totalPnL: 0,
            totalTrades: 0,
            winRate: 0,
            maxDrawdown: 0,
            lastPerformanceUpdate: new Date(),
          },
        });
        return;
      }

      // Calculate basic metrics
      const totalPnL = trades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);
      const totalTrades = trades.length;
      const winningTrades = trades.filter((trade) => (trade.profitLoss || 0) > 0);
      const winRate = (winningTrades.length / totalTrades) * 100;

      // Calculate maximum drawdown
      let maxDrawdown = 0;
      let runningPnL = 0;
      let peak = 0;

      for (const trade of trades) {
        runningPnL += trade.profitLoss || 0;
        if (runningPnL > peak) {
          peak = runningPnL;
        }
        const currentDrawdown = peak - runningPnL;
        if (currentDrawdown > maxDrawdown) {
          maxDrawdown = currentDrawdown;
        }
      }

      // Update bot performance metrics
      await this.prisma.bot.update({
        where: { id: botId },
        data: {
          totalPnL,
          totalTrades,
          winRate,
          maxDrawdown,
          lastPerformanceUpdate: new Date(),
        },
      });

      const performanceData = {
        totalPnL,
        totalTrades,
        winRate,
        maxDrawdown,
        lastPerformanceUpdate: new Date(),
      };

      console.log(`Performance metrics updated for bot ${botId}:`, {
        totalPnL,
        totalTrades,
        winRate: winRate.toFixed(2) + "%",
        maxDrawdown,
      });

      // Broadcast performance update via WebSocket
      try {
        const wsService = (global as any).wsService;
        if (wsService) {
          wsService.broadcastPerformanceUpdate(botId, performanceData);
        }
      } catch (error) {
        console.error("Error broadcasting performance update:", error);
      }
    } catch (error) {
      console.error(`Error calculating performance for bot ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate additional trade analytics when a trade is closed
   */
  async calculateTradeAnalytics(tradeId: string): Promise<void> {
    try {
      const trade = await this.prisma.trade.findUnique({
        where: { id: tradeId },
      });

      if (!trade || !trade.openedAt || !trade.closedAt) {
        return;
      }

      // Calculate trade duration in minutes
      const tradeDurationMinutes = Math.floor((trade.closedAt.getTime() - trade.openedAt.getTime()) / (1000 * 60));

      // Calculate risk/reward ratio
      let riskRewardRatio: number | null = null;
      if (trade.stopLoss && trade.takeProfit && trade.entryPrice) {
        const risk = Math.abs(trade.entryPrice - trade.stopLoss);
        const reward = Math.abs(trade.takeProfit - trade.entryPrice);
        riskRewardRatio = reward / risk;
      }

      // Determine market condition (simplified logic)
      const marketCondition = this.determineMarketCondition(trade);

      // Update trade with analytics
      await this.prisma.trade.update({
        where: { id: tradeId },
        data: {
          tradeDurationMinutes,
          riskRewardRatio,
          marketCondition,
        },
      });

      const analyticsData = {
        tradeDurationMinutes,
        riskRewardRatio,
        marketCondition,
      };

      console.log(`Trade analytics updated for trade ${tradeId}:`, {
        tradeDurationMinutes,
        riskRewardRatio,
        marketCondition,
      });

      // Broadcast trade analytics update via WebSocket
      try {
        const wsService = (global as any).wsService;
        if (wsService) {
          wsService.broadcastTradeAnalytics(tradeId, analyticsData);
        }
      } catch (error) {
        console.error("Error broadcasting trade analytics update:", error);
      }
    } catch (error) {
      console.error(`Error calculating trade analytics for trade ${tradeId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate performance metrics for all active bots
   */
  async calculateAllBotsPerformance(): Promise<void> {
    try {
      const bots = await this.prisma.bot.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });

      console.log(`Calculating performance for ${bots.length} active bots...`);

      for (const bot of bots) {
        try {
          await this.calculateBotPerformance(bot.id);
        } catch (error) {
          console.error(`Failed to calculate performance for bot ${bot.name} (${bot.id}):`, error);
        }
      }

      console.log("Finished calculating performance for all bots");
    } catch (error) {
      console.error("Error calculating performance for all bots:", error);
      throw error;
    }
  }

  /**
   * Update trade analytics for all closed trades without analytics
   */
  async updateMissingTradeAnalytics(): Promise<void> {
    try {
      const trades = await this.prisma.trade.findMany({
        where: {
          status: "CLOSED",
          tradeDurationMinutes: null,
          openedAt: { not: null },
          closedAt: { not: null },
        },
        select: { id: true },
      });

      console.log(`Updating analytics for ${trades.length} trades...`);

      for (const trade of trades) {
        try {
          await this.calculateTradeAnalytics(trade.id);
        } catch (error) {
          console.error(`Failed to update analytics for trade ${trade.id}:`, error);
        }
      }

      console.log("Finished updating trade analytics");
    } catch (error) {
      console.error("Error updating trade analytics:", error);
      throw error;
    }
  }

  /**
   * Simplified market condition determination
   */
  private determineMarketCondition(trade: any): string {
    // This is a simplified implementation
    // In a real system, you'd analyze market data around the trade time

    if (!trade.profitLoss) return "UNKNOWN";

    const profitLossPercent = trade.profitLossPercent || 0;

    if (Math.abs(profitLossPercent) < 0.5) {
      return "SIDEWAYS";
    } else if (profitLossPercent > 2) {
      return "TRENDING_UP";
    } else if (profitLossPercent < -2) {
      return "TRENDING_DOWN";
    } else if (Math.abs(profitLossPercent) > 1) {
      return "VOLATILE";
    } else {
      return "NORMAL";
    }
  }

  /**
   * Clean up and close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
