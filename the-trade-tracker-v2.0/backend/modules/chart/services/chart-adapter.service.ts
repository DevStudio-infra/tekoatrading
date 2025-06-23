import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import { loggerService } from "../../../services/logger.service";
import { supabaseStorageService } from "../../../services/supabase-storage.service";
import { localStorageService } from "../../../services/local-storage.service";
import { chartEngineService } from "../../chart-engine";
import { ChartOptions } from "../../chart-engine/interfaces/chart-options.interface";

/**
 * Adapter service to maintain backward compatibility with the original Chart service
 * This service provides the same interface as the original service while using the new modular structure internally
 */
export class ChartAdapterService extends EventEmitter {
  constructor() {
    super();
  }

  /**
   * Generate a chart based on the provided symbol and timeframe
   *
   * @param symbol Trading symbol
   * @param timeframe Chart timeframe (e.g., '1h', '1d')
   * @param width Chart width in pixels (optional)
   * @param height Chart height in pixels (optional)
   * @param theme Chart theme (dark or light, optional)
   * @param showVolume Whether to show volume (optional)
   * @returns Chart URL or path
   */
  async generateChart(symbol: string, timeframe: string, width?: number, height?: number, theme: "dark" | "light" = "dark", showVolume: boolean = true): Promise<string> {
    try {
      loggerService.info(`Generating chart for ${symbol} with timeframe ${timeframe} via adapter`);

      const options: ChartOptions = {
        symbol,
        timeframe,
        width,
        height,
        theme,
        showVolume,
      };

      const result = await chartEngineService.generateChart(options);

      if (result.isFallback) {
        loggerService.warn(`Using fallback chart for ${symbol}`);
      }

      return result.chartUrl;
    } catch (error) {
      loggerService.error(`Error generating chart via adapter: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  /**
   * Generate a chart using the chart engine service
   * and store it in Supabase storage
   *
   * @param symbolData The OHLCV data for the chart
   * @param botId The ID of the bot requesting the chart
   * @param chartOptions Optional configuration for the chart
   * @returns Object containing chart URL and data
   */
  async generateAndStoreChart(
    symbolData: any[],
    botId: string,
    chartOptions: {
      symbol?: string;
      timeframe?: string;
      userId?: string;
      strategyName?: string;
      useRealData?: boolean;
      width?: number;
      height?: number;
      theme?: "light" | "dark";
      showVolume?: boolean;
      indicators?: string[] | Record<string, any>;
      chartType?: "candle" | "line" | "area" | "bar";
    }
  ): Promise<{ chartUrl: string; chartData: any; isFallback?: boolean }> {
    try {
      loggerService.info(`Generating and storing chart for bot ${botId}`);

      // Configure chart options
      const options: ChartOptions = {
        symbol: chartOptions.symbol || "unknown",
        timeframe: chartOptions.timeframe || "1h",
        width: chartOptions.width || 1200,
        height: chartOptions.height || 800,
        theme: chartOptions.theme || "dark",
        showVolume: chartOptions.showVolume !== undefined ? chartOptions.showVolume : true,
        indicators: chartOptions.indicators, // Pass indicators configuration
        userId: chartOptions.userId, // Pass through userId
        strategyName: chartOptions.strategyName, // Pass through strategy name
        useRealData: chartOptions.useRealData, // Pass through useRealData flag
        chartType: chartOptions.chartType, // Pass through chart type
      };

      // Generate chart with skipLocalStorage=true to avoid local file storage
      // We'll be storing in Supabase bucket instead
      const result = await chartEngineService.generateChart({
        ...options,
        skipLocalStorage: true, // Skip local file storage since we're using Supabase
      });

      // Create a unique ID for the chart
      const chartId = uuidv4();
      const filename = `${chartId}.png`;

      // Try to store in Supabase first
      try {
        // Check if we have a valid image buffer
        if (!result.imageBuffer || result.imageBuffer.length === 0) {
          loggerService.warn("No valid image buffer received, using placeholder image");

          // Return a placeholder image instead of throwing an error
          return {
            chartUrl:
              "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI4MDAiIHZpZXdCb3g9IjAgMCAxMjAwIDgwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEyMDAiIGhlaWdodD0iODAwIiBmaWxsPSIjMjEyMTIxIi8+Cjx0ZXh0IHg9IjYwMCIgeT0iNDAwIiBmaWxsPSIjZmZmZmZmIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkNoYXJ0IEdlbmVyYXRpb24gRmFpbGVkPC90ZXh0Pgo8L3N2Zz4K",
            chartData: null,
            isFallback: true,
          };
        }

        // Validate the PNG buffer by checking for PNG signature
        const isPngValid =
          result.imageBuffer.length >= 8 &&
          result.imageBuffer[0] === 137 &&
          result.imageBuffer[1] === 80 &&
          result.imageBuffer[2] === 78 &&
          result.imageBuffer[3] === 71 &&
          result.imageBuffer[4] === 13 &&
          result.imageBuffer[5] === 10 &&
          result.imageBuffer[6] === 26 &&
          result.imageBuffer[7] === 10;

        if (!isPngValid) {
          loggerService.warn("Image buffer does not have a valid PNG signature, this may cause display issues");
          // Continue anyway but log the warning
        } else {
          loggerService.info("Valid PNG image buffer detected");
        }

        // Convert buffer to base64 string for storage
        const base64Image = result.imageBuffer.toString("base64");

        // Create the data URI
        const base64Data = `data:image/png;base64,${base64Image}`;

        loggerService.debug(`Chart image size: ${Math.round(base64Image.length / 1024)}KB`);

        // Upload to Supabase
        const supabaseUrl = await supabaseStorageService.uploadBase64Image(base64Data, filename, "image/png", botId);

        return {
          chartUrl: supabaseUrl,
          chartData: symbolData,
          isFallback: result.isFallback,
        };
      } catch (supabaseError) {
        // If Supabase fails, use local storage as fallback
        loggerService.warn(`Supabase storage failed, using local storage as fallback: ${supabaseError instanceof Error ? supabaseError.message : "Unknown error"}`);

        // Check if we have a valid image buffer
        if (!result.imageBuffer || result.imageBuffer.length === 0) {
          loggerService.warn("No valid image buffer received, using placeholder image");

          // Return a placeholder image instead of throwing an error
          return {
            chartUrl:
              "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI4MDAiIHZpZXdCb3g9IjAgMCAxMjAwIDgwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEyMDAiIGhlaWdodD0iODAwIiBmaWxsPSIjMjEyMTIxIi8+Cjx0ZXh0IHg9IjYwMCIgeT0iNDAwIiBmaWxsPSIjZmZmZmZmIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkNoYXJ0IEdlbmVyYXRpb24gRmFpbGVkPC90ZXh0Pgo8L3N2Zz4K",
            chartData: null,
            isFallback: true,
          };
        }

        // Validate the PNG buffer by checking for PNG signature
        const isPngValid =
          result.imageBuffer.length >= 8 &&
          result.imageBuffer[0] === 137 &&
          result.imageBuffer[1] === 80 &&
          result.imageBuffer[2] === 78 &&
          result.imageBuffer[3] === 71 &&
          result.imageBuffer[4] === 13 &&
          result.imageBuffer[5] === 10 &&
          result.imageBuffer[6] === 26 &&
          result.imageBuffer[7] === 10;

        if (!isPngValid) {
          loggerService.warn("Image buffer does not have a valid PNG signature in fallback path, this may cause display issues");
          // Continue anyway but log the warning
        } else {
          loggerService.info("Valid PNG image buffer detected in fallback path");
        }

        // Convert buffer to base64 string for storage
        const base64Image = result.imageBuffer.toString("base64");

        // Create the data URI
        const base64Data = `data:image/png;base64,${base64Image}`;

        loggerService.debug(`Fallback chart image size: ${Math.round(base64Image.length / 1024)}KB`);

        // Save to local storage
        const localUrl = await localStorageService.saveBase64Image(base64Data, filename);

        return {
          chartUrl: localUrl,
          chartData: symbolData,
          isFallback: result.isFallback,
        };
      }
    } catch (error) {
      loggerService.error(`Error generating and storing chart: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Submit a chart for AI analysis
   * @param chartUrl The URL to the chart image
   * @param analysisOptions Options for the analysis
   * @returns Analysis results
   */
  async submitChartForAnalysis(
    chartUrl: string,
    analysisOptions: {
      botId: string;
      userId?: string;
      symbolInfo?: {
        symbol: string;
        timeframe: string;
      };
      additionalContext?: string;
    }
  ): Promise<any> {
    try {
      loggerService.info(`Submitting chart for AI analysis: ${chartUrl}`);

      // This is a placeholder implementation
      // In a real implementation, this would call an AI service to analyze the chart
      return {
        success: true,
        analysis: {
          trend: "bullish",
          confidence: 0.85,
          support: [12345.67, 12300.0],
          resistance: [12500.0, 12550.0],
          recommendation: "Consider long position with stop loss at nearest support level.",
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      loggerService.error(`Error submitting chart for analysis: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    chartEngineService.cleanup();
  }
}

// Export singleton instance
export const chartAdapter = new ChartAdapterService();
