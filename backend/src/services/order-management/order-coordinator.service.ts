import { logger } from "../../logger";

export interface OrderConflictCheck {
  canProceed: boolean;
  reason?: string;
  conflictingOrders?: PendingOrderRecord[];
}

export interface PendingOrderRecord {
  botId: string;
  symbol: string;
  direction: "BUY" | "SELL";
  orderType: string;
  requestingAgent: string;
  createdAt: Date;
  expiresAt?: Date;
  status: "PENDING" | "FILLED" | "CANCELLED" | "EXPIRED";
}

export interface OrderStatistics {
  totalPendingOrders: number;
  pendingBySymbol: { [symbol: string]: number };
  pendingByAgent: { [agent: string]: number };
  orderConflicts: number;
  successfulCoordinations: number;
}

export class OrderCoordinator {
  private pendingOrders: Map<string, PendingOrderRecord[]> = new Map(); // symbol -> orders
  private agentActivity: Map<string, Date> = new Map(); // agent -> last activity
  private conflictCount = 0;
  private successfulCoordinations = 0;

  constructor() {
    // Clean expired orders every 30 seconds
    setInterval(() => {
      this.cleanExpiredOrders();
    }, 30000);

    // Emergency cleanup on startup to clear any stuck orders
    setTimeout(() => {
      this.emergencyStartupCleanup();
    }, 5000);

    logger.info("🏛️ Order Coordinator initialized with automatic cleanup");
  }

  /**
   * Emergency cleanup on startup to clear stuck orders
   */
  private async emergencyStartupCleanup(): Promise<void> {
    const stats = await this.getOrderStatistics();
    if (stats.totalPendingOrders > 10) {
      logger.warn(
        `🚨 Found ${stats.totalPendingOrders} pending orders on startup - clearing stuck orders`,
      );
      await this.emergencyClearAll("Startup cleanup - too many stuck orders");
    } else if (stats.totalPendingOrders > 0) {
      logger.info(
        `🧹 Found ${stats.totalPendingOrders} pending orders on startup - running cleanup`,
      );
      this.cleanExpiredOrders();
    }
  }

  /**
   * Check for order conflicts before allowing new orders
   */
  async checkOrderConflicts(
    botId: string,
    symbol: string,
    direction: "BUY" | "SELL",
    requestingAgent: string,
  ): Promise<OrderConflictCheck> {
    logger.info(
      `🔍 Order Coordination Check: ${requestingAgent} requesting ${direction} ${symbol}`,
    );

    try {
      const symbolOrders = this.pendingOrders.get(symbol) || [];
      const conflicts: PendingOrderRecord[] = [];

      // 1. CHECK FOR SAME DIRECTION CONFLICTS
      const sameDirectionOrders = symbolOrders.filter(
        (order) => order.direction === direction && order.status === "PENDING",
      );

      if (sameDirectionOrders.length > 0) {
        conflicts.push(...sameDirectionOrders);
        return {
          canProceed: false,
          reason: `Already have ${sameDirectionOrders.length} pending ${direction} order(s) for ${symbol}`,
          conflictingOrders: sameDirectionOrders,
        };
      }

      // 2. CHECK FOR OPPOSITE DIRECTION CONFLICTS (Hedging check)
      const oppositeDirection = direction === "BUY" ? "SELL" : "BUY";
      const oppositeDirectionOrders = symbolOrders.filter(
        (order) => order.direction === oppositeDirection && order.status === "PENDING",
      );

      if (oppositeDirectionOrders.length > 0) {
        // Allow opposite directions but warn
        logger.warn(
          `⚠️ Hedging Alert: Creating ${direction} order while ${oppositeDirection} orders exist for ${symbol}`,
        );
      }

      // 3. CHECK FOR AGENT ACTIVITY LIMITS
      const recentAgentActivity = this.getRecentAgentActivity(requestingAgent);
      if (recentAgentActivity > 10) {
        // Max 10 orders per minute per agent
        return {
          canProceed: false,
          reason: `Agent ${requestingAgent} exceeding activity limits: ${recentAgentActivity} orders in last minute`,
          conflictingOrders: [],
        };
      }

      // 4. CHECK FOR SYMBOL OVERLOAD
      const totalSymbolOrders = symbolOrders.filter((order) => order.status === "PENDING").length;
      if (totalSymbolOrders >= 5) {
        // Max 5 pending orders per symbol
        return {
          canProceed: false,
          reason: `Symbol ${symbol} has too many pending orders: ${totalSymbolOrders}/5`,
          conflictingOrders: symbolOrders,
        };
      }

      // 5. COORDINATION SUCCESS
      this.successfulCoordinations++;
      this.agentActivity.set(requestingAgent, new Date());

      logger.info(`✅ Order Coordination APPROVED for ${requestingAgent}: ${direction} ${symbol}`);

      return {
        canProceed: true,
      };
    } catch (error) {
      logger.error(`❌ Order Coordination Error:`, error);
      this.conflictCount++;

      return {
        canProceed: false,
        reason: `Coordination system error: ${error instanceof Error ? error.message : "Unknown error"}`,
        conflictingOrders: [],
      };
    }
  }

  /**
   * Register a pending order decision
   */
  async registerPendingOrder(
    botId: string,
    symbol: string,
    orderDecision: any,
    requestingAgent: string,
  ): Promise<void> {
    const orderRecord: PendingOrderRecord = {
      botId,
      symbol,
      direction:
        orderDecision.orderType === "MARKET" ? "UNKNOWN" : orderDecision.direction || "BUY",
      orderType: orderDecision.orderType,
      requestingAgent,
      createdAt: new Date(),
      expiresAt: orderDecision.expiration || this.getDefaultExpiration(orderDecision.orderType),
      status: "PENDING",
    };

    // Add to pending orders
    const symbolOrders = this.pendingOrders.get(symbol) || [];
    symbolOrders.push(orderRecord);
    this.pendingOrders.set(symbol, symbolOrders);

    logger.info(
      `📝 Registered Pending Order: ${requestingAgent} ${orderDecision.orderType} ${symbol}`,
    );
  }

  /**
   * Cancel a pending order
   */
  async cancelPendingOrder(botId: string, symbol: string, reason: string): Promise<void> {
    const symbolOrders = this.pendingOrders.get(symbol) || [];
    const cancelledOrders = symbolOrders.filter(
      (order) => order.botId === botId && order.status === "PENDING",
    );

    cancelledOrders.forEach((order) => {
      order.status = "CANCELLED";
      logger.info(
        `🚫 Cancelled Pending Order: ${order.requestingAgent} ${order.orderType} ${symbol} - ${reason}`,
      );
    });
  }

  /**
   * Mark order as filled
   */
  async markOrderFilled(botId: string, symbol: string, direction: "BUY" | "SELL"): Promise<void> {
    const symbolOrders = this.pendingOrders.get(symbol) || [];
    const filledOrders = symbolOrders.filter(
      (order) =>
        order.botId === botId && order.direction === direction && order.status === "PENDING",
    );

    filledOrders.forEach((order) => {
      order.status = "FILLED";
      logger.info(
        `✅ Marked Order as Filled: ${order.requestingAgent} ${order.orderType} ${symbol}`,
      );
    });
  }

  /**
   * Get recent agent activity count
   */
  private getRecentAgentActivity(agentName: string): number {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    let activityCount = 0;

    for (const [symbol, orders] of this.pendingOrders) {
      activityCount += orders.filter(
        (order) => order.requestingAgent === agentName && order.createdAt > oneMinuteAgo,
      ).length;
    }

    return activityCount;
  }

  /**
   * Get default expiration for order types
   */
  private getDefaultExpiration(orderType: string): Date {
    const now = new Date();

    switch (orderType) {
      case "MARKET":
        return new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
      case "LIMIT":
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      case "STOP":
        return new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours
      default:
        return new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
    }
  }

  /**
   * Clean expired orders
   */
  private cleanExpiredOrders(): void {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
    let cleanedCount = 0;

    for (const [symbol, orders] of this.pendingOrders) {
      const activeOrders = orders.filter((order) => {
        // Remove if expired by expiration date
        if (order.expiresAt && order.expiresAt < now && order.status === "PENDING") {
          order.status = "EXPIRED";
          cleanedCount++;
          logger.info(`⏰ Expired order: ${order.requestingAgent} ${order.orderType} ${symbol}`);
          return false;
        }

        // Remove if older than 1 hour and still pending (safety cleanup)
        if (order.status === "PENDING" && order.createdAt < oneHourAgo) {
          order.status = "EXPIRED";
          cleanedCount++;
          logger.info(
            `🧹 Force expired old order: ${order.requestingAgent} ${order.orderType} ${symbol} (${Math.round((now.getTime() - order.createdAt.getTime()) / (1000 * 60))} minutes old)`,
          );
          return false;
        }

        // Keep non-expired orders
        return (
          order.status !== "EXPIRED" && order.status !== "FILLED" && order.status !== "CANCELLED"
        );
      });

      if (activeOrders.length !== orders.length) {
        this.pendingOrders.set(symbol, activeOrders);
      }
    }

    if (cleanedCount > 0) {
      logger.info(`🧹 Cleaned ${cleanedCount} expired/old orders`);
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStatistics(botId?: string): Promise<OrderStatistics> {
    let totalPendingOrders = 0;
    const pendingBySymbol: { [symbol: string]: number } = {};
    const pendingByAgent: { [agent: string]: number } = {};

    for (const [symbol, orders] of this.pendingOrders) {
      const pendingOrders = orders.filter((order) => {
        const isPending = order.status === "PENDING";
        const matchesBot = !botId || order.botId === botId;
        return isPending && matchesBot;
      });

      if (pendingOrders.length > 0) {
        pendingBySymbol[symbol] = pendingOrders.length;
        totalPendingOrders += pendingOrders.length;

        pendingOrders.forEach((order) => {
          pendingByAgent[order.requestingAgent] = (pendingByAgent[order.requestingAgent] || 0) + 1;
        });
      }
    }

    return {
      totalPendingOrders,
      pendingBySymbol,
      pendingByAgent,
      orderConflicts: this.conflictCount,
      successfulCoordinations: this.successfulCoordinations,
    };
  }

  /**
   * Get pending orders for a symbol
   */
  async getPendingOrdersForSymbol(symbol: string): Promise<PendingOrderRecord[]> {
    const symbolOrders = this.pendingOrders.get(symbol) || [];
    return symbolOrders.filter((order) => order.status === "PENDING");
  }

  /**
   * Force clear all pending orders (emergency use)
   */
  async emergencyClearAll(reason: string): Promise<void> {
    let clearedCount = 0;

    for (const [symbol, orders] of this.pendingOrders) {
      orders.forEach((order) => {
        if (order.status === "PENDING") {
          order.status = "CANCELLED";
          clearedCount++;
        }
      });
    }

    logger.warn(`🚨 EMERGENCY: Cleared ${clearedCount} pending orders - ${reason}`);
  }
}
