import { BaseAgent } from "../../ai/base-agent";
import { logger } from "../../logger";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface OrderAwarenessParams {
  botId: string;
  userId: string;
  symbol: string;
  direction: "BUY" | "SELL";
  proposedOrderType: "MARKET" | "LIMIT" | "STOP";
  proposedPrice?: number;
  proposedStopLoss?: number;
  proposedTakeProfit?: number;
  accountBalance: number;
  timeframe: string;
  botConfig: {
    maxOpenOrders?: number;
    maxOrdersPerSymbol?: number;
    orderTimeoutMinutes?: number;
    name: string;
  };
  strategyConfig?: {
    parameters?: any;
  };
  capitalApi: any;
  currentPrice?: number;
}

export interface PendingOrder {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL";
  orderType: "LIMIT" | "STOP";
  size: number;
  orderPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  createdAt: Date;
  expiryDate?: Date;
  timeInForce: string;
  status: "OPEN" | "WORKING" | "PENDING";
  distanceFromMarket: number;
  estimatedFillProbability: number;
  conflictLevel: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  brokerOrderId: string;
}

export interface OrderAwarenessResult {
  canPlaceOrder: boolean;
  reasoning: string[];
  recommendations: string[];
  pendingOrders: PendingOrder[];
  conflictingOrders: PendingOrder[];
  ordersToCancel: PendingOrder[];
  ordersToModify: PendingOrder[];
  orderIntelligence: {
    totalPendingOrders: number;
    symbolPendingOrders: number;
    conflictingOrdersCount: number;
    oldestOrderAge: number;
    averageDistanceFromMarket: number;
    estimatedTotalExposure: number;
  };
  orderManagementActions: {
    cancelOrders: string[];
    modifyOrders: { orderId: string; newPrice: number; reason: string }[];
  };
}

export class OrderAwarenessAgent extends BaseAgent {
  constructor() {
    super("OrderAwarenessAgent");
  }

  async analyze(data: any): Promise<any> {
    return this.checkOrderLimits(data);
  }

  async checkOrderLimits(params: OrderAwarenessParams): Promise<OrderAwarenessResult> {
    try {
      logger.info(
        `[ORDER-AWARENESS] Checking order limits for ${params.symbol} ${params.direction} (Bot: ${params.botConfig.name})`,
      );

      // Get all pending orders from Capital.com API
      const pendingOrders = await this.getPendingOrders(params.capitalApi, params.botId);

      // Get symbol-specific orders
      const symbolOrders = pendingOrders.filter(
        (order: PendingOrder) => order.symbol === params.symbol,
      );

      // Analyze order conflicts and opportunities
      const orderAnalysis = await this.analyzeOrderConflicts(params, pendingOrders, symbolOrders);

      // Calculate order intelligence metrics
      const orderIntelligence = this.calculateOrderIntelligence(pendingOrders, params);

      // Perform order management checks
      const checks = await this.performOrderChecks(
        params,
        pendingOrders,
        symbolOrders,
        orderIntelligence,
        orderAnalysis,
      );

      logger.info(
        `[ORDER-AWARENESS] Analysis complete: ${checks.canPlaceOrder ? "✅ ORDER ALLOWED" : "❌ ORDER BLOCKED"} - Pending orders: ${orderIntelligence.totalPendingOrders}, Conflicts: ${orderIntelligence.conflictingOrdersCount}`,
      );

      return {
        canPlaceOrder: checks.canPlaceOrder,
        reasoning: checks.reasoning,
        recommendations: checks.recommendations,
        pendingOrders,
        conflictingOrders: orderAnalysis.conflictingOrders,
        ordersToCancel: orderAnalysis.ordersToCancel,
        ordersToModify: orderAnalysis.ordersToModify,
        orderIntelligence,
        orderManagementActions: {
          cancelOrders: orderAnalysis.ordersToCancel.map((o) => o.id),
          modifyOrders: orderAnalysis.ordersToModify.map((o) => ({
            orderId: o.id,
            newPrice: o.orderPrice * 1.001, // Example modification
            reason: "Price adjustment based on market conditions",
          })),
        },
      };
    } catch (error) {
      logger.error(`[ORDER-AWARENESS] Error checking order limits:`, error);
      return {
        canPlaceOrder: false,
        reasoning: ["Error checking order limits - defaulting to no order for safety"],
        recommendations: ["Fix order checking system"],
        pendingOrders: [],
        conflictingOrders: [],
        ordersToCancel: [],
        ordersToModify: [],
        orderIntelligence: {
          totalPendingOrders: 0,
          symbolPendingOrders: 0,
          conflictingOrdersCount: 0,
          oldestOrderAge: 0,
          averageDistanceFromMarket: 0,
          estimatedTotalExposure: 0,
        },
        orderManagementActions: {
          cancelOrders: [],
          modifyOrders: [],
        },
      };
    }
  }

  private async getPendingOrders(capitalApi: any, botId: string): Promise<PendingOrder[]> {
    try {
      logger.info(`[ORDER-AWARENESS] Fetching pending orders from Capital.com API...`);

      // Fetch working orders from Capital.com API
      const workingOrdersResponse = await capitalApi.getWorkingOrders();
      const workingOrders = workingOrdersResponse.workingOrders || [];

      logger.info(
        `[ORDER-AWARENESS] Found ${workingOrders.length} pending orders in Capital.com account`,
      );

      // Transform Capital.com API response to our format
      const mappedOrders: PendingOrder[] = workingOrders.map((order: any) => {
        const currentPrice =
          order.market?.bid || order.market?.ask || order.workingOrderData?.level;
        const orderPrice = order.workingOrderData?.level || 0;
        const distanceFromMarket = Math.abs(currentPrice - orderPrice);

        return {
          id: order.workingOrderData?.dealId || order.workingOrderData?.requestId,
          symbol: order.market?.epic || "UNKNOWN",
          direction: order.workingOrderData?.direction as "BUY" | "SELL",
          orderType: order.workingOrderData?.type as "LIMIT" | "STOP",
          size: order.workingOrderData?.size || 0,
          orderPrice,
          stopLoss: order.workingOrderData?.stopLevel,
          takeProfit: order.workingOrderData?.profitLevel,
          createdAt: new Date(order.workingOrderData?.createdDate || Date.now()),
          expiryDate: order.workingOrderData?.goodTillDate
            ? new Date(order.workingOrderData.goodTillDate)
            : undefined,
          timeInForce: order.workingOrderData?.timeInForce || "GTC",
          status: "WORKING",
          distanceFromMarket,
          estimatedFillProbability: this.calculateFillProbability(distanceFromMarket, currentPrice),
          conflictLevel: "NONE", // Will be calculated in analyzeOrderConflicts
          brokerOrderId: order.workingOrderData?.dealId || order.workingOrderData?.requestId,
        };
      });

      // Debug order mapping
      logger.info(`[ORDER-AWARENESS] Order mapping debug:`, {
        rawOrdersCount: workingOrders.length,
        mappedOrdersCount: mappedOrders.length,
        symbols: mappedOrders.map((o: PendingOrder) => o.symbol),
        orderTypes: mappedOrders.map((o: PendingOrder) => o.orderType),
        directions: mappedOrders.map((o: PendingOrder) => o.direction),
      });

      return mappedOrders;
    } catch (error) {
      logger.error(`[ORDER-AWARENESS] Error fetching pending orders from Capital.com API:`, error);

      // Fallback to database orders (if we're tracking them)
      logger.warn(`[ORDER-AWARENESS] Falling back to database orders...`);

      // For now, return empty array as fallback
      return [];
    }
  }

  private async analyzeOrderConflicts(
    params: OrderAwarenessParams,
    allOrders: PendingOrder[],
    symbolOrders: PendingOrder[],
  ): Promise<{
    conflictingOrders: PendingOrder[];
    ordersToCancel: PendingOrder[];
    ordersToModify: PendingOrder[];
  }> {
    const conflictingOrders: PendingOrder[] = [];
    const ordersToCancel: PendingOrder[] = [];
    const ordersToModify: PendingOrder[] = [];

    const currentPrice = params.currentPrice || 0;
    const proposedPrice = params.proposedPrice || currentPrice;

    // Check for conflicting orders
    for (const order of symbolOrders) {
      let conflictLevel: "NONE" | "LOW" | "MEDIUM" | "HIGH" = "NONE";

      // Check if proposed order conflicts with existing orders
      if (params.direction === order.direction) {
        // Same direction - check if prices are too close
        const priceDistance = Math.abs(proposedPrice - order.orderPrice);
        const priceDistancePercent = (priceDistance / currentPrice) * 100;

        if (priceDistancePercent < 0.1) {
          // Less than 0.1% apart
          conflictLevel = "HIGH";
        } else if (priceDistancePercent < 0.5) {
          // Less than 0.5% apart
          conflictLevel = "MEDIUM";
        } else if (priceDistancePercent < 1.0) {
          // Less than 1% apart
          conflictLevel = "LOW";
        }
      } else {
        // Opposite direction - check if it's a hedge or conflict
        if (order.size > params.proposedOrderType === "MARKET" ? 1 : 0.5) {
          conflictLevel = "MEDIUM"; // Potential hedge conflict
        }
      }

      // Check if order is too old
      const orderAge = Date.now() - order.createdAt.getTime();
      const orderAgeHours = orderAge / (1000 * 60 * 60);

      if (orderAgeHours > (params.botConfig.orderTimeoutMinutes || 60)) {
        ordersToCancel.push(order);
      }

      // Check if order is too far from market
      const distancePercent = (order.distanceFromMarket / currentPrice) * 100;
      if (distancePercent > 5) {
        // More than 5% away
        ordersToModify.push(order);
      }

      if (conflictLevel !== "NONE") {
        order.conflictLevel = conflictLevel;
        conflictingOrders.push(order);
      }
    }

    return {
      conflictingOrders,
      ordersToCancel,
      ordersToModify,
    };
  }

  private calculateOrderIntelligence(orders: PendingOrder[], params: OrderAwarenessParams) {
    const symbolOrders = orders.filter((o) => o.symbol === params.symbol);
    const conflictingOrders = orders.filter((o) => o.conflictLevel !== "NONE");

    const orderAges = orders.map((o) => Date.now() - o.createdAt.getTime());
    const oldestOrderAge = Math.max(...orderAges, 0);

    const distances = orders.map((o) => o.distanceFromMarket);
    const averageDistanceFromMarket =
      distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : 0;

    const estimatedTotalExposure = orders.reduce((total, order) => {
      return total + order.size * order.orderPrice;
    }, 0);

    return {
      totalPendingOrders: orders.length,
      symbolPendingOrders: symbolOrders.length,
      conflictingOrdersCount: conflictingOrders.length,
      oldestOrderAge,
      averageDistanceFromMarket,
      estimatedTotalExposure,
    };
  }

  private async performOrderChecks(
    params: OrderAwarenessParams,
    allOrders: PendingOrder[],
    symbolOrders: PendingOrder[],
    intelligence: any,
    analysis: any,
  ): Promise<{
    canPlaceOrder: boolean;
    reasoning: string[];
    recommendations: string[];
  }> {
    const reasoning: string[] = [];
    const recommendations: string[] = [];
    let canPlaceOrder = true;

    // Check maximum orders limit
    const maxOrders = params.botConfig.maxOpenOrders || 10;
    if (intelligence.totalPendingOrders >= maxOrders) {
      canPlaceOrder = false;
      reasoning.push(
        `Maximum orders limit reached (${intelligence.totalPendingOrders}/${maxOrders})`,
      );
      recommendations.push("Cancel old or conflicting orders before placing new ones");
    }

    // Check symbol-specific order limits
    const maxOrdersPerSymbol = params.botConfig.maxOrdersPerSymbol || 3;
    if (intelligence.symbolPendingOrders >= maxOrdersPerSymbol) {
      canPlaceOrder = false;
      reasoning.push(
        `Symbol order limit reached for ${params.symbol} (${intelligence.symbolPendingOrders}/${maxOrdersPerSymbol})`,
      );
      recommendations.push(
        `Consider canceling existing ${params.symbol} orders or increasing symbol limit`,
      );
    }

    // Check for high-conflict orders
    if (intelligence.conflictingOrdersCount > 0) {
      const highConflicts = analysis.conflictingOrders.filter(
        (o: PendingOrder) => o.conflictLevel === "HIGH",
      );
      if (highConflicts.length > 0) {
        canPlaceOrder = false;
        reasoning.push(`High conflict detected with ${highConflicts.length} existing orders`);
        recommendations.push("Cancel conflicting orders before placing new order");
      }
    }

    // Check account exposure
    const exposurePercent = (intelligence.estimatedTotalExposure / params.accountBalance) * 100;
    if (exposurePercent > 80) {
      canPlaceOrder = false;
      reasoning.push(`Pending orders exposure too high (${exposurePercent.toFixed(1)}%)`);
      recommendations.push("Reduce pending order sizes or cancel some orders");
    }

    // Add positive reasoning if checks pass
    if (canPlaceOrder) {
      reasoning.push("All order limit checks passed");
      reasoning.push(
        `Orders: ${intelligence.totalPendingOrders}/${maxOrders}, Symbol: ${intelligence.symbolPendingOrders}/${maxOrdersPerSymbol}`,
      );

      if (analysis.ordersToCancel.length > 0) {
        recommendations.push(
          `Consider canceling ${analysis.ordersToCancel.length} old orders to improve efficiency`,
        );
      }

      if (analysis.ordersToModify.length > 0) {
        recommendations.push(
          `Consider modifying ${analysis.ordersToModify.length} orders that are far from market`,
        );
      }
    }

    return {
      canPlaceOrder,
      reasoning,
      recommendations,
    };
  }

  private calculateFillProbability(distanceFromMarket: number, currentPrice: number): number {
    // Simple probability model based on distance from market
    const distancePercent = (distanceFromMarket / currentPrice) * 100;

    if (distancePercent < 0.1) return 0.9; // Very close to market
    if (distancePercent < 0.5) return 0.7; // Close to market
    if (distancePercent < 1.0) return 0.5; // Moderate distance
    if (distancePercent < 2.0) return 0.3; // Far from market
    return 0.1; // Very far from market
  }

  async cancelOrder(capitalApi: any, orderId: string): Promise<boolean> {
    try {
      logger.info(`[ORDER-AWARENESS] Canceling order: ${orderId}`);
      await capitalApi.cancelWorkingOrder(orderId);
      logger.info(`[ORDER-AWARENESS] ✅ Order canceled: ${orderId}`);
      return true;
    } catch (error) {
      logger.error(`[ORDER-AWARENESS] ❌ Failed to cancel order ${orderId}:`, error);
      return false;
    }
  }

  async modifyOrder(capitalApi: any, orderId: string, newPrice: number): Promise<boolean> {
    try {
      logger.info(`[ORDER-AWARENESS] Modifying order: ${orderId} to price: ${newPrice}`);
      await capitalApi.updateWorkingOrder(orderId, { level: newPrice });
      logger.info(`[ORDER-AWARENESS] ✅ Order modified: ${orderId}`);
      return true;
    } catch (error) {
      logger.error(`[ORDER-AWARENESS] ❌ Failed to modify order ${orderId}:`, error);
      return false;
    }
  }
}
