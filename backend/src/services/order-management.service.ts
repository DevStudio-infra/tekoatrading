import { logger } from "../logger";
import { OrderAwarenessAgent } from "../agents/trading/order-awareness.agent";
import { OrderIntelligenceAgent } from "../agents/trading/order-intelligence.agent";

export interface OrderManagementAction {
  type: "CANCEL" | "MODIFY" | "CREATE";
  orderId?: string;
  symbol: string;
  newPrice?: number;
  reason: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  timestamp: Date;
}

export interface OrderManagementResult {
  success: boolean;
  actionsPerformed: OrderManagementAction[];
  actionsSkipped: OrderManagementAction[];
  errors: string[];
  summary: {
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    ordersChanged: number;
  };
}

export class OrderManagementService {
  private orderAwarenessAgent: OrderAwarenessAgent;
  private orderIntelligenceAgent: OrderIntelligenceAgent;

  constructor() {
    this.orderAwarenessAgent = new OrderAwarenessAgent();
    this.orderIntelligenceAgent = new OrderIntelligenceAgent();
  }

  /**
   * Execute order management actions based on order intelligence recommendations
   */
  async executeOrderManagementActions(
    capitalApi: any,
    botConfig: any,
    orderIntelligenceResult: any,
    dryRun: boolean = false,
  ): Promise<OrderManagementResult> {
    const actionsPerformed: OrderManagementAction[] = [];
    const actionsSkipped: OrderManagementAction[] = [];
    const errors: string[] = [];

    logger.info(`[ORDER-MANAGEMENT] Executing order management actions (dryRun: ${dryRun})`);

    try {
      // 1. Cancel Orders
      if (orderIntelligenceResult.orderManagementActions.cancelOrders.length > 0) {
        logger.info(
          `[ORDER-MANAGEMENT] Processing ${orderIntelligenceResult.orderManagementActions.cancelOrders.length} order cancellations`,
        );

        for (const orderId of orderIntelligenceResult.orderManagementActions.cancelOrders) {
          const action: OrderManagementAction = {
            type: "CANCEL",
            orderId,
            symbol: "MULTIPLE", // Could be multiple symbols
            reason: "Old or conflicting order",
            priority: orderIntelligenceResult.orderManagementActions.priorityLevel,
            timestamp: new Date(),
          };

          if (dryRun) {
            logger.info(`[ORDER-MANAGEMENT] [DRY-RUN] Would cancel order: ${orderId}`);
            actionsPerformed.push(action);
          } else {
            try {
              const success = await this.orderAwarenessAgent.cancelOrder(capitalApi, orderId);
              if (success) {
                logger.info(`[ORDER-MANAGEMENT] ✅ Successfully canceled order: ${orderId}`);
                actionsPerformed.push(action);
              } else {
                logger.warn(`[ORDER-MANAGEMENT] ❌ Failed to cancel order: ${orderId}`);
                actionsSkipped.push(action);
                errors.push(`Failed to cancel order ${orderId}`);
              }
            } catch (error: any) {
              logger.error(`[ORDER-MANAGEMENT] ❌ Error canceling order ${orderId}:`, error);
              actionsSkipped.push(action);
              errors.push(`Error canceling order ${orderId}: ${error.message}`);
            }
          }
        }
      }

      // 2. Modify Orders
      if (orderIntelligenceResult.orderManagementActions.modifyOrders.length > 0) {
        logger.info(
          `[ORDER-MANAGEMENT] Processing ${orderIntelligenceResult.orderManagementActions.modifyOrders.length} order modifications`,
        );

        for (const modification of orderIntelligenceResult.orderManagementActions.modifyOrders) {
          const action: OrderManagementAction = {
            type: "MODIFY",
            orderId: modification.orderId,
            symbol: "MULTIPLE", // Could be multiple symbols
            newPrice: modification.newPrice,
            reason: modification.reason,
            priority: orderIntelligenceResult.orderManagementActions.priorityLevel,
            timestamp: new Date(),
          };

          if (dryRun) {
            logger.info(
              `[ORDER-MANAGEMENT] [DRY-RUN] Would modify order: ${modification.orderId} to price: ${modification.newPrice}`,
            );
            actionsPerformed.push(action);
          } else {
            try {
              const success = await this.orderAwarenessAgent.modifyOrder(
                capitalApi,
                modification.orderId,
                modification.newPrice,
              );
              if (success) {
                logger.info(
                  `[ORDER-MANAGEMENT] ✅ Successfully modified order: ${modification.orderId} to ${modification.newPrice}`,
                );
                actionsPerformed.push(action);
              } else {
                logger.warn(
                  `[ORDER-MANAGEMENT] ❌ Failed to modify order: ${modification.orderId}`,
                );
                actionsSkipped.push(action);
                errors.push(`Failed to modify order ${modification.orderId}`);
              }
            } catch (error: any) {
              logger.error(
                `[ORDER-MANAGEMENT] ❌ Error modifying order ${modification.orderId}:`,
                error,
              );
              actionsSkipped.push(action);
              errors.push(`Error modifying order ${modification.orderId}: ${error.message}`);
            }
          }
        }
      }

      const result: OrderManagementResult = {
        success: errors.length === 0,
        actionsPerformed,
        actionsSkipped,
        errors,
        summary: {
          totalActions: actionsPerformed.length + actionsSkipped.length,
          successfulActions: actionsPerformed.length,
          failedActions: actionsSkipped.length,
          ordersChanged: actionsPerformed.filter((a) => a.type === "CANCEL" || a.type === "MODIFY")
            .length,
        },
      };

      logger.info(
        `[ORDER-MANAGEMENT] Execution complete: ${result.summary.successfulActions}/${result.summary.totalActions} actions successful`,
      );

      return result;
    } catch (error: any) {
      logger.error(`[ORDER-MANAGEMENT] Critical error in order management:`, error);
      return {
        success: false,
        actionsPerformed,
        actionsSkipped,
        errors: [...errors, `Critical error: ${error.message}`],
        summary: {
          totalActions: actionsPerformed.length + actionsSkipped.length,
          successfulActions: actionsPerformed.length,
          failedActions: actionsSkipped.length + 1,
          ordersChanged: 0,
        },
      };
    }
  }

  /**
   * Get order management recommendations without executing
   */
  async getOrderManagementRecommendations(
    capitalApi: any,
    botConfig: any,
    symbol: string,
    direction: "BUY" | "SELL",
    proposedPrice?: number,
  ): Promise<{
    recommendations: string[];
    actions: OrderManagementAction[];
    priority: "LOW" | "MEDIUM" | "HIGH";
    shouldProceed: boolean;
  }> {
    try {
      logger.info(
        `[ORDER-MANAGEMENT] Getting order management recommendations for ${symbol} ${direction}`,
      );

      // Get order intelligence analysis
      const orderIntelligenceContext = {
        symbol,
        direction,
        currentPrice: proposedPrice || 0,
        proposedOrderType: "MARKET" as const,
        proposedPrice,
        marketConditions: {
          volatility: "MEDIUM" as const,
          spread: 0,
          volume: 1000000,
          trend: "SIDEWAYS" as const,
        },
        timeframe: "1h",
        accountBalance: 10000,
        botConfig,
        capitalApi,
      };

      const orderIntelligence = await this.orderIntelligenceAgent.analyze(orderIntelligenceContext);

      // Convert to actions
      const actions: OrderManagementAction[] = [];

      // Add cancel actions
      orderIntelligence.orderManagementActions.cancelOrders.forEach((orderId) => {
        actions.push({
          type: "CANCEL",
          orderId,
          symbol,
          reason: "Conflicting or old order",
          priority: orderIntelligence.orderManagementActions.priorityLevel,
          timestamp: new Date(),
        });
      });

      // Add modify actions
      orderIntelligence.orderManagementActions.modifyOrders.forEach((modification) => {
        actions.push({
          type: "MODIFY",
          orderId: modification.orderId,
          symbol,
          newPrice: modification.newPrice,
          reason: modification.reason,
          priority: orderIntelligence.orderManagementActions.priorityLevel,
          timestamp: new Date(),
        });
      });

      const recommendations = [
        ...orderIntelligence.reasoning,
        `Order decision: ${orderIntelligence.orderDecision}`,
        `Overall risk: ${orderIntelligence.riskAssessment.overallRisk}`,
        `Market timing: ${orderIntelligence.marketTiming.isOptimalTiming ? "Good" : "Poor"}`,
      ];

      const shouldProceed =
        orderIntelligence.orderDecision === "EXECUTE" ||
        orderIntelligence.orderDecision === "CANCEL_FIRST" ||
        orderIntelligence.orderDecision === "MODIFY_EXISTING";

      return {
        recommendations,
        actions,
        priority: orderIntelligence.orderManagementActions.priorityLevel,
        shouldProceed,
      };
    } catch (error: any) {
      logger.error(`[ORDER-MANAGEMENT] Error getting recommendations:`, error);
      return {
        recommendations: [`Error getting recommendations: ${error.message}`],
        actions: [],
        priority: "LOW",
        shouldProceed: false,
      };
    }
  }

  /**
   * Clean up old orders based on time and distance from market
   */
  async cleanupOldOrders(
    capitalApi: any,
    botConfig: any,
    maxAgeMinutes: number = 60,
    maxDistancePercent: number = 5,
    dryRun: boolean = false,
  ): Promise<OrderManagementResult> {
    try {
      logger.info(
        `[ORDER-MANAGEMENT] Cleaning up old orders (maxAge: ${maxAgeMinutes}min, maxDistance: ${maxDistancePercent}%)`,
      );

      // Get all pending orders
      const orderAwarenessParams = {
        botId: botConfig.id || "default",
        userId: botConfig.userId || "default",
        symbol: "ALL", // Check all symbols
        direction: "BUY" as const,
        proposedOrderType: "MARKET" as const,
        accountBalance: 10000,
        timeframe: "1h",
        botConfig: {
          maxOpenOrders: 20,
          maxOrdersPerSymbol: 5,
          orderTimeoutMinutes: maxAgeMinutes,
          name: botConfig.name || "Unknown Bot",
        },
        capitalApi,
      };

      const orderAwareness = await this.orderAwarenessAgent.checkOrderLimits(orderAwarenessParams);

      // Filter orders that need cleanup
      const ordersToCleanup = orderAwareness.ordersToCancel.concat(
        orderAwareness.ordersToModify.filter((order) => {
          const distancePercent = (order.distanceFromMarket / (order.orderPrice || 1)) * 100;
          return distancePercent > maxDistancePercent;
        }),
      );

      if (ordersToCleanup.length === 0) {
        logger.info(`[ORDER-MANAGEMENT] No orders need cleanup`);
        return {
          success: true,
          actionsPerformed: [],
          actionsSkipped: [],
          errors: [],
          summary: {
            totalActions: 0,
            successfulActions: 0,
            failedActions: 0,
            ordersChanged: 0,
          },
        };
      }

      // Execute cleanup
      const cleanupResult = await this.executeOrderManagementActions(
        capitalApi,
        botConfig,
        {
          orderManagementActions: {
            cancelOrders: ordersToCleanup.map((o) => o.id),
            modifyOrders: [],
            priorityLevel: "MEDIUM",
          },
        },
        dryRun,
      );

      logger.info(
        `[ORDER-MANAGEMENT] Cleanup complete: ${cleanupResult.summary.ordersChanged} orders cleaned up`,
      );

      return cleanupResult;
    } catch (error: any) {
      logger.error(`[ORDER-MANAGEMENT] Error in cleanup:`, error);
      return {
        success: false,
        actionsPerformed: [],
        actionsSkipped: [],
        errors: [`Cleanup error: ${error.message}`],
        summary: {
          totalActions: 0,
          successfulActions: 0,
          failedActions: 1,
          ordersChanged: 0,
        },
      };
    }
  }
}
