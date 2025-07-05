import { logger } from "../logger";
import { CandleData } from "../agents/core/technical-analysis.agent";

export interface OrderTypeRecommendation {
  orderType: "MARKET" | "LIMIT" | "STOP";
  reasoning: string;
  confidence: number;
  limitPrice?: number;
  stopPrice?: number;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  marketConditions: {
    volatility: "LOW" | "MEDIUM" | "HIGH";
    spread: "TIGHT" | "NORMAL" | "WIDE";
    volume: "LOW" | "MEDIUM" | "HIGH";
    trend: "STRONG" | "WEAK" | "SIDEWAYS";
  };
}

export class OrderTypeSelectionService {
  /**
   * Analyze market conditions and recommend optimal order type
   */
  async recommendOrderType(params: {
    direction: "BUY" | "SELL";
    currentPrice: number;
    aiConfidence: number;
    candleData: CandleData[];
    technicalAnalysis: any;
    marketIntelligence: any;
    timeframe: string;
    symbol: string;
  }): Promise<OrderTypeRecommendation> {
    try {
      logger.info(`🎯 Analyzing optimal order type for ${params.symbol} ${params.direction}`);

      // Analyze market conditions
      const marketConditions = await this.analyzeMarketConditions(
        params.candleData,
        params.currentPrice,
      );
      const volatility = this.calculateVolatility(params.candleData);
      const spread = this.estimateSpread(params.currentPrice, params.symbol);
      const urgency = this.determineUrgency(
        params.aiConfidence,
        params.technicalAnalysis,
        params.marketIntelligence,
      );

      // Decision logic based on market conditions
      const recommendation = this.makeOrderTypeDecision({
        ...params,
        marketConditions,
        volatility,
        spread,
        urgency,
      });

      logger.info(
        `✅ Order type recommendation: ${recommendation.orderType} (${recommendation.confidence}% confidence)`,
      );
      logger.info(
        `📊 Market conditions: Vol=${marketConditions.volatility}, Spread=${marketConditions.spread}, Urgency=${urgency}`,
      );

      return recommendation;
    } catch (error) {
      logger.error(`❌ Order type selection failed: ${error}`);
      return {
        orderType: "MARKET",
        reasoning: "Defaulting to MARKET due to analysis error",
        confidence: 50,
        urgency: "MEDIUM",
        marketConditions: {
          volatility: "MEDIUM",
          spread: "NORMAL",
          volume: "MEDIUM",
          trend: "SIDEWAYS",
        },
      };
    }
  }

  private async analyzeMarketConditions(
    candleData: CandleData[],
    currentPrice: number,
  ): Promise<OrderTypeRecommendation["marketConditions"]> {
    const volatility = this.calculateVolatility(candleData);
    const volume = this.analyzeVolume(candleData);
    const trend = this.analyzeTrend(candleData, currentPrice);
    const spread = this.estimateSpread(currentPrice, "DEFAULT");

    return {
      volatility: volatility > 0.02 ? "HIGH" : volatility > 0.01 ? "MEDIUM" : "LOW",
      spread: spread > 0.005 ? "WIDE" : spread > 0.002 ? "NORMAL" : "TIGHT",
      volume: volume > 0.8 ? "HIGH" : volume > 0.4 ? "MEDIUM" : "LOW",
      trend: trend > 0.015 ? "STRONG" : trend > 0.005 ? "WEAK" : "SIDEWAYS",
    };
  }

  private makeOrderTypeDecision(params: {
    direction: "BUY" | "SELL";
    currentPrice: number;
    aiConfidence: number;
    marketConditions: OrderTypeRecommendation["marketConditions"];
    volatility: number;
    spread: number;
    urgency: "LOW" | "MEDIUM" | "HIGH";
    technicalAnalysis: any;
    timeframe: string;
  }): OrderTypeRecommendation {
    const { direction, currentPrice, aiConfidence, marketConditions, urgency, timeframe } = params;

    // High urgency scenarios - use MARKET orders
    if (urgency === "HIGH") {
      return {
        orderType: "MARKET",
        reasoning: "High urgency situation requires immediate execution",
        confidence: 90,
        urgency,
        marketConditions,
      };
    }

    // High volatility scenarios - be cautious with LIMIT orders
    if (marketConditions.volatility === "HIGH") {
      if (aiConfidence > 80) {
        return {
          orderType: "MARKET",
          reasoning: "High volatility with strong signal - execute immediately",
          confidence: 85,
          urgency,
          marketConditions,
        };
      } else {
        return {
          orderType: "STOP",
          reasoning: "High volatility with moderate signal - wait for confirmation",
          confidence: 70,
          stopPrice: this.calculateStopPrice(direction, currentPrice, 0.02), // High volatility
          urgency,
          marketConditions,
        };
      }
    }

    // Low volatility + High confidence = LIMIT orders for better entry
    if (marketConditions.volatility === "LOW" && aiConfidence > 75) {
      const spreadValue = this.convertSpreadToNumber(marketConditions.spread);
      const limitPrice = this.calculateLimitPrice(direction, currentPrice, spreadValue);
      return {
        orderType: "LIMIT",
        reasoning: "Low volatility with high confidence - optimize entry with limit order",
        confidence: 80,
        limitPrice,
        urgency,
        marketConditions,
      };
    }

    // Strong trend + Medium confidence = STOP orders for trend confirmation
    if (marketConditions.trend === "STRONG" && aiConfidence > 65) {
      const stopPrice = this.calculateStopPrice(direction, currentPrice, 0.01); // Strong trend
      return {
        orderType: "STOP",
        reasoning: "Strong trend detected - wait for breakout confirmation",
        confidence: 75,
        stopPrice,
        urgency,
        marketConditions,
      };
    }

    // Scalping timeframes - prefer MARKET orders
    if (timeframe === "M1" || timeframe === "M5") {
      return {
        orderType: "MARKET",
        reasoning: "Scalping timeframe requires immediate execution",
        confidence: 85,
        urgency,
        marketConditions,
      };
    }

    // Default to MARKET for moderate confidence
    if (aiConfidence > 60) {
      return {
        orderType: "MARKET",
        reasoning: "Moderate confidence - execute with market order",
        confidence: 70,
        urgency,
        marketConditions,
      };
    }

    // Low confidence - use LIMIT orders to be conservative
    const spreadValue = this.convertSpreadToNumber(marketConditions.spread);
    const limitPrice = this.calculateLimitPrice(direction, currentPrice, spreadValue);
    return {
      orderType: "LIMIT",
      reasoning: "Low confidence - conservative entry with limit order",
      confidence: 60,
      limitPrice,
      urgency,
      marketConditions,
    };
  }

  private calculateVolatility(candleData: CandleData[]): number {
    if (candleData.length < 10) return 0.01;

    const returns = [];
    for (let i = 1; i < candleData.length; i++) {
      const prevClose = candleData[i - 1].close;
      const currentClose = candleData[i].close;
      const return_ = (currentClose - prevClose) / prevClose;
      returns.push(return_);
    }

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private analyzeVolume(candleData: CandleData[]): number {
    if (candleData.length < 10) return 0.5;

    const recentVolume = candleData.slice(-10).reduce((sum, candle) => sum + candle.volume, 0);
    const avgVolume =
      candleData.reduce((sum, candle) => sum + candle.volume, 0) / candleData.length;

    return recentVolume / (avgVolume * 10); // Normalize to 0-1 range
  }

  private analyzeTrend(candleData: CandleData[], currentPrice: number): number {
    if (candleData.length < 20) return 0;

    const period = Math.min(20, candleData.length);
    const oldPrice = candleData[candleData.length - period].close;
    const trendStrength = Math.abs((currentPrice - oldPrice) / oldPrice);

    return trendStrength;
  }

  private estimateSpread(currentPrice: number, symbol: string): number {
    // Estimate spread based on symbol type and price
    const symbolUpper = symbol.toUpperCase();

    if (symbolUpper.includes("BTC")) {
      return currentPrice * 0.001; // 0.1% for BTC
    } else if (symbolUpper.includes("ETH")) {
      return currentPrice * 0.0015; // 0.15% for ETH
    } else if (symbolUpper.includes("USD") || symbolUpper.includes("EUR")) {
      return currentPrice * 0.0002; // 0.02% for major pairs
    }

    return currentPrice * 0.003; // 0.3% default
  }

  private determineUrgency(
    aiConfidence: number,
    technicalAnalysis: any,
    marketIntelligence: any,
  ): "LOW" | "MEDIUM" | "HIGH" {
    // High urgency indicators
    if (aiConfidence > 90) return "HIGH";
    if (technicalAnalysis?.patternQuality > 85) return "HIGH";
    if (
      marketIntelligence?.sentiment === "EXTREMELY_BULLISH" ||
      marketIntelligence?.sentiment === "EXTREMELY_BEARISH"
    )
      return "HIGH";

    // Medium urgency indicators
    if (aiConfidence > 75) return "MEDIUM";
    if (technicalAnalysis?.patternQuality > 70) return "MEDIUM";

    return "LOW";
  }

  private calculateLimitPrice(
    direction: "BUY" | "SELL",
    currentPrice: number,
    spread: number,
  ): number {
    // Calculate a favorable limit price based on direction and spread
    const improvement = spread * 0.5; // Try to get 50% of the spread as improvement

    if (direction === "BUY") {
      return currentPrice - improvement; // Buy below current price
    } else {
      return currentPrice + improvement; // Sell above current price
    }
  }

  private calculateStopPrice(
    direction: "BUY" | "SELL",
    currentPrice: number,
    volatilityValue: number,
  ): number {
    // Calculate stop price based on volatility value
    const multiplier = volatilityValue > 0.015 ? 0.01 : volatilityValue > 0.01 ? 0.005 : 0.002;

    if (direction === "BUY") {
      return currentPrice + currentPrice * multiplier; // Buy stop above current price
    } else {
      return currentPrice - currentPrice * multiplier; // Sell stop below current price
    }
  }

  private convertSpreadToNumber(spread: "TIGHT" | "NORMAL" | "WIDE"): number {
    switch (spread) {
      case "TIGHT":
        return 0.001;
      case "NORMAL":
        return 0.003;
      case "WIDE":
        return 0.007;
      default:
        return 0.003;
    }
  }
}
