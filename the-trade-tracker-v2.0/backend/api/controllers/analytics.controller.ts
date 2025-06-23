import { Request, Response } from "express";
import { loggerService } from "../../services/logger.service";
import { PrismaClient } from "@prisma/client";

// Create Prisma instance
const prisma = new PrismaClient();

/**
 * Helper function to get real user UUID (same logic as dashboard controller)
 */
const getRealUserUuid = async (userId: string): Promise<string> => {
  if (process.env.NODE_ENV === "development") {
    console.log("[ANALYTICS] [DEV] Looking up a valid user UUID from the database");
    const anyUser = await prisma.user.findFirst();

    if (!anyUser) {
      console.log("[ANALYTICS] [DEV] No users found, creating a temporary development user");
      const tempUser = await prisma.user.create({
        data: {
          clerkId: "dev-user-" + Date.now(),
          email: "dev@example.com",
        },
      });
      return tempUser.id;
    }

    console.log(`[ANALYTICS] [DEV] Using user with UUID: ${anyUser.id}`);
    return anyUser.id;
  } else {
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
 * Get P&L history data for charts
 */
export const getPnLHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = String(req.user.userId);
    const realUserId = await getRealUserUuid(userId);

    // Parse query parameters
    const period = (req.query.period as string) || "30d";
    const groupBy = (req.query.groupBy as string) || "day";

    loggerService.info(`[ANALYTICS] Fetching P&L history for user ${userId} - Period: ${period}, GroupBy: ${groupBy}`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case "7d":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(endDate.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get trades within date range
    const trades = await prisma.trade.findMany({
      where: {
        userId: realUserId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        profitLoss: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    loggerService.info(`[ANALYTICS] Found ${trades.length} trades for P&L analysis`);

    // Group trades by date and calculate daily P&L
    const dailyPnL: { [key: string]: number } = {};
    const tradesByDate: { [key: string]: any[] } = {};

    trades.forEach((trade: any) => {
      const date = trade.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD format

      if (!dailyPnL[date]) {
        dailyPnL[date] = 0;
        tradesByDate[date] = [];
      }

      dailyPnL[date] += trade.profitLoss || 0;
      tradesByDate[date].push(trade);
    });

    // Create chart data with cumulative P&L
    const chartData: any[] = [];
    let cumulativePnL = 0;

    // Fill in missing dates with 0 P&L
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const dailyValue = dailyPnL[dateStr] || 0;
      cumulativePnL += dailyValue;

      chartData.push({
        date: dateStr,
        dailyPnL: Number(dailyValue.toFixed(2)),
        cumulativePnL: Number(cumulativePnL.toFixed(2)),
        tradesCount: tradesByDate[dateStr]?.length || 0,
        formattedDate: currentDate.toLocaleDateString(),
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate summary metrics
    const totalPnL = trades.reduce((sum: number, trade: any) => sum + (trade.profitLoss || 0), 0);
    const winningTrades = trades.filter((trade: any) => (trade.profitLoss || 0) > 0);
    const losingTrades = trades.filter((trade: any) => (trade.profitLoss || 0) < 0);

    const summary = {
      totalPnL: Number(totalPnL.toFixed(2)),
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: trades.length > 0 ? Number(((winningTrades.length / trades.length) * 100).toFixed(1)) : 0,
      avgWin: winningTrades.length > 0 ? Number((winningTrades.reduce((sum: number, trade: any) => sum + trade.profitLoss, 0) / winningTrades.length).toFixed(2)) : 0,
      avgLoss: losingTrades.length > 0 ? Number((losingTrades.reduce((sum: number, trade: any) => sum + trade.profitLoss, 0) / losingTrades.length).toFixed(2)) : 0,
      bestDay: chartData.length > 0 ? Math.max(...chartData.map((d) => d.dailyPnL)) : 0,
      worstDay: chartData.length > 0 ? Math.min(...chartData.map((d) => d.dailyPnL)) : 0,
    };

    loggerService.info(`[ANALYTICS] P&L Summary - Total: $${summary.totalPnL}, Trades: ${summary.totalTrades}, Win Rate: ${summary.winRate}%`);

    res.status(200).json({
      success: true,
      data: {
        chartData,
        summary,
        period,
        groupBy,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
    });
  } catch (error: any) {
    loggerService.error("Error fetching P&L history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch P&L history",
      error: error.message,
    });
  }
};

/**
 * Get trading performance metrics
 */
export const getPerformanceMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = String(req.user.userId);
    const realUserId = await getRealUserUuid(userId);
    const period = (req.query.period as string) || "30d";

    loggerService.info(`[ANALYTICS] Fetching performance metrics for user ${userId} - Period: ${period}`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case "7d":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get closed trades for the period
    const closedTrades = await prisma.trade.findMany({
      where: {
        userId: realUserId,
        status: "CLOSED",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        profitLoss: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (closedTrades.length === 0) {
      res.status(200).json({
        success: true,
        data: {
          sharpeRatio: 0,
          maxDrawdown: 0,
          calmarRatio: 0,
          profitFactor: 0,
          averageTradeDuration: 0,
          riskRewardRatio: 0,
          consecutiveWins: 0,
          consecutiveLosses: 0,
          period,
        },
      });
      return;
    }

    // Calculate returns for each trade
    const returns = closedTrades.map((trade: any) => {
      const entryValue = (trade.entryPrice || 0) * trade.quantity;
      return entryValue > 0 ? ((trade.profitLoss || 0) / entryValue) * 100 : 0;
    });

    // Calculate Sharpe Ratio
    const avgReturn = returns.reduce((sum: number, r: number) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum: number, r: number) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? Number((avgReturn / stdDev).toFixed(2)) : 0;

    // Calculate Max Drawdown
    let maxDrawdown = 0;
    let peak = 0;
    let cumulativePnL = 0;

    closedTrades.forEach((trade: any) => {
      cumulativePnL += trade.profitLoss || 0;
      if (cumulativePnL > peak) {
        peak = cumulativePnL;
      }
      const drawdown = ((peak - cumulativePnL) / (peak || 1)) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    // Calculate other metrics
    const totalPnL = closedTrades.reduce((sum: number, trade: any) => sum + (trade.profitLoss || 0), 0);
    const winningTrades = closedTrades.filter((trade: any) => (trade.profitLoss || 0) > 0);
    const losingTrades = closedTrades.filter((trade: any) => (trade.profitLoss || 0) < 0);

    const grossProfit = winningTrades.reduce((sum: number, trade: any) => sum + trade.profitLoss, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum: number, trade: any) => sum + trade.profitLoss, 0));
    const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : 0;

    // Calculate Calmar Ratio
    const annualizedReturn = totalPnL; // Simplified for demo
    const calmarRatio = maxDrawdown > 0 ? Number((annualizedReturn / maxDrawdown).toFixed(2)) : 0;

    // Calculate consecutive wins/losses
    let consecutiveWins = 0;
    let consecutiveLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;

    closedTrades.forEach((trade: any) => {
      if ((trade.profitLoss || 0) > 0) {
        currentWins++;
        currentLosses = 0;
        consecutiveWins = Math.max(consecutiveWins, currentWins);
      } else {
        currentLosses++;
        currentWins = 0;
        consecutiveLosses = Math.max(consecutiveLosses, currentLosses);
      }
    });

    const metrics = {
      sharpeRatio,
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      calmarRatio,
      profitFactor,
      averageTradeDuration: 0, // TODO: Calculate when we have trade duration data
      riskRewardRatio:
        winningTrades.length > 0 && losingTrades.length > 0 ? Number((Math.abs(grossProfit / winningTrades.length) / Math.abs(grossLoss / losingTrades.length)).toFixed(2)) : 0,
      consecutiveWins,
      consecutiveLosses,
      period,
      totalTrades: closedTrades.length,
      grossProfit: Number(grossProfit.toFixed(2)),
      grossLoss: Number(grossLoss.toFixed(2)),
    };

    loggerService.info(`[ANALYTICS] Performance metrics calculated - Sharpe: ${sharpeRatio}, Max DD: ${maxDrawdown.toFixed(2)}%`);

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    loggerService.error("Error fetching performance metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch performance metrics",
      error: error.message,
    });
  }
};

/**
 * Get win/loss distribution analysis
 */
export const getWinLossDistribution = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = String(req.user.userId);
    const realUserId = await getRealUserUuid(userId);

    loggerService.info(`[ANALYTICS] Fetching win/loss distribution for user ${userId}`);

    const closedTrades = await prisma.trade.findMany({
      where: {
        userId: realUserId,
        status: "CLOSED",
        profitLoss: {
          not: null,
        },
      },
    });

    // Group trades by outcome
    const distribution = {
      wins: closedTrades.filter((trade: any) => (trade.profitLoss || 0) > 0),
      losses: closedTrades.filter((trade: any) => (trade.profitLoss || 0) < 0),
      neutral: closedTrades.filter((trade: any) => (trade.profitLoss || 0) === 0),
    };

    // Calculate distribution stats
    const stats = {
      totalTrades: closedTrades.length,
      wins: {
        count: distribution.wins.length,
        percentage: closedTrades.length > 0 ? Number(((distribution.wins.length / closedTrades.length) * 100).toFixed(1)) : 0,
        avgPnL: distribution.wins.length > 0 ? Number((distribution.wins.reduce((sum: number, trade: any) => sum + trade.profitLoss, 0) / distribution.wins.length).toFixed(2)) : 0,
        totalPnL: Number(distribution.wins.reduce((sum: number, trade: any) => sum + (trade.profitLoss || 0), 0).toFixed(2)),
      },
      losses: {
        count: distribution.losses.length,
        percentage: closedTrades.length > 0 ? Number(((distribution.losses.length / closedTrades.length) * 100).toFixed(1)) : 0,
        avgPnL:
          distribution.losses.length > 0 ? Number((distribution.losses.reduce((sum: number, trade: any) => sum + trade.profitLoss, 0) / distribution.losses.length).toFixed(2)) : 0,
        totalPnL: Number(distribution.losses.reduce((sum: number, trade: any) => sum + (trade.profitLoss || 0), 0).toFixed(2)),
      },
      neutral: {
        count: distribution.neutral.length,
        percentage: closedTrades.length > 0 ? Number(((distribution.neutral.length / closedTrades.length) * 100).toFixed(1)) : 0,
      },
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    loggerService.error("Error fetching win/loss distribution:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch win/loss distribution",
      error: error.message,
    });
  }
};

/**
 * Get bot performance comparison
 */
export const getBotComparison = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = String(req.user.userId);
    const realUserId = await getRealUserUuid(userId);
    const period = (req.query.period as string) || "30d";

    loggerService.info(`[ANALYTICS] Fetching bot comparison for user ${userId} - Period: ${period}`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(endDate.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get all bots for the user with their trade performance
    const botsWithTrades = await prisma.bot.findMany({
      where: {
        userId: realUserId,
      },
      include: {
        trades: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
            profitLoss: {
              not: null,
            },
          },
        },
        strategy: true,
      },
    });

    loggerService.info(`[ANALYTICS] Found ${botsWithTrades.length} bots for comparison`);

    // Calculate performance metrics for each bot
    const botComparison = botsWithTrades.map((bot: any) => {
      const trades = bot.trades;
      const totalTrades = trades.length;
      const totalPnL = trades.reduce((sum: number, trade: any) => sum + (trade.profitLoss || 0), 0);
      const winningTrades = trades.filter((trade: any) => (trade.profitLoss || 0) > 0);
      const losingTrades = trades.filter((trade: any) => (trade.profitLoss || 0) < 0);
      const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
      const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum: number, trade: any) => sum + trade.profitLoss, 0) / winningTrades.length : 0;
      const avgLoss = losingTrades.length > 0 ? losingTrades.reduce((sum: number, trade: any) => sum + trade.profitLoss, 0) / losingTrades.length : 0;
      const profitFactor = Math.abs(avgLoss) > 0 ? Math.abs(avgWin / avgLoss) : 0;

      return {
        botId: bot.id,
        botName: bot.name,
        isActive: bot.isActive,
        strategyName: bot.strategy?.name || "Unknown",
        tradingPair: bot.tradingPair,
        totalTrades,
        totalPnL: Number(totalPnL.toFixed(2)),
        winRate: Number(winRate.toFixed(1)),
        avgWin: Number(avgWin.toFixed(2)),
        avgLoss: Number(avgLoss.toFixed(2)),
        profitFactor: Number(profitFactor.toFixed(2)),
        lastTradeDate: trades.length > 0 ? trades[trades.length - 1].createdAt : null,
      };
    });

    // Sort by total P&L descending
    botComparison.sort((a, b) => b.totalPnL - a.totalPnL);

    loggerService.info(`[ANALYTICS] Bot comparison calculated for ${botComparison.length} bots`);

    res.status(200).json({
      success: true,
      data: {
        bots: botComparison,
        period,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
    });
  } catch (error: any) {
    loggerService.error("Error fetching bot comparison:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bot comparison",
      error: error.message,
    });
  }
};

/**
 * Get strategy performance analysis
 */
export const getStrategyPerformance = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = String(req.user.userId);
    const realUserId = await getRealUserUuid(userId);
    const period = (req.query.period as string) || "30d";

    loggerService.info(`[ANALYTICS] Fetching strategy performance for user ${userId} - Period: ${period}`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(endDate.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get all strategies with their associated trades
    const strategiesWithTrades = await prisma.strategy.findMany({
      where: {
        userId: realUserId,
      },
      include: {
        bots: {
          include: {
            trades: {
              where: {
                createdAt: {
                  gte: startDate,
                  lte: endDate,
                },
                profitLoss: {
                  not: null,
                },
              },
            },
          },
        },
      },
    });

    loggerService.info(`[ANALYTICS] Found ${strategiesWithTrades.length} strategies for performance analysis`);

    // Calculate performance metrics for each strategy
    const strategyPerformance = strategiesWithTrades.map((strategy: any) => {
      // Flatten all trades from all bots using this strategy
      const allTrades = strategy.bots.flatMap((bot: any) => bot.trades);
      const totalTrades = allTrades.length;
      const totalPnL = allTrades.reduce((sum: number, trade: any) => sum + (trade.profitLoss || 0), 0);
      const winningTrades = allTrades.filter((trade: any) => (trade.profitLoss || 0) > 0);
      const losingTrades = allTrades.filter((trade: any) => (trade.profitLoss || 0) < 0);
      const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
      const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum: number, trade: any) => sum + trade.profitLoss, 0) / winningTrades.length : 0;
      const avgLoss = losingTrades.length > 0 ? losingTrades.reduce((sum: number, trade: any) => sum + trade.profitLoss, 0) / losingTrades.length : 0;
      const profitFactor = Math.abs(avgLoss) > 0 ? Math.abs(avgWin / avgLoss) : 0;

      // Calculate daily P&L for the strategy
      const dailyPnL: { [key: string]: number } = {};
      allTrades.forEach((trade: any) => {
        const date = trade.createdAt.toISOString().split("T")[0];
        if (!dailyPnL[date]) {
          dailyPnL[date] = 0;
        }
        dailyPnL[date] += trade.profitLoss || 0;
      });

      const activeBots = strategy.bots.filter((bot: any) => bot.isActive).length;

      return {
        strategyId: strategy.id,
        strategyName: strategy.name,
        strategyType: strategy.type,
        activeBots,
        totalBots: strategy.bots.length,
        totalTrades,
        totalPnL: Number(totalPnL.toFixed(2)),
        winRate: Number(winRate.toFixed(1)),
        avgWin: Number(avgWin.toFixed(2)),
        avgLoss: Number(avgLoss.toFixed(2)),
        profitFactor: Number(profitFactor.toFixed(2)),
        dailyPnL: Object.entries(dailyPnL).map(([date, pnl]) => ({
          date,
          pnl: Number(pnl.toFixed(2)),
        })),
        lastTradeDate: allTrades.length > 0 ? allTrades[allTrades.length - 1].createdAt : null,
      };
    });

    // Sort by total P&L descending
    strategyPerformance.sort((a, b) => b.totalPnL - a.totalPnL);

    loggerService.info(`[ANALYTICS] Strategy performance calculated for ${strategyPerformance.length} strategies`);

    res.status(200).json({
      success: true,
      data: {
        strategies: strategyPerformance,
        period,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
    });
  } catch (error: any) {
    loggerService.error("Error fetching strategy performance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch strategy performance",
      error: error.message,
    });
  }
};

/**
 * Get risk analysis data
 */
export const getRiskAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = String(req.user.userId);
    const realUserId = await getRealUserUuid(userId);
    const period = (req.query.period as string) || "30d";

    loggerService.info(`[ANALYTICS] Fetching risk analysis for user ${userId} - Period: ${period}`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(endDate.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get trades for risk analysis
    const trades = await prisma.trade.findMany({
      where: {
        userId: realUserId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        profitLoss: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    loggerService.info(`[ANALYTICS] Found ${trades.length} trades for risk analysis`);

    if (trades.length === 0) {
      res.status(200).json({
        success: true,
        data: {
          exposureBySymbol: [],
          riskMetrics: {
            totalExposure: 0,
            concentrationRisk: 0,
            volatility: 0,
            valueAtRisk: 0,
          },
          period,
        },
      });
      return;
    }

    // Calculate exposure by symbol
    const exposureBySymbol: { [key: string]: { trades: number; exposure: number; pnl: number } } = {};
    let totalExposure = 0;

    trades.forEach((trade: any) => {
      const symbol = trade.symbol;
      const exposure = Math.abs(trade.profitLoss || 0);
      totalExposure += exposure;

      if (!exposureBySymbol[symbol]) {
        exposureBySymbol[symbol] = { trades: 0, exposure: 0, pnl: 0 };
      }

      exposureBySymbol[symbol].trades += 1;
      exposureBySymbol[symbol].exposure += exposure;
      exposureBySymbol[symbol].pnl += trade.profitLoss || 0;
    });

    // Convert to array and calculate percentages
    const exposureData = Object.entries(exposureBySymbol).map(([symbol, data]) => ({
      symbol,
      trades: data.trades,
      exposure: Number(data.exposure.toFixed(2)),
      exposurePercentage: totalExposure > 0 ? Number(((data.exposure / totalExposure) * 100).toFixed(1)) : 0,
      pnl: Number(data.pnl.toFixed(2)),
    }));

    // Sort by exposure descending
    exposureData.sort((a, b) => b.exposure - a.exposure);

    // Calculate risk metrics
    const returns = trades.map((trade: any) => trade.profitLoss || 0);
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    // Calculate concentration risk (Herfindahl index)
    const concentrationRisk = exposureData.reduce((sum, item) => {
      const percentage = item.exposurePercentage / 100;
      return sum + Math.pow(percentage, 2);
    }, 0);

    // Value at Risk (95% confidence level, assuming normal distribution)
    const valueAtRisk = avgReturn - 1.645 * volatility;

    const riskMetrics = {
      totalExposure: Number(totalExposure.toFixed(2)),
      concentrationRisk: Number((concentrationRisk * 100).toFixed(1)), // Convert to percentage
      volatility: Number(volatility.toFixed(2)),
      valueAtRisk: Number(valueAtRisk.toFixed(2)),
    };

    loggerService.info(`[ANALYTICS] Risk analysis calculated - Total exposure: ${riskMetrics.totalExposure}, VaR: ${riskMetrics.valueAtRisk}`);

    res.status(200).json({
      success: true,
      data: {
        exposureBySymbol: exposureData,
        riskMetrics,
        period,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
    });
  } catch (error: any) {
    loggerService.error("Error fetching risk analysis:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch risk analysis",
      error: error.message,
    });
  }
};
