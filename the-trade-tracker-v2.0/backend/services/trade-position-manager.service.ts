import { loggerService } from "./logger.service";
import { prisma } from "../utils/prisma";

/**
 * TradePositionManagerService
 *
 * Comprehensive service for managing trades and positions with proper database integration.
 * Handles the full lifecycle from trade creation to completion and performance tracking.
 */
export class TradePositionManagerService {
  private logger: typeof loggerService;

  constructor() {
    this.logger = loggerService;
  }

  /**
   * Create a new trade record
   */
  async createTrade(tradeData: {
    botId: string;
    userId: string;
    symbol: string;
    direction: "BUY" | "SELL";
    orderType: "MARKET" | "LIMIT" | "STOP";
    quantity: number;
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    rationale?: string;
    aiConfidence?: number;
    riskScore?: number;
    evaluationId?: number;
  }) {
    try {
      const trade = await prisma.trade.create({
        data: {
          ...tradeData,
          status: "PENDING",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      this.logger.info(`Created trade ${trade.id} for bot ${tradeData.botId}: ${tradeData.direction} ${tradeData.quantity} ${tradeData.symbol}`);
      return trade;
    } catch (error) {
      this.logger.error("Error creating trade:", error);
      throw error;
    }
  }

  /**
   * Update trade when order is executed
   */
  async executeTradeOrder(
    tradeId: string,
    executionData: {
      entryPrice: number;
      brokerOrderId?: string;
      brokerDealId?: string;
      openedAt?: Date;
    }
  ) {
    try {
      const updatedTrade = await prisma.trade.update({
        where: { id: tradeId },
        data: {
          ...executionData,
          status: "OPEN",
          currentPrice: executionData.entryPrice,
          openedAt: executionData.openedAt || new Date(),
          updatedAt: new Date(),
        },
      });

      // Create position record for tracking
      await this.createPositionFromTrade(updatedTrade);

      this.logger.info(`Trade ${tradeId} executed at price ${executionData.entryPrice}`);
      return updatedTrade;
    } catch (error) {
      this.logger.error(`Error executing trade ${tradeId}:`, error);
      throw error;
    }
  }

  /**
   * Close a trade position
   */
  async closeTrade(
    tradeId: string,
    closeData: {
      exitPrice: number;
      exitReason: "STOP_LOSS" | "TAKE_PROFIT" | "MANUAL" | "TIMEOUT";
      fees?: number;
    }
  ) {
    try {
      const trade = await prisma.trade.findUnique({
        where: { id: tradeId },
      });

      if (!trade) {
        throw new Error(`Trade ${tradeId} not found`);
      }

      // Calculate P&L
      const profitLoss = this.calculateProfitLoss(trade.direction as "BUY" | "SELL", trade.entryPrice || 0, closeData.exitPrice, trade.quantity, closeData.fees || 0);

      const profitLossPercent = trade.entryPrice ? (profitLoss / (trade.entryPrice * trade.quantity)) * 100 : 0;

      // Calculate trade duration
      const tradeDurationMinutes = trade.openedAt ? Math.floor((Date.now() - trade.openedAt.getTime()) / (1000 * 60)) : 0;

      // Calculate risk/reward ratio
      const riskRewardRatio = this.calculateRiskRewardRatio(trade, closeData.exitPrice);

      const updatedTrade = await prisma.trade.update({
        where: { id: tradeId },
        data: {
          status: "CLOSED",
          currentPrice: closeData.exitPrice,
          profitLoss,
          profitLossPercent,
          tradeDurationMinutes,
          riskRewardRatio,
          // exitReason: closeData.exitReason, // Field exists in schema but may need migration
          fees: closeData.fees || 0,
          closedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Update corresponding position
      await this.updatePositionFromTrade(updatedTrade);

      // Update bot performance cache
      await this.updateBotPerformanceCache(trade.botId);

      // Update daily P&L summary
      await this.updateDailyPnLSummary(trade.botId, trade.userId, profitLoss);

      this.logger.info(`Closed trade ${tradeId}: P&L=${profitLoss.toFixed(2)}, Duration=${tradeDurationMinutes}min`);
      return updatedTrade;
    } catch (error) {
      this.logger.error(`Error closing trade ${tradeId}:`, error);
      throw error;
    }
  }

  /**
   * Update trade with current market price and unrealized P&L
   */
  async updateTradePrice(tradeId: string, currentPrice: number) {
    try {
      const trade = await prisma.trade.findUnique({
        where: { id: tradeId },
      });

      if (!trade || trade.status !== "OPEN") {
        return;
      }

      const unrealizedPnL = this.calculateProfitLoss(trade.direction as "BUY" | "SELL", trade.entryPrice || 0, currentPrice, trade.quantity, 0);

      await prisma.trade.update({
        where: { id: tradeId },
        data: {
          currentPrice,
          profitLoss: unrealizedPnL, // Store unrealized P&L for open positions
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error updating trade price for ${tradeId}:`, error);
    }
  }

  /**
   * Get active trades for a bot
   */
  async getActiveTrades(botId: string) {
    try {
      return await prisma.trade.findMany({
        where: {
          botId,
          status: { in: ["PENDING", "OPEN"] },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      this.logger.error(`Error getting active trades for bot ${botId}:`, error);
      return [];
    }
  }

  /**
   * Get trade history for a bot
   */
  async getTradeHistory(botId: string, limit: number = 50) {
    try {
      return await prisma.trade.findMany({
        where: { botId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    } catch (error) {
      this.logger.error(`Error getting trade history for bot ${botId}:`, error);
      return [];
    }
  }

  /**
   * Get open positions for a bot
   */
  async getOpenPositions(botId: string) {
    try {
      return await prisma.position.findMany({
        where: {
          botId,
          status: "open",
        },
        orderBy: { entryTime: "desc" },
      });
    } catch (error) {
      this.logger.error(`Error getting open positions for bot ${botId}:`, error);
      return [];
    }
  }

  /**
   * Private helper methods
   */

  private async createPositionFromTrade(trade: any) {
    try {
      await prisma.position.create({
        data: {
          userId: trade.userId,
          botId: trade.botId,
          symbol: trade.symbol,
          side: trade.direction.toLowerCase(),
          entryPrice: trade.entryPrice,
          quantity: trade.quantity,
          status: "open",
          entryTime: trade.openedAt || new Date(),
          stopLoss: trade.stopLoss,
          takeProfit: trade.takeProfit,
          notes: `Created from trade ${trade.id}`,
        },
      });
    } catch (error) {
      this.logger.error(`Error creating position from trade ${trade.id}:`, error);
    }
  }

  private async updatePositionFromTrade(trade: any) {
    try {
      const profitLossPercent = trade.entryPrice && trade.profitLoss ? (trade.profitLoss / (trade.entryPrice * trade.quantity)) * 100 : 0;

      await prisma.position.updateMany({
        where: {
          botId: trade.botId,
          symbol: trade.symbol,
          status: "open",
          entryTime: trade.openedAt,
        },
        data: {
          status: "closed",
          exitPrice: trade.currentPrice,
          exitTime: trade.closedAt,
          pnl: trade.profitLoss,
          pnlPercent: profitLossPercent,
          notes: `Closed from trade ${trade.id} - ${trade.exitReason}`,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error updating position from trade ${trade.id}:`, error);
    }
  }

  private calculateProfitLoss(direction: "BUY" | "SELL", entryPrice: number, exitPrice: number, quantity: number, fees: number): number {
    let profitLoss = 0;

    if (direction === "BUY") {
      profitLoss = (exitPrice - entryPrice) * quantity;
    } else {
      profitLoss = (entryPrice - exitPrice) * quantity;
    }

    return profitLoss - fees;
  }

  private calculateRiskRewardRatio(trade: any, exitPrice: number): number {
    if (!trade.stopLoss || !trade.takeProfit || !trade.entryPrice) {
      return 0;
    }

    const risk = Math.abs(trade.entryPrice - trade.stopLoss);
    const reward = Math.abs(exitPrice - trade.entryPrice);

    return risk > 0 ? reward / risk : 0;
  }

  private async updateBotPerformanceCache(botId: string) {
    try {
      const trades = await prisma.trade.findMany({
        where: {
          botId,
          status: "CLOSED",
          profitLoss: { not: null },
        },
      });

      const totalTrades = trades.length;
      const winningTrades = trades.filter((t) => (t.profitLoss || 0) > 0).length;
      const totalPnL = trades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

      // Calculate max drawdown
      let maxDrawdown = 0;
      let peak = 0;
      let runningPnL = 0;

      for (const trade of trades.sort((a, b) => a.closedAt!.getTime() - b.closedAt!.getTime())) {
        runningPnL += trade.profitLoss || 0;
        if (runningPnL > peak) {
          peak = runningPnL;
        }
        const drawdown = peak - runningPnL;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }

      await prisma.bot.update({
        where: { id: botId },
        data: {
          totalPnL,
          totalTrades,
          winRate,
          maxDrawdown,
          lastPerformanceUpdate: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Error updating bot performance cache for ${botId}:`, error);
    }
  }

  private async updateDailyPnLSummary(botId: string, userId: string, profitLoss: number) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingSummary = await prisma.dailyPnLSummary.findFirst({
        where: {
          botId,
          date: today,
        },
      });

      if (existingSummary) {
        // Update existing summary
        await prisma.dailyPnLSummary.update({
          where: { id: existingSummary.id },
          data: {
            dailyPnL: existingSummary.dailyPnL + profitLoss,
            cumulativePnL: existingSummary.cumulativePnL + profitLoss,
            tradesClosed: existingSummary.tradesClosed + 1,
            winningTrades: profitLoss > 0 ? existingSummary.winningTrades + 1 : existingSummary.winningTrades,
            losingTrades: profitLoss <= 0 ? existingSummary.losingTrades + 1 : existingSummary.losingTrades,
            largestWin: Math.max(existingSummary.largestWin, profitLoss),
            largestLoss: Math.min(existingSummary.largestLoss, profitLoss),
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new summary
        const previousSummary = await prisma.dailyPnLSummary.findFirst({
          where: { botId },
          orderBy: { date: "desc" },
        });

        const cumulativePnL = (previousSummary?.cumulativePnL || 0) + profitLoss;

        await prisma.dailyPnLSummary.create({
          data: {
            botId,
            userId,
            date: today,
            dailyPnL: profitLoss,
            cumulativePnL,
            drawdown: Math.max(0, (previousSummary?.cumulativePnL || 0) - cumulativePnL),
            tradesOpened: 0, // This would be updated when trades are opened
            tradesClosed: 1,
            winningTrades: profitLoss > 0 ? 1 : 0,
            losingTrades: profitLoss <= 0 ? 1 : 0,
            largestWin: Math.max(0, profitLoss),
            largestLoss: Math.min(0, profitLoss),
            totalVolume: 0, // This would need to be calculated
            averageHoldTime: 0, // This would need to be calculated
            riskExposure: 0, // This would need to be calculated
          },
        });
      }
    } catch (error) {
      this.logger.error(`Error updating daily P&L summary for bot ${botId}:`, error);
    }
  }
}

export const tradePositionManagerService = new TradePositionManagerService();
