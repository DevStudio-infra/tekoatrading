import { PrismaClient } from "@prisma/client";
import { loggerService } from "./logger.service";

const prisma = new PrismaClient();

export interface TradeMetrics {
  tradeId: string;
  symbol: string;
  direction: "BUY" | "SELL";
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  status: "PENDING" | "OPEN" | "CLOSED" | "CANCELLED";
  profitLoss?: number;
  profitLossPercent?: number;
  tradeDurationMinutes?: number;
  maxProfit?: number;
  maxLoss?: number;
  exitReason?: string;
  riskRewardRatio?: number;
  openedAt?: Date;
  closedAt?: Date;
}

export interface PerformanceSnapshot {
  botId: string;
  snapshotDate: Date;
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winRate: number;
  totalPnL: number;
  maxDrawdown: number;
  sharpeRatio?: number;
  avgTradeDuration: number; // in minutes
  bestTrade: number;
  worstTrade: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

export class EnhancedTradeManagementService {
  /**
   * Get comprehensive trade metrics for a specific trade
   */
  async getTradeMetrics(tradeId: string): Promise<TradeMetrics | null> {
    try {
      const trade = await prisma.trade.findUnique({
        where: { id: tradeId },
        include: {
          bot: true,
          user: true,
        },
      });

      if (!trade) {
        return null;
      }

      // Calculate additional metrics
      const tradeDurationMinutes = trade.openedAt && trade.closedAt ? Math.floor((trade.closedAt.getTime() - trade.openedAt.getTime()) / (1000 * 60)) : undefined;

      const riskRewardRatio =
        trade.stopLoss && trade.takeProfit && trade.entryPrice ? this.calculateRiskRewardRatio(trade.entryPrice, trade.stopLoss, trade.takeProfit, trade.direction) : undefined;

      return {
        tradeId: trade.id,
        symbol: trade.symbol,
        direction: trade.direction as "BUY" | "SELL",
        entryPrice: trade.entryPrice || 0,
        exitPrice: trade.currentPrice || undefined,
        quantity: trade.quantity,
        status: trade.status as "PENDING" | "OPEN" | "CLOSED" | "CANCELLED",
        profitLoss: trade.profitLoss || undefined,
        profitLossPercent: trade.profitLossPercent || undefined,
        tradeDurationMinutes,
        riskRewardRatio,
        openedAt: trade.openedAt || undefined,
        closedAt: trade.closedAt || undefined,
      };
    } catch (error) {
      loggerService.error("Error getting trade metrics:", (error as Error).message);
      return null;
    }
  }

  /**
   * Update trade with enhanced tracking
   */
  async updateTradeWithTracking(tradeId: string, updates: Partial<TradeMetrics>, exitReason?: string): Promise<boolean> {
    try {
      const currentTrade = await prisma.trade.findUnique({
        where: { id: tradeId },
      });

      if (!currentTrade) {
        loggerService.error(`Trade ${tradeId} not found for update`);
        return false;
      }

      // Calculate duration if closing
      let tradeDurationMinutes: number | undefined;
      if (updates.status === "CLOSED" && currentTrade.openedAt) {
        tradeDurationMinutes = Math.floor((Date.now() - currentTrade.openedAt.getTime()) / (1000 * 60));
      }

      // Calculate risk-reward ratio
      let riskRewardRatio: number | undefined;
      if (currentTrade.entryPrice && currentTrade.stopLoss && currentTrade.takeProfit) {
        riskRewardRatio = this.calculateRiskRewardRatio(currentTrade.entryPrice, currentTrade.stopLoss, currentTrade.takeProfit, currentTrade.direction);
      }

      await prisma.trade.update({
        where: { id: tradeId },
        data: {
          ...updates,
          tradeDurationMinutes,
          riskRewardRatio,
          closedAt: updates.status === "CLOSED" ? new Date() : currentTrade.closedAt,
          updatedAt: new Date(),
        },
      });

      // Update bot performance cache if trade is closed
      if (updates.status === "CLOSED") {
        await this.updateBotPerformanceCache(currentTrade.botId);
      }

      loggerService.info(`Trade ${tradeId} updated successfully`, {
        status: updates.status,
        pnl: updates.profitLoss,
        duration: tradeDurationMinutes,
        exitReason,
      });

      return true;
    } catch (error) {
      loggerService.error("Error updating trade with tracking:", (error as Error).message);
      return false;
    }
  }

  /**
   * Get comprehensive performance snapshot for a bot
   */
  async getPerformanceSnapshot(botId: string): Promise<PerformanceSnapshot | null> {
    try {
      const trades = await prisma.trade.findMany({
        where: { botId },
        orderBy: { createdAt: "desc" },
      });

      if (trades.length === 0) {
        return null;
      }

      const openTrades = trades.filter((t) => t.status === "OPEN");
      const closedTrades = trades.filter((t) => t.status === "CLOSED" && t.profitLoss !== null);
      const winningTrades = closedTrades.filter((t) => (t.profitLoss || 0) > 0);

      const totalPnL = closedTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
      const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

      // Calculate average trade duration
      const tradesWithDuration = closedTrades.filter((t) => t.tradeDurationMinutes);
      const avgTradeDuration = tradesWithDuration.length > 0 ? tradesWithDuration.reduce((sum, t) => sum + (t.tradeDurationMinutes || 0), 0) / tradesWithDuration.length : 0;

      // Find best and worst trades
      const bestTrade = closedTrades.length > 0 ? Math.max(...closedTrades.map((t) => t.profitLoss || 0)) : 0;
      const worstTrade = closedTrades.length > 0 ? Math.min(...closedTrades.map((t) => t.profitLoss || 0)) : 0;

      // Calculate consecutive wins/losses
      const { consecutiveWins, consecutiveLosses } = this.calculateConsecutiveWinsLosses(closedTrades);

      // Calculate max drawdown
      const maxDrawdown = this.calculateMaxDrawdown(closedTrades);

      return {
        botId,
        snapshotDate: new Date(),
        totalTrades: trades.length,
        openTrades: openTrades.length,
        closedTrades: closedTrades.length,
        winRate,
        totalPnL,
        maxDrawdown,
        avgTradeDuration,
        bestTrade,
        worstTrade,
        consecutiveWins,
        consecutiveLosses,
      };
    } catch (error) {
      loggerService.error("Error getting performance snapshot:", (error as Error).message);
      return null;
    }
  }

  /**
   * Store daily performance snapshot
   */
  async storeDailyPerformanceSnapshot(botId: string): Promise<boolean> {
    try {
      const snapshot = await this.getPerformanceSnapshot(botId);
      if (!snapshot) {
        return false;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if snapshot already exists for today
      const existingSnapshot = await prisma.dailyPnLSummary.findFirst({
        where: {
          botId,
          date: today,
        },
      });

      const snapshotData = {
        botId,
        userId: (await prisma.bot.findUnique({ where: { id: botId } }))?.userId || "",
        date: today,
        dailyPnL: snapshot.totalPnL,
        cumulativePnL: snapshot.totalPnL,
        drawdown: snapshot.maxDrawdown,
        tradesOpened: snapshot.openTrades,
        tradesClosed: snapshot.closedTrades,
        winningTrades: Math.floor(snapshot.closedTrades * (snapshot.winRate / 100)),
        losingTrades: snapshot.closedTrades - Math.floor(snapshot.closedTrades * (snapshot.winRate / 100)),
        largestWin: snapshot.bestTrade,
        largestLoss: Math.abs(snapshot.worstTrade),
        totalVolume: 0, // Would need to calculate from trade quantities
        averageHoldTime: snapshot.avgTradeDuration / 60, // Convert to hours
        riskExposure: 0, // Would need account balance to calculate
      };

      if (existingSnapshot) {
        await prisma.dailyPnLSummary.update({
          where: { id: existingSnapshot.id },
          data: snapshotData,
        });
      } else {
        await prisma.dailyPnLSummary.create({
          data: snapshotData,
        });
      }

      loggerService.info(`Daily performance snapshot stored for bot ${botId}`);
      return true;
    } catch (error) {
      loggerService.error("Error storing daily performance snapshot:", (error as Error).message);
      return false;
    }
  }

  /**
   * Get trade analytics for UI display
   */
  async getTradeAnalytics(botId: string, timeframe: "24h" | "7d" | "30d" | "all" = "all") {
    try {
      let dateFilter: Date | undefined;
      const now = new Date();

      switch (timeframe) {
        case "24h":
          dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const trades = await prisma.trade.findMany({
        where: {
          botId,
          ...(dateFilter && { createdAt: { gte: dateFilter } }),
        },
        orderBy: { createdAt: "desc" },
      });

      const analytics = {
        totalTrades: trades.length,
        openTrades: trades.filter((t) => t.status === "OPEN").length,
        closedTrades: trades.filter((t) => t.status === "CLOSED").length,
        pendingTrades: trades.filter((t) => t.status === "PENDING").length,
        cancelledTrades: trades.filter((t) => t.status === "CANCELLED").length,

        // Performance metrics
        totalPnL: trades.reduce((sum, t) => sum + (t.profitLoss || 0), 0),
        winRate: this.calculateWinRate(trades),
        avgTradeDuration: this.calculateAvgTradeDuration(trades),

        // Risk metrics
        maxDrawdown: this.calculateMaxDrawdown(trades),
        avgRiskReward: this.calculateAvgRiskReward(trades),

        // Recent activity
        recentTrades: trades.slice(0, 10).map((t) => ({
          id: t.id,
          symbol: t.symbol,
          direction: t.direction,
          status: t.status,
          pnl: t.profitLoss,
          openedAt: t.openedAt,
          closedAt: t.closedAt,
        })),
      };

      return analytics;
    } catch (error) {
      loggerService.error("Error getting trade analytics:", (error as Error).message);
      return null;
    }
  }

  // Private helper methods
  private calculateRiskRewardRatio(entryPrice: number, stopLoss: number, takeProfit: number, direction: string): number {
    if (direction === "BUY") {
      const risk = entryPrice - stopLoss;
      const reward = takeProfit - entryPrice;
      return risk > 0 ? reward / risk : 0;
    } else {
      const risk = stopLoss - entryPrice;
      const reward = entryPrice - takeProfit;
      return risk > 0 ? reward / risk : 0;
    }
  }

  private calculateConsecutiveWinsLosses(trades: any[]): { consecutiveWins: number; consecutiveLosses: number } {
    let consecutiveWins = 0;
    let consecutiveLosses = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    for (const trade of trades.reverse()) {
      if ((trade.profitLoss || 0) > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        consecutiveWins = Math.max(consecutiveWins, currentWinStreak);
      } else if ((trade.profitLoss || 0) < 0) {
        currentLossStreak++;
        currentWinStreak = 0;
        consecutiveLosses = Math.max(consecutiveLosses, currentLossStreak);
      }
    }

    return { consecutiveWins, consecutiveLosses };
  }

  private calculateMaxDrawdown(trades: any[]): number {
    let maxDrawdown = 0;
    let peak = 0;
    let cumulativePnL = 0;

    for (const trade of trades) {
      cumulativePnL += trade.profitLoss || 0;
      if (cumulativePnL > peak) {
        peak = cumulativePnL;
      }
      const drawdown = peak - cumulativePnL;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  private calculateWinRate(trades: any[]): number {
    const closedTrades = trades.filter((t) => t.status === "CLOSED" && t.profitLoss !== null);
    if (closedTrades.length === 0) return 0;

    const winningTrades = closedTrades.filter((t) => (t.profitLoss || 0) > 0);
    return (winningTrades.length / closedTrades.length) * 100;
  }

  private calculateAvgTradeDuration(trades: any[]): number {
    const tradesWithDuration = trades.filter((t) => t.tradeDurationMinutes);
    if (tradesWithDuration.length === 0) return 0;

    return tradesWithDuration.reduce((sum, t) => sum + (t.tradeDurationMinutes || 0), 0) / tradesWithDuration.length;
  }

  private calculateAvgRiskReward(trades: any[]): number {
    const tradesWithRR = trades.filter((t) => t.riskRewardRatio);
    if (tradesWithRR.length === 0) return 0;

    return tradesWithRR.reduce((sum, t) => sum + (t.riskRewardRatio || 0), 0) / tradesWithRR.length;
  }

  private async updateBotPerformanceCache(botId: string): Promise<void> {
    try {
      const snapshot = await this.getPerformanceSnapshot(botId);
      if (!snapshot) return;

      await prisma.bot.update({
        where: { id: botId },
        data: {
          totalPnL: snapshot.totalPnL,
          totalTrades: snapshot.totalTrades,
          winRate: snapshot.winRate,
          maxDrawdown: snapshot.maxDrawdown,
          lastPerformanceUpdate: new Date(),
        },
      });
    } catch (error) {
      loggerService.error("Error updating bot performance cache:", (error as Error).message);
    }
  }
}

export const enhancedTradeManagementService = new EnhancedTradeManagementService();
