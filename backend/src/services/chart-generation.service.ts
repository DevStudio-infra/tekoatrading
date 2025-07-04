import { logger } from "../logger";
import { ChartService } from "../modules/chart/index";
import { CandleData } from "../agents/core/technical-analysis.agent";
import { supabaseStorageService } from "./supabase-storage.service";

export interface ChartGenerationResult {
  success: boolean;
  chartUrl?: string;
  error?: string;
  chartBuffer?: Buffer;
}

export class ChartGenerationService {
  private chartService: ChartService;

  constructor() {
    this.chartService = new ChartService();
  }

  /**
   * Generate chart for a bot with shared candlestick data optimization
   */
  async generateBotChart(
    botId: string,
    symbol: string,
    timeframe: string,
    bot: any,
    sharedCandleData?: CandleData[],
  ): Promise<ChartGenerationResult> {
    try {
      logger.info(`📊 Generating chart for ${symbol} (${timeframe}) - Bot: ${bot.name}`);

      // Use the existing ChartService generateChart method
      const chartResult = await this.chartService.generateChart({
        symbol,
        timeframe,
        botId,
        width: 1200,
        height: 800,
        indicators: ["SMA", "EMA", "RSI"],
        theme: "dark",
      });

      if (chartResult.success && chartResult.chartUrl) {
        logger.info(`✅ Chart generated successfully: ${chartResult.chartUrl}`);
        return {
          success: true,
          chartUrl: chartResult.chartUrl,
        };
      } else {
        throw new Error(chartResult.error || "Chart generation failed");
      }
    } catch (error) {
      logger.error(`❌ Chart generation failed for ${symbol}:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown chart generation error",
      };
    }
  }

  /**
   * Generate chart with custom configuration
   */
  async generateCustomChart(
    candleData: CandleData[],
    config: {
      title?: string;
      subtitle?: string;
      symbol: string;
      timeframe: string;
      includeVolume?: boolean;
      includeIndicators?: boolean;
      width?: number;
      height?: number;
    },
  ): Promise<ChartGenerationResult> {
    try {
      if (candleData.length === 0) {
        throw new Error("No candlestick data provided");
      }

      // TODO: Implement generateCandlestickChart method in ChartService
      // For now, use the existing generateChart method and return a placeholder
      const chartResult = await this.chartService.generateChart({
        symbol: config.symbol,
        timeframe: config.timeframe,
        width: config.width || 1200,
        height: config.height || 800,
        indicators: config.includeIndicators ? ["SMA", "EMA", "RSI"] : [],
        theme: "dark",
        botId: "custom-chart", // Placeholder bot ID for custom charts
      });

      if (chartResult.success) {
        return {
          success: true,
          chartUrl: chartResult.chartUrl,
        };
      } else {
        throw new Error(chartResult.error || "Chart generation failed");
      }
    } catch (error) {
      logger.error(`❌ Custom chart generation failed:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown custom chart generation error",
      };
    }
  }

  /**
   * Upload chart buffer to storage
   */
  async uploadChartToStorage(chartBuffer: Buffer, fileName: string): Promise<string> {
    try {
      const result = await supabaseStorageService.uploadFile(fileName, chartBuffer, "image/png");

      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }

      return result.publicUrl!;
    } catch (error) {
      logger.error(`❌ Chart upload failed:`, error);
      throw error;
    }
  }
}
