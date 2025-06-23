import { loggerService } from "./logger.service";
import { MarketDataService } from "./market-data.service";

export interface SimpleTimeframeAnalysis {
  timeframe: string;
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  momentum: "STRONG" | "WEAK" | "NEUTRAL";
  confidence: number; // 0-100
  supportLevel: number;
  resistanceLevel: number;
  volume: "HIGH" | "LOW" | "NORMAL";
  summary: string;
}

export interface TwoTimeframeContext {
  symbol: string;
  primaryTimeframe: string;
  higherTimeframe: string;
  higherTimeframeAnalysis: SimpleTimeframeAnalysis;
  portfolioContext: {
    balance: number;
    openPositions: number;
    riskExposure: number;
    maxPositions: number;
  };
  timestamp: Date;
}

export class SimplifiedTimeframeAnalysisService {
  private marketDataService: MarketDataService | null = null;

  // Timeframe hierarchy mapping (primary -> higher)
  private readonly TIMEFRAME_MAPPING: Record<string, string> = {
    M1: "M15", // 1min -> 15min (avoid HOUR completely)
    M5: "M15", // 5min -> 15min (avoid HOUR completely)
    M15: "M30", // 15min -> 30min (avoid HOUR completely)
    M30: "M15", // 30min -> 15min (avoid HOUR completely)
    H1: "M15", // 1hour -> 15min (avoid HOUR completely)
    H4: "M15", // 4hour -> 15min (avoid HOUR completely)
    D1: "M15", // daily -> 15min (avoid HOUR completely)
  };

  constructor() {
    try {
      this.marketDataService = new MarketDataService();
      loggerService.info("✅ SimplifiedTimeframeAnalysisService initialized successfully");
    } catch (error) {
      loggerService.error("❌ Failed to initialize SimplifiedTimeframeAnalysisService:", error);
      this.marketDataService = null;
    }
  }

  /**
   * Analyze higher timeframe to provide context for primary timeframe decision
   */
  async analyzeHigherTimeframe(symbol: string, primaryTimeframe: string, brokerCredentials: any, portfolioContext: any): Promise<TwoTimeframeContext> {
    try {
      const higherTimeframe = this.getHigherTimeframe(primaryTimeframe);
      loggerService.info(`🔍 Analyzing higher timeframe ${higherTimeframe} for ${symbol} (primary: ${primaryTimeframe})`);

      // Check if market data service is available
      if (!this.marketDataService) {
        loggerService.warn("⚠️ MarketDataService not available, returning neutral analysis");
        return this.createNeutralContext(symbol, primaryTimeframe, higherTimeframe, portfolioContext);
      }

      // Initialize market data service with user's broker credentials
      await this.initializeWithCredentials(brokerCredentials);

      // Get historical data for higher timeframe
      const historicalData = await this.getHistoricalData(symbol, higherTimeframe);

      if (!historicalData || historicalData.length < 1) {
        loggerService.warn(`⚠️ Insufficient data for ${higherTimeframe} (got ${historicalData?.length || 0} points, need at least 1), returning neutral analysis`);
        return this.createNeutralContext(symbol, primaryTimeframe, higherTimeframe, portfolioContext);
      }

      // Perform simple technical analysis
      const analysis = this.performSimpleTechnicalAnalysis(historicalData, higherTimeframe);

      loggerService.info(`✅ Higher timeframe analysis complete: ${analysis.trend} (${analysis.confidence}%)`);

      return {
        symbol,
        primaryTimeframe,
        higherTimeframe,
        higherTimeframeAnalysis: analysis,
        portfolioContext,
        timestamp: new Date(),
      };
    } catch (error: any) {
      // EMERGENCY: Don't retry on Capital.com data limitation errors
      if (error.message?.includes("error.invalid.from") || error.message?.includes("error.too-many.requests") || error.response?.status === 429 || error.response?.status === 400) {
        loggerService.warn(
          `💡 Capital.com data limitation detected (${error.message?.includes("error.invalid.from") ? "invalid date range" : "rate limit"}), returning neutral analysis immediately`
        );
      } else {
        loggerService.error("❌ Error in higher timeframe analysis:", error);
      }

      const higherTimeframe = this.getHigherTimeframe(primaryTimeframe);
      return this.createNeutralContext(symbol, primaryTimeframe, higherTimeframe, portfolioContext);
    }
  }

  /**
   * Get the appropriate higher timeframe for analysis
   */
  private getHigherTimeframe(primaryTimeframe: string): string {
    return this.TIMEFRAME_MAPPING[primaryTimeframe] || "H4";
  }

  /**
   * Initialize market data service with user's broker credentials
   */
  private async initializeWithCredentials(brokerCredentials: any): Promise<void> {
    if (!this.marketDataService || !brokerCredentials) {
      return;
    }

    try {
      // Initialize with user's specific credentials
      await (this.marketDataService as any).initializeWithCredentials(brokerCredentials);
      loggerService.info("✅ Market data service initialized with user credentials");
    } catch (error) {
      loggerService.warn("⚠️ Failed to initialize with user credentials, using default:", error);
    }
  }

  /**
   * Get historical data for the specified timeframe
   */
  private async getHistoricalData(symbol: string, timeframe: string): Promise<any[] | null> {
    if (!this.marketDataService) {
      return null;
    }

    try {
      const candleCount = this.getCandleCount(timeframe);

      // Add retry logic with exponential backoff
      let lastError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const data = await this.marketDataService.getHistoricalData({
            symbol,
            timeframe,
            limit: candleCount,
          });

          if (data && data.length > 0) {
            loggerService.info(`✅ Got ${data.length} data points for ${symbol} ${timeframe} (attempt ${attempt})`);
            return data;
          }
        } catch (error) {
          lastError = error;
          if (attempt < 3) {
            const delay = attempt * 2000; // 2s, 4s delays
            loggerService.warn(`⚠️ Attempt ${attempt} failed for ${symbol} ${timeframe}, retrying in ${delay}ms`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError;
    } catch (error) {
      loggerService.error(`❌ Failed to get historical data for ${symbol} ${timeframe}:`, error);
      return null;
    }
  }

  /**
   * Perform simple technical analysis on historical data
   */
  private performSimpleTechnicalAnalysis(data: any[], timeframe: string): SimpleTimeframeAnalysis {
    const prices = data.map((candle) => candle.close);
    const volumes = data.map((candle) => candle.volume || 0);
    const highs = data.map((candle) => candle.high);
    const lows = data.map((candle) => candle.low);

    // Adjust minimum data requirements based on available data
    const minDataForAnalysis = Math.min(5, Math.floor(data.length * 0.8)); // At least 5 points or 80% of available data

    if (data.length < minDataForAnalysis) {
      loggerService.warn(`⚠️ Only ${data.length} data points for ${timeframe}, need at least ${minDataForAnalysis}`);
      return this.createFallbackAnalysis(timeframe, prices[prices.length - 1] || 0);
    }

    // Calculate simple moving averages with adaptive periods
    const shortPeriod = Math.min(5, Math.floor(prices.length / 3));
    const longPeriod = Math.min(10, Math.floor(prices.length / 2));

    const smaShort = this.calculateSMA(prices, shortPeriod);
    const smaLong = this.calculateSMA(prices, longPeriod);
    const currentPrice = prices[prices.length - 1];

    // Determine trend
    let trend: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
    let momentum: "STRONG" | "WEAK" | "NEUTRAL" = "NEUTRAL";
    let confidence = 50;

    if (prices.length >= shortPeriod && currentPrice > smaShort) {
      if (prices.length >= longPeriod && smaShort > smaLong) {
        trend = "BULLISH";
        momentum = this.calculateMomentumStrength(prices) > 0.6 ? "STRONG" : "WEAK";
        confidence = 60 + (momentum === "STRONG" ? 10 : 0);
      } else {
        trend = "BULLISH";
        confidence = 55;
      }
    } else if (prices.length >= shortPeriod && currentPrice < smaShort) {
      if (prices.length >= longPeriod && smaShort < smaLong) {
        trend = "BEARISH";
        momentum = this.calculateMomentumStrength(prices) > 0.6 ? "STRONG" : "WEAK";
        confidence = 60 + (momentum === "STRONG" ? 10 : 0);
      } else {
        trend = "BEARISH";
        confidence = 55;
      }
    }

    // Calculate support and resistance with available data
    const lookbackPeriod = Math.min(10, prices.length);
    const supportLevel = Math.min(...lows.slice(-lookbackPeriod));
    const resistanceLevel = Math.max(...highs.slice(-lookbackPeriod));

    // Analyze volume if available
    const volume: "HIGH" | "LOW" | "NORMAL" = "NORMAL"; // Default to normal when volume data is limited
    if (volumes.length >= 3) {
      const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
      const recentVolume = volumes.slice(-Math.min(3, volumes.length)).reduce((sum, vol) => sum + vol, 0) / Math.min(3, volumes.length);

      if (avgVolume > 0) {
        if (recentVolume > avgVolume * 1.2) {
          // volume = "HIGH";
        } else if (recentVolume < avgVolume * 0.8) {
          // volume = "LOW";
        }
      }
    }

    // Generate summary
    const summary = this.generateAnalysisSummary(trend, momentum, volume, confidence, timeframe, data.length);

    return {
      timeframe,
      trend,
      momentum,
      confidence,
      supportLevel,
      resistanceLevel,
      volume,
      summary,
    };
  }

  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];

    const slice = prices.slice(-period);
    return slice.reduce((sum, price) => sum + price, 0) / period;
  }

  /**
   * Calculate momentum strength based on price movement
   */
  private calculateMomentumStrength(prices: number[]): number {
    if (prices.length < 10) return 0.5;

    const recentPrices = prices.slice(-10);
    const priceChanges = [];

    for (let i = 1; i < recentPrices.length; i++) {
      priceChanges.push((recentPrices[i] - recentPrices[i - 1]) / recentPrices[i - 1]);
    }

    const avgChange = Math.abs(priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length);
    return Math.min(1, avgChange * 100); // Normalize to 0-1 range
  }

  /**
   * Create fallback analysis when data is too limited
   */
  private createFallbackAnalysis(timeframe: string, currentPrice: number): SimpleTimeframeAnalysis {
    return {
      timeframe,
      trend: "NEUTRAL",
      momentum: "NEUTRAL",
      confidence: 30, // Low confidence due to limited data
      supportLevel: currentPrice * 0.98, // 2% below current price
      resistanceLevel: currentPrice * 1.02, // 2% above current price
      volume: "NORMAL",
      summary: `${timeframe} analysis with limited data (${currentPrice ? "current price available" : "no price data"}). Confidence: 30%`,
    };
  }

  /**
   * Generate human-readable analysis summary
   */
  private generateAnalysisSummary(trend: string, momentum: string, volume: string, confidence: number, timeframe: string, dataPoints: number): string {
    const trendDesc = trend === "BULLISH" ? "upward" : trend === "BEARISH" ? "downward" : "sideways";
    const momentumDesc = momentum === "STRONG" ? "strong" : momentum === "WEAK" ? "weak" : "neutral";
    const volumeDesc = volume === "HIGH" ? "above average" : volume === "LOW" ? "below average" : "normal";

    return `${timeframe} shows ${trendDesc} trend with ${momentumDesc} momentum (${dataPoints} data points). Volume is ${volumeDesc}. Confidence: ${confidence}%`;
  }

  /**
   * Get appropriate candle count for timeframe
   */
  private getCandleCount(timeframe: string): number {
    // EMERGENCY: Ultra-minimal candle counts for 30-minute window
    // Designed to work within Capital.com's strictest limits
    const counts: Record<string, number> = {
      M1: 30, // 30 minutes of M1 data - fits exactly in 30min window
      M5: 6, // 30 minutes of M5 data - fits exactly in 30min window
      M15: 2, // 30 minutes of M15 data - fits exactly in 30min window
      M30: 1, // 30 minutes of M30 data - fits exactly in 30min window
      H1: 1, // 1 hour of H1 data - minimal but should work
      H4: 1, // 4 hours of H4 data - minimal but should work
      D1: 1, // 1 day of daily data - minimal
      W1: 1, // 1 week of weekly data - minimal
    };

    return counts[timeframe] || 1; // Default to 1 candle minimum
  }

  /**
   * Create neutral context when analysis fails
   */
  private createNeutralContext(symbol: string, primaryTimeframe: string, higherTimeframe: string, portfolioContext: any): TwoTimeframeContext {
    return {
      symbol,
      primaryTimeframe,
      higherTimeframe,
      higherTimeframeAnalysis: {
        timeframe: higherTimeframe,
        trend: "NEUTRAL",
        momentum: "NEUTRAL",
        confidence: 50,
        supportLevel: 0,
        resistanceLevel: 0,
        volume: "NORMAL",
        summary: `${higherTimeframe} analysis unavailable - insufficient data`,
      },
      portfolioContext,
      timestamp: new Date(),
    };
  }

  /**
   * Format context for LLM consumption
   */
  formatContextForLLM(context: TwoTimeframeContext): string {
    const { higherTimeframeAnalysis, portfolioContext } = context;

    return `
HIGHER TIMEFRAME CONTEXT (${context.higherTimeframe}):
- Trend: ${higherTimeframeAnalysis.trend}
- Momentum: ${higherTimeframeAnalysis.momentum}
- Volume: ${higherTimeframeAnalysis.volume}
- Support: ${higherTimeframeAnalysis.supportLevel.toFixed(2)}
- Resistance: ${higherTimeframeAnalysis.resistanceLevel.toFixed(2)}
- Confidence: ${higherTimeframeAnalysis.confidence}%
- Summary: ${higherTimeframeAnalysis.summary}

PORTFOLIO CONTEXT:
- Balance: $${portfolioContext.balance?.toFixed(2) || "N/A"}
- Open Positions: ${portfolioContext.openPositions || 0}
- Risk Exposure: ${portfolioContext.riskExposure?.toFixed(2) || "N/A"}%
- Max Positions: ${portfolioContext.maxPositions || 1}

IMPORTANT: Use this higher timeframe context to validate your ${context.primaryTimeframe} chart analysis.
If higher timeframe shows strong opposing trend, be more cautious with trade decisions.
    `.trim();
  }
}
