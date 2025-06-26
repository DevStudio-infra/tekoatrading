import { BaseAgent } from "./base-agent";
import { TechnicalAnalysisAgent } from "./technical-analysis-agent";

interface MarketConditions {
  volatility: number; // 0-100 scale
  spread: number; // bid-ask spread in points
  volume: number; // relative volume (1 = average)
  trend: "bullish" | "bearish" | "neutral";
  support: number;
  resistance: number;
}

interface OrderDecision {
  orderType: "MARKET" | "LIMIT" | "STOP";
  limitPrice?: number;
  stopPrice?: number;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  reasoning: string[];
  confidence: number;
  timeframe: string;
}

export class ProfessionalOrderDecisionAgent extends BaseAgent {
  private technicalAgent: TechnicalAnalysisAgent;

  constructor() {
    super("ProfessionalOrderDecisionAgent");
    this.technicalAgent = new TechnicalAnalysisAgent();
  }

  async analyze(data: any): Promise<any> {
    return this.determineOrderType(data);
  }

  async determineOrderType(context: {
    symbol: string;
    action: "buy" | "sell";
    currentPrice: number;
    strategy: string;
    timeframe: string;
    confidence: number;
    marketData: any;
  }): Promise<OrderDecision> {
    try {
      // Analyze market conditions
      const marketConditions = await this.analyzeMarketConditions(context);

      // Get strategy-specific preferences
      const strategyPreference = this.getStrategyOrderPreference(context.strategy);

      // Make intelligent decision
      const decision = await this.makeOrderDecision(context, marketConditions, strategyPreference);

      return decision;
    } catch (error) {
      // Conservative fallback
      return {
        orderType: "MARKET",
        urgency: "LOW",
        reasoning: ["Error in analysis - using safe market order"],
        confidence: 0.3,
        timeframe: context.timeframe,
      };
    }
  }

  private async analyzeMarketConditions(data: any): Promise<MarketConditions> {
    // Analyze volatility from recent price movements
    const volatility = this.calculateVolatility(data.marketData);

    // Estimate spread (simplified - in real implementation would use broker API)
    const spread = this.estimateSpread(data.currentPrice, data.symbol);

    // Analyze volume
    const volume = this.analyzeVolume(data.marketData);

    // Get technical levels
    const technicalAnalysis = await this.technicalAgent.analyze(data.marketData);

    return {
      volatility,
      spread,
      volume,
      trend: technicalAnalysis.trend as "bullish" | "bearish" | "neutral",
      support: data.currentPrice * 0.98, // Simplified - would use real S/R levels
      resistance: data.currentPrice * 1.02,
    };
  }

  private getStrategyOrderPreference(strategy: string): string {
    const strategyMap: Record<string, string> = {
      // Breakout strategies prefer stop orders
      breakout: "STOP",
      momentum: "STOP",
      gap_trading: "STOP",

      // Mean reversion prefers limit orders
      mean_reversion: "LIMIT",
      support_resistance: "LIMIT",
      oversold_bounce: "LIMIT",

      // Scalping strategies prefer market orders for speed
      scalping: "MARKET",
      news_trading: "MARKET",
      arbitrage: "MARKET",

      // Default strategies
      trend_following: "MARKET",
      swing_trading: "LIMIT",
    };

    return strategyMap[strategy.toLowerCase()] || "MARKET";
  }

  private async makeOrderDecision(
    data: any,
    conditions: MarketConditions,
    strategyPreference: string,
  ): Promise<OrderDecision> {
    const reasoning: string[] = [];
    let orderType: "MARKET" | "LIMIT" | "STOP" = "MARKET";
    let urgency: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM";
    let limitPrice: number | undefined;
    let stopPrice: number | undefined;

    // Factor 1: Confidence and urgency
    if (data.confidence > 0.8) {
      urgency = "HIGH";
      reasoning.push(`High confidence (${data.confidence}) signals urgent execution`);
    } else if (data.confidence < 0.6) {
      urgency = "LOW";
      reasoning.push(`Lower confidence (${data.confidence}) allows patient execution`);
    }

    // Factor 2: Market conditions
    if (conditions.volatility > 70) {
      reasoning.push(`High volatility (${conditions.volatility}) favors market orders`);
      if (strategyPreference !== "STOP") {
        orderType = "MARKET";
      }
    } else if (conditions.volatility < 30) {
      reasoning.push(`Low volatility (${conditions.volatility}) allows limit orders`);
      if (urgency !== "HIGH") {
        orderType = "LIMIT";
      }
    }

    // Factor 3: Spread analysis
    if (conditions.spread > data.currentPrice * 0.001) {
      // >0.1% spread
      reasoning.push(`Wide spread (${conditions.spread}) favors limit orders`);
      if (urgency !== "HIGH" && orderType !== "STOP") {
        orderType = "LIMIT";
      }
    }

    // Factor 4: Strategy override
    if (
      strategyPreference === "STOP" &&
      (data.strategy.includes("breakout") || data.strategy.includes("momentum"))
    ) {
      orderType = "STOP";
      reasoning.push(`Breakout/momentum strategy requires stop order for confirmation`);
    }

    // Factor 5: Timeframe considerations
    if (data.timeframe === "1m" || data.timeframe === "5m") {
      // Short timeframes need speed
      if (orderType !== "STOP") {
        orderType = "MARKET";
        urgency = "HIGH";
      }
      reasoning.push(`Short timeframe (${data.timeframe}) prioritizes speed`);
    }

    // Calculate specific prices
    if (orderType === "LIMIT") {
      limitPrice = this.calculateLimitPrice(data, conditions);
      reasoning.push(`Limit price set at ${limitPrice} for better fill`);
    } else if (orderType === "STOP") {
      stopPrice = this.calculateStopPrice(data, conditions);
      reasoning.push(`Stop price set at ${stopPrice} for breakout confirmation`);
    }

    // Calculate final confidence
    const confidence = this.calculateDecisionConfidence(data, conditions, orderType);

    return {
      orderType,
      limitPrice,
      stopPrice,
      urgency,
      reasoning,
      confidence,
      timeframe: data.timeframe,
    };
  }

  private calculateLimitPrice(data: any, conditions: MarketConditions): number {
    const improvement = Math.min(conditions.spread * 0.5, data.currentPrice * 0.002); // Max 0.2% improvement

    if (data.action === "buy") {
      return data.currentPrice - improvement;
    } else {
      return data.currentPrice + improvement;
    }
  }

  private calculateStopPrice(data: any, conditions: MarketConditions): number {
    const buffer = Math.max(conditions.spread, data.currentPrice * 0.001); // Min 0.1% buffer

    if (data.action === "buy") {
      // Buy stop above resistance
      return conditions.resistance + buffer;
    } else {
      // Sell stop below support
      return conditions.support - buffer;
    }
  }

  private calculateVolatility(marketData: any): number {
    // Simplified volatility calculation
    // In real implementation, would use ATR or other indicators
    if (!marketData?.prices || marketData.prices.length < 10) return 50;

    const prices = marketData.prices.slice(-10);
    const returns = prices
      .slice(1)
      .map((price: number, i: number) => Math.abs((price - prices[i]) / prices[i]));

    const avgReturn = returns.reduce((a: number, b: number) => a + b, 0) / returns.length;
    return Math.min(100, avgReturn * 1000); // Scale to 0-100
  }

  private estimateSpread(price: number, symbol: string): number {
    // Simplified spread estimation based on asset type and price
    if (symbol.includes("JPY")) return 0.01; // 1 pip for JPY pairs
    if (symbol.includes("USD")) return 0.0001; // 0.1 pip for major pairs
    if (symbol.includes("BTC") || symbol.includes("ETH")) return price * 0.0005; // 0.05% for crypto
    return price * 0.0002; // 0.02% for stocks
  }

  private analyzeVolume(marketData: any): number {
    // Simplified volume analysis
    if (!marketData?.volume) return 1;

    const currentVolume = marketData.volume[marketData.volume.length - 1];
    const avgVolume =
      marketData.volume.reduce((a: number, b: number) => a + b, 0) / marketData.volume.length;

    return currentVolume / avgVolume;
  }

  private calculateDecisionConfidence(
    data: any,
    conditions: MarketConditions,
    orderType: string,
  ): number {
    let confidence = data.confidence * 0.7; // Start with signal confidence

    // Boost confidence for appropriate order type choices
    if (orderType === "MARKET" && conditions.volatility > 60) confidence += 0.1;
    if (orderType === "LIMIT" && conditions.volatility < 40) confidence += 0.1;
    if (orderType === "STOP" && data.strategy.includes("breakout")) confidence += 0.15;

    // Reduce confidence for risky conditions
    if (conditions.spread > data.currentPrice * 0.002) confidence -= 0.05;
    if (conditions.volume < 0.5) confidence -= 0.1;

    return Math.max(0.2, Math.min(0.95, confidence));
  }
}
