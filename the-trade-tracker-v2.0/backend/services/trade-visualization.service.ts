import { prisma } from "../utils/prisma";
import { loggerService } from "./logger.service";
import { chartAdapter } from "../modules/chart/services/chart-adapter.service";
import { realChartGeneratorService } from "./real-chart-generator.service";
import { botService } from "./bot.service";

export interface TradeVisualizationData {
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  direction: "BUY" | "SELL";
  openedAt: string;
  status: "OPEN" | "CLOSED" | "PENDING";
  currentPrice?: number;
  closedAt?: string;
  closePrice?: number;
  symbol: string;
  botId: string;
  tradeId: string;
}

export interface TradeChartOptions {
  width?: number;
  height?: number;
  showIndicators?: boolean;
  theme?: "light" | "dark";
  useRealCharts?: boolean;
}

export class TradeVisualizationService {
  /**
   * Generate a chart for a specific trade showing entry, SL, and TP levels
   * @param tradeId Trade identifier (number)
   * @param options Chart generation options
   * @returns Promise with chart URL and metadata
   */
  async generateTradeChart(tradeId: number, options: TradeChartOptions = {}): Promise<{ chartUrl: string; chartData: any; success: boolean; error?: string }> {
    try {
      loggerService.info(`[TRADE VISUALIZATION] Generating chart for trade ${tradeId}`);

      // Get trade details from database with proper includes
      const trade = await prisma.position.findUnique({
        where: { id: tradeId },
        include: {
          bot: {
            include: {
              strategy: true,
            },
          },
        },
      });

      if (!trade) {
        return {
          success: false,
          error: `Trade ${tradeId} not found`,
          chartUrl: "",
          chartData: null,
        };
      }

      // Use real chart generator if enabled
      if (options.useRealCharts !== false) {
        return await this.generateRealChart(trade, options);
      }

      // Fallback to existing chart generation
      return await this.generateFallbackChart(trade, options);
    } catch (error) {
      loggerService.error(`[TRADE VISUALIZATION] Error generating chart for trade ${tradeId}: ${error}`);
      return {
        success: false,
        error: `Failed to generate chart: ${error}`,
        chartUrl: "",
        chartData: null,
      };
    }
  }

  /**
   * Generate real candlestick chart with trade levels
   */
  private async generateRealChart(trade: any, options: TradeChartOptions) {
    try {
      // Create trade levels from trade data
      const tradeLevels = realChartGeneratorService.createTradeLevelsFromTrade(trade);

      // Chart options
      const chartOptions = {
        width: options.width || 1200,
        height: options.height || 600,
        theme: options.theme || "dark",
        showVolume: true,
        showIndicators: options.showIndicators || true,
        timeframe: trade.bot?.timeframe || "M1",
      };

      // Generate the chart
      const { chartUrl, chartData } = await realChartGeneratorService.generateCandlestickChart(
        trade.symbol,
        [], // Empty array will generate realistic mock data
        tradeLevels,
        chartOptions
      );

      // Enhanced chart data with trade information
      const enhancedChartData = {
        ...chartData,
        tradeInfo: {
          id: trade.id,
          symbol: trade.symbol,
          direction: trade.side,
          entryPrice: trade.entryPrice,
          stopLoss: trade.stopLoss,
          takeProfit: trade.takeProfit,
          entryTime: trade.entryTime,
          status: trade.exitTime ? "CLOSED" : "OPEN",
        },
        tradeLevels: tradeLevels.map((level) => ({
          type: level.type,
          price: level.price,
          label: level.label,
          color: level.color,
        })),
      };

      loggerService.info(`[TRADE VISUALIZATION] Real chart generated successfully for trade ${trade.id}`);

      return {
        success: true,
        chartUrl,
        chartData: enhancedChartData,
      };
    } catch (error) {
      loggerService.error(`[TRADE VISUALIZATION] Error generating real chart: ${error}`);
      throw error;
    }
  }

  /**
   * Generate fallback chart using existing system
   */
  private async generateFallbackChart(trade: any, options: TradeChartOptions) {
    try {
      // Get market data for the trade symbol
      const symbolData = await this.getMarketDataForTrade(trade);

      // Generate chart with trade levels using the existing generateAndStoreChart method
      const chartResult = await chartAdapter.generateAndStoreChart(symbolData, trade.botId || "unknown", {
        width: options.width || 1200,
        height: options.height || 800,
        userId: trade.bot?.userId,
        symbol: trade.symbol,
        timeframe: trade.bot?.timeframe || "M15",
        indicators: options.showIndicators ? this.getDefaultIndicators() : {},
        // Pass trade data as additional context
        chartType: "candle",
        theme: "dark",
        showVolume: true,
      });

      // Add trade level information to chart data
      const enhancedChartData = {
        ...chartResult.chartData,
        tradeVisualization: true,
        tradeLevels: {
          entry: trade.entryPrice,
          stopLoss: trade.stopLoss,
          takeProfit: trade.takeProfit,
        },
        tradeInfo: {
          id: trade.id,
          symbol: trade.symbol,
          direction: trade.side,
          entryTime: trade.entryTime,
          status: trade.exitTime ? "CLOSED" : "OPEN",
        },
      };

      loggerService.info(`[TRADE VISUALIZATION] Fallback chart generated successfully for trade ${trade.id}`);

      return {
        success: true,
        chartUrl: chartResult.chartUrl,
        chartData: enhancedChartData,
      };
    } catch (error) {
      loggerService.error(`[TRADE VISUALIZATION] Error generating fallback chart: ${error}`);
      throw error;
    }
  }

  /**
   * Generate charts for all open trades of a bot
   * @param botId Bot identifier
   * @param options Chart generation options
   * @returns Promise with array of chart results
   */
  async generateBotTradeCharts(botId: string, options: TradeChartOptions = {}): Promise<Array<{ tradeId: string; chartUrl: string; chartData: any; success: boolean }>> {
    try {
      loggerService.info(`[TRADE VISUALIZATION] Generating charts for all trades of bot ${botId}`);

      // Get all open trades for the bot
      const openTrades = await prisma.position.findMany({
        where: {
          botId: botId,
          status: "open",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10, // Limit to most recent 10 trades
      });

      const results = [];

      for (const trade of openTrades) {
        const chartResult = await this.generateTradeChart(trade.id, options);
        results.push({
          tradeId: String(trade.id), // Convert to string for consistency
          ...chartResult,
        });
      }

      loggerService.info(`[TRADE VISUALIZATION] Generated ${results.length} trade charts for bot ${botId}`);
      return results;
    } catch (error) {
      loggerService.error(`[TRADE VISUALIZATION] Error generating bot trade charts for ${botId}:`, error);
      return [];
    }
  }

  /**
   * Get market data for a specific trade period
   * @private
   */
  private async getMarketDataForTrade(trade: any): Promise<any[]> {
    try {
      // For now, return simple synthetic data based on the trade
      // In a real implementation, this would fetch historical market data for the trade period
      const startDate = trade.entryTime || trade.createdAt;
      const endDate = trade.exitTime || new Date();

      // Generate sample OHLCV data for the chart
      const candles = [];
      const basePrice = Number(trade.entryPrice || 100);
      const timeRange = endDate.getTime() - startDate.getTime();
      const candleCount = Math.min(100, Math.max(20, Math.floor(timeRange / (15 * 60 * 1000)))); // 15-minute candles

      for (let i = 0; i < candleCount; i++) {
        const time = new Date(startDate.getTime() + (i * timeRange) / candleCount);
        const volatility = basePrice * 0.002; // 0.2% volatility
        const change = (Math.random() - 0.5) * volatility;

        const open = basePrice + change;
        const high = open + Math.random() * volatility;
        const low = open - Math.random() * volatility;
        const close = open + (Math.random() - 0.5) * volatility;

        candles.push({
          datetime: time.toISOString(),
          timestamp: time.getTime(),
          open: Number(open.toFixed(8)),
          high: Number(high.toFixed(8)),
          low: Number(low.toFixed(8)),
          close: Number(close.toFixed(8)),
          volume: Math.floor(1000 + Math.random() * 9000),
        });
      }

      return candles;
    } catch (error) {
      loggerService.error(`[TRADE VISUALIZATION] Error getting market data for trade:`, error);

      // Return minimal fallback data
      return [
        {
          datetime: new Date().toISOString(),
          timestamp: Date.now(),
          open: Number(trade.entryPrice || 100),
          high: Number(trade.entryPrice || 100) * 1.001,
          low: Number(trade.entryPrice || 100) * 0.999,
          close: Number(trade.entryPrice || 100),
          volume: 1000,
        },
      ];
    }
  }

  /**
   * Map database trade status to visualization status
   * @private
   */
  private mapTradeStatus(dbStatus: string): "OPEN" | "CLOSED" | "PENDING" {
    switch (dbStatus.toLowerCase()) {
      case "open":
      case "active":
        return "OPEN";
      case "closed":
      case "completed":
      case "filled":
        return "CLOSED";
      case "pending":
      case "pending_open":
      case "submitted":
        return "PENDING";
      default:
        return "OPEN";
    }
  }

  /**
   * Get default indicators for trade charts
   * @private
   */
  private getDefaultIndicators(): Record<string, any> {
    return {
      SMA: { period: 20, color: "blue" },
      EMA: { period: 50, color: "orange" },
      RSI: { period: 14 },
    };
  }

  /**
   * Get trade summary with P&L and performance metrics
   * @param tradeId Trade identifier (number)
   * @returns Promise with trade summary
   */
  async getTradeSummary(tradeId: number): Promise<{
    trade: any;
    performance: {
      profitLoss: number;
      profitLossPercent: number;
      duration: string;
      status: string;
    };
    levels: {
      entry: number;
      stopLoss?: number;
      takeProfit?: number;
      current?: number;
    };
  } | null> {
    try {
      const trade = await prisma.position.findUnique({
        where: { id: tradeId },
        include: {
          bot: {
            select: {
              name: true,
              timeframe: true,
            },
          },
        },
      });

      if (!trade) {
        return null;
      }

      const entryPrice = Number(trade.entryPrice || 0);
      // Use exitPrice for closed trades, or entryPrice for open trades (since we don't have real-time current price)
      const currentPrice = Number(trade.exitPrice || entryPrice);
      const quantity = Number(trade.quantity || 0);

      // Calculate P&L
      let profitLoss = 0;
      if (trade.side === "BUY") {
        profitLoss = (currentPrice - entryPrice) * quantity;
      } else {
        profitLoss = (entryPrice - currentPrice) * quantity;
      }

      const profitLossPercent = entryPrice > 0 ? (profitLoss / (entryPrice * quantity)) * 100 : 0;

      // Calculate duration
      const startTime = trade.entryTime || trade.createdAt;
      const endTime = trade.exitTime || new Date();
      const durationMs = endTime.getTime() - startTime.getTime();
      const duration = this.formatDuration(durationMs);

      return {
        trade,
        performance: {
          profitLoss,
          profitLossPercent,
          duration,
          status: this.mapTradeStatus(trade.status),
        },
        levels: {
          entry: entryPrice,
          stopLoss: trade.stopLoss ? Number(trade.stopLoss) : undefined,
          takeProfit: trade.takeProfit ? Number(trade.takeProfit) : undefined,
          current: trade.status === "open" ? currentPrice : undefined,
        },
      };
    } catch (error) {
      loggerService.error(`[TRADE VISUALIZATION] Error getting trade summary for ${tradeId}:`, error);
      return null;
    }
  }

  /**
   * Format duration in human-readable format
   * @private
   */
  private formatDuration(durationMs: number): string {
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

export const tradeVisualizationService = new TradeVisualizationService();
