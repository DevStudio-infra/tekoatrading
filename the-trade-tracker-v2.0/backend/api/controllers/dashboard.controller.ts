import { Request, Response } from "express";
import { botService } from "../../services/bot.service";
import { dailyPerformanceService } from "../../services/daily-performance.service";
import { performanceMonitoringService } from "../../services/performance-monitoring.service";
import { evaluationService } from "../../services/evaluation.service";
import { strategyService } from "../../services/strategy.service";
import { loggerService } from "../../services/logger.service";
import { PrismaClient } from "@prisma/client";

// Create Prisma instance
const prisma = new PrismaClient();

export interface DashboardStats {
  totalPnL: number;
  totalTrades: number;
  winRate: number;
  activeStrategies: number;
  activeBots: number;
  recentEvaluations: number;
}

export interface PerformanceData {
  value: number;
  change: number;
  changePercent: number;
  isPositive: boolean;
  period: string;
}

export interface RecentActivity {
  id: string;
  type: "trade" | "evaluation" | "strategy" | "bot";
  title: string;
  description: string;
  timestamp: Date;
  status: "success" | "error" | "pending" | "warning";
  value?: number;
  symbol?: string;
}

export interface TradingMetrics {
  totalVolume: number;
  avgTradeSize: number;
  bestPerformer: string;
  worstPerformer: string;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface DashboardData {
  stats: DashboardStats;
  performance: PerformanceData;
  recentActivity: RecentActivity[];
  tradingMetrics: TradingMetrics;
  lastUpdated: Date;
}

/**
 * Helper function to get real user UUID (same logic as in other services)
 */
const getRealUserUuid = async (userId: string): Promise<string> => {
  if (process.env.NODE_ENV === "development") {
    // In development, try to find a user - any user will do for testing
    console.log("[DASHBOARD] [DEV] Looking up a valid user UUID from the database");
    const anyUser = await prisma.user.findFirst();

    if (!anyUser) {
      // If no users exist, create a temporary development user
      console.log("[DASHBOARD] [DEV] No users found, creating a temporary development user");
      const tempUser = await prisma.user.create({
        data: {
          clerkId: "dev-user-" + Date.now(),
          email: "dev@example.com",
        },
      });
      return tempUser.id;
    }

    console.log(`[DASHBOARD] [DEV] Using user with UUID: ${anyUser.id}`);
    return anyUser.id;
  } else {
    // In production, get the user by their numeric ID or convert from JWT
    const user = await prisma.user.findFirst({
      where: {
        clerkId: userId,
      },
    });

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    return user.id;
  }
};

/**
 * Get comprehensive dashboard data for a user
 */
export const getDashboardData = async (req: Request, res: Response): Promise<void> => {
  try {
    // User ID from auth middleware
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = String(req.user.userId);
    loggerService.info(`[DASHBOARD] Fetching dashboard data for user ${userId}`);

    // Convert numeric userId to real user UUID
    const realUserId = await getRealUserUuid(userId);
    loggerService.info(`[DASHBOARD] Using real user UUID: ${realUserId}`);

    // Get user's bots (service does its own UUID conversion)
    const userBots = await botService.getUserBots(userId);
    loggerService.info(`[DASHBOARD] Found ${userBots.length} total bots`);
    userBots.forEach((bot: any, index: number) => {
      loggerService.info(`[DASHBOARD] Bot ${index + 1}: ${bot.name} - Status: "${bot.status}" - isActive: ${bot.isActive}`);
    });

    // Check for both status field and isActive boolean
    const activeBots = userBots.filter((bot: any) => bot.status === "ACTIVE" || bot.isActive === true);
    loggerService.info(`[DASHBOARD] Active bots after filtering: ${activeBots.length}`);

    // Get user's strategies (service does its own UUID conversion)
    const userStrategies = await strategyService.getUserStrategies(userId);
    loggerService.info(`[DASHBOARD] Found ${userStrategies.length} total strategies`);
    userStrategies.forEach((strategy: any, index: number) => {
      loggerService.info(`[DASHBOARD] Strategy ${index + 1}: ${strategy.name || "Unnamed"} - Status: "${strategy.status}" - isActive: ${strategy.isActive}`);
    });

    const activeStrategies = userStrategies.filter((strategy: any) => strategy.status === "ACTIVE" || strategy.isActive === true);

    // Get all user trades (direct database call needs real UUID)
    const allTrades = await prisma.trade.findMany({
      where: { userId: realUserId },
      orderBy: { createdAt: "desc" },
      take: 1000, // Limit to recent trades for performance
    });

    const openTrades = allTrades.filter((trade: any) => trade.status === "OPEN");
    const closedTrades = allTrades.filter((trade: any) => trade.status === "CLOSED");

    // Calculate total P&L
    const totalPnL = allTrades.reduce((sum: number, trade: any) => sum + (trade.profitLoss || 0), 0);

    // Calculate win rate
    const winningTrades = closedTrades.filter((trade: any) => (trade.profitLoss || 0) > 0);
    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

    // Get recent evaluations - use available method
    let recentEvaluations: any[] = [];
    try {
      // Try to get evaluations for the user's bots
      const allEvaluations = await Promise.all(
        userBots.slice(0, 5).map(async (bot: any) => {
          try {
            return await botService.getBotEvaluations(bot.id, userId, 2);
          } catch (error) {
            loggerService.error(`Error getting evaluations for bot ${bot.id}:`, error);
            return [];
          }
        })
      );
      recentEvaluations = allEvaluations.flat().slice(0, 10);
    } catch (error) {
      loggerService.error("Error getting evaluations:", error);
      recentEvaluations = [];
    }

    // Calculate performance metrics
    const last30DaysTrades = allTrades.filter((trade: any) => {
      const tradeDate = new Date(trade.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return tradeDate >= thirtyDaysAgo;
    });

    const last30DaysPnL = last30DaysTrades.reduce((sum: number, trade: any) => sum + (trade.profitLoss || 0), 0);
    const previousPeriodTrades = allTrades.filter((trade: any) => {
      const tradeDate = new Date(trade.createdAt);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return tradeDate >= sixtyDaysAgo && tradeDate < thirtyDaysAgo;
    });

    const previousPeriodPnL = previousPeriodTrades.reduce((sum: number, trade: any) => sum + (trade.profitLoss || 0), 0);
    const changeAmount = last30DaysPnL - previousPeriodPnL;
    const changePercent = previousPeriodPnL !== 0 ? (changeAmount / Math.abs(previousPeriodPnL)) * 100 : 0;

    // Calculate trading metrics
    const totalVolume = allTrades.reduce((sum: number, trade: any) => {
      return sum + (trade.entryPrice || 0) * trade.quantity;
    }, 0);

    const avgTradeSize = allTrades.length > 0 ? totalVolume / allTrades.length : 0;

    // Find best and worst performing bots
    let bestPerformer = "N/A";
    let worstPerformer = "N/A";
    let bestPnL = -Infinity;
    let worstPnL = Infinity;

    for (const bot of userBots) {
      if (bot.totalPnL !== undefined) {
        if (bot.totalPnL > bestPnL) {
          bestPnL = bot.totalPnL;
          bestPerformer = bot.name;
        }
        if (bot.totalPnL < worstPnL) {
          worstPnL = bot.totalPnL;
          worstPerformer = bot.name;
        }
      }
    }

    // Calculate simplified Sharpe ratio and max drawdown
    const returns = closedTrades.map((trade: any) => {
      const entryValue = (trade.entryPrice || 0) * trade.quantity;
      return entryValue > 0 ? ((trade.profitLoss || 0) / entryValue) * 100 : 0;
    });

    const avgReturn = returns.length > 0 ? returns.reduce((sum: number, r: number) => sum + r, 0) / returns.length : 0;
    const variance = returns.length > 0 ? returns.reduce((sum: number, r: number) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    const losses = closedTrades.filter((trade: any) => (trade.profitLoss || 0) < 0).map((trade: any) => trade.profitLoss || 0);
    const maxDrawdown = losses.length > 0 ? Math.abs(Math.min(...losses)) : 0;

    // Generate recent activity
    const recentActivity: RecentActivity[] = [];

    // Add recent trades
    const recentTrades = allTrades.slice(0, 3);
    recentTrades.forEach((trade: any) => {
      recentActivity.push({
        id: trade.id,
        type: "trade",
        title: `${trade.symbol} Trade ${trade.status === "OPEN" ? "Opened" : "Executed"}`,
        description: `${trade.direction} position ${trade.status === "OPEN" ? "opened" : "closed"} at $${trade.entryPrice?.toFixed(2) || "N/A"}`,
        timestamp: trade.createdAt,
        status:
          trade.status === "CLOSED" && (trade.profitLoss || 0) > 0
            ? "success"
            : trade.status === "CLOSED" && (trade.profitLoss || 0) < 0
            ? "error"
            : trade.status === "OPEN"
            ? "pending"
            : "warning",
        value: trade.profitLoss || undefined,
        symbol: trade.symbol,
      });
    });

    // Add recent evaluations
    recentEvaluations.slice(0, 2).forEach((evaluation: any) => {
      let status: "success" | "error" | "pending" | "warning" = "success";
      let description = `${evaluation.botName || "Bot"} completed evaluation`;

      // Check if evaluation indicates risk management limitation
      if (evaluation.riskLimitReached) {
        status = "warning";
        description = `${evaluation.botName || "Bot"} evaluation completed - Trading limited by risk management`;
      } else if (evaluation.tradeExecuted === false && evaluation.tradeError) {
        status = "error";
        description = `${evaluation.botName || "Bot"} evaluation completed - Trade execution failed`;
      } else if (evaluation.overallScore !== undefined) {
        status = evaluation.overallScore >= 70 ? "success" : evaluation.overallScore >= 50 ? "warning" : "error";
      }

      recentActivity.push({
        id: evaluation.id.toString(),
        type: "evaluation",
        title: "Bot Performance Evaluation",
        description: description,
        timestamp: evaluation.createdAt,
        status: status,
      });
    });

    // Add recent bot/strategy activities
    const recentBots = userBots.slice(0, 1);
    recentBots.forEach((bot: any) => {
      recentActivity.push({
        id: bot.id,
        type: "bot",
        title: `${bot.name} Status Update`,
        description: `Bot is currently ${bot.status?.toLowerCase() || "unknown"}`,
        timestamp: bot.updatedAt,
        status: bot.status === "ACTIVE" ? "success" : "warning",
      });
    });

    // Sort activities by timestamp
    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Prepare response
    const dashboardData: DashboardData = {
      stats: {
        totalPnL: totalPnL,
        totalTrades: allTrades.length,
        winRate: winRate,
        activeStrategies: activeStrategies.length,
        activeBots: activeBots.length,
        recentEvaluations: recentEvaluations.length,
      },
      performance: {
        value: totalPnL,
        change: changeAmount,
        changePercent: Math.abs(changePercent),
        isPositive: changeAmount >= 0,
        period: "30d",
      },
      recentActivity: recentActivity.slice(0, 6), // Limit to 6 most recent
      tradingMetrics: {
        totalVolume: totalVolume,
        avgTradeSize: avgTradeSize,
        bestPerformer: bestPerformer,
        worstPerformer: worstPerformer,
        sharpeRatio: sharpeRatio,
        maxDrawdown: maxDrawdown,
      },
      lastUpdated: new Date(),
    };

    loggerService.info(`[DASHBOARD] Dashboard data compiled successfully for user ${userId} (UUID: ${realUserId})`);
    loggerService.info(`[DASHBOARD] Stats: P&L: $${totalPnL.toFixed(2)}, Trades: ${allTrades.length}, Win Rate: ${winRate.toFixed(1)}%`);
    loggerService.info(`[DASHBOARD] Bots: ${userBots.length} total, ${activeBots.length} active`);
    loggerService.info(`[DASHBOARD] Strategies: ${userStrategies.length} total, ${activeStrategies.length} active`);

    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error: any) {
    loggerService.error("Error fetching dashboard data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
      error: error.message,
    });
  }
};
