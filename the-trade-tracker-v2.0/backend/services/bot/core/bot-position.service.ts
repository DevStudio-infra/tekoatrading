import { prisma } from "../../../utils/prisma";
import { loggerService } from "../../logger.service";

export interface IBotPositionService {
  getCurrentPositions(botId: string, symbol?: string): Promise<any[]>;
  collectPortfolioContext(userId: string, botId?: string): Promise<any>;
  getDefaultPositionSize(symbol: string, price: number): number;
  calculateTimeframePositionSize(timeframe: string, basePositionSize: number, accountBalance: number, riskPercentage: number): number;
  getMaxDrawdownForTimeframe(timeframe: string): number;
  getLastTradeTime(botId: string, symbol: string): Promise<Date | null>;
  getTradeCountSince(botId: string, since: Date): Promise<number>;
}

export class BotPositionService implements IBotPositionService {
  constructor() {}

  /**
   * Get current positions for a bot
   */
  async getCurrentPositions(botId: string, symbol?: string): Promise<any[]> {
    try {
      const whereClause: any = {
        botId,
        status: "OPEN",
      };

      if (symbol) {
        whereClause.symbol = symbol;
      }

      const trades = await prisma.trade.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
          bot: {
            select: {
              name: true,
            },
          },
        },
      });

      return trades.map((trade: any) => ({
        id: trade.id,
        symbol: trade.symbol,
        direction: trade.direction,
        quantity: trade.quantity,
        entryPrice: trade.entryPrice,
        currentPrice: trade.currentPrice,
        unrealizedPnl: trade.profitLoss,
        stopLoss: trade.stopLoss,
        takeProfit: trade.takeProfit,
        createdAt: trade.createdAt,
        updatedAt: trade.updatedAt,
        bot: trade.bot,
      }));
    } catch (error) {
      loggerService.error(`Error fetching current positions: ${error}`);
      throw error;
    }
  }

  /**
   * Collect portfolio context for trading decisions
   */
  async collectPortfolioContext(userId: string, botId?: string): Promise<any> {
    try {
      const context: any = {
        totalPositions: 0,
        openPositions: [],
        totalUnrealizedPnl: 0,
        totalRealizedPnl: 0,
        activeSymbols: new Set(),
        riskExposure: 0,
        accountBalance: 0,
        availableMargin: 0,
        recentTrades: [],
        performanceMetrics: {},
      };

      // Get user's bots
      const botFilter: any = { userId };
      if (botId) {
        botFilter.id = botId;
      }

      const userBots = await prisma.bot.findMany({
        where: botFilter,
        select: {
          id: true,
          name: true,
          totalPnL: true,
          isActive: true,
        },
      });

      if (userBots.length === 0) {
        return context;
      }

      const botIds = userBots.map((bot: any) => bot.id);

      // Get open trades (positions)
      const openTrades = await prisma.trade.findMany({
        where: {
          botId: { in: botIds },
          status: "OPEN",
        },
        orderBy: { createdAt: "desc" },
        include: {
          bot: {
            select: {
              name: true,
            },
          },
        },
      });

      // Calculate portfolio metrics
      context.totalPositions = openTrades.length;
      context.openPositions = openTrades.map((trade: any) => ({
        id: trade.id,
        symbol: trade.symbol,
        direction: trade.direction,
        quantity: trade.quantity,
        entryPrice: trade.entryPrice,
        currentPrice: trade.currentPrice,
        unrealizedPnl: trade.profitLoss,
        botName: trade.bot?.name,
      }));

      context.totalUnrealizedPnl = openTrades.reduce((sum: number, trade: any) => sum + (trade.profitLoss || 0), 0);

      openTrades.forEach((trade: any) => {
        context.activeSymbols.add(trade.symbol);
        context.riskExposure += Math.abs(trade.quantity * (trade.currentPrice || trade.entryPrice));
      });

      // Convert Set to Array for JSON serialization
      context.activeSymbols = Array.from(context.activeSymbols);

      // For account balance, we'll use a default value since it's not in the Bot model
      // In a real implementation, this would come from the broker API
      context.accountBalance = 10000; // Default demo account balance

      context.totalRealizedPnl = userBots.reduce((sum: number, bot: any) => sum + (bot.totalPnL || 0), 0);

      // Get recent trades (last 10)
      const recentTrades = await prisma.trade.findMany({
        where: {
          botId: { in: botIds },
          status: { in: ["CLOSED"] },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: {
          bot: {
            select: {
              name: true,
            },
          },
        },
      });

      context.recentTrades = recentTrades.map((trade: any) => ({
        id: trade.id,
        symbol: trade.symbol,
        direction: trade.direction,
        quantity: trade.quantity,
        entryPrice: trade.entryPrice,
        exitPrice: trade.currentPrice, // For closed trades, currentPrice is the exit price
        pnl: trade.profitLoss,
        closedAt: trade.updatedAt,
        botName: trade.bot?.name,
      }));

      // Calculate performance metrics
      const totalTrades = await prisma.trade.count({
        where: {
          botId: { in: botIds },
          status: { in: ["CLOSED"] },
        },
      });

      const winningTrades = await prisma.trade.count({
        where: {
          botId: { in: botIds },
          status: { in: ["CLOSED"] },
          profitLoss: { gt: 0 },
        },
      });

      context.performanceMetrics = {
        totalTrades,
        winningTrades,
        losingTrades: totalTrades - winningTrades,
        winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
        totalRealizedPnl: context.totalRealizedPnl,
        totalUnrealizedPnl: context.totalUnrealizedPnl,
        netPnl: context.totalRealizedPnl + context.totalUnrealizedPnl,
      };

      // Calculate available margin (simplified)
      context.availableMargin = context.accountBalance - context.riskExposure * 0.1; // Assume 10% margin requirement

      return context;
    } catch (error) {
      loggerService.error(`Error collecting portfolio context: ${error}`);
      throw error;
    }
  }

  /**
   * Get default position size for a symbol
   */
  getDefaultPositionSize(symbol: string, price: number): number {
    const symbolUpper = symbol.toUpperCase();

    // Crypto pairs - smaller positions due to volatility
    if (
      symbolUpper.includes("BTC") ||
      symbolUpper.includes("ETH") ||
      symbolUpper.includes("XRP") ||
      symbolUpper.includes("LTC") ||
      symbolUpper.includes("ADA") ||
      symbolUpper.includes("DOT") ||
      symbolUpper.includes("LINK") ||
      symbolUpper.includes("SOL") ||
      symbolUpper.includes("AVAX") ||
      symbolUpper.includes("MATIC") ||
      symbolUpper.includes("DOGE") ||
      symbolUpper.includes("SHIB")
    ) {
      if (symbolUpper.includes("BTC")) return 0.01; // 0.01 BTC
      if (symbolUpper.includes("ETH")) return 0.1; // 0.1 ETH
      return 10; // 10 units for other crypto
    }

    // Major forex pairs
    if (
      symbolUpper.includes("EUR") ||
      symbolUpper.includes("GBP") ||
      symbolUpper.includes("JPY") ||
      symbolUpper.includes("CHF") ||
      symbolUpper.includes("CAD") ||
      symbolUpper.includes("AUD") ||
      symbolUpper.includes("NZD")
    ) {
      return 1000; // 1 micro lot = 1000 units
    }

    // Indices
    if (symbolUpper.includes("SPX") || symbolUpper.includes("SP500")) {
      return 0.1; // 0.1 lots
    }
    if (symbolUpper.includes("NAS") || symbolUpper.includes("NASDAQ")) {
      return 0.1; // 0.1 lots
    }
    if (symbolUpper.includes("DJI") || symbolUpper.includes("DOW")) {
      return 0.1; // 0.1 lots
    }

    // Commodities
    if (symbolUpper.includes("GOLD")) {
      return 0.1; // 0.1 ounces
    }
    if (symbolUpper.includes("SILVER")) {
      return 1; // 1 ounce
    }
    if (symbolUpper.includes("OIL")) {
      return 1; // 1 barrel
    }

    // Default for stocks and others
    return Math.max(1, Math.floor(100 / price)); // Aim for around $100 position
  }

  /**
   * Calculate timeframe-specific position size
   */
  calculateTimeframePositionSize(timeframe: string, basePositionSize: number, accountBalance: number, riskPercentage: number): number {
    // Adjust position size based on timeframe risk
    let sizeMultiplier = 1;

    switch (timeframe.toUpperCase()) {
      case "M1":
        sizeMultiplier = 0.3; // Very small positions for 1-minute trades
        break;
      case "M5":
        sizeMultiplier = 0.5; // Small positions for 5-minute trades
        break;
      case "M15":
        sizeMultiplier = 0.7; // Moderate positions for 15-minute trades
        break;
      case "M30":
        sizeMultiplier = 0.8; // Slightly smaller than base
        break;
      case "H1":
        sizeMultiplier = 1.0; // Base position size for hourly trades
        break;
      case "H4":
        sizeMultiplier = 1.2; // Larger positions for 4-hour trades
        break;
      case "D1":
        sizeMultiplier = 1.5; // Larger positions for daily trades
        break;
      case "W1":
        sizeMultiplier = 2.0; // Largest positions for weekly trades
        break;
      default:
        sizeMultiplier = 1.0;
    }

    // Calculate risk-based position size
    const riskAmount = accountBalance * (riskPercentage / 100);
    const adjustedSize = basePositionSize * sizeMultiplier;

    // Ensure position doesn't exceed risk tolerance
    const maxSizeByRisk = riskAmount / (basePositionSize * 0.02); // Assume 2% stop loss

    return Math.min(adjustedSize, maxSizeByRisk);
  }

  /**
   * Get maximum drawdown allowed for timeframe
   */
  getMaxDrawdownForTimeframe(timeframe: string): number {
    switch (timeframe.toUpperCase()) {
      case "M1":
        return 0.5; // 0.5% max drawdown for 1-minute
      case "M5":
        return 1.0; // 1% max drawdown for 5-minute
      case "M15":
        return 1.5; // 1.5% max drawdown for 15-minute
      case "M30":
        return 2.0; // 2% max drawdown for 30-minute
      case "H1":
        return 3.0; // 3% max drawdown for hourly
      case "H4":
        return 5.0; // 5% max drawdown for 4-hour
      case "D1":
        return 8.0; // 8% max drawdown for daily
      case "W1":
        return 12.0; // 12% max drawdown for weekly
      default:
        return 3.0; // Default 3%
    }
  }

  /**
   * Get last trade time for a bot and symbol
   */
  async getLastTradeTime(botId: string, symbol: string): Promise<Date | null> {
    try {
      const lastTrade = await prisma.trade.findFirst({
        where: {
          botId,
          symbol,
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });

      return lastTrade?.createdAt || null;
    } catch (error) {
      loggerService.error(`Error getting last trade time: ${error}`);
      return null;
    }
  }

  /**
   * Get trade count since a specific date
   */
  async getTradeCountSince(botId: string, since: Date): Promise<number> {
    try {
      const count = await prisma.trade.count({
        where: {
          botId,
          createdAt: { gte: since },
        },
      });

      return count;
    } catch (error) {
      loggerService.error(`Error getting trade count: ${error}`);
      return 0;
    }
  }
}
