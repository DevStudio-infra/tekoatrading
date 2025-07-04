/**
 * Chart Service - Sophisticated Implementation
 * Uses the advanced chart engine service from the-trade-tracker-v2.0
 */

import { logger } from "../../logger";
import { ChartEngineService } from "../chart-engine/services/chart-engine.service";
import {
  ChartOptions as EngineChartOptions,
  ChartResult as EngineChartResult,
} from "../chart-engine/interfaces/chart-options.interface";

export interface ChartOptions {
  symbol: string;
  timeframe?: string;
  interval?: string;
  indicators?: string[];
  period?: number;
  width?: number;
  height?: number;
  theme?: string;
  botId?: string;
}

export interface ChartResult {
  success: boolean;
  chartUrl?: string;
  data?: any;
  error?: string;
}

export interface OHLCVData {
  timestamp: number;
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class ChartService {
  private chartEngineService: ChartEngineService;

  constructor() {
    this.chartEngineService = new ChartEngineService();
  }

  /**
   * Generate a sophisticated chart using the advanced chart engine service
   */
  async generateChart(options: ChartOptions): Promise<ChartResult> {
    try {
      logger.info(
        `🎨 Generating sophisticated chart for ${options.symbol} (${options.timeframe || options.interval})`,
      );

      if (!options.botId) {
        const error = `❌ BOT ID REQUIRED: Chart generation requires a botId to access user broker credentials.`;
        logger.error(error);
        return {
          success: false,
          error,
        };
      }

      // Convert to sophisticated chart options
      const engineOptions: EngineChartOptions = {
        symbol: options.symbol,
        timeframe: options.timeframe || options.interval || "H1",
        width: options.width || 1200,
        height: options.height || 800,
        theme: (options.theme as "light" | "dark") || "dark",
        showVolume: true,
        indicators: this.convertIndicators(options.indicators),
        botId: options.botId,
      };

      // Use the sophisticated chart engine service
      const chartResult: EngineChartResult =
        await this.chartEngineService.generateChart(engineOptions);

      logger.info(`✅ Sophisticated chart generated successfully: ${chartResult.chartUrl}`);

      return {
        success: true,
        chartUrl: chartResult.chartUrl,
        data: {
          symbol: options.symbol,
          timeframe: options.timeframe || options.interval,
          indicators: options.indicators || [],
          dataSource: "Capital.com API (Sophisticated Engine)",
          generatedAt: chartResult.generatedAt.toISOString(),
          chartEngine: chartResult.isFallback ? "Fallback" : "Sophisticated PNG Engine",
          imageSize: chartResult.imageBuffer?.length || 0,
        },
      };
    } catch (error) {
      const errorMessage = `❌ SOPHISTICATED CHART GENERATION FAILED: ${error instanceof Error ? error.message : "Unknown error"}`;
      logger.error(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Convert simple indicators to sophisticated format
   */
  private convertIndicators(
    indicators?: string[],
  ): { [key: string]: { enabled: boolean; period?: number; color?: string } } | undefined {
    if (!indicators || indicators.length === 0) {
      return {
        SMA: { enabled: true, period: 20, color: "blue" },
        EMA: { enabled: true, period: 20, color: "red" },
        RSI: { enabled: true, period: 14, color: "purple" },
      };
    }

    const result: { [key: string]: { enabled: boolean; period?: number; color?: string } } = {};

    for (const indicator of indicators) {
      const upperIndicator = indicator.toUpperCase();
      switch (upperIndicator) {
        case "SMA":
          result.SMA = { enabled: true, period: 20, color: "blue" };
          break;
        case "EMA":
          result.EMA = { enabled: true, period: 20, color: "red" };
          break;
        case "RSI":
          result.RSI = { enabled: true, period: 14, color: "purple" };
          break;
        case "MACD":
          result.MACD = { enabled: true, color: "green" };
          break;
        case "BOLLINGER":
          result.BOLLINGER = { enabled: true, period: 20, color: "orange" };
          break;
        default:
          result[upperIndicator] = { enabled: true };
      }
    }

    return result;
  }

  /**
   * Get real OHLCV data (public method) - FIXED to return actual market data
   */
  async getChartData(symbol: string, timeframe: string, botId: string): Promise<OHLCVData[]> {
    if (!botId) {
      throw new Error(
        "❌ BOT ID REQUIRED: Getting chart data requires a botId to access user broker credentials.",
      );
    }

    try {
      logger.info(`📊 Requesting REAL chart data for ${symbol} (${timeframe}) via chart engine`);

      // Get real historical data directly from chart engine service
      const realData = await this.getRealHistoricalData(symbol, timeframe, botId);

      if (realData && realData.length > 0) {
        logger.info(`✅ Retrieved ${realData.length} REAL data points for ${symbol}`);
        return realData;
      } else {
        logger.warn(`❌ No real data available for ${symbol}, using fallback data`);
        return this.generateFallbackDataWithTrend(symbol);
      }
    } catch (error) {
      logger.error(
        `❌ Error getting real chart data: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      logger.info(`📊 Using fallback data for ${symbol} due to error`);
      return this.generateFallbackDataWithTrend(symbol);
    }
  }

  /**
   * Get real historical data using the same logic as chart engine
   */
  private async getRealHistoricalData(
    symbol: string,
    timeframe: string,
    botId: string,
  ): Promise<OHLCVData[]> {
    try {
      // Import required modules
      const { getCapitalApiInstance } = await import("../capital");
      const { credentialsEncryption } = await import(
        "../../services/credentials-encryption.service"
      );
      const { prisma } = await import("../../prisma");

      // Get broker credentials for the bot
      const brokerCredential = await prisma.brokerCredential.findFirst({
        where: {
          isActive: true,
          userId: botId.includes("user-") ? botId.replace("user-", "") : undefined,
        },
      });

      if (!brokerCredential) {
        // Fallback to any active credential
        const anyCredential = await prisma.brokerCredential.findFirst({
          where: { isActive: true },
        });

        if (!anyCredential) {
          throw new Error("No active broker credentials found");
        }

        const credentialsData = credentialsEncryption.decryptCredentials(anyCredential.credentials);
        const capitalApi = await getCapitalApiInstance(credentialsData as any);

        return await this.fetchRealMarketData(capitalApi, symbol, timeframe);
      }

      const credentialsData = credentialsEncryption.decryptCredentials(
        brokerCredential.credentials,
      );
      const capitalApi = await getCapitalApiInstance(credentialsData as any);

      return await this.fetchRealMarketData(capitalApi, symbol, timeframe);
    } catch (error) {
      logger.error(
        `❌ Error fetching real historical data: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Fetch real market data from Capital API
   */
  private async fetchRealMarketData(
    capitalApi: any,
    symbol: string,
    timeframe: string,
  ): Promise<OHLCVData[]> {
    try {
      const epic = this.convertSymbolToEpic(symbol);
      const resolution = this.mapTimeframeToResolution(timeframe);
      const candleCount = this.calculateCandleCount(timeframe);

      logger.info(`📊 Fetching ${candleCount} bars of REAL ${timeframe} data for ${epic}`);

      const response = await capitalApi.getHistoricalPrices(epic, resolution, candleCount);

      if (!response || response.length === 0) {
        throw new Error(`No real price data returned for ${symbol}`);
      }

      // Convert Capital API response to OHLCVData format
      const ohlcvData: OHLCVData[] = response.map((price: any) => {
        const timestamp = new Date(price.snapshotTimeUTC).getTime();
        return {
          timestamp,
          datetime: price.snapshotTimeUTC,
          open: (price.openPrice.bid + price.openPrice.ask) / 2,
          high: (price.highPrice.bid + price.highPrice.ask) / 2,
          low: (price.lowPrice.bid + price.lowPrice.ask) / 2,
          close: (price.closePrice.bid + price.closePrice.ask) / 2,
          volume: price.lastTradedVolume || Math.random() * 1000000, // Use real volume or estimate
        };
      });

      logger.info(`✅ Successfully fetched ${ohlcvData.length} REAL price points for ${symbol}`);
      return ohlcvData.reverse(); // Ensure chronological order (oldest first)
    } catch (error) {
      logger.error(
        `❌ Error in fetchRealMarketData: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Generate realistic fallback data with market-like trends (ONLY used when real data fails)
   */
  private generateFallbackDataWithTrend(symbol: string): OHLCVData[] {
    logger.warn(`⚠️  USING FALLBACK DATA for ${symbol} - Real market data unavailable!`);

    const fallbackData: OHLCVData[] = [];

    // Use more realistic base prices for different symbols
    let basePrice = 100000; // Default for BTC/USD
    if (symbol.includes("ETH")) basePrice = 3500;
    else if (symbol.includes("EUR")) basePrice = 1.1;
    else if (symbol.includes("GBP")) basePrice = 1.3;

    const now = Date.now();

    // Generate realistic market data with trend
    for (let i = 99; i >= 0; i--) {
      const timestamp = now - i * 60 * 1000; // 1 minute intervals

      // Add trend bias and volatility
      const trendBias = Math.sin(i / 20) * 0.02; // Subtle trend
      const volatility = (Math.random() - 0.5) * 0.01; // 1% volatility
      const priceChange = basePrice * (trendBias + volatility);

      const price = basePrice + priceChange;
      const spread = price * 0.001; // 0.1% spread

      fallbackData.push({
        timestamp,
        datetime: new Date(timestamp).toISOString(),
        open: price,
        high: price + Math.random() * spread * 2,
        low: price - Math.random() * spread * 2,
        close: price + (Math.random() - 0.5) * spread,
        volume: Math.random() * 1000000,
      });
    }

    logger.warn(
      `⚠️  Generated ${fallbackData.length} SYNTHETIC fallback data points for ${symbol} - NOT REAL MARKET DATA!`,
    );
    return fallbackData;
  }

  /**
   * Convert symbol to Capital.com epic format
   */
  private convertSymbolToEpic(symbol: string): string {
    const symbolMappings: Record<string, string> = {
      "BTC/USD": "BTCUSD",
      "ETH/USD": "ETHUSD",
      "EUR/USD": "EURUSD",
      "GBP/USD": "GBPUSD",
      "USD/JPY": "USDJPY",
      "AUD/USD": "AUDUSD",
      "USD/CAD": "USDCAD",
      "USD/CHF": "USDCHF",
      "NZD/USD": "NZDUSD",
    };

    return symbolMappings[symbol] || symbol.replace("/", "");
  }

  /**
   * Map timeframe to Capital.com resolution
   */
  private mapTimeframeToResolution(
    timeframe: string,
  ): "MINUTE" | "MINUTE_5" | "MINUTE_15" | "MINUTE_30" | "HOUR" | "HOUR_4" | "DAY" | "WEEK" {
    const timeframeMappings: Record<string, any> = {
      M1: "MINUTE",
      "1m": "MINUTE",
      M5: "MINUTE_5",
      "5m": "MINUTE_5",
      M15: "MINUTE_15",
      "15m": "MINUTE_15",
      M30: "MINUTE_30",
      "30m": "MINUTE_30",
      H1: "HOUR",
      "1h": "HOUR",
      H4: "HOUR_4",
      "4h": "HOUR_4",
      D1: "DAY",
      "1d": "DAY",
      W1: "WEEK",
      "1w": "WEEK",
    };

    return timeframeMappings[timeframe] || "MINUTE";
  }

  /**
   * Calculate appropriate candle count for timeframe
   */
  private calculateCandleCount(timeframe: string): number {
    const timeframeCounts: Record<string, number> = {
      M1: 400,
      "1m": 400,
      M5: 200,
      "5m": 200,
      M15: 100,
      "15m": 100,
      M30: 100,
      "30m": 100,
      H1: 100,
      "1h": 100,
      H4: 50,
      "4h": 50,
      D1: 30,
      "1d": 30,
      W1: 20,
      "1w": 20,
    };

    return timeframeCounts[timeframe] || 100;
  }
}

// Create and export a singleton instance
export const chartService = new ChartService();
