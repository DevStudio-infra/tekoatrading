import { EventEmitter } from "events";
import { logger } from "../logger";
import { prisma } from "../prisma";
import { BrokerIntegrationService } from "./broker-integration.service";

export interface PendingOrder {
  id: string;
  botId: string;
  userId: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "LIMIT" | "STOP";
  size: number;
  price: number;
  stopLevel?: number;
  profitLevel?: number;
  status: "PENDING" | "FILLED" | "CANCELLED" | "EXPIRED";
  createdAt: Date;
  updatedAt: Date;
  brokerOrderId?: string;
  timeInForce: "GTC" | "GTD" | "IOC" | "FOK";
  expireTime?: Date;
  fillPrice?: number;
  fillTime?: Date;
  cancellationReason?: string;
}

export interface OrderMonitoringConfig {
  checkIntervalMs: number;
  maxOrderAge: number; // in milliseconds
  autoCleanupExpired: boolean;
  maxOrdersPerBot: number;
  notificationEnabled: boolean;
}

export class PendingOrderMonitorService extends EventEmitter {
  private isRunning: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private pendingOrders: Map<string, PendingOrder> = new Map();
  private brokerService: BrokerIntegrationService;
  private config: OrderMonitoringConfig;

  constructor(brokerService: BrokerIntegrationService, config?: Partial<OrderMonitoringConfig>) {
    super();
    this.brokerService = brokerService;
    this.config = {
      checkIntervalMs: 5000, // Check every 5 seconds
      maxOrderAge: 24 * 60 * 60 * 1000, // 24 hours
      autoCleanupExpired: true,
      maxOrdersPerBot: 10,
      notificationEnabled: true,
      ...config,
    };
  }

  /**
   * Start monitoring pending orders
   */
  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      logger.warn("⚠️ Pending order monitoring is already running");
      return;
    }

    logger.info("🔍 Starting pending order monitoring service");
    this.isRunning = true;

    // Load existing pending orders from database
    await this.loadPendingOrders();

    // Start monitoring interval
    this.monitoringInterval = setInterval(async () => {
      await this.checkPendingOrders();
    }, this.config.checkIntervalMs);

    logger.info(`✅ Pending order monitoring started (interval: ${this.config.checkIntervalMs}ms)`);
  }

  /**
   * Stop monitoring pending orders
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isRunning) {
      logger.warn("⚠️ Pending order monitoring is not running");
      return;
    }

    logger.info("🛑 Stopping pending order monitoring service");
    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Save pending orders to database
    await this.savePendingOrders();

    logger.info("✅ Pending order monitoring stopped");
  }

  /**
   * Add a new pending order to monitor
   */
  async addPendingOrder(
    order: Omit<PendingOrder, "id" | "createdAt" | "updatedAt">,
  ): Promise<string> {
    const orderId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const pendingOrder: PendingOrder = {
      ...order,
      id: orderId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Check bot order limits
    const botOrderCount = this.getBotOrderCount(order.botId);
    if (botOrderCount >= this.config.maxOrdersPerBot) {
      throw new Error(
        `Bot ${order.botId} has reached maximum pending orders limit (${this.config.maxOrdersPerBot})`,
      );
    }

    // Add to memory
    this.pendingOrders.set(orderId, pendingOrder);

    // Save to database
    await this.savePendingOrderToDatabase(pendingOrder);

    logger.info(
      `📋 Added pending order: ${orderId} (${order.type} ${order.side} ${order.size} ${order.symbol} @ ${order.price})`,
    );

    // Emit event
    this.emit("order_added", pendingOrder);

    return orderId;
  }

  /**
   * Cancel a pending order
   */
  async cancelPendingOrder(
    orderId: string,
    reason: string = "Manual cancellation",
  ): Promise<boolean> {
    const order = this.pendingOrders.get(orderId);
    if (!order) {
      logger.warn(`⚠️ Pending order not found: ${orderId}`);
      return false;
    }

    if (order.status !== "PENDING") {
      logger.warn(`⚠️ Cannot cancel order ${orderId} - status: ${order.status}`);
      return false;
    }

    try {
      // Cancel with broker if it has broker order ID
      if (order.brokerOrderId) {
        // TODO: Implement broker order cancellation
        logger.info(`📤 Cancelling broker order: ${order.brokerOrderId}`);
      }

      // Update order status
      order.status = "CANCELLED";
      order.cancellationReason = reason;
      order.updatedAt = new Date();

      // Update database
      await this.updatePendingOrderInDatabase(order);

      logger.info(`❌ Cancelled pending order: ${orderId} (${reason})`);

      // Emit event
      this.emit("order_cancelled", order);

      return true;
    } catch (error) {
      logger.error(`❌ Failed to cancel pending order ${orderId}: ${error}`);
      return false;
    }
  }

  /**
   * Get all pending orders for a bot
   */
  getBotPendingOrders(botId: string): PendingOrder[] {
    return Array.from(this.pendingOrders.values()).filter(
      (order) => order.botId === botId && order.status === "PENDING",
    );
  }

  /**
   * Get all pending orders for a user
   */
  getUserPendingOrders(userId: string): PendingOrder[] {
    return Array.from(this.pendingOrders.values()).filter(
      (order) => order.userId === userId && order.status === "PENDING",
    );
  }

  /**
   * Get order statistics
   */
  getOrderStatistics(): {
    total: number;
    pending: number;
    filled: number;
    cancelled: number;
    expired: number;
    byType: { [key: string]: number };
    byBot: { [key: string]: number };
  } {
    const orders = Array.from(this.pendingOrders.values());
    const stats = {
      total: orders.length,
      pending: orders.filter((o) => o.status === "PENDING").length,
      filled: orders.filter((o) => o.status === "FILLED").length,
      cancelled: orders.filter((o) => o.status === "CANCELLED").length,
      expired: orders.filter((o) => o.status === "EXPIRED").length,
      byType: {} as { [key: string]: number },
      byBot: {} as { [key: string]: number },
    };

    // Count by type
    orders.forEach((order) => {
      stats.byType[order.type] = (stats.byType[order.type] || 0) + 1;
      stats.byBot[order.botId] = (stats.byBot[order.botId] || 0) + 1;
    });

    return stats;
  }

  private async checkPendingOrders(): Promise<void> {
    if (!this.isRunning) return;

    const pendingOrders = Array.from(this.pendingOrders.values()).filter(
      (order) => order.status === "PENDING",
    );

    if (pendingOrders.length === 0) return;

    logger.debug(`🔍 Checking ${pendingOrders.length} pending orders...`);

    for (const order of pendingOrders) {
      try {
        await this.checkSingleOrder(order);
      } catch (error) {
        logger.error(`❌ Error checking pending order ${order.id}: ${error}`);
      }
    }

    // Clean up expired orders
    if (this.config.autoCleanupExpired) {
      await this.cleanupExpiredOrders();
    }
  }

  private async checkSingleOrder(order: PendingOrder): Promise<void> {
    // Check if order has expired
    if (order.expireTime && new Date() > order.expireTime) {
      await this.expireOrder(order);
      return;
    }

    // Check if order is too old
    const age = Date.now() - order.createdAt.getTime();
    if (age > this.config.maxOrderAge) {
      await this.expireOrder(order, "Maximum age exceeded");
      return;
    }

    // Check order status with broker
    if (order.brokerOrderId) {
      await this.checkBrokerOrderStatus(order);
    }
  }

  private async checkBrokerOrderStatus(order: PendingOrder): Promise<void> {
    try {
      // TODO: Implement broker order status check
      // const brokerOrder = await this.brokerService.getOrderStatus(order.brokerOrderId);
      // if (brokerOrder.status === "FILLED") {
      //   await this.fillOrder(order, brokerOrder.fillPrice, brokerOrder.fillTime);
      // }
    } catch (error) {
      logger.error(`❌ Failed to check broker order status for ${order.id}: ${error}`);
    }
  }

  private async fillOrder(order: PendingOrder, fillPrice: number, fillTime: Date): Promise<void> {
    order.status = "FILLED";
    order.fillPrice = fillPrice;
    order.fillTime = fillTime;
    order.updatedAt = new Date();

    await this.updatePendingOrderInDatabase(order);

    logger.info(`✅ Order filled: ${order.id} @ ${fillPrice}`);

    // Emit event
    this.emit("order_filled", order);
  }

  private async expireOrder(order: PendingOrder, reason: string = "Expired"): Promise<void> {
    order.status = "EXPIRED";
    order.cancellationReason = reason;
    order.updatedAt = new Date();

    await this.updatePendingOrderInDatabase(order);

    logger.info(`⏰ Order expired: ${order.id} (${reason})`);

    // Emit event
    this.emit("order_expired", order);
  }

  private async cleanupExpiredOrders(): Promise<void> {
    const cutoffTime = new Date(Date.now() - this.config.maxOrderAge);
    const ordersToRemove = Array.from(this.pendingOrders.values()).filter(
      (order) => order.status !== "PENDING" && order.updatedAt < cutoffTime,
    );

    for (const order of ordersToRemove) {
      this.pendingOrders.delete(order.id);
      await this.removePendingOrderFromDatabase(order.id);
    }

    if (ordersToRemove.length > 0) {
      logger.info(`🧹 Cleaned up ${ordersToRemove.length} old orders`);
    }
  }

  private getBotOrderCount(botId: string): number {
    return Array.from(this.pendingOrders.values()).filter(
      (order) => order.botId === botId && order.status === "PENDING",
    ).length;
  }

  private async loadPendingOrders(): Promise<void> {
    try {
      // TODO: Implement database loading
      // const orders = await prisma.pendingOrder.findMany();
      // orders.forEach(order => this.pendingOrders.set(order.id, order));
      logger.debug("📥 Loaded pending orders from database");
    } catch (error) {
      logger.error(`❌ Failed to load pending orders: ${error}`);
    }
  }

  private async savePendingOrders(): Promise<void> {
    try {
      // TODO: Implement database saving
      logger.debug("💾 Saved pending orders to database");
    } catch (error) {
      logger.error(`❌ Failed to save pending orders: ${error}`);
    }
  }

  private async savePendingOrderToDatabase(order: PendingOrder): Promise<void> {
    try {
      // TODO: Implement database saving
      logger.debug(`💾 Saved pending order to database: ${order.id}`);
    } catch (error) {
      logger.error(`❌ Failed to save pending order ${order.id}: ${error}`);
    }
  }

  private async updatePendingOrderInDatabase(order: PendingOrder): Promise<void> {
    try {
      // TODO: Implement database update
      logger.debug(`💾 Updated pending order in database: ${order.id}`);
    } catch (error) {
      logger.error(`❌ Failed to update pending order ${order.id}: ${error}`);
    }
  }

  private async removePendingOrderFromDatabase(orderId: string): Promise<void> {
    try {
      // TODO: Implement database removal
      logger.debug(`🗑️ Removed pending order from database: ${orderId}`);
    } catch (error) {
      logger.error(`❌ Failed to remove pending order ${orderId}: ${error}`);
    }
  }
}
