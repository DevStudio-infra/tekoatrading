import { BaseAgent } from "../../ai/base-agent";
import { logger } from "../../logger";

export interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

export interface SwingLevels {
  swingHighs: number[];
  swingLows: number[];
}

export interface SupportResistance {
  support: number;
  resistance: number;
  strength: number; // Number of times level was tested
}

export interface TechnicalAnalysisResult {
  atr: number;
  volatility: number;
  swingLevels: SwingLevels;
  supportResistance: SupportResistance;
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  trendStrength: number; // 1-10
  keyLevels: {
    nearestSupport: number;
    nearestResistance: number;
    pivotLevel: number;
  };
  priceAction: {
    momentum: number;
    volatilityRank: "LOW" | "MEDIUM" | "HIGH";
    marketStructure: "UPTREND" | "DOWNTREND" | "SIDEWAYS";
  };
  reasoning: string[];
}

export class TechnicalAnalysisAgent extends BaseAgent {
  constructor() {
    super("TechnicalAnalysisAgent");
  }

  // Base class compatibility method
  async analyze(data: any): Promise<any> {
    if (data.candleData && data.currentPrice && data.symbol) {
      return this.analyzeTechnical(data.candleData, data.currentPrice, data.symbol);
    }
    throw new Error("TechnicalAnalysisAgent requires candleData, currentPrice, and symbol");
  }

  async analyzeTechnical(
    candleData: CandleData[],
    currentPrice: number,
    symbol: string,
  ): Promise<TechnicalAnalysisResult> {
    try {
      logger.info(`[TECHNICAL] Analyzing ${symbol} with ${candleData.length} candles`);

      if (!candleData || candleData.length < 20) {
        return this.getFallbackAnalysis(currentPrice, symbol);
      }

      // Core technical calculations
      const atr = this.calculateATR(candleData);
      const volatility = this.calculateVolatility(candleData);
      const swingLevels = this.findSwingHighsLows(candleData);
      const supportResistance = this.calculatePreciseSupportResistance(candleData);

      // Trend analysis
      const trendAnalysis = this.analyzeTrend(candleData);

      // Price action analysis
      const priceAction = this.analyzePriceAction(candleData, atr);

      // Key levels identification
      const keyLevels = this.identifyKeyLevels(
        candleData,
        currentPrice,
        swingLevels,
        supportResistance,
      );

      const reasoning = [
        `ATR: ${atr.toFixed(2)} (${priceAction.volatilityRank} volatility)`,
        `Trend: ${trendAnalysis.trend} (strength: ${trendAnalysis.trendStrength}/10)`,
        `Market Structure: ${priceAction.marketStructure}`,
        `Support: ${supportResistance.support.toFixed(2)}, Resistance: ${supportResistance.resistance.toFixed(2)}`,
        `Swing levels: ${swingLevels.swingHighs.length} highs, ${swingLevels.swingLows.length} lows identified`,
      ];

      const result: TechnicalAnalysisResult = {
        atr,
        volatility,
        swingLevels,
        supportResistance,
        trend: trendAnalysis.trend,
        trendStrength: trendAnalysis.trendStrength,
        keyLevels,
        priceAction,
        reasoning,
      };

      logger.info(
        `[TECHNICAL] ${symbol} analysis complete: ${trendAnalysis.trend} trend, ATR=${atr.toFixed(2)}`,
      );
      return result;
    } catch (error) {
      logger.error(`[TECHNICAL] Analysis error for ${symbol}:`, error);
      return this.getFallbackAnalysis(currentPrice, symbol);
    }
  }

  /**
   * Calculate Average True Range (ATR) for volatility measurement
   */
  private calculateATR(candles: CandleData[], period: number = 14): number {
    if (candles.length < period + 1) {
      // Fallback ATR estimation based on recent price range
      const recentCandles = candles.slice(-Math.min(candles.length, 10));
      const highestHigh = Math.max(...recentCandles.map((c) => c.high));
      const lowestLow = Math.min(...recentCandles.map((c) => c.low));
      return (highestHigh - lowestLow) / recentCandles.length;
    }

    const trueRanges: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];

      const trueRange = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close),
      );

      trueRanges.push(trueRange);
    }

    // Calculate ATR as average of recent true ranges
    const recentTrueRanges = trueRanges.slice(-period);
    return recentTrueRanges.reduce((sum, tr) => sum + tr, 0) / recentTrueRanges.length;
  }

  /**
   * Calculate price volatility (standard deviation of returns)
   */
  private calculateVolatility(candles: CandleData[]): number {
    if (candles.length < 2) return 0.02;

    const returns: number[] = [];
    for (let i = 1; i < candles.length; i++) {
      const returnPct = (candles[i].close - candles[i - 1].close) / candles[i - 1].close;
      returns.push(returnPct);
    }

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;

    return Math.sqrt(variance);
  }

  /**
   * Find swing highs and lows using a lookback period
   */
  private findSwingHighsLows(candles: CandleData[], lookback: number = 5): SwingLevels {
    const swingHighs: number[] = [];
    const swingLows: number[] = [];

    if (candles.length < lookback * 2 + 1) {
      return { swingHighs, swingLows };
    }

    for (let i = lookback; i < candles.length - lookback; i++) {
      const currentHigh = candles[i].high;
      const currentLow = candles[i].low;

      // Check for swing high
      let isSwingHigh = true;
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && candles[j].high >= currentHigh) {
          isSwingHigh = false;
          break;
        }
      }

      // Check for swing low
      let isSwingLow = true;
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && candles[j].low <= currentLow) {
          isSwingLow = false;
          break;
        }
      }

      if (isSwingHigh) swingHighs.push(currentHigh);
      if (isSwingLow) swingLows.push(currentLow);
    }

    return { swingHighs, swingLows };
  }

  /**
   * Calculate support and resistance levels using multiple methods
   */
  private calculatePreciseSupportResistance(candles: CandleData[]): SupportResistance {
    if (candles.length < 20) {
      const fallbackPrice = candles[candles.length - 1]?.close || 50000;
      return {
        support: fallbackPrice * 0.995,
        resistance: fallbackPrice * 1.005,
        strength: 1,
      };
    }

    // Use recent candles for more relevant levels
    const recentCandles = candles.slice(-50);
    const { swingHighs, swingLows } = this.findSwingHighsLows(recentCandles, 3);

    // Group similar levels and find strongest
    const resistanceGroups = this.groupSimilarLevels(swingHighs);
    const supportGroups = this.groupSimilarLevels(swingLows);

    // Find the strongest levels (most tests)
    const strongestResistance = resistanceGroups.reduce(
      (prev, curr) => (curr.count > prev.count ? curr : prev),
      { level: Math.max(...swingHighs), count: 1 },
    );

    const strongestSupport = supportGroups.reduce(
      (prev, curr) => (curr.count > prev.count ? curr : prev),
      { level: Math.min(...swingLows), count: 1 },
    );

    return {
      support: strongestSupport.level,
      resistance: strongestResistance.level,
      strength: Math.max(strongestSupport.count, strongestResistance.count),
    };
  }

  /**
   * Group similar price levels within tolerance
   */
  private groupSimilarLevels(
    levels: number[],
    tolerance: number = 0.002,
  ): Array<{ level: number; count: number }> {
    const groups: Array<{ level: number; count: number }> = [];

    for (const level of levels) {
      const existingGroup = groups.find((g) => Math.abs(g.level - level) / level < tolerance);

      if (existingGroup) {
        existingGroup.count++;
        existingGroup.level = (existingGroup.level + level) / 2; // Average the levels
      } else {
        groups.push({ level, count: 1 });
      }
    }

    return groups.sort((a, b) => b.count - a.count); // Sort by strength
  }

  /**
   * Analyze trend direction and strength
   */
  private analyzeTrend(candles: CandleData[]): {
    trend: "BULLISH" | "BEARISH" | "NEUTRAL";
    trendStrength: number;
  } {
    if (candles.length < 20) {
      return { trend: "NEUTRAL", trendStrength: 5 };
    }

    const recent20 = candles.slice(-20);
    const recent50 = candles.slice(-Math.min(50, candles.length));

    // Simple moving averages
    const sma20 = recent20.reduce((sum, c) => sum + c.close, 0) / recent20.length;
    const sma50 = recent50.reduce((sum, c) => sum + c.close, 0) / recent50.length;
    const currentPrice = candles[candles.length - 1].close;

    // Trend determination
    let trend: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
    let trendStrength = 5;

    if (currentPrice > sma20 && sma20 > sma50) {
      trend = "BULLISH";
      trendStrength = Math.min(10, 6 + Math.floor(((currentPrice - sma20) / sma20) * 100));
    } else if (currentPrice < sma20 && sma20 < sma50) {
      trend = "BEARISH";
      trendStrength = Math.min(10, 6 + Math.floor(((sma20 - currentPrice) / sma20) * 100));
    }

    return { trend, trendStrength };
  }

  /**
   * Analyze price action characteristics
   */
  private analyzePriceAction(
    candles: CandleData[],
    atr: number,
  ): {
    momentum: number;
    volatilityRank: "LOW" | "MEDIUM" | "HIGH";
    marketStructure: "UPTREND" | "DOWNTREND" | "SIDEWAYS";
  } {
    const recent = candles.slice(-10);
    const currentPrice = candles[candles.length - 1].close;
    const oldPrice = recent[0].close;

    // Momentum calculation
    const momentum = ((currentPrice - oldPrice) / oldPrice) * 100;

    // Volatility ranking
    const avgPrice = candles.slice(-20).reduce((sum, c) => sum + c.close, 0) / 20;
    const volatilityPercent = (atr / avgPrice) * 100;

    let volatilityRank: "LOW" | "MEDIUM" | "HIGH";
    if (volatilityPercent < 1) volatilityRank = "LOW";
    else if (volatilityPercent < 3) volatilityRank = "MEDIUM";
    else volatilityRank = "HIGH";

    // Market structure
    const { swingHighs, swingLows } = this.findSwingHighsLows(recent, 2);
    let marketStructure: "UPTREND" | "DOWNTREND" | "SIDEWAYS";

    if (swingHighs.length > 0 && swingLows.length > 0) {
      const recentHigh = Math.max(...swingHighs);
      const recentLow = Math.min(...swingLows);

      if (currentPrice > (recentHigh + recentLow) / 2 && momentum > 0) {
        marketStructure = "UPTREND";
      } else if (currentPrice < (recentHigh + recentLow) / 2 && momentum < 0) {
        marketStructure = "DOWNTREND";
      } else {
        marketStructure = "SIDEWAYS";
      }
    } else {
      marketStructure = "SIDEWAYS";
    }

    return { momentum, volatilityRank, marketStructure };
  }

  /**
   * Identify key price levels for trading decisions
   */
  private identifyKeyLevels(
    candles: CandleData[],
    currentPrice: number,
    swingLevels: SwingLevels,
    supportResistance: SupportResistance,
  ): { nearestSupport: number; nearestResistance: number; pivotLevel: number } {
    // Find nearest support below current price
    const supportsBelow = [...swingLevels.swingLows, supportResistance.support]
      .filter((level) => level < currentPrice)
      .sort((a, b) => b - a);

    // Find nearest resistance above current price
    const resistancesAbove = [...swingLevels.swingHighs, supportResistance.resistance]
      .filter((level) => level > currentPrice)
      .sort((a, b) => a - b);

    const nearestSupport = supportsBelow[0] || currentPrice * 0.99;
    const nearestResistance = resistancesAbove[0] || currentPrice * 1.01;
    const pivotLevel = (nearestSupport + nearestResistance) / 2;

    return { nearestSupport, nearestResistance, pivotLevel };
  }

  /**
   * Fallback analysis for insufficient data
   */
  private getFallbackAnalysis(currentPrice: number, symbol: string): TechnicalAnalysisResult {
    logger.warn(`[TECHNICAL] Using fallback analysis for ${symbol} - insufficient data`);

    return {
      atr: currentPrice * 0.005, // 0.5% of price as fallback ATR
      volatility: 0.02,
      swingLevels: { swingHighs: [], swingLows: [] },
      supportResistance: {
        support: currentPrice * 0.995,
        resistance: currentPrice * 1.005,
        strength: 1,
      },
      trend: "NEUTRAL",
      trendStrength: 5,
      keyLevels: {
        nearestSupport: currentPrice * 0.995,
        nearestResistance: currentPrice * 1.005,
        pivotLevel: currentPrice,
      },
      priceAction: {
        momentum: 0,
        volatilityRank: "MEDIUM",
        marketStructure: "SIDEWAYS",
      },
      reasoning: ["Fallback analysis due to insufficient historical data"],
    };
  }
}
