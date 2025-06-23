import { loggerService } from "../../../services/logger.service";
import { chartEngineService } from "../../chart-engine";
import { ChartResult, ChartOptions } from "../../chart-engine/interfaces/chart-options.interface";

export class ChartAdapter {
  /**
   * Generate and store a chart
   *
   * @param symbolData Historical market data
   * @param botId Bot identifier for file naming
   * @param options Chart generation options
   * @returns Chart generation result
   */
  async generateAndStoreChart(symbolData: any[], botId: string, options: any): Promise<{ success: boolean; chartUrl: string; chartData: any }> {
    try {
      // Validate input data
      if (!symbolData || symbolData.length === 0) {
        throw new Error("No market data provided for chart generation");
      }

      // Enhanced options with defaults
      const chartOptions: ChartOptions = {
        symbol: options.symbol || "UNKNOWN",
        timeframe: options.timeframe || "M15",
        width: options.width || 1200,
        height: options.height || 800,
        theme: options.theme || "dark",
        showVolume: options.showVolume !== false,
        indicators: options.indicators || {},
      };

      // Debug: Log the indicators received by chart adapter
      loggerService.info(`[CHART ADAPTER] Received indicators: ${JSON.stringify(options.indicators, null, 2)}`);
      loggerService.info(`[CHART ADAPTER] Final chart options indicators: ${JSON.stringify(chartOptions.indicators, null, 2)}`);

      loggerService.info(`[CHART ADAPTER] Generating chart for bot ${botId} with ${symbolData.length} data points`);

      // Try chart engine service first
      try {
        const chartEngineResult: ChartResult = await chartEngineService.generateChart(chartOptions);

        if (chartEngineResult && chartEngineResult.chartUrl) {
          loggerService.info(`[CHART ADAPTER] Chart engine generated chart successfully`);
          return {
            success: true,
            chartUrl: chartEngineResult.chartUrl,
            chartData: {
              engine: "ChartEngineService",
              generatedAt: chartEngineResult.generatedAt,
              dataPoints: symbolData.length,
              options: chartOptions,
              isFallback: chartEngineResult.isFallback,
            },
          };
        }
      } catch (chartEngineError) {
        loggerService.warn(`[CHART ADAPTER] Chart engine failed: ${chartEngineError instanceof Error ? chartEngineError.message : "Unknown error"}`);
        throw chartEngineError;
      }

      // If we reach here, all chart generation methods have failed
      throw new Error("All chart generation methods failed");
    } catch (error) {
      loggerService.error(`[CHART ADAPTER] Chart generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }

  /**
   * Generate a trade visualization chart
   *
   * @param tradeData Trade information
   * @param symbolData Historical market data
   * @param botId Bot identifier
   * @param options Chart options
   * @returns Chart generation result
   */
  async generateTradeChart(tradeData: any, symbolData: any[], botId: string, options: any): Promise<{ chartUrl: string; chartData: any }> {
    try {
      // Validate inputs
      if (!tradeData) {
        throw new Error("No trade data provided");
      }
      if (!symbolData || symbolData.length === 0) {
        throw new Error("No market data provided for trade visualization");
      }

      loggerService.info(`[CHART ADAPTER] Generating trade chart for trade ${tradeData.id || "unknown"}`);

      // Enhanced options for trade visualization
      const enhancedOptions = {
        ...options,
        width: options.width || 1200,
        height: options.height || 800,
        theme: options.theme || "dark",
        showVolume: options.showVolume !== false,

        // Add trade levels as custom indicators/overlays
        tradeVisualization: {
          entryPrice: tradeData.entryPrice,
          stopLoss: tradeData.stopLoss,
          takeProfit: tradeData.takeProfit,
          direction: tradeData.direction || tradeData.side,
          entryTime: tradeData.entryTime,
          exitTime: tradeData.exitTime,
        },
      };

      // Generate chart with trade visualization
      const result = await this.generateAndStoreChart(symbolData, botId, enhancedOptions);

      // Enhance the chart data with trade information
      const tradeChartData = {
        ...result.chartData,
        tradeVisualization: true,
        tradeData: {
          id: tradeData.id,
          symbol: tradeData.symbol,
          direction: tradeData.direction || tradeData.side,
          entryPrice: tradeData.entryPrice,
          stopLoss: tradeData.stopLoss,
          takeProfit: tradeData.takeProfit,
          entryTime: tradeData.entryTime,
          exitTime: tradeData.exitTime,
          status: tradeData.status,
        },
      };

      return {
        chartUrl: result.chartUrl,
        chartData: tradeChartData,
      };
    } catch (error) {
      loggerService.error(`[CHART ADAPTER] Trade chart generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }
}
