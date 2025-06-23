import { z } from "zod";
import { BaseTradingTool } from "./base.tool";

/**
 * Chart Analysis Tool for LangChain.js Agents
 * Provides chart pattern recognition and technical analysis capabilities
 */
export class ChartAnalysisTool extends BaseTradingTool {
  name = "chart_analysis_tool";
  description = "Analyze chart patterns, support/resistance levels, and provide technical insights from price data";

  schema = z.object({
    action: z.enum(["analyze_pattern", "find_support_resistance", "trend_analysis", "volume_analysis"]),
    params: z
      .object({
        prices: z.array(z.number()).optional(),
        highs: z.array(z.number()).optional(),
        lows: z.array(z.number()).optional(),
        volumes: z.array(z.number()).optional(),
        timeframe: z.string().optional().default("1h"),
        lookback: z.number().optional().default(50),
      })
      .optional(),
  });

  protected async execute(input: z.infer<typeof this.schema>): Promise<string> {
    try {
      const { action, params = {} } = input;

      switch (action) {
        case "analyze_pattern":
          return await this.analyzePattern(params);
        case "find_support_resistance":
          return await this.findSupportResistance(params);
        case "trend_analysis":
          return await this.analyzeTrend(params);
        case "volume_analysis":
          return await this.analyzeVolume(params);
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error: any) {
      throw new Error(`Chart analysis tool error: ${error?.message || "Unknown error"}`);
    }
  }

  private async analyzePattern(params: any): Promise<string> {
    try {
      const { prices = [], highs = [], lows = [] } = params;

      if (!prices.length && !highs.length) {
        return JSON.stringify({
          error: "Price data required for pattern analysis",
          patterns: [],
        });
      }

      // Simple pattern recognition logic
      const patterns = [];
      const priceData = prices.length ? prices : highs;

      // Detect basic patterns
      if (this.isAscendingTriangle(priceData)) {
        patterns.push({
          type: "ascending_triangle",
          confidence: 0.7,
          signal: "bullish",
          description: "Price making higher lows with resistance at same level",
        });
      }

      if (this.isDescendingTriangle(priceData)) {
        patterns.push({
          type: "descending_triangle",
          confidence: 0.7,
          signal: "bearish",
          description: "Price making lower highs with support at same level",
        });
      }

      return JSON.stringify({
        success: true,
        patterns,
        analysis: patterns.length > 0 ? "Chart patterns detected" : "No clear patterns identified",
      });
    } catch (error: any) {
      throw new Error(`Failed to analyze patterns: ${error.message}`);
    }
  }

  private async findSupportResistance(params: any): Promise<string> {
    try {
      const { prices = [], highs = [], lows = [] } = params;

      if (!prices.length && !highs.length && !lows.length) {
        return JSON.stringify({
          error: "Price data required for support/resistance analysis",
          levels: [],
        });
      }

      const supportLevels = this.findSupportLevels(lows.length ? lows : prices);
      const resistanceLevels = this.findResistanceLevels(highs.length ? highs : prices);

      return JSON.stringify({
        success: true,
        support: supportLevels,
        resistance: resistanceLevels,
        analysis: `Found ${supportLevels.length} support and ${resistanceLevels.length} resistance levels`,
      });
    } catch (error: any) {
      throw new Error(`Failed to find support/resistance: ${error.message}`);
    }
  }

  private async analyzeTrend(params: any): Promise<string> {
    try {
      const { prices = [], lookback = 20 } = params;

      if (!prices.length) {
        return JSON.stringify({
          error: "Price data required for trend analysis",
          trend: "unknown",
        });
      }

      const recentPrices = prices.slice(-lookback);
      const trend = this.calculateTrend(recentPrices);

      return JSON.stringify({
        success: true,
        trend: trend.direction,
        strength: trend.strength,
        analysis: `${trend.direction} trend with ${trend.strength} strength`,
      });
    } catch (error: any) {
      throw new Error(`Failed to analyze trend: ${error.message}`);
    }
  }

  private async analyzeVolume(params: any): Promise<string> {
    try {
      const { volumes = [], prices = [] } = params;

      if (!volumes.length) {
        return JSON.stringify({
          error: "Volume data required for volume analysis",
          analysis: "No volume data available",
        });
      }

      const volumeAnalysis = this.analyzeVolumePattern(volumes, prices);

      return JSON.stringify({
        success: true,
        ...volumeAnalysis,
      });
    } catch (error: any) {
      throw new Error(`Failed to analyze volume: ${error.message}`);
    }
  }

  // Helper methods for pattern recognition
  private isAscendingTriangle(prices: number[]): boolean {
    if (prices.length < 10) return false;

    const recent = prices.slice(-10);
    const lows = recent.filter((_, i) => i % 2 === 0);

    // Check if lows are generally increasing
    let increasingLows = 0;
    for (let i = 1; i < lows.length; i++) {
      if (lows[i] > lows[i - 1]) increasingLows++;
    }

    return increasingLows >= lows.length * 0.6;
  }

  private isDescendingTriangle(prices: number[]): boolean {
    if (prices.length < 10) return false;

    const recent = prices.slice(-10);
    const highs = recent.filter((_, i) => i % 2 === 1);

    // Check if highs are generally decreasing
    let decreasingHighs = 0;
    for (let i = 1; i < highs.length; i++) {
      if (highs[i] < highs[i - 1]) decreasingHighs++;
    }

    return decreasingHighs >= highs.length * 0.6;
  }

  private findSupportLevels(prices: number[]): Array<{ level: number; strength: number }> {
    const levels = [];
    const tolerance = 0.02; // 2% tolerance

    // Find local minimums
    for (let i = 2; i < prices.length - 2; i++) {
      if (prices[i] < prices[i - 1] && prices[i] < prices[i + 1]) {
        const level = prices[i];
        const strength = this.calculateLevelStrength(prices, level, tolerance);
        if (strength > 2) {
          levels.push({ level, strength });
        }
      }
    }

    return levels.sort((a, b) => b.strength - a.strength).slice(0, 3);
  }

  private findResistanceLevels(prices: number[]): Array<{ level: number; strength: number }> {
    const levels = [];
    const tolerance = 0.02; // 2% tolerance

    // Find local maximums
    for (let i = 2; i < prices.length - 2; i++) {
      if (prices[i] > prices[i - 1] && prices[i] > prices[i + 1]) {
        const level = prices[i];
        const strength = this.calculateLevelStrength(prices, level, tolerance);
        if (strength > 2) {
          levels.push({ level, strength });
        }
      }
    }

    return levels.sort((a, b) => b.strength - a.strength).slice(0, 3);
  }

  private calculateLevelStrength(prices: number[], level: number, tolerance: number): number {
    let touches = 0;
    const range = level * tolerance;

    for (const price of prices) {
      if (Math.abs(price - level) <= range) {
        touches++;
      }
    }

    return touches;
  }

  private calculateTrend(prices: number[]): { direction: string; strength: string } {
    if (prices.length < 2) return { direction: "unknown", strength: "weak" };

    const first = prices[0];
    const last = prices[prices.length - 1];
    const change = (last - first) / first;

    let direction = "sideways";
    if (change > 0.02) direction = "uptrend";
    else if (change < -0.02) direction = "downtrend";

    const strength = Math.abs(change) > 0.05 ? "strong" : "weak";

    return { direction, strength };
  }

  private analyzeVolumePattern(volumes: number[], prices: number[]): any {
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;

    const volumeRatio = recentVolume / avgVolume;
    let analysis = "Normal volume activity";

    if (volumeRatio > 1.5) {
      analysis = "High volume - potential breakout or significant move";
    } else if (volumeRatio < 0.5) {
      analysis = "Low volume - consolidation or lack of interest";
    }

    return {
      averageVolume: avgVolume,
      recentVolume,
      volumeRatio,
      analysis,
    };
  }
}
