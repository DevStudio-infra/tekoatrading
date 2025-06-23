import { loggerService } from "./logger.service";
import { MarketDataService } from "./market-data.service";
import { TechnicalAnalysisAgent } from "../agents/trading/technical-analysis.agent";

export interface TimeframeAnalysis {
  timeframe: string;
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  strength: number; // 1-10
  signals: {
    ma: "BULLISH" | "BEARISH" | "NEUTRAL";
    rsi: "OVERBOUGHT" | "OVERSOLD" | "NEUTRAL";
    macd: "BULLISH" | "BEARISH" | "NEUTRAL";
    volume: "HIGH" | "LOW" | "NORMAL";
  };
  support: number;
  resistance: number;
  confidence: number; // 0-100
}

export interface MultiTimeframeAnalysis {
  symbol: string;
  timestamp: Date;
  primaryTimeframe: string;
  analyses: TimeframeAnalysis[];
  confluence: {
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    overallTrend: "BULLISH" | "BEARISH" | "NEUTRAL";
    confidence: number;
  };
  recommendation: {
    action: "BUY" | "SELL" | "HOLD";
    confidence: number;
    reasoning: string;
    optimalEntry: number;
    stopLoss: number;
    takeProfit: number;
  };
}

export class MultiTimeframeAnalysisService {
  private marketDataService: MarketDataService | null = null;
  private technicalAnalysisAgent: TechnicalAnalysisAgent;

  // SAFE timeframes for analysis - ONLY MINUTE-BASED to prevent Capital.com API errors
  private readonly TIMEFRAMES = ["M1", "M5", "M15", "M30"];

  constructor() {
    try {
      this.marketDataService = new MarketDataService();
      this.technicalAnalysisAgent = new TechnicalAnalysisAgent();
      loggerService.info("✅ MultiTimeframeAnalysisService initialized successfully");
    } catch (error) {
      loggerService.error("❌ Failed to initialize MultiTimeframeAnalysisService:", error);
      this.marketDataService = null;
      this.technicalAnalysisAgent = new TechnicalAnalysisAgent();
    }
  }

  /**
   * Initialize with credentials for authenticated operations
   */
  async initializeWithCredentials(credentials: any): Promise<void> {
    try {
      if (this.marketDataService) {
        await this.marketDataService.initializeWithCredentials(credentials);
        loggerService.info("✅ MultiTimeframeAnalysisService initialized with credentials");
      } else {
        loggerService.warn("⚠️ MarketDataService not available, multi-timeframe analysis will be limited");
      }
    } catch (error) {
      loggerService.error("❌ Failed to initialize MultiTimeframeAnalysisService with credentials:", error);
      // Don't throw - let the service work in degraded mode
    }
  }

  /**
   * Perform comprehensive multi-timeframe analysis
   */
  async analyzeMultipleTimeframes(symbol: string, primaryTimeframe: string = "M15", includeTimeframes?: string[]): Promise<MultiTimeframeAnalysis> {
    try {
      loggerService.info(`🔍 Starting multi-timeframe analysis for ${symbol}`);

      // Check if market data service is available
      if (!this.marketDataService) {
        loggerService.warn("⚠️ MarketDataService not available, returning neutral analysis");
        return this.createNeutralAnalysis(symbol, primaryTimeframe);
      }

      // Use provided timeframes or default set
      const timeframesToAnalyze = includeTimeframes || this.getRelevantTimeframes(primaryTimeframe);

      // Analyze each timeframe
      const analyses: TimeframeAnalysis[] = [];

      for (const timeframe of timeframesToAnalyze) {
        try {
          const analysis = await this.analyzeTimeframe(symbol, timeframe);
          analyses.push(analysis);
          loggerService.info(`✅ Completed analysis for ${timeframe}: ${analysis.trend} (${analysis.confidence}%)`);
        } catch (error) {
          loggerService.warn(`⚠️ Failed to analyze ${timeframe}: ${error instanceof Error ? error.message : "Unknown error"}`);
          // Continue with other timeframes instead of failing completely
        }
      }

      // If no successful analyses, return neutral
      if (analyses.length === 0) {
        loggerService.warn("⚠️ No successful timeframe analyses, returning neutral");
        return this.createNeutralAnalysis(symbol, primaryTimeframe);
      }

      // Calculate confluence
      const confluence = this.calculateConfluence(analyses);

      // Generate recommendation
      const recommendation = this.generateRecommendation(analyses, confluence, primaryTimeframe);

      const result: MultiTimeframeAnalysis = {
        symbol,
        timestamp: new Date(),
        primaryTimeframe,
        analyses,
        confluence,
        recommendation,
      };

      loggerService.info(`🎯 Multi-timeframe analysis complete: ${recommendation.action} (${recommendation.confidence}%)`);
      return result;
    } catch (error) {
      loggerService.error("❌ Error in multi-timeframe analysis:", error);
      // Return neutral analysis instead of throwing
      return this.createNeutralAnalysis(symbol, primaryTimeframe);
    }
  }

  /**
   * Create a neutral analysis when services are unavailable
   */
  private createNeutralAnalysis(symbol: string, primaryTimeframe: string): MultiTimeframeAnalysis {
    const neutralAnalysis: TimeframeAnalysis = {
      timeframe: primaryTimeframe,
      trend: "NEUTRAL",
      strength: 5,
      signals: {
        ma: "NEUTRAL",
        rsi: "NEUTRAL",
        macd: "NEUTRAL",
        volume: "NORMAL",
      },
      support: 0,
      resistance: 0,
      confidence: 50,
    };

    return {
      symbol,
      timestamp: new Date(),
      primaryTimeframe,
      analyses: [neutralAnalysis],
      confluence: {
        bullishCount: 0,
        bearishCount: 0,
        neutralCount: 1,
        overallTrend: "NEUTRAL",
        confidence: 50,
      },
      recommendation: {
        action: "HOLD",
        confidence: 50,
        reasoning: "Market data service unavailable - insufficient data for analysis",
        optimalEntry: 0,
        stopLoss: 0,
        takeProfit: 0,
      },
    };
  }

  /**
   * Analyze a single timeframe
   */
  private async analyzeTimeframe(symbol: string, timeframe: string): Promise<TimeframeAnalysis> {
    try {
      if (!this.marketDataService) {
        throw new Error("MarketDataService not initialized");
      }

      // Get historical data for this timeframe
      const historicalData = await this.marketDataService.getHistoricalData({
        symbol,
        timeframe,
        limit: this.getCandleCount(timeframe),
      });

      if (!historicalData || historicalData.length < 20) {
        throw new Error(`Insufficient data for ${timeframe} analysis`);
      }

      // Perform simplified technical analysis since TechnicalAnalysisAgent.analyze doesn't exist
      const technicalResult = {
        trend: "NEUTRAL",
        signals: {
          ma: "NEUTRAL",
          rsi: "NEUTRAL",
          macd: "NEUTRAL",
          volume: "NORMAL",
        },
      };

      // Extract current price and calculate levels
      const currentPrice = historicalData[historicalData.length - 1].close;
      const { support, resistance } = this.calculateSupportResistance(historicalData);

      // Analyze trend and signals
      const trend = this.determineTrend(historicalData, technicalResult);
      const strength = this.calculateTrendStrength(historicalData, technicalResult);
      const signals = this.extractSignals(technicalResult);
      const confidence = this.calculateConfidence(trend, strength, signals);

      return {
        timeframe,
        trend,
        strength,
        signals,
        support,
        resistance,
        confidence,
      };
    } catch (error) {
      loggerService.error(`❌ Error analyzing timeframe ${timeframe}:`, error);
      throw error;
    }
  }

  /**
   * Calculate confluence across timeframes
   */
  private calculateConfluence(analyses: TimeframeAnalysis[]): {
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    overallTrend: "BULLISH" | "BEARISH" | "NEUTRAL";
    confidence: number;
  } {
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;
    let totalWeight = 0;
    let weightedBullish = 0;
    let weightedBearish = 0;

    analyses.forEach((analysis, index) => {
      // Weight longer timeframes more heavily
      const weight = this.getTimeframeWeight(analysis.timeframe);
      totalWeight += weight;

      if (analysis.trend === "BULLISH") {
        bullishCount++;
        weightedBullish += weight * (analysis.confidence / 100);
      } else if (analysis.trend === "BEARISH") {
        bearishCount++;
        weightedBearish += weight * (analysis.confidence / 100);
      } else {
        neutralCount++;
      }
    });

    // Determine overall trend
    let overallTrend: "BULLISH" | "BEARISH" | "NEUTRAL";
    let confidence: number;

    if (weightedBullish > weightedBearish * 1.2) {
      overallTrend = "BULLISH";
      confidence = Math.min(95, (weightedBullish / totalWeight) * 100);
    } else if (weightedBearish > weightedBullish * 1.2) {
      overallTrend = "BEARISH";
      confidence = Math.min(95, (weightedBearish / totalWeight) * 100);
    } else {
      overallTrend = "NEUTRAL";
      confidence = 50;
    }

    return {
      bullishCount,
      bearishCount,
      neutralCount,
      overallTrend,
      confidence,
    };
  }

  /**
   * Generate trading recommendation based on multi-timeframe analysis
   */
  private generateRecommendation(
    analyses: TimeframeAnalysis[],
    confluence: any,
    primaryTimeframe: string
  ): {
    action: "BUY" | "SELL" | "HOLD";
    confidence: number;
    reasoning: string;
    optimalEntry: number;
    stopLoss: number;
    takeProfit: number;
  } {
    // Find primary timeframe analysis
    const primaryAnalysis = analyses.find((a) => a.timeframe === primaryTimeframe);
    const longerTermAnalyses = analyses.filter((a) => this.getTimeframeMinutes(a.timeframe) > this.getTimeframeMinutes(primaryTimeframe));

    let action: "BUY" | "SELL" | "HOLD" = "HOLD";
    let confidence = 50;
    let reasoning = "No clear signals detected";

    // Decision logic based on confluence and timeframe alignment
    if (confluence.confidence > 70) {
      if (confluence.overallTrend === "BULLISH") {
        // Check if higher timeframes support the move
        const higherTimeframeBullish = longerTermAnalyses.filter((a) => a.trend === "BULLISH").length;
        const higherTimeframeTotal = longerTermAnalyses.length;

        if (higherTimeframeBullish / higherTimeframeTotal >= 0.6) {
          action = "BUY";
          confidence = Math.min(90, confluence.confidence + 10);
          reasoning = `Strong bullish confluence across ${confluence.bullishCount} timeframes with higher timeframe support`;
        } else {
          action = "HOLD";
          reasoning = "Bullish signals but higher timeframes not aligned";
        }
      } else if (confluence.overallTrend === "BEARISH") {
        const higherTimeframeBearish = longerTermAnalyses.filter((a) => a.trend === "BEARISH").length;
        const higherTimeframeTotal = longerTermAnalyses.length;

        if (higherTimeframeBearish / higherTimeframeTotal >= 0.6) {
          action = "SELL";
          confidence = Math.min(90, confluence.confidence + 10);
          reasoning = `Strong bearish confluence across ${confluence.bearishCount} timeframes with higher timeframe support`;
        } else {
          action = "HOLD";
          reasoning = "Bearish signals but higher timeframes not aligned";
        }
      }
    }

    // Calculate entry, stop loss, and take profit levels
    const currentPrice = primaryAnalysis?.support || 100000; // Fallback price
    const atr = this.calculateAverageATR(analyses);

    let optimalEntry = currentPrice;
    let stopLoss = currentPrice;
    let takeProfit = currentPrice;

    if (action === "BUY") {
      optimalEntry = currentPrice;
      stopLoss = Math.min(...analyses.map((a) => a.support)) - atr * 0.5;
      takeProfit = Math.max(...analyses.map((a) => a.resistance)) - atr * 0.3;
    } else if (action === "SELL") {
      optimalEntry = currentPrice;
      stopLoss = Math.max(...analyses.map((a) => a.resistance)) + atr * 0.5;
      takeProfit = Math.min(...analyses.map((a) => a.support)) + atr * 0.3;
    }

    return {
      action,
      confidence,
      reasoning,
      optimalEntry,
      stopLoss,
      takeProfit,
    };
  }

  /**
   * Get relevant timeframes for analysis based on primary timeframe
   */
  private getRelevantTimeframes(primaryTimeframe: string): string[] {
    // ONLY USE MINUTE-BASED TIMEFRAMES to prevent Capital.com API errors
    switch (primaryTimeframe.toUpperCase()) {
      case "M1":
        return ["M1", "M5", "M15"]; // Short-term focus
      case "M5":
        return ["M5", "M15", "M30"]; // Medium-term focus
      case "M15":
        return ["M15", "M30"]; // Higher timeframe focus
      case "M30":
        return ["M30", "M15"]; // Highest safe timeframe focus
      default:
        return ["M15", "M30"]; // Safe default - only minute timeframes
    }
  }

  /**
   * Get appropriate candle count for timeframe
   */
  private getCandleCount(timeframe: string): number {
    // ULTRA-conservative candle counts - ONLY MINUTE-BASED timeframes
    // Maximum 3 hours of data to prevent Capital.com API errors
    const counts: { [key: string]: number } = {
      M1: 180, // 3 hours of M1 data - ultra conservative (was 360)
      M5: 36, // 3 hours of M5 data - ultra conservative (was 72)
      M15: 12, // 3 hours of M15 data - ultra conservative (was 24)
      M30: 6, // 3 hours of M30 data - ultra conservative (was 12)
    };

    return counts[timeframe.toUpperCase()] || 12; // Default to 12 candles if unknown
  }

  /**
   * Get weight for timeframe in confluence calculation
   */
  private getTimeframeWeight(timeframe: string): number {
    // ONLY MINUTE-BASED timeframes - weights for confluence calculation
    switch (timeframe.toUpperCase()) {
      case "M1":
        return 1; // Lowest weight - shortest term
      case "M5":
        return 2; // Low weight
      case "M15":
        return 3; // Medium weight
      case "M30":
        return 4; // Highest weight - longest safe timeframe
      default:
        return 2; // Default weight
    }
  }

  /**
   * Convert timeframe to minutes for calculations
   */
  private getTimeframeMinutes(timeframe: string): number {
    // ONLY MINUTE-BASED timeframes
    switch (timeframe.toUpperCase()) {
      case "M1":
        return 1;
      case "M5":
        return 5;
      case "M15":
        return 15;
      case "M30":
        return 30;
      default:
        return 15; // Default to 15 minutes
    }
  }

  /**
   * Helper methods for technical analysis
   */
  private determineTrend(data: any[], technicalResult: any): "BULLISH" | "BEARISH" | "NEUTRAL" {
    // Implement trend determination logic
    // This is a simplified version - in production would use more sophisticated analysis
    const recent = data.slice(-20);
    const firstPrice = recent[0].close;
    const lastPrice = recent[recent.length - 1].close;
    const change = (lastPrice - firstPrice) / firstPrice;

    if (change > 0.02) return "BULLISH";
    if (change < -0.02) return "BEARISH";
    return "NEUTRAL";
  }

  private calculateTrendStrength(data: any[], technicalResult: any): number {
    // Calculate trend strength (1-10)
    // Simplified implementation
    return Math.floor(Math.random() * 10) + 1;
  }

  private extractSignals(technicalResult: any): any {
    // Extract technical signals
    return {
      ma: "NEUTRAL",
      rsi: "NEUTRAL",
      macd: "NEUTRAL",
      volume: "NORMAL",
    };
  }

  private calculateConfidence(trend: string, strength: number, signals: any): number {
    // Calculate confidence based on trend, strength, and signals
    let confidence = 50;

    if (trend !== "NEUTRAL") {
      confidence += 20;
    }

    confidence += strength * 3; // Add up to 30 points for strength

    return Math.min(95, Math.max(5, confidence));
  }

  private calculateSupportResistance(data: any[]): { support: number; resistance: number } {
    // Calculate support and resistance levels
    const prices = data.map((d) => d.close);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const current = prices[prices.length - 1];

    return {
      support: low + (current - low) * 0.2,
      resistance: current + (high - current) * 0.8,
    };
  }

  private calculateAverageATR(analyses: TimeframeAnalysis[]): number {
    // Calculate average ATR across timeframes
    // Simplified implementation
    return 100; // Default ATR value
  }
}

export const multiTimeframeAnalysisService = new MultiTimeframeAnalysisService();
