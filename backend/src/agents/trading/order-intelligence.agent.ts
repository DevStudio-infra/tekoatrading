import { BaseAgent } from "../../ai/base-agent";
import { logger } from "../../logger";
import {
  OrderAwarenessAgent,
  OrderAwarenessParams,
  OrderAwarenessResult,
} from "./order-awareness.agent";

export interface OrderIntelligenceContext {
  symbol: string;
  direction: "BUY" | "SELL";
  currentPrice: number;
  proposedOrderType: "MARKET" | "LIMIT" | "STOP";
  proposedPrice?: number;
  proposedStopLoss?: number;
  proposedTakeProfit?: number;
  marketConditions: {
    volatility: "LOW" | "MEDIUM" | "HIGH";
    spread: number;
    volume: number;
    trend: "BULLISH" | "BEARISH" | "SIDEWAYS";
  };
  timeframe: string;
  accountBalance: number;
  botConfig: any;
  capitalApi: any;
}

export interface OrderIntelligenceResult {
  orderDecision: "EXECUTE" | "WAIT" | "CANCEL_FIRST" | "MODIFY_EXISTING" | "REJECT";
  confidence: number;
  reasoning: string[];
  orderManagementActions: {
    cancelOrders: string[];
    modifyOrders: { orderId: string; newPrice: number; reason: string }[];
    priorityLevel: "LOW" | "MEDIUM" | "HIGH";
  };
  riskAssessment: {
    orderRisk: "LOW" | "MEDIUM" | "HIGH";
    conflictRisk: "LOW" | "MEDIUM" | "HIGH";
    exposureRisk: "LOW" | "MEDIUM" | "HIGH";
    overallRisk: "LOW" | "MEDIUM" | "HIGH";
  };
  marketTiming: {
    isOptimalTiming: boolean;
    betterTimingAvailable: boolean;
    suggestedDelay: number; // minutes
    timingReason: string;
  };
}

export class OrderIntelligenceAgent extends BaseAgent {
  private orderAwarenessAgent: OrderAwarenessAgent;

  constructor() {
    super("OrderIntelligenceAgent");
    this.orderAwarenessAgent = new OrderAwarenessAgent();
  }

  async analyze(context: OrderIntelligenceContext): Promise<OrderIntelligenceResult> {
    try {
      logger.info(
        `[ORDER-INTELLIGENCE] Analyzing order intelligence for ${context.symbol} ${context.direction}`,
      );

      // Get order awareness analysis
      const orderAwarenessParams: OrderAwarenessParams = {
        botId: context.botConfig.id || "default",
        userId: context.botConfig.userId || "default",
        symbol: context.symbol,
        direction: context.direction,
        proposedOrderType: context.proposedOrderType,
        proposedPrice: context.proposedPrice,
        proposedStopLoss: context.proposedStopLoss,
        proposedTakeProfit: context.proposedTakeProfit,
        accountBalance: context.accountBalance,
        timeframe: context.timeframe,
        botConfig: {
          maxOpenOrders: context.botConfig.maxOpenOrders || 10,
          maxOrdersPerSymbol: context.botConfig.maxOrdersPerSymbol || 3,
          orderTimeoutMinutes: context.botConfig.orderTimeoutMinutes || 60,
          name: context.botConfig.name || "Unknown Bot",
        },
        capitalApi: context.capitalApi,
        currentPrice: context.currentPrice,
      };

      const orderAwareness = await this.orderAwarenessAgent.checkOrderLimits(orderAwarenessParams);

      // Analyze market timing
      const marketTiming = this.analyzeMarketTiming(context, orderAwareness);

      // Assess order risks
      const riskAssessment = this.assessOrderRisks(context, orderAwareness);

      // Make order decision
      const orderDecision = this.makeOrderDecision(
        context,
        orderAwareness,
        marketTiming,
        riskAssessment,
      );

      logger.info(
        `[ORDER-INTELLIGENCE] Order decision: ${orderDecision.decision} with ${orderDecision.confidence}% confidence`,
      );

      return {
        orderDecision: orderDecision.decision,
        confidence: orderDecision.confidence,
        reasoning: orderDecision.reasoning,
        orderManagementActions: {
          cancelOrders: orderAwareness.orderManagementActions.cancelOrders,
          modifyOrders: orderAwareness.orderManagementActions.modifyOrders,
          priorityLevel: this.calculatePriorityLevel(orderAwareness),
        },
        riskAssessment,
        marketTiming,
      };
    } catch (error) {
      logger.error(`[ORDER-INTELLIGENCE] Error analyzing order intelligence:`, error);

      return {
        orderDecision: "REJECT",
        confidence: 0,
        reasoning: ["Error in order intelligence analysis - defaulting to reject for safety"],
        orderManagementActions: {
          cancelOrders: [],
          modifyOrders: [],
          priorityLevel: "LOW",
        },
        riskAssessment: {
          orderRisk: "HIGH",
          conflictRisk: "HIGH",
          exposureRisk: "HIGH",
          overallRisk: "HIGH",
        },
        marketTiming: {
          isOptimalTiming: false,
          betterTimingAvailable: false,
          suggestedDelay: 0,
          timingReason: "Analysis error",
        },
      };
    }
  }

  private analyzeMarketTiming(
    context: OrderIntelligenceContext,
    orderAwareness: OrderAwarenessResult,
  ) {
    let isOptimalTiming = true;
    let betterTimingAvailable = false;
    let suggestedDelay = 0;
    let timingReason = "Market conditions favorable";

    // Check if there are conflicting orders that should be resolved first
    if (orderAwareness.conflictingOrders.length > 0) {
      isOptimalTiming = false;
      betterTimingAvailable = true;
      suggestedDelay = 2; // Wait 2 minutes
      timingReason = "Conflicting orders should be resolved first";
    }

    // Check market volatility
    if (context.marketConditions.volatility === "HIGH" && context.proposedOrderType === "LIMIT") {
      isOptimalTiming = false;
      betterTimingAvailable = true;
      suggestedDelay = 5; // Wait 5 minutes for volatility to settle
      timingReason = "High volatility - wait for calmer conditions for limit orders";
    }

    // Check spread conditions
    if (context.marketConditions.spread > context.currentPrice * 0.001) {
      // Spread > 0.1%
      if (context.proposedOrderType === "MARKET") {
        isOptimalTiming = false;
        betterTimingAvailable = true;
        suggestedDelay = 1; // Wait 1 minute
        timingReason = "Wide spread - consider waiting or using limit order";
      }
    }

    // Check if orders need to be canceled first
    if (orderAwareness.ordersToCancel.length > 0) {
      isOptimalTiming = false;
      betterTimingAvailable = true;
      suggestedDelay = 1; // Wait 1 minute for cancellations
      timingReason = "Old orders should be canceled first";
    }

    return {
      isOptimalTiming,
      betterTimingAvailable,
      suggestedDelay,
      timingReason,
    };
  }

  private assessOrderRisks(
    context: OrderIntelligenceContext,
    orderAwareness: OrderAwarenessResult,
  ) {
    // Assess order risk based on order type and market conditions
    let orderRisk: "LOW" | "MEDIUM" | "HIGH" = "LOW";

    if (context.proposedOrderType === "MARKET" && context.marketConditions.volatility === "HIGH") {
      orderRisk = "HIGH";
    } else if (
      context.proposedOrderType === "LIMIT" &&
      context.marketConditions.spread > context.currentPrice * 0.002
    ) {
      orderRisk = "MEDIUM";
    }

    // Assess conflict risk
    let conflictRisk: "LOW" | "MEDIUM" | "HIGH" = "LOW";

    if (orderAwareness.conflictingOrders.length > 0) {
      const highConflicts = orderAwareness.conflictingOrders.filter(
        (o) => o.conflictLevel === "HIGH",
      );
      if (highConflicts.length > 0) {
        conflictRisk = "HIGH";
      } else {
        conflictRisk = "MEDIUM";
      }
    }

    // Assess exposure risk
    let exposureRisk: "LOW" | "MEDIUM" | "HIGH" = "LOW";

    const exposurePercent =
      (orderAwareness.orderIntelligence.estimatedTotalExposure / context.accountBalance) * 100;
    if (exposurePercent > 60) {
      exposureRisk = "HIGH";
    } else if (exposurePercent > 30) {
      exposureRisk = "MEDIUM";
    }

    // Calculate overall risk
    const risks = [orderRisk, conflictRisk, exposureRisk];
    const riskScores = risks.map((r) => (r === "HIGH" ? 3 : r === "MEDIUM" ? 2 : 1));
    const avgRisk = riskScores.reduce((a, b) => a + b, 0) / riskScores.length;

    const overallRisk: "LOW" | "MEDIUM" | "HIGH" =
      avgRisk >= 2.5 ? "HIGH" : avgRisk >= 1.5 ? "MEDIUM" : "LOW";

    return {
      orderRisk,
      conflictRisk,
      exposureRisk,
      overallRisk,
    };
  }

  private makeOrderDecision(
    context: OrderIntelligenceContext,
    orderAwareness: OrderAwarenessResult,
    marketTiming: any,
    riskAssessment: any,
  ): {
    decision: "EXECUTE" | "WAIT" | "CANCEL_FIRST" | "MODIFY_EXISTING" | "REJECT";
    confidence: number;
    reasoning: string[];
  } {
    const reasoning: string[] = [];
    let confidence = 100;

    // Check if order awareness allows the order
    if (!orderAwareness.canPlaceOrder) {
      reasoning.push(...orderAwareness.reasoning);

      // Check if we can resolve by canceling orders
      if (orderAwareness.ordersToCancel.length > 0) {
        return {
          decision: "CANCEL_FIRST",
          confidence: 80,
          reasoning: [...reasoning, "Can proceed after canceling old orders"],
        };
      }

      // Check if we can resolve by modifying orders
      if (orderAwareness.ordersToModify.length > 0) {
        return {
          decision: "MODIFY_EXISTING",
          confidence: 70,
          reasoning: [...reasoning, "Can proceed after modifying existing orders"],
        };
      }

      return {
        decision: "REJECT",
        confidence: 90,
        reasoning: [...reasoning, "Cannot resolve order conflicts"],
      };
    }

    // Check overall risk
    if (riskAssessment.overallRisk === "HIGH") {
      confidence -= 40;
      reasoning.push(`High overall risk (${riskAssessment.overallRisk})`);

      if (confidence < 50) {
        return {
          decision: "REJECT",
          confidence: 30,
          reasoning: [...reasoning, "Overall risk too high"],
        };
      }
    }

    // Check market timing
    if (!marketTiming.isOptimalTiming) {
      confidence -= 20;
      reasoning.push(marketTiming.timingReason);

      if (marketTiming.betterTimingAvailable) {
        return {
          decision: "WAIT",
          confidence: 70,
          reasoning: [...reasoning, `Suggested delay: ${marketTiming.suggestedDelay} minutes`],
        };
      }
    }

    // Check if orders need to be canceled first
    if (orderAwareness.ordersToCancel.length > 0) {
      reasoning.push(`${orderAwareness.ordersToCancel.length} orders should be canceled first`);
      return {
        decision: "CANCEL_FIRST",
        confidence: 75,
        reasoning: [...reasoning, "Clean up orders before executing new order"],
      };
    }

    // Check if orders need to be modified first
    if (orderAwareness.ordersToModify.length > 0) {
      reasoning.push(`${orderAwareness.ordersToModify.length} orders should be modified first`);
      return {
        decision: "MODIFY_EXISTING",
        confidence: 65,
        reasoning: [...reasoning, "Optimize existing orders before new order"],
      };
    }

    // If we reach here, order can be executed
    reasoning.push("Order intelligence analysis passed");
    reasoning.push(`Total pending orders: ${orderAwareness.orderIntelligence.totalPendingOrders}`);
    reasoning.push(`Symbol orders: ${orderAwareness.orderIntelligence.symbolPendingOrders}`);
    reasoning.push(`Overall risk: ${riskAssessment.overallRisk}`);

    return {
      decision: "EXECUTE",
      confidence: Math.max(confidence, 50),
      reasoning,
    };
  }

  private calculatePriorityLevel(orderAwareness: OrderAwarenessResult): "LOW" | "MEDIUM" | "HIGH" {
    const cancelCount = orderAwareness.ordersToCancel.length;
    const modifyCount = orderAwareness.ordersToModify.length;
    const conflictCount = orderAwareness.conflictingOrders.length;

    if (cancelCount > 3 || conflictCount > 2) {
      return "HIGH";
    } else if (cancelCount > 1 || modifyCount > 2) {
      return "MEDIUM";
    } else {
      return "LOW";
    }
  }
}
