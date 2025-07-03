import { logger } from "../../logger";

export interface OrderTypeDecision {
  orderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
  entryPrice?: number;
  reasoning: string;
  expiration?: Date;
  requiredConfirmations?: string[];
  confidence: number; // 0-1 confidence in the order type choice
}

export class OrderTypeDecisionEngine {
  /**
   * Determine optimal order type based on comprehensive analysis
   */
  async determineOptimalOrderType(
    analysis: any,
    strategy: any,
    marketConditions: any,
    direction: "BUY" | "SELL",
    timeframe: string,
  ): Promise<OrderTypeDecision> {
    logger.info(`🎯 Order Type Decision for ${direction} ${strategy.name} on ${timeframe}`);

    try {
      // 1. STRATEGY CATEGORY RULES (Primary Decision Factor)
      const categoryDecision = this.getCategoryBasedOrderType(
        strategy.category,
        marketConditions,
        timeframe,
      );

      // 2. TECHNICAL ANALYSIS INFLUENCE
      const technicalDecision = this.getTechnicalBasedOrderType(
        analysis,
        direction,
        marketConditions,
      );

      // 3. MARKET CONDITIONS ADJUSTMENT
      const marketDecision = this.getMarketConditionAdjustment(marketConditions, timeframe);

      // 4. RISK MANAGEMENT OVERRIDE
      const riskDecision = this.getRiskBasedOrderType(strategy.riskManagement, analysis);

      // 5. COMBINE ALL FACTORS INTO FINAL DECISION
      const finalDecision = this.synthesizeOrderTypeDecision(
        categoryDecision,
        technicalDecision,
        marketDecision,
        riskDecision,
        strategy,
        analysis,
        direction,
      );

      logger.info(
        `✅ Order Type Decision: ${finalDecision.orderType} (Confidence: ${(finalDecision.confidence * 100).toFixed(1)}%)`,
      );
      logger.info(`📋 Reasoning: ${finalDecision.reasoning}`);

      return finalDecision;
    } catch (error) {
      logger.error(`❌ Order Type Decision Error:`, error);

      // Safe fallback to MARKET order
      return {
        orderType: "MARKET",
        reasoning: `Error in order type decision: ${error instanceof Error ? error.message : "Unknown error"}. Defaulting to market order for safety.`,
        confidence: 0.3,
      };
    }
  }

  /**
   * Strategy category-based order type preferences
   */
  private getCategoryBasedOrderType(
    category: string,
    marketConditions: any,
    timeframe: string,
  ): Partial<OrderTypeDecision> {
    const categoryLower = category?.toLowerCase() || "unknown";

    switch (categoryLower) {
      case "scalping":
        if (marketConditions.spread && marketConditions.spread > 1.5) {
          return {
            orderType: "LIMIT",
            reasoning: "Scalping with wide spreads - use limit orders for better pricing",
            confidence: 0.8,
          };
        }
        return {
          orderType: "MARKET",
          reasoning: "Scalping strategy - immediate execution required",
          confidence: 0.9,
        };

      case "day_trade":
        if (marketConditions.volatility === "HIGH") {
          return {
            orderType: "LIMIT",
            reasoning: "High volatility day trading - limit orders for better entries",
            confidence: 0.7,
          };
        }
        return {
          orderType: "MARKET",
          reasoning: "Day trading - standard market execution",
          confidence: 0.6,
        };

      case "swing_trade":
        return {
          orderType: "LIMIT",
          reasoning: "Swing trading - planned entries at better levels",
          confidence: 0.8,
        };

      default:
        return {
          orderType: "MARKET",
          reasoning: "Unknown category - default to market order",
          confidence: 0.4,
        };
    }
  }

  /**
   * Technical analysis-based order type determination
   */
  private getTechnicalBasedOrderType(
    analysis: any,
    direction: "BUY" | "SELL",
    marketConditions: any,
  ): Partial<OrderTypeDecision> {
    const currentPrice = analysis.marketPrice?.price || 0;
    const trend = analysis.trend;
    const trendStrength = analysis.trendStrength || 0;
    const supportResistance = analysis.supportResistance;

    if (trend !== "NEUTRAL" && trendStrength > 7) {
      return {
        orderType: "MARKET",
        reasoning: `Strong ${trend} trend (${trendStrength}/10) - immediate execution preferred`,
        confidence: 0.85,
      };
    }

    if (supportResistance && currentPrice > 0) {
      const nearSupport =
        supportResistance.nearestSupport &&
        Math.abs(currentPrice - supportResistance.nearestSupport) / currentPrice < 0.005;

      const nearResistance =
        supportResistance.nearestResistance &&
        Math.abs(currentPrice - supportResistance.nearestResistance) / currentPrice < 0.005;

      if (direction === "BUY" && nearSupport) {
        return {
          orderType: "LIMIT",
          entryPrice: supportResistance.nearestSupport + (analysis.atr || 0) * 0.1,
          reasoning: "Near support level - limit buy for better entry",
          confidence: 0.8,
        };
      }

      if (direction === "SELL" && nearResistance) {
        return {
          orderType: "LIMIT",
          entryPrice: supportResistance.nearestResistance - (analysis.atr || 0) * 0.1,
          reasoning: "Near resistance level - limit sell for better entry",
          confidence: 0.8,
        };
      }

      if (direction === "BUY" && currentPrice < supportResistance.nearestResistance) {
        return {
          orderType: "STOP",
          entryPrice: supportResistance.nearestResistance + (analysis.atr || 0) * 0.2,
          reasoning: "Breakout strategy - buy stop above resistance",
          confidence: 0.75,
        };
      }

      if (direction === "SELL" && currentPrice > supportResistance.nearestSupport) {
        return {
          orderType: "STOP",
          entryPrice: supportResistance.nearestSupport - (analysis.atr || 0) * 0.2,
          reasoning: "Breakdown strategy - sell stop below support",
          confidence: 0.75,
        };
      }
    }

    if (trend === "NEUTRAL" || trendStrength < 4) {
      return {
        orderType: "LIMIT",
        reasoning: "Neutral/weak trend - wait for better pricing",
        confidence: 0.6,
      };
    }

    return {
      orderType: "MARKET",
      reasoning: "Standard technical conditions - market execution",
      confidence: 0.5,
    };
  }

  /**
   * Market conditions adjustment
   */
  private getMarketConditionAdjustment(
    marketConditions: any,
    timeframe: string,
  ): Partial<OrderTypeDecision> {
    if (marketConditions.volatility === "HIGH") {
      return {
        orderType: "LIMIT",
        reasoning: "High volatility - limit orders for price protection",
        confidence: 0.7,
      };
    }

    if (marketConditions.liquidity === "LOW") {
      return {
        orderType: "LIMIT",
        reasoning: "Low liquidity - avoid market impact with limit orders",
        confidence: 0.8,
      };
    }

    if (marketConditions.spread && marketConditions.spread > 2) {
      return {
        orderType: "LIMIT",
        reasoning: `Wide spread (${marketConditions.spread} pips) - limit order preferred`,
        confidence: 0.7,
      };
    }

    if (["M1", "M5"].includes(timeframe)) {
      return {
        orderType: "MARKET",
        reasoning: "Short timeframe - immediate execution needed",
        confidence: 0.6,
      };
    }

    return { confidence: 0.5 };
  }

  /**
   * Risk management-based order type
   */
  private getRiskBasedOrderType(riskManagement: any, analysis: any): Partial<OrderTypeDecision> {
    if (!riskManagement) {
      return { confidence: 0.5 };
    }

    if (riskManagement.confirmation) {
      if (
        riskManagement.confirmation.includes("candle close") ||
        riskManagement.confirmation.includes("confirmation")
      ) {
        return {
          orderType: "LIMIT",
          reasoning: "Strategy requires confirmation - use limit order",
          requiredConfirmations: ["CANDLE_CLOSE_CONFIRMATION"],
          confidence: 0.8,
        };
      }
    }

    if (
      riskManagement.riskPerTrade &&
      parseFloat(riskManagement.riskPerTrade.replace("%", "")) <= 1
    ) {
      return {
        orderType: "LIMIT",
        reasoning: "Conservative risk management - better entries with limit orders",
        confidence: 0.7,
      };
    }

    return { confidence: 0.5 };
  }

  /**
   * Synthesize all decision factors into final order type
   */
  private synthesizeOrderTypeDecision(
    categoryDecision: Partial<OrderTypeDecision>,
    technicalDecision: Partial<OrderTypeDecision>,
    marketDecision: Partial<OrderTypeDecision>,
    riskDecision: Partial<OrderTypeDecision>,
    strategy: any,
    analysis: any,
    direction: "BUY" | "SELL",
  ): OrderTypeDecision {
    const decisions = [
      { ...categoryDecision, weight: 0.3 },
      { ...technicalDecision, weight: 0.25 },
      { ...marketDecision, weight: 0.25 },
      { ...riskDecision, weight: 0.2 },
    ];

    const orderTypeScores: { [key: string]: number } = {
      MARKET: 0,
      LIMIT: 0,
      STOP: 0,
      STOP_LIMIT: 0,
    };

    const reasoningParts: string[] = [];
    let totalConfidence = 0;
    let finalEntryPrice: number | undefined;
    const requiredConfirmations: string[] = [];

    for (const decision of decisions) {
      if (decision.orderType && decision.confidence !== undefined) {
        const score = decision.confidence * decision.weight;
        orderTypeScores[decision.orderType] += score;
        totalConfidence += score;

        if (decision.reasoning) {
          reasoningParts.push(`${decision.reasoning} (${(decision.confidence * 100).toFixed(0)}%)`);
        }

        if (decision.entryPrice) {
          finalEntryPrice = decision.entryPrice;
        }

        if (decision.requiredConfirmations) {
          requiredConfirmations.push(...decision.requiredConfirmations);
        }
      }
    }

    let winningOrderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT" = "MARKET";
    let highestScore = 0;

    for (const [orderType, score] of Object.entries(orderTypeScores)) {
      if (score > highestScore) {
        highestScore = score;
        winningOrderType = orderType as "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
      }
    }

    if (!finalEntryPrice && winningOrderType !== "MARKET") {
      finalEntryPrice = this.calculateDefaultEntryPrice(
        winningOrderType,
        analysis.marketPrice?.price || 0,
        direction,
        analysis.atr || 0,
      );
    }

    let expiration: Date | undefined;
    if (winningOrderType !== "MARKET") {
      expiration = this.getOrderExpiration(winningOrderType, strategy.category);
    }

    return {
      orderType: winningOrderType,
      entryPrice: finalEntryPrice,
      reasoning: reasoningParts.length > 0 ? reasoningParts.join(" | ") : "Default market order",
      confidence: Math.min(1.0, totalConfidence),
      expiration,
      requiredConfirmations: requiredConfirmations.length > 0 ? requiredConfirmations : undefined,
    };
  }

  /**
   * Calculate default entry price for order types
   */
  private calculateDefaultEntryPrice(
    orderType: string,
    currentPrice: number,
    direction: "BUY" | "SELL",
    atr: number,
  ): number {
    if (currentPrice <= 0) return 0;

    const buffer = atr > 0 ? atr * 0.2 : currentPrice * 0.001;

    switch (orderType) {
      case "LIMIT":
        return direction === "BUY" ? currentPrice - buffer : currentPrice + buffer;

      case "STOP":
        return direction === "BUY" ? currentPrice + buffer : currentPrice - buffer;

      case "STOP_LIMIT":
        return direction === "BUY" ? currentPrice + buffer * 1.5 : currentPrice - buffer * 1.5;

      default:
        return currentPrice;
    }
  }

  /**
   * Get order expiration based on order type and strategy
   */
  private getOrderExpiration(orderType: string, category: string): Date {
    const now = new Date();

    if (category === "scalping") {
      return new Date(now.getTime() + 15 * 60 * 1000);
    }

    if (category === "day_trade") {
      return new Date(now.getTime() + 4 * 60 * 60 * 1000);
    }

    if (category === "swing_trade") {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    switch (orderType) {
      case "LIMIT":
        return new Date(now.getTime() + 8 * 60 * 60 * 1000);
      case "STOP":
        return new Date(now.getTime() + 4 * 60 * 60 * 1000);
      case "STOP_LIMIT":
        return new Date(now.getTime() + 2 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 60 * 60 * 1000);
    }
  }
}
