import { prisma } from "../utils/prisma";
import { loggerService } from "./logger.service";
import { EventEmitter } from "events";

export interface DailyPerformanceMetrics {
  botId: string;
  date: Date;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  realizedPnL: number;
  unrealizedPnL: number;
  commissions: number;
  netPnL: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  largestWin: number;
  largestLoss: number;
  averageTradeReturn: number;
  riskRewardRatio: number;
  sharpeRatio: number;
  volatility: number;
  activeTrades: number;
  accountBalance: number; // Estimated based on P&L
  equity: number; // Account balance + unrealized P&L
}

export interface BotPerformanceSummary {
  botId: string;
  botName: string;
  currentStreak: number; // Current winning/losing streak
  longestWinStreak: number;
  longestLossStreak: number;
  totalDays: number;
  profitableDays: number;
  profitableDaysPercent: number;
  bestDay: DailyPerformanceMetrics | null;
  worstDay: DailyPerformanceMetrics | null;
  monthlyPnL: number;
  weeklyPnL: number;
  ytdPnL: number;
  lastUpdated: Date;
}

export class DailyPerformanceService extends EventEmitter {
  private logger: typeof loggerService;

  constructor() {
    super();
    this.logger = loggerService;
  }

  /**
   * Calculate and store daily performance metrics for all active bots
   */
  async calculateDailyPerformance(date?: Date): Promise<void> {
    try {
      const targetDate = date || new Date();
      targetDate.setHours(0, 0, 0, 0); // Start of day

      this.logger.info(`Calculating daily performance for date: ${targetDate.toISOString()}`);

      // Get all active bots
      const bots = await prisma.bot.findMany({
        where: { isActive: true },
        include: { strategy: true },
      });

      this.logger.info(`Processing daily performance for ${bots.length} active bots`);

      for (const bot of bots) {
        try {
          await this.calculateBotDailyPerformance(bot.id, targetDate);
        } catch (error) {
          this.logger.error(`Error calculating daily performance for bot ${bot.id}:`, error);
        }
      }

      this.emit("dailyPerformanceCalculated", targetDate);
    } catch (error) {
      this.logger.error("Error calculating daily performance:", error);
      throw error;
    }
  }

  /**
   * Calculate daily performance for a specific bot
   */
  async calculateBotDailyPerformance(botId: string, date: Date = new Date()): Promise<any> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      this.logger.info(`Calculating daily performance for bot ${botId} on ${startOfDay.toISOString().split("T")[0]}`);

      // Get all trades for this bot on this day
      const tradesForDay = await prisma.trade.findMany({
        where: {
          botId,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      this.logger.info(`Found ${tradesForDay.length} trades for bot ${botId} on ${startOfDay.toISOString().split("T")[0]}`);

      // Get trades closed on this date (regardless of when they were opened)
      const closedTrades = await prisma.trade.findMany({
        where: {
          botId: botId,
          status: "CLOSED",
          closedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      // Get currently open trades for unrealized P&L
      const openTrades = await prisma.trade.findMany({
        where: {
          botId: botId,
          status: "OPEN",
        },
      });

      // Calculate metrics
      const totalTrades = tradesForDay.length;
      const closedTradesWithPnL = closedTrades.filter((trade) => trade.profitLoss !== null);
      const winningTrades = closedTradesWithPnL.filter((trade) => (trade.profitLoss || 0) > 0);
      const losingTrades = closedTradesWithPnL.filter((trade) => (trade.profitLoss || 0) < 0);

      const winRate = closedTradesWithPnL.length > 0 ? (winningTrades.length / closedTradesWithPnL.length) * 100 : 0;

      // P&L calculations
      const realizedPnL = closedTradesWithPnL.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);
      const unrealizedPnL = openTrades.reduce((sum, trade) => {
        // Calculate current unrealized P&L based on current price vs entry price
        if (trade.currentPrice && trade.entryPrice) {
          const priceDiff = trade.direction === "BUY" ? trade.currentPrice - trade.entryPrice : trade.entryPrice - trade.currentPrice;
          return sum + priceDiff * trade.quantity;
        }
        return sum;
      }, 0);

      const commissions = tradesForDay.reduce((sum, trade) => sum + (trade.fees || 0), 0);
      const totalPnL = realizedPnL + unrealizedPnL;
      const netPnL = totalPnL - commissions;

      // Win/Loss statistics
      const averageWin = winningTrades.length > 0 ? winningTrades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0) / winningTrades.length : 0;
      const averageLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0) / losingTrades.length) : 0;

      const profitFactor = averageLoss > 0 ? averageWin / averageLoss : averageWin > 0 ? Infinity : 0;

      const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map((trade) => trade.profitLoss || 0)) : 0;
      const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map((trade) => trade.profitLoss || 0)) : 0;

      const averageTradeReturn = closedTradesWithPnL.length > 0 ? realizedPnL / closedTradesWithPnL.length : 0;

      // Calculate drawdown (simplified version)
      const { maxDrawdown, maxDrawdownPercent } = await this.calculateMaxDrawdown(botId, date);

      // Risk metrics
      const riskRewardRatio = averageLoss > 0 ? averageWin / averageLoss : 0;
      const returns = closedTradesWithPnL.map((trade) => {
        const entryValue = (trade.entryPrice || 0) * trade.quantity;
        return entryValue > 0 ? ((trade.profitLoss || 0) / entryValue) * 100 : 0;
      });
      const sharpeRatio = this.calculateSharpeRatio(returns);
      const volatility = this.calculateVolatility(returns);

      // Account balance estimation (this would be better if we had actual account balance tracking)
      const estimatedAccountBalance = 10000; // Base amount - in production this should be tracked properly

      const metrics: DailyPerformanceMetrics = {
        botId,
        date: startOfDay,
        totalTrades,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winRate,
        totalPnL,
        realizedPnL,
        unrealizedPnL,
        commissions,
        netPnL,
        averageWin,
        averageLoss,
        profitFactor,
        maxDrawdown,
        maxDrawdownPercent,
        largestWin,
        largestLoss,
        averageTradeReturn,
        riskRewardRatio,
        sharpeRatio,
        volatility,
        activeTrades: openTrades.length,
        accountBalance: estimatedAccountBalance + netPnL,
        equity: estimatedAccountBalance + totalPnL,
      };

      // Store the metrics in database (you might want to create a daily_performance table)
      await this.storeDailyPerformance(metrics);

      // Also store in performance metrics history for long-term tracking
      await this.storePerformanceHistory(metrics);

      this.logger.info(`Daily performance calculated for bot ${botId}: P&L ${totalPnL.toFixed(2)}, Win Rate ${winRate.toFixed(1)}%`);

      return metrics;
    } catch (error) {
      this.logger.error(`Error calculating bot daily performance for ${botId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate maximum drawdown for a bot up to a specific date
   */
  private async calculateMaxDrawdown(botId: string, upToDate: Date): Promise<{ maxDrawdown: number; maxDrawdownPercent: number }> {
    try {
      // Get all closed trades up to this date, ordered by close date
      const trades = await prisma.trade.findMany({
        where: {
          botId: botId,
          status: "CLOSED",
          closedAt: { lte: upToDate },
        },
        orderBy: { closedAt: "asc" },
      });

      let runningBalance = 0;
      let peak = 0;
      let maxDrawdown = 0;
      let maxDrawdownPercent = 0;

      for (const trade of trades) {
        runningBalance += trade.profitLoss || 0;

        if (runningBalance > peak) {
          peak = runningBalance;
        }

        const drawdown = peak - runningBalance;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
          maxDrawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;
        }
      }

      return { maxDrawdown, maxDrawdownPercent };
    } catch (error) {
      this.logger.error(`Error calculating max drawdown for bot ${botId}:`, error);
      return { maxDrawdown: 0, maxDrawdownPercent: 0 };
    }
  }

  /**
   * Calculate Sharpe ratio from returns array
   */
  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const standardDeviation = Math.sqrt(variance);

    // Assume risk-free rate of 2% annually = 0.0055% daily
    const riskFreeRate = 0.0055;

    return standardDeviation > 0 ? (avgReturn - riskFreeRate) / standardDeviation : 0;
  }

  /**
   * Calculate volatility from returns array
   */
  private calculateVolatility(returns: number[]): number {
    if (returns.length === 0) return 0;

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;

    return Math.sqrt(variance);
  }

  /**
   * Store daily performance metrics
   */
  private async storeDailyPerformance(metrics: DailyPerformanceMetrics): Promise<void> {
    try {
      // Get the bot to get the userId
      const bot = await prisma.bot.findUnique({
        where: { id: metrics.botId },
        select: { userId: true },
      });

      if (!bot) {
        this.logger.error(`Bot not found for performance storage: ${metrics.botId}`);
        return;
      }

      // Store in the DailyPnLSummary table as per schema
      await prisma.dailyPnLSummary.upsert({
        where: {
          botId_date: {
            botId: metrics.botId,
            date: metrics.date,
          },
        },
        update: {
          dailyPnL: metrics.realizedPnL,
          cumulativePnL: metrics.totalPnL,
          drawdown: metrics.maxDrawdown,
          tradesOpened: metrics.totalTrades,
          tradesClosed: metrics.winningTrades + metrics.losingTrades,
          winningTrades: metrics.winningTrades,
          losingTrades: metrics.losingTrades,
          largestWin: metrics.largestWin,
          largestLoss: Math.abs(metrics.largestLoss),
          totalVolume: metrics.totalTrades * 1000, // Estimate - would need actual volume tracking
          averageHoldTime: 24, // Estimate - would need actual hold time tracking
          riskExposure: metrics.activeTrades * 0.02, // Estimate based on 2% risk per trade
          updatedAt: new Date(),
        },
        create: {
          botId: metrics.botId,
          userId: bot.userId,
          date: metrics.date,
          dailyPnL: metrics.realizedPnL,
          cumulativePnL: metrics.totalPnL,
          drawdown: metrics.maxDrawdown,
          tradesOpened: metrics.totalTrades,
          tradesClosed: metrics.winningTrades + metrics.losingTrades,
          winningTrades: metrics.winningTrades,
          losingTrades: metrics.losingTrades,
          largestWin: metrics.largestWin,
          largestLoss: Math.abs(metrics.largestLoss),
          totalVolume: metrics.totalTrades * 1000, // Estimate - would need actual volume tracking
          averageHoldTime: 24, // Estimate - would need actual hold time tracking
          riskExposure: metrics.activeTrades * 0.02, // Estimate based on 2% risk per trade
        },
      });

      this.logger.info(
        `Stored daily performance in DailyPnLSummary for bot ${metrics.botId}: P&L=${metrics.realizedPnL.toFixed(2)}, Trades=${
          metrics.totalTrades
        }, Win Rate=${metrics.winRate.toFixed(1)}%`
      );

      // Also update the bot's performance optimization field for quick access
      await prisma.bot.update({
        where: { id: metrics.botId },
        data: {
          perfOptimization: {
            ...(((await prisma.bot.findUnique({ where: { id: metrics.botId } }))?.perfOptimization as any) || {}),
            dailyPerformance: {
              date: metrics.date.toISOString(),
              totalPnL: metrics.totalPnL,
              winRate: metrics.winRate,
              profitFactor: metrics.profitFactor,
              maxDrawdown: metrics.maxDrawdown,
              sharpeRatio: metrics.sharpeRatio,
              activeTrades: metrics.activeTrades,
              lastUpdated: new Date().toISOString(),
            },
          },
        },
      });

      this.logger.debug(`Updated bot performance optimization field for bot ${metrics.botId}`);
    } catch (error) {
      this.logger.error(`Error storing daily performance for bot ${metrics.botId}:`, error);
    }
  }

  /**
   * Store performance metrics history
   */
  private async storePerformanceHistory(metrics: DailyPerformanceMetrics): Promise<void> {
    try {
      // Store performance in bot cache for quick access
      await prisma.bot.update({
        where: { id: metrics.botId },
        data: {
          totalPnL: metrics.totalPnL,
          totalTrades: metrics.totalTrades,
          winRate: metrics.winRate,
          maxDrawdown: metrics.maxDrawdown,
          lastPerformanceUpdate: new Date(),
        },
      });

      this.logger.info(
        `Stored performance metrics history for bot ${metrics.botId}: P&L=${metrics.totalPnL.toFixed(2)}, Trades=${metrics.totalTrades}, Win Rate=${metrics.winRate.toFixed(1)}%`
      );
    } catch (error) {
      this.logger.error(`Error storing performance metrics history for bot ${metrics.botId}:`, error);
    }
  }

  /**
   * Get performance summary for a bot
   */
  async getBotPerformanceSummary(botId: string): Promise<BotPerformanceSummary | null> {
    try {
      const bot = await prisma.bot.findUnique({
        where: { id: botId },
        include: { strategy: true },
      });

      if (!bot) return null;

      // Calculate current streak
      const recentTrades = await prisma.trade.findMany({
        where: {
          botId: botId,
          status: "CLOSED",
          profitLoss: { not: null },
        },
        orderBy: { closedAt: "desc" },
        take: 50,
      });

      const currentStreak = this.calculateCurrentStreak(recentTrades);
      const { longestWinStreak, longestLossStreak } = this.calculateLongestStreaks(recentTrades);

      // Calculate time-based P&L
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const yearStart = new Date(now.getFullYear(), 0, 1);

      const weeklyPnL = await this.calculatePnLForPeriod(botId, weekAgo, now);
      const monthlyPnL = await this.calculatePnLForPeriod(botId, monthAgo, now);
      const ytdPnL = await this.calculatePnLForPeriod(botId, yearStart, now);

      return {
        botId,
        botName: bot.name,
        currentStreak,
        longestWinStreak,
        longestLossStreak,
        totalDays: 0, // Would calculate from performance history
        profitableDays: 0, // Would calculate from performance history
        profitableDaysPercent: 0,
        bestDay: null, // Would get from performance history
        worstDay: null, // Would get from performance history
        weeklyPnL,
        monthlyPnL,
        ytdPnL,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error getting performance summary for bot ${botId}:`, error);
      return null;
    }
  }

  /**
   * Calculate P&L for a specific period
   */
  private async calculatePnLForPeriod(botId: string, startDate: Date, endDate: Date): Promise<number> {
    const trades = await prisma.trade.findMany({
      where: {
        botId: botId,
        status: "CLOSED",
        closedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return trades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);
  }

  /**
   * Calculate current winning/losing streak
   */
  private calculateCurrentStreak(trades: any[]): number {
    if (trades.length === 0) return 0;

    let streak = 0;
    const isWinning = (trades[0].profitLoss || 0) > 0;

    for (const trade of trades) {
      const tradeIsWinning = (trade.profitLoss || 0) > 0;
      if (tradeIsWinning === isWinning) {
        streak++;
      } else {
        break;
      }
    }

    return isWinning ? streak : -streak;
  }

  /**
   * Calculate longest winning and losing streaks
   */
  private calculateLongestStreaks(trades: any[]): { longestWinStreak: number; longestLossStreak: number } {
    let longestWinStreak = 0;
    let longestLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;

    for (const trade of trades.reverse()) {
      const isWinning = (trade.profitLoss || 0) > 0;

      if (isWinning) {
        currentWinStreak++;
        currentLossStreak = 0;
        longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
      }
    }

    return { longestWinStreak, longestLossStreak };
  }

  /**
   * Initialize daily performance tracking - run this at startup
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info("Initializing daily performance service");

      // Calculate today's performance if not already done
      const today = new Date();
      await this.calculateDailyPerformance(today);

      this.logger.info("Daily performance service initialized");
    } catch (error) {
      this.logger.error("Error initializing daily performance service:", error);
    }
  }

  /**
   * Get performance metrics for a bot
   */
  async getPerformanceMetrics(botId: string, days: number = 30): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      // Get daily P&L summaries
      const dailyPerformance = await prisma.dailyPnLSummary.findMany({
        where: {
          botId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          date: "desc",
        },
      });

      // Get performance history from bot's cached performance data instead of the deleted table
      const bot = await prisma.bot.findUnique({
        where: { id: botId },
        select: {
          totalPnL: true,
          winRate: true,
          maxDrawdown: true,
          totalTrades: true,
          createdAt: true,
          lastPerformanceUpdate: true,
        },
      });

      if (!bot) {
        throw new Error(`Bot ${botId} not found`);
      }

      // Create historical data points from current cached metrics
      // Since we don't have historical table anymore, we'll return current state
      const performanceHistory = [
        {
          date: bot.lastPerformanceUpdate || bot.createdAt,
          totalPnL: bot.totalPnL || 0,
          winRate: bot.winRate || 0,
          maxDrawdown: bot.maxDrawdown || 0,
          sharpeRatio: 0, // Calculate from trade data if needed
          totalTrades: bot.totalTrades || 0,
        },
      ];

      // Get current open trades
      const openTrades = await prisma.trade.findMany({
        where: {
          botId,
          status: "OPEN",
        },
      });

      // Calculate summary metrics
      const totalDailyPnL = dailyPerformance.reduce((sum, day) => sum + day.dailyPnL, 0);
      const totalTrades = dailyPerformance.reduce((sum, day) => sum + day.tradesOpened, 0);
      const winningDays = dailyPerformance.filter((day) => day.dailyPnL > 0).length;
      const profitableDaysPercent = dailyPerformance.length > 0 ? (winningDays / dailyPerformance.length) * 100 : 0;

      this.logger.info(`Retrieved performance metrics for bot ${botId}: ${days} days, Total P&L: ${totalDailyPnL.toFixed(2)}`);

      return {
        botId,
        period: `${days} days`,
        summary: {
          totalPnL: totalDailyPnL,
          totalTrades,
          profitableDays: winningDays,
          profitableDaysPercent,
          currentOpenTrades: openTrades.length,
        },
        dailyPerformance,
        performanceHistory,
        openTrades: openTrades.map((trade) => ({
          id: trade.id,
          symbol: trade.symbol,
          direction: trade.direction,
          quantity: trade.quantity,
          entryPrice: trade.entryPrice,
          currentPrice: trade.currentPrice,
          unrealizedPnL:
            trade.currentPrice && trade.entryPrice
              ? (trade.direction === "BUY" ? trade.currentPrice - trade.entryPrice : trade.entryPrice - trade.currentPrice) * trade.quantity
              : 0,
          openedAt: trade.openedAt,
        })),
      };
    } catch (error) {
      this.logger.error(`Error getting performance metrics for bot ${botId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const dailyPerformanceService = new DailyPerformanceService();
