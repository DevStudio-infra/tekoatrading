import { EventEmitter } from "events";
import { CapitalMainService } from "../modules/capital/services/capital-main.service";
import { logger } from "../logger";

export interface BrokerPosition {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercentage: number;
  openTime: Date;
  stopLoss?: number;
  takeProfit?: number;
  status: "OPEN" | "CLOSED" | "PENDING";
}

export interface BrokerOrder {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | "STOP";
  size: number;
  price?: number;
  stopPrice?: number;
  status: "PENDING" | "FILLED" | "CANCELLED" | "REJECTED";
  createdAt: Date;
  filledAt?: Date;
  filledPrice?: number;
  filledSize?: number;
}

export interface AccountBalance {
  currency: string;
  balance: number;
  available: number;
  reserved: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  lastUpdated: Date;
}

export interface BrokerExecutionResult {
  success: boolean;
  dealReference?: string;
  dealId?: string;
  error?: string;
}

/**
 * Sophisticated broker integration service for real trading
 */
export class BrokerIntegrationService extends EventEmitter {
  private capitalApiInstances = new Map<string, CapitalMainService>();
  private cache = new Map<string, { data: any; timestamp: Date }>();
  private positions = new Map<string, BrokerPosition>();
  private orders = new Map<string, BrokerOrder>();
  private accountBalance: AccountBalance | null = null;
  private readonly cacheTimeout = 30000; // 30 seconds

  private connectionStatus = {
    isConnected: false,
    lastConnectionAttempt: null as Date | null,
    errorCount: 0,
    lastError: null as string | null,
  };

  constructor() {
    super();
  }

  /**
   * Get Capital.com API instance with user credentials
   */
  private getCapitalApiWithCredentials(credentials: {
    apiKey: string;
    identifier: string;
    password: string;
    isDemo?: boolean;
  }): CapitalMainService {
    const instanceKey = `${credentials.identifier}_${credentials.apiKey.substring(0, 8)}`;

    if (!this.capitalApiInstances.has(instanceKey)) {
      const capitalApi = new CapitalMainService({
        apiKey: credentials.apiKey,
        identifier: credentials.identifier,
        password: credentials.password,
        isDemo: credentials.isDemo,
        instanceId: instanceKey,
      });

      this.capitalApiInstances.set(instanceKey, capitalApi);
    }

    return this.capitalApiInstances.get(instanceKey)!;
  }

  /**
   * Test broker connection with credentials
   */
  async testConnection(credentials: {
    apiKey: string;
    identifier: string;
    password: string;
    isDemo?: boolean;
  }): Promise<{ success: boolean; error?: string; accountInfo?: any }> {
    try {
      logger.info("[BrokerIntegration] Testing Capital.com connection");
      this.connectionStatus.lastConnectionAttempt = new Date();

      const capitalApi = this.getCapitalApiWithCredentials(credentials);
      await capitalApi.authenticate();

      // Test by getting account details
      const accountDetails = await capitalApi.getAccountDetails();

      this.connectionStatus.isConnected = true;
      this.connectionStatus.errorCount = 0;
      this.connectionStatus.lastError = null;

      logger.info("[BrokerIntegration] Capital.com connection successful");

      return {
        success: true,
        accountInfo: {
          accountId: accountDetails.accountId,
          currency: accountDetails.currency,
          balance: accountDetails.balance,
          accountType: accountDetails.accountType,
        },
      };
    } catch (error) {
      this.connectionStatus.isConnected = false;
      this.connectionStatus.errorCount++;
      this.connectionStatus.lastError = error instanceof Error ? error.message : "Unknown error";

      logger.error("[BrokerIntegration] Capital.com connection failed:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get account balance from broker
   */
  async getAccountBalance(credentials: {
    apiKey: string;
    identifier: string;
    password: string;
    isDemo?: boolean;
  }): Promise<AccountBalance> {
    try {
      logger.info("[BrokerIntegration] Fetching account balance from Capital.com API");

      // Check cache
      const cacheKey = `account_balance_${credentials.apiKey.substring(0, 8)}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTimeout) {
        return cached.data;
      }

      const capitalApi = this.getCapitalApiWithCredentials(credentials);
      const accountDetails = await capitalApi.getAccountDetails();

      const balance: AccountBalance = {
        currency: accountDetails.currency || "USD",
        balance: accountDetails.balance || 0,
        available: accountDetails.available || 0,
        reserved: accountDetails.deposit || 0,
        equity: accountDetails.balance || 0,
        margin: accountDetails.profitLoss || 0,
        freeMargin: accountDetails.available || 0,
        marginLevel:
          accountDetails.available > 0
            ? (accountDetails.balance / accountDetails.available) * 100
            : 0,
        lastUpdated: new Date(),
      };

      // Update local cache
      this.accountBalance = balance;

      // Cache the result
      this.cache.set(cacheKey, { data: balance, timestamp: new Date() });

      logger.info(
        `[BrokerIntegration] Account balance retrieved: ${balance.balance} ${balance.currency}`,
      );
      return balance;
    } catch (error) {
      logger.error("[BrokerIntegration] Error fetching account balance from Capital.com:", error);
      this.connectionStatus.errorCount++;
      throw new Error(
        `Failed to fetch account balance: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Create a new order
   */
  async createOrder(
    orderRequest: {
      symbol: string;
      side: "BUY" | "SELL";
      type: "MARKET" | "LIMIT";
      size: number;
      price?: number;
      stopLoss?: number;
      takeProfit?: number;
    },
    credentials: {
      apiKey: string;
      identifier: string;
      password: string;
      isDemo?: boolean;
    },
  ): Promise<BrokerOrder> {
    try {
      logger.info(
        `[BrokerIntegration] Creating ${orderRequest.type} order for ${orderRequest.symbol}`,
      );

      const capitalApi = this.getCapitalApiWithCredentials(credentials);

      // Map our symbol to Capital.com epic if needed
      const epic = (await capitalApi.getEpicForSymbol(orderRequest.symbol)) || orderRequest.symbol;

      let result;

      if (orderRequest.type === "MARKET") {
        // Create market position (immediate execution)
        result = await capitalApi.createPosition(
          epic,
          orderRequest.side,
          orderRequest.size,
          orderRequest.stopLoss,
          orderRequest.takeProfit,
        );
      } else {
        // Create limit order
        if (!orderRequest.price) {
          throw new Error("Price is required for limit orders");
        }

        result = await capitalApi.createLimitOrder(
          epic,
          orderRequest.side,
          orderRequest.size,
          orderRequest.price,
          orderRequest.stopLoss,
          orderRequest.takeProfit,
        );
      }

      // Convert Capital.com response to our BrokerOrder format
      const order: BrokerOrder = {
        id: result.dealReference || result.dealId || Math.random().toString(36).substr(2, 9),
        symbol: orderRequest.symbol,
        side: orderRequest.side,
        type: orderRequest.type,
        size: orderRequest.size,
        price: orderRequest.price,
        status: result.dealStatus === "ACCEPTED" ? "FILLED" : "PENDING",
        createdAt: new Date(),
        filledAt: result.dealStatus === "ACCEPTED" ? new Date() : undefined,
        filledPrice: result.level || orderRequest.price,
        filledSize: result.dealStatus === "ACCEPTED" ? orderRequest.size : 0,
      };

      // Store in local cache
      this.orders.set(order.id, order);

      // Emit order event
      this.emit("order_created", order);

      logger.info(`[BrokerIntegration] Order created successfully: ${order.id} (${order.status})`);
      return order;
    } catch (error) {
      logger.error(`[BrokerIntegration] Error creating order:`, error);
      this.connectionStatus.errorCount++;
      throw new Error(
        `Failed to create order: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Close a position
   */
  async closePosition(
    positionId: string,
    credentials: {
      apiKey: string;
      identifier: string;
      password: string;
      isDemo?: boolean;
    },
  ): Promise<BrokerExecutionResult> {
    try {
      logger.info(`[BrokerIntegration] Closing position ${positionId}`);

      const capitalApi = this.getCapitalApiWithCredentials(credentials);
      const result = await capitalApi.closePosition(positionId);

      if (result.dealStatus === "ACCEPTED") {
        // Update local position cache
        const position = this.positions.get(positionId);
        if (position) {
          position.status = "CLOSED";
          this.emit("position_closed", position);
        }

        logger.info(`[BrokerIntegration] Position closed successfully: ${positionId}`);
        return {
          success: true,
          dealReference: result.dealReference,
          dealId: result.dealId,
        };
      } else {
        throw new Error(`Position close rejected: ${result.reason || "Unknown reason"}`);
      }
    } catch (error) {
      logger.error(`[BrokerIntegration] Error closing position ${positionId}:`, error);
      this.connectionStatus.errorCount++;
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get all open positions from broker
   */
  async getOpenPositions(credentials: {
    apiKey: string;
    identifier: string;
    password: string;
    isDemo?: boolean;
  }): Promise<BrokerPosition[]> {
    try {
      logger.info("[BrokerIntegration] Fetching open positions from Capital.com API");

      // Check cache
      const cacheKey = `open_positions_${credentials.apiKey.substring(0, 8)}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp.getTime() < 10000) {
        // 10 second cache for positions
        return cached.data;
      }

      const capitalApi = this.getCapitalApiWithCredentials(credentials);
      const positions = await this.fetchPositionsFromBroker(capitalApi);

      // Update local cache
      positions.forEach((position) => {
        this.positions.set(position.id, position);
      });

      // Cache the result
      this.cache.set(cacheKey, { data: positions, timestamp: new Date() });

      logger.info(`[BrokerIntegration] Retrieved ${positions.length} open positions`);
      return positions;
    } catch (error) {
      logger.error("[BrokerIntegration] Error fetching open positions:", error);
      this.connectionStatus.errorCount++;
      throw new Error(
        `Failed to fetch positions: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get all pending orders from broker
   */
  async getPendingOrders(credentials: {
    apiKey: string;
    identifier: string;
    password: string;
    isDemo?: boolean;
  }): Promise<BrokerOrder[]> {
    try {
      logger.info("[BrokerIntegration] Fetching pending orders from Capital.com API");

      const capitalApi = this.getCapitalApiWithCredentials(credentials);
      const orders = await this.fetchOrdersFromBroker(capitalApi);

      // Update local cache
      orders.forEach((order) => {
        this.orders.set(order.id, order);
      });

      logger.info(`[BrokerIntegration] Retrieved ${orders.length} pending orders`);
      return orders;
    } catch (error) {
      logger.error("[BrokerIntegration] Error fetching pending orders:", error);
      this.connectionStatus.errorCount++;
      throw new Error(
        `Failed to fetch orders: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get all open positions from broker - REAL IMPLEMENTATION
   */
  private async fetchPositionsFromBroker(
    capitalApi: CapitalMainService,
  ): Promise<BrokerPosition[]> {
    try {
      // Get real positions from Capital.com API
      const capitalPositions = await capitalApi.getOpenPositions();

      if (!capitalPositions || !capitalPositions.positions) {
        logger.debug("[BrokerIntegration] No open positions found");
        return [];
      }

      // Convert Capital.com positions to our format
      const positions: BrokerPosition[] = capitalPositions.positions.map(
        (pos: any): BrokerPosition => ({
          id: pos.dealId,
          symbol: pos.epic, // We'll map this back to symbol format if needed
          side: pos.direction === "BUY" ? "BUY" : "SELL",
          size: Math.abs(pos.dealSize),
          entryPrice: pos.openLevel,
          currentPrice: pos.level,
          pnl: pos.profit,
          pnlPercentage:
            pos.profit && pos.openLevel
              ? (pos.profit / (pos.openLevel * Math.abs(pos.dealSize))) * 100
              : 0,
          openTime: new Date(pos.createdDate),
          stopLoss: pos.stopLevel,
          takeProfit: pos.limitLevel,
          status: "OPEN",
        }),
      );

      logger.debug(
        `[BrokerIntegration] Retrieved ${positions.length} real positions from Capital.com`,
      );
      return positions;
    } catch (error) {
      logger.error("[BrokerIntegration] Error fetching real positions:", error);
      throw error;
    }
  }

  /**
   * Get all pending orders from broker - REAL IMPLEMENTATION
   */
  private async fetchOrdersFromBroker(capitalApi: CapitalMainService): Promise<BrokerOrder[]> {
    try {
      // Get real working orders from Capital.com API
      const capitalOrders = await capitalApi.getWorkingOrders();

      if (!capitalOrders || !capitalOrders.workingOrders) {
        logger.debug("[BrokerIntegration] No pending orders found");
        return [];
      }

      // Convert Capital.com orders to our format
      const orders: BrokerOrder[] = capitalOrders.workingOrders.map(
        (order: any): BrokerOrder => ({
          id: order.dealId,
          symbol: order.epic,
          side: order.direction === "BUY" ? "BUY" : "SELL",
          type:
            order.orderType === "LIMIT" ? "LIMIT" : order.orderType === "STOP" ? "STOP" : "MARKET",
          size: Math.abs(order.orderSize),
          price: order.orderLevel,
          stopPrice: order.orderType === "STOP" ? order.orderLevel : undefined,
          status: "PENDING",
          createdAt: new Date(order.createdDate),
        }),
      );

      logger.debug(`[BrokerIntegration] Retrieved ${orders.length} real orders from Capital.com`);
      return orders;
    } catch (error) {
      logger.error("[BrokerIntegration] Error fetching real orders:", error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isConnected: boolean;
    lastConnectionAttempt: Date | null;
    errorCount: number;
    lastError: string | null;
  } {
    return { ...this.connectionStatus };
  }

  /**
   * Get cached account balance
   */
  getCachedAccountBalance(): AccountBalance | null {
    return this.accountBalance;
  }

  /**
   * Get cached positions
   */
  getCachedPositions(): BrokerPosition[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get cached orders
   */
  getCachedOrders(): BrokerOrder[] {
    return Array.from(this.orders.values());
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.positions.clear();
    this.orders.clear();
    this.accountBalance = null;
    logger.info("[BrokerIntegration] All caches cleared");
  }

  /**
   * Cleanup - close all connections and clear resources
   */
  cleanup(): void {
    this.clearCache();
    this.capitalApiInstances.clear();
    this.removeAllListeners();
    logger.info("[BrokerIntegration] Service cleanup completed");
  }
}

// Export singleton instance
export const brokerIntegrationService = new BrokerIntegrationService();
