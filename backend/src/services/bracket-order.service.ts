import { EventEmitter } from "events";
import { logger } from "../logger";
import { PendingOrderMonitorService } from "./pending-order-monitor.service";
import { BrokerIntegrationService } from "./broker-integration.service";

export interface BracketOrderConfig {
  symbol: string;
  side: "BUY" | "SELL";
  entryType: "MARKET" | "LIMIT" | "STOP";
  size: number;
  entryPrice?: number; // For LIMIT/STOP entry orders
  stopLoss: number;
  takeProfit: number;
  timeInForce: "GTC" | "GTD" | "IOC" | "FOK";
  expireTime?: Date;
  botId: string;
  userId: string;
}

export interface BracketOrder {
  id: string;
  config: BracketOrderConfig;
  entryOrderId?: string;
  stopLossOrderId?: string;
  takeProfitOrderId?: string;
  status: "PENDING" | "ENTRY_FILLED" | "COMPLETED" | "CANCELLED" | "FAILED";
  createdAt: Date;
  updatedAt: Date;
  fillPrice?: number;
  fillTime?: Date;
  completionReason?: string;
  brokerOrderIds: {
    entry?: string;
    stopLoss?: string;
    takeProfit?: string;
  };
}

export class BracketOrderService extends EventEmitter {
  private pendingOrderMonitor: PendingOrderMonitorService;
  private brokerService: BrokerIntegrationService;
  private bracketOrders: Map<string, BracketOrder> = new Map();
  private isInitialized: boolean = false;

  constructor(
    pendingOrderMonitor: PendingOrderMonitorService,
    brokerService: BrokerIntegrationService,
  ) {
    super();
    this.pendingOrderMonitor = pendingOrderMonitor;
    this.brokerService = brokerService;

    // Listen to pending order events
    this.setupEventListeners();
  }

  /**
   * Initialize the bracket order service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    logger.info("🎯 Initializing Bracket Order Service");
    this.isInitialized = true;

    // Load existing bracket orders from database
    await this.loadBracketOrders();

    logger.info("✅ Bracket Order Service initialized");
  }

  /**
   * Create a new bracket order
   */
  async createBracketOrder(config: BracketOrderConfig): Promise<string> {
    if (!this.isInitialized) {
      throw new Error("Bracket Order Service not initialized");
    }

    // Validate configuration
    this.validateBracketConfig(config);

    const bracketId = `bracket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const bracketOrder: BracketOrder = {
      id: bracketId,
      config,
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
      brokerOrderIds: {},
    };

    logger.info(
      `🎯 Creating bracket order: ${bracketId} (${config.entryType} ${config.side} ${config.size} ${config.symbol})`,
    );

    try {
      // Step 1: Create entry order
      await this.createEntryOrder(bracketOrder);

      // Step 2: If entry is MARKET, immediately create SL/TP orders
      if (config.entryType === "MARKET") {
        await this.createStopLossAndTakeProfit(bracketOrder);
        bracketOrder.status = "ENTRY_FILLED";
        bracketOrder.fillTime = new Date();
      }

      // Add to tracking
      this.bracketOrders.set(bracketId, bracketOrder);

      // Save to database
      await this.saveBracketOrderToDatabase(bracketOrder);

      logger.info(`✅ Bracket order created: ${bracketId}`);

      // Emit event
      this.emit("bracket_created", bracketOrder);

      return bracketId;
    } catch (error) {
      logger.error(`❌ Failed to create bracket order: ${error}`);

      // Cleanup any partially created orders
      await this.cleanupFailedBracketOrder(bracketOrder);

      throw error;
    }
  }

  /**
   * Cancel a bracket order
   */
  async cancelBracketOrder(
    bracketId: string,
    reason: string = "Manual cancellation",
  ): Promise<boolean> {
    const bracketOrder = this.bracketOrders.get(bracketId);
    if (!bracketOrder) {
      logger.warn(`⚠️ Bracket order not found: ${bracketId}`);
      return false;
    }

    if (bracketOrder.status === "COMPLETED" || bracketOrder.status === "CANCELLED") {
      logger.warn(`⚠️ Cannot cancel bracket order ${bracketId} - status: ${bracketOrder.status}`);
      return false;
    }

    logger.info(`❌ Cancelling bracket order: ${bracketId} (${reason})`);

    try {
      // Cancel all associated orders
      const cancelPromises = [];

      if (bracketOrder.entryOrderId) {
        cancelPromises.push(
          this.pendingOrderMonitor.cancelPendingOrder(bracketOrder.entryOrderId, reason),
        );
      }
      if (bracketOrder.stopLossOrderId) {
        cancelPromises.push(
          this.pendingOrderMonitor.cancelPendingOrder(bracketOrder.stopLossOrderId, reason),
        );
      }
      if (bracketOrder.takeProfitOrderId) {
        cancelPromises.push(
          this.pendingOrderMonitor.cancelPendingOrder(bracketOrder.takeProfitOrderId, reason),
        );
      }

      await Promise.all(cancelPromises);

      // Update bracket order status
      bracketOrder.status = "CANCELLED";
      bracketOrder.completionReason = reason;
      bracketOrder.updatedAt = new Date();

      // Update database
      await this.updateBracketOrderInDatabase(bracketOrder);

      logger.info(`✅ Bracket order cancelled: ${bracketId}`);

      // Emit event
      this.emit("bracket_cancelled", bracketOrder);

      return true;
    } catch (error) {
      logger.error(`❌ Failed to cancel bracket order ${bracketId}: ${error}`);
      return false;
    }
  }

  /**
   * Get bracket order by ID
   */
  getBracketOrder(bracketId: string): BracketOrder | undefined {
    return this.bracketOrders.get(bracketId);
  }

  /**
   * Get all bracket orders for a bot
   */
  getBotBracketOrders(botId: string): BracketOrder[] {
    return Array.from(this.bracketOrders.values()).filter((order) => order.config.botId === botId);
  }

  /**
   * Get bracket order statistics
   */
  getBracketOrderStatistics(): {
    total: number;
    pending: number;
    entryFilled: number;
    completed: number;
    cancelled: number;
    failed: number;
    bySymbol: { [key: string]: number };
    byBot: { [key: string]: number };
  } {
    const orders = Array.from(this.bracketOrders.values());
    const stats = {
      total: orders.length,
      pending: orders.filter((o) => o.status === "PENDING").length,
      entryFilled: orders.filter((o) => o.status === "ENTRY_FILLED").length,
      completed: orders.filter((o) => o.status === "COMPLETED").length,
      cancelled: orders.filter((o) => o.status === "CANCELLED").length,
      failed: orders.filter((o) => o.status === "FAILED").length,
      bySymbol: {} as { [key: string]: number },
      byBot: {} as { [key: string]: number },
    };

    // Count by symbol and bot
    orders.forEach((order) => {
      stats.bySymbol[order.config.symbol] = (stats.bySymbol[order.config.symbol] || 0) + 1;
      stats.byBot[order.config.botId] = (stats.byBot[order.config.botId] || 0) + 1;
    });

    return stats;
  }

  /**
   * Setup event listeners for order events
   */
  private setupEventListeners(): void {
    // Listen for order fills to handle bracket order progression
    this.pendingOrderMonitor.on("order_filled", (order) => {
      this.handleOrderFilled(order);
    });

    this.pendingOrderMonitor.on("order_cancelled", (order) => {
      this.handleOrderCancelled(order);
    });
  }

  /**
   * Handle order filled event
   */
  private async handleOrderFilled(order: any): Promise<void> {
    // Find bracket order that contains this order
    const bracketOrder = this.findBracketOrderByOrderId(order.id);
    if (!bracketOrder) return;

    logger.info(`🎯 Order filled in bracket ${bracketOrder.id}: ${order.id}`);

    try {
      if (order.id === bracketOrder.entryOrderId) {
        // Entry order filled - create SL/TP orders
        await this.handleEntryOrderFilled(bracketOrder, order);
      } else if (order.id === bracketOrder.stopLossOrderId) {
        // Stop loss hit - complete bracket
        await this.handleStopLossFilled(bracketOrder, order);
      } else if (order.id === bracketOrder.takeProfitOrderId) {
        // Take profit hit - complete bracket
        await this.handleTakeProfitFilled(bracketOrder, order);
      }
    } catch (error) {
      logger.error(`❌ Error handling order fill for bracket ${bracketOrder.id}: ${error}`);
    }
  }

  /**
   * Handle entry order filled
   */
  private async handleEntryOrderFilled(bracketOrder: BracketOrder, entryOrder: any): Promise<void> {
    logger.info(`📈 Entry order filled for bracket ${bracketOrder.id} @ ${entryOrder.fillPrice}`);

    bracketOrder.status = "ENTRY_FILLED";
    bracketOrder.fillPrice = entryOrder.fillPrice;
    bracketOrder.fillTime = entryOrder.fillTime;
    bracketOrder.updatedAt = new Date();

    // Create stop loss and take profit orders
    await this.createStopLossAndTakeProfit(bracketOrder);

    // Update database
    await this.updateBracketOrderInDatabase(bracketOrder);

    // Emit event
    this.emit("bracket_entry_filled", bracketOrder);
  }

  /**
   * Handle stop loss filled
   */
  private async handleStopLossFilled(
    bracketOrder: BracketOrder,
    stopLossOrder: any,
  ): Promise<void> {
    logger.info(`🛑 Stop loss hit for bracket ${bracketOrder.id} @ ${stopLossOrder.fillPrice}`);

    // Cancel take profit order
    if (bracketOrder.takeProfitOrderId) {
      await this.pendingOrderMonitor.cancelPendingOrder(
        bracketOrder.takeProfitOrderId,
        "Stop loss triggered",
      );
    }

    bracketOrder.status = "COMPLETED";
    bracketOrder.completionReason = "Stop loss triggered";
    bracketOrder.updatedAt = new Date();

    // Update database
    await this.updateBracketOrderInDatabase(bracketOrder);

    // Emit event
    this.emit("bracket_completed", bracketOrder);
  }

  /**
   * Handle take profit filled
   */
  private async handleTakeProfitFilled(
    bracketOrder: BracketOrder,
    takeProfitOrder: any,
  ): Promise<void> {
    logger.info(`🎯 Take profit hit for bracket ${bracketOrder.id} @ ${takeProfitOrder.fillPrice}`);

    // Cancel stop loss order
    if (bracketOrder.stopLossOrderId) {
      await this.pendingOrderMonitor.cancelPendingOrder(
        bracketOrder.stopLossOrderId,
        "Take profit triggered",
      );
    }

    bracketOrder.status = "COMPLETED";
    bracketOrder.completionReason = "Take profit triggered";
    bracketOrder.updatedAt = new Date();

    // Update database
    await this.updateBracketOrderInDatabase(bracketOrder);

    // Emit event
    this.emit("bracket_completed", bracketOrder);
  }

  /**
   * Handle order cancelled event
   */
  private async handleOrderCancelled(order: any): Promise<void> {
    const bracketOrder = this.findBracketOrderByOrderId(order.id);
    if (!bracketOrder) return;

    logger.info(`❌ Order cancelled in bracket ${bracketOrder.id}: ${order.id}`);

    // If entry order cancelled, fail the entire bracket
    if (order.id === bracketOrder.entryOrderId) {
      bracketOrder.status = "FAILED";
      bracketOrder.completionReason = "Entry order cancelled";
      bracketOrder.updatedAt = new Date();

      await this.updateBracketOrderInDatabase(bracketOrder);
      this.emit("bracket_failed", bracketOrder);
    }
  }

  /**
   * Create entry order
   */
  private async createEntryOrder(bracketOrder: BracketOrder): Promise<void> {
    const config = bracketOrder.config;

    if (config.entryType === "MARKET") {
      // For market orders, we'll create them directly through the broker
      // This will be handled in the main execution flow
      logger.info(`📈 Market entry order will be executed immediately`);
      return;
    }

    // Create LIMIT or STOP entry order
    const entryOrderId = await this.pendingOrderMonitor.addPendingOrder({
      botId: config.botId,
      userId: config.userId,
      symbol: config.symbol,
      side: config.side,
      type: config.entryType as "LIMIT" | "STOP",
      size: config.size,
      price: config.entryPrice!,
      status: "PENDING",
      timeInForce: config.timeInForce,
      expireTime: config.expireTime,
    });

    bracketOrder.entryOrderId = entryOrderId;
    logger.info(
      `📋 Entry order created: ${entryOrderId} (${config.entryType} @ ${config.entryPrice})`,
    );
  }

  /**
   * Create stop loss and take profit orders
   */
  private async createStopLossAndTakeProfit(bracketOrder: BracketOrder): Promise<void> {
    const config = bracketOrder.config;

    // Create stop loss order
    const stopLossOrderId = await this.pendingOrderMonitor.addPendingOrder({
      botId: config.botId,
      userId: config.userId,
      symbol: config.symbol,
      side: config.side === "BUY" ? "SELL" : "BUY", // Opposite side
      type: "STOP",
      size: config.size,
      price: config.stopLoss,
      status: "PENDING",
      timeInForce: "GTC", // Stop losses are typically GTC
    });

    // Create take profit order
    const takeProfitOrderId = await this.pendingOrderMonitor.addPendingOrder({
      botId: config.botId,
      userId: config.userId,
      symbol: config.symbol,
      side: config.side === "BUY" ? "SELL" : "BUY", // Opposite side
      type: "LIMIT",
      size: config.size,
      price: config.takeProfit,
      status: "PENDING",
      timeInForce: "GTC", // Take profits are typically GTC
    });

    bracketOrder.stopLossOrderId = stopLossOrderId;
    bracketOrder.takeProfitOrderId = takeProfitOrderId;

    logger.info(
      `🛡️ Protective orders created: SL=${stopLossOrderId} @ ${config.stopLoss}, TP=${takeProfitOrderId} @ ${config.takeProfit}`,
    );
  }

  /**
   * Find bracket order by order ID
   */
  private findBracketOrderByOrderId(orderId: string): BracketOrder | undefined {
    return Array.from(this.bracketOrders.values()).find(
      (bracketOrder) =>
        bracketOrder.entryOrderId === orderId ||
        bracketOrder.stopLossOrderId === orderId ||
        bracketOrder.takeProfitOrderId === orderId,
    );
  }

  /**
   * Validate bracket configuration
   */
  private validateBracketConfig(config: BracketOrderConfig): void {
    if (!config.symbol || !config.side || !config.size) {
      throw new Error("Missing required bracket order parameters");
    }

    if (config.size <= 0) {
      throw new Error("Position size must be positive");
    }

    if (config.entryType !== "MARKET" && !config.entryPrice) {
      throw new Error("Entry price required for LIMIT/STOP orders");
    }

    // Validate stop loss and take profit levels
    const isBuy = config.side === "BUY";
    const entryPrice = config.entryPrice || 0;

    if (isBuy) {
      if (config.stopLoss >= entryPrice) {
        throw new Error("Stop loss must be below entry price for BUY orders");
      }
      if (config.takeProfit <= entryPrice) {
        throw new Error("Take profit must be above entry price for BUY orders");
      }
    } else {
      if (config.stopLoss <= entryPrice) {
        throw new Error("Stop loss must be above entry price for SELL orders");
      }
      if (config.takeProfit >= entryPrice) {
        throw new Error("Take profit must be below entry price for SELL orders");
      }
    }
  }

  /**
   * Cleanup failed bracket order
   */
  private async cleanupFailedBracketOrder(bracketOrder: BracketOrder): Promise<void> {
    const ordersToCancel = [
      bracketOrder.entryOrderId,
      bracketOrder.stopLossOrderId,
      bracketOrder.takeProfitOrderId,
    ].filter(Boolean);

    for (const orderId of ordersToCancel) {
      try {
        await this.pendingOrderMonitor.cancelPendingOrder(
          orderId!,
          "Bracket order creation failed",
        );
      } catch (error) {
        logger.error(`❌ Failed to cleanup order ${orderId}: ${error}`);
      }
    }
  }

  // Database operations (TODO: Implement with actual database)
  private async loadBracketOrders(): Promise<void> {
    // TODO: Load from database
    logger.debug("📥 Loading bracket orders from database");
  }

  private async saveBracketOrderToDatabase(bracketOrder: BracketOrder): Promise<void> {
    // TODO: Save to database
    logger.debug(`💾 Saving bracket order to database: ${bracketOrder.id}`);
  }

  private async updateBracketOrderInDatabase(bracketOrder: BracketOrder): Promise<void> {
    // TODO: Update in database
    logger.debug(`💾 Updating bracket order in database: ${bracketOrder.id}`);
  }
}
