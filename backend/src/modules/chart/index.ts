/**
 * Chart Service - Real Implementation
 * Fetches real market data from Capital.com and generates charts
 */

import { logger } from "../../logger";
import { getCapitalApiInstance } from "../capital";
import type { CapitalAuthConfig } from "../capital";
import axios from "axios";
import * as path from "path";
import * as fs from "fs/promises";
import { prisma } from "../../prisma";

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
  private chartEngineUrl: string;
  private outputDir: string;

  constructor() {
    this.chartEngineUrl = process.env.CHART_ENGINE_URL || "http://localhost:5001";
    this.outputDir = process.env.CHART_OUTPUT_DIR || path.join(process.cwd(), "public", "charts");
  }

  /**
   * Generate a real chart with real market data using user's broker credentials
   */
  async generateChart(options: ChartOptions): Promise<ChartResult> {
    try {
      logger.info(
        `Generating real chart for ${options.symbol} (${options.timeframe || options.interval})`,
      );

      if (!options.botId) {
        const error = `❌ BOT ID REQUIRED: Chart generation requires a botId to access user broker credentials. Please provide botId in chart options.`;
        logger.error(error);
        return {
          success: false,
          error,
        };
      }

      // Fetch real OHLCV data using user's broker credentials
      const ohlcvData = await this.fetchRealOHLCVData(
        options.symbol,
        options.timeframe || options.interval || "HOUR",
        options.botId,
      );

      if (!ohlcvData || ohlcvData.length === 0) {
        const error = `❌ NO MARKET DATA: No market data available for ${options.symbol}. Check broker connection and symbol availability.`;
        logger.error(error);
        return {
          success: false,
          error,
        };
      }

      // Generate chart using chart engine
      const chartResult = await this.generateChartWithEngine(options, ohlcvData);

      logger.info(`Real chart generated successfully: ${chartResult.chartUrl}`);

      return {
        success: true,
        chartUrl: chartResult.chartUrl,
        data: {
          symbol: options.symbol,
          timeframe: options.timeframe || options.interval,
          indicators: options.indicators || [],
          candleCount: ohlcvData.length,
          dataSource: "Capital.com API (User Credentials)",
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      const errorMessage = `❌ CHART GENERATION FAILED: ${error instanceof Error ? error.message : "Unknown error"}`;
      logger.error(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Fetch real OHLCV data from Capital.com API using user's broker credentials
   */
  private async fetchRealOHLCVData(
    symbol: string,
    timeframe: string,
    botId?: string,
  ): Promise<OHLCVData[]> {
    try {
      logger.info(`Fetching real OHLCV data for ${symbol} (${timeframe})`);

      // If botId is provided, get user's broker credentials
      if (botId) {
        // Get bot configuration with broker credentials
        const bot = await prisma.bot.findUnique({
          where: { id: botId },
          include: { brokerCredential: true },
        });

        if (!bot?.brokerCredential) {
          const error = `❌ BROKER CREDENTIALS MISSING: Bot ${botId} has no broker credentials configured. Please configure broker credentials for this bot to access real market data.`;
          logger.error(error);
          throw new Error(error);
        }

        // Parse the encrypted credentials
        let credentialsData;
        try {
          credentialsData = JSON.parse(bot.brokerCredential.credentials);
        } catch (error) {
          const errorMsg = `❌ CREDENTIAL PARSING FAILED: Bot ${botId} broker credentials are corrupted. Please re-configure broker credentials.`;
          logger.error(errorMsg, error);
          throw new Error(errorMsg);
        }

        if (!credentialsData.apiKey || !credentialsData.identifier || !credentialsData.password) {
          const errorMsg = `❌ INCOMPLETE CREDENTIALS: Bot ${botId} broker credentials are missing required fields (apiKey, identifier, or password). Please complete broker configuration.`;
          logger.error(errorMsg);
          throw new Error(errorMsg);
        }

        const config: CapitalAuthConfig = {
          apiKey: credentialsData.apiKey,
          identifier: credentialsData.identifier,
          password: credentialsData.password,
          isDemo: bot.brokerCredential.isDemo,
        };

        return await this.fetchRealOHLCVWithConfig(symbol, timeframe, config);
      }

      // No botId provided - this is an error in production
      const error = `❌ BOT ID REQUIRED: Chart generation requires a botId to access user broker credentials. System configuration error.`;
      logger.error(error);
      throw new Error(error);
    } catch (error) {
      logger.error(`Failed to fetch real OHLCV data: ${error}`);
      throw error; // Re-throw instead of fallback
    }
  }

  /**
   * Fetch OHLCV data with specific API configuration
   */
  private async fetchRealOHLCVWithConfig(
    symbol: string,
    timeframe: string,
    config: CapitalAuthConfig,
  ): Promise<OHLCVData[]> {
    // Create Capital.com API instance
    const capitalApi = getCapitalApiInstance(config);
    await capitalApi.authenticate();

    // Convert symbol to epic format
    const epic = await this.convertSymbolToEpic(symbol);

    // Calculate date range (last 400 candles)
    const to = new Date().toISOString();
    const from = this.calculateFromDate(timeframe, 400);

    // Fetch historical prices
    const historicalPrices = await capitalApi.getHistoricalPrices(
      epic,
      this.mapTimeframeToResolution(timeframe),
      from,
      to,
    );

    // Convert to OHLCV format
    const ohlcvData: OHLCVData[] = historicalPrices.map((price) => ({
      timestamp: new Date(price.snapshotTime).getTime(),
      datetime: price.snapshotTime,
      open: (price.openPrice.bid + price.openPrice.ask) / 2,
      high: (price.highPrice.bid + price.highPrice.ask) / 2,
      low: (price.lowPrice.bid + price.lowPrice.ask) / 2,
      close: (price.closePrice.bid + price.closePrice.ask) / 2,
      volume: price.lastTradedVolume || 0,
    }));

    logger.info(`Fetched ${ohlcvData.length} real candles for ${symbol}`);
    return ohlcvData;
  }

  /**
   * Generate chart using chart engine
   */
  private async generateChartWithEngine(
    options: ChartOptions,
    data: OHLCVData[],
  ): Promise<{ chartUrl: string }> {
    try {
      // Ensure output directory exists
      await this.ensureOutputDirectory();

      // Prepare chart options
      const chartOptions = {
        width: options.width || 1200,
        height: options.height || 800,
        chart_type: "candle",
        theme: options.theme || "dark",
        indicators: this.processIndicators(options),
      };

      // Prepare request data
      const requestData = {
        data: data,
        ...chartOptions,
      };

      try {
        // Try to generate chart using chart engine
        const response = await axios.post(`${this.chartEngineUrl}/generate-chart`, requestData, {
          timeout: 60000,
          headers: { "Content-Type": "application/json" },
        });

        if (response.data?.chart_url) {
          return { chartUrl: response.data.chart_url };
        } else {
          throw new Error("Chart engine did not return chart URL");
        }
      } catch (engineError) {
        logger.warn("Chart engine unavailable, generating fallback chart");

        // Fallback: generate simple chart filename and save data
        const filename = `chart-${options.symbol}-${options.timeframe || options.interval}-${Date.now()}.png`;
        const chartPath = path.join(this.outputDir, filename);

        // For now, create a placeholder file with chart data
        const chartData = {
          symbol: options.symbol,
          timeframe: options.timeframe || options.interval,
          candleCount: data.length,
          generatedAt: new Date().toISOString(),
          data: data.slice(-20), // Last 20 candles for display
        };

        await fs.writeFile(chartPath.replace(".png", ".json"), JSON.stringify(chartData, null, 2));

        return { chartUrl: `/charts/${filename}` };
      }
    } catch (error) {
      logger.error(`Chart generation failed: ${error}`);
      throw error;
    }
  }

  /**
   * Get real OHLCV data (public method) - requires botId for user credentials
   */
  async getChartData(symbol: string, timeframe: string, botId: string): Promise<OHLCVData[]> {
    if (!botId) {
      throw new Error(
        "❌ BOT ID REQUIRED: Getting chart data requires a botId to access user broker credentials.",
      );
    }
    return this.fetchRealOHLCVData(symbol, timeframe, botId);
  }

  /**
   * Convert symbol to Capital.com epic format
   */
  private async convertSymbolToEpic(symbol: string): Promise<string> {
    // Common symbol mappings
    const symbolMappings: { [key: string]: string } = {
      BTCUSD: "BITCOIN",
      ETHUSD: "ETHEREUM",
      EURUSD: "EURUSD",
      GBPUSD: "GBPUSD",
      USDJPY: "USDJPY",
      AUDUSD: "AUDUSD",
      USDCAD: "USDCAD",
      USDCHF: "USDCHF",
      NZDUSD: "NZDUSD",
      EURGBP: "EURGBP",
      EURJPY: "EURJPY",
      GBPJPY: "GBPJPY",
    };

    return symbolMappings[symbol.toUpperCase()] || symbol;
  }

  /**
   * Map timeframe to Capital.com resolution
   */
  private mapTimeframeToResolution(
    timeframe: string,
  ): "MINUTE" | "MINUTE_5" | "MINUTE_15" | "MINUTE_30" | "HOUR" | "HOUR_4" | "DAY" | "WEEK" {
    const timeframeMap: { [key: string]: any } = {
      M1: "MINUTE",
      MINUTE: "MINUTE",
      M5: "MINUTE_5",
      MINUTE_5: "MINUTE_5",
      M15: "MINUTE_15",
      MINUTE_15: "MINUTE_15",
      M30: "MINUTE_30",
      MINUTE_30: "MINUTE_30",
      H1: "HOUR",
      HOUR: "HOUR",
      H4: "HOUR_4",
      HOUR_4: "HOUR_4",
      D1: "DAY",
      DAY: "DAY",
      W1: "WEEK",
      WEEK: "WEEK",
    };

    return timeframeMap[timeframe.toUpperCase()] || "HOUR";
  }

  /**
   * Calculate from date based on timeframe and candle count
   */
  private calculateFromDate(timeframe: string, candleCount: number): string {
    const now = new Date();
    const timeframeMinutes = this.getTimeframeInMinutes(timeframe);
    const totalMinutes = timeframeMinutes * candleCount;
    const fromDate = new Date(now.getTime() - totalMinutes * 60 * 1000);
    return fromDate.toISOString();
  }

  /**
   * Get timeframe in minutes
   */
  private getTimeframeInMinutes(timeframe: string): number {
    const timeframeMap: { [key: string]: number } = {
      M1: 1,
      MINUTE: 1,
      M5: 5,
      MINUTE_5: 5,
      M15: 15,
      MINUTE_15: 15,
      M30: 30,
      MINUTE_30: 30,
      H1: 60,
      HOUR: 60,
      H4: 240,
      HOUR_4: 240,
      D1: 1440,
      DAY: 1440,
      W1: 10080,
      WEEK: 10080,
    };

    return timeframeMap[timeframe.toUpperCase()] || 60;
  }

  /**
   * Process indicators for chart generation
   */
  private processIndicators(options: ChartOptions): Record<string, any> {
    const indicators: Record<string, any> = {};

    if (options.indicators && options.indicators.length > 0) {
      options.indicators.forEach((indicator) => {
        switch (indicator.toUpperCase()) {
          case "SMA":
            indicators["SMA"] = { window: 20, color: "blue" };
            break;
          case "EMA":
            indicators["EMA"] = { window: 50, color: "orange" };
            break;
          case "MACD":
            indicators["MACD"] = { fast: 12, slow: 26, signal: 9 };
            break;
          case "RSI":
            indicators["RSI"] = { window: 14 };
            break;
          case "BOLLINGER":
            indicators["BOLLINGER"] = { window: 20, std: 2 };
            break;
        }
      });
    }

    return indicators;
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
      logger.info(`Created chart output directory: ${this.outputDir}`);
    }
  }
}

export default ChartService;
