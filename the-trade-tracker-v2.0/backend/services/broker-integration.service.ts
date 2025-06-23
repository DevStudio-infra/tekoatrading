/**
 * Broker Integration Service
 * Handles real broker API integration for positions, orders, and account data
 */

import { loggerService } from "./logger.service";
import type { CapitalMainService } from "../modules/capital/services/capital-main.service";
import { getCapitalApiInstance } from "../modules/capital";

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
  type: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
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

export interface BrokerConnectionStatus {
  isConnected: boolean;
  lastPing: Date;
  latency: number;
  errorCount: number;
  connectionQuality: "EXCELLENT" | "GOOD" | "POOR" | "DISCONNECTED";
}

export class BrokerIntegrationService {
  private positions: Map<string, BrokerPosition> = new Map();
  private orders: Map<string, BrokerOrder> = new Map();
  private accountBalance: AccountBalance | null = null;
  private connectionStatus: BrokerConnectionStatus;
  private cache: Map<string, { data: any; timestamp: Date }> = new Map();
  private cacheTimeout = 30000; // 30 seconds cache for broker data

  constructor() {
    this.connectionStatus = {
      isConnected: false,
      lastPing: new Date(),
      latency: 0,
      errorCount: 0,
      connectionQuality: "DISCONNECTED",
    };

    loggerService.info("[BrokerIntegration] Broker Integration Service initialized - will use user-specific credentials");
  }

  /**
   * Get Capital.com API instance with user credentials
   */
  private getCapitalApiWithCredentials(credentials: { apiKey: string; identifier: string; password: string; isDemo?: boolean }): CapitalMainService {
    return getCapitalApiInstance({
      apiKey: credentials.apiKey,
      identifier: credentials.identifier,
      password: credentials.password,
      isDemo: credentials.isDemo,
      instanceId: `broker-integration-${Date.now()}`,
    });
  }

  /**
   * Test connection with specific credentials
   */
  async testConnection(credentials: { apiKey: string; identifier: string; password: string; isDemo?: boolean }): Promise<boolean> {
    try {
      loggerService.info("[BrokerIntegration] Testing Capital.com API connection...");

      const capitalApi = this.getCapitalApiWithCredentials(credentials);

      // Test connection by getting account details
      await capitalApi.getAccountDetails();

      this.connectionStatus.isConnected = true;
      this.connectionStatus.connectionQuality = "EXCELLENT";
      this.connectionStatus.lastPing = new Date();

      loggerService.info("[BrokerIntegration] Capital.com API connection test successful");
      return true;
    } catch (error) {
      loggerService.error("[BrokerIntegration] Failed to connect to Capital.com API:", error);
      this.connectionStatus.connectionQuality = "DISCONNECTED";
      this.connectionStatus.errorCount++;
      return false;
    }
  }

  /**
   * Get all open positions from broker with credentials
   */
  async getOpenPositions(credentials: { apiKey: string; identifier: string; password: string; isDemo?: boolean }): Promise<BrokerPosition[]> {
    try {
      loggerService.info("[BrokerIntegration] Fetching open positions from broker");

      // Check cache
      const cacheKey = `open_positions_${credentials.apiKey.substring(0, 8)}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTimeout) {
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

      loggerService.info(`[BrokerIntegration] Retrieved ${positions.length} open positions`);
      return positions;
    } catch (error) {
      loggerService.error("[BrokerIntegration] Error fetching positions:", error);
      this.connectionStatus.errorCount++;
      return [];
    }
  }

  /**
   * Get all pending orders from broker with credentials
   */
  async getPendingOrders(credentials: { apiKey: string; identifier: string; password: string; isDemo?: boolean }): Promise<BrokerOrder[]> {
    try {
      loggerService.info("[BrokerIntegration] Fetching pending orders from broker");

      // Check cache
      const cacheKey = `pending_orders_${credentials.apiKey.substring(0, 8)}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTimeout) {
        return cached.data;
      }

      const capitalApi = this.getCapitalApiWithCredentials(credentials);
      const orders = await this.fetchOrdersFromBroker(capitalApi);

      // Update local cache
      orders.forEach((order) => {
        this.orders.set(order.id, order);
      });

      // Cache the result
      this.cache.set(cacheKey, { data: orders, timestamp: new Date() });

      loggerService.info(`[BrokerIntegration] Retrieved ${orders.length} pending orders`);
      return orders;
    } catch (error) {
      loggerService.error("[BrokerIntegration] Error fetching orders:", error);
      this.connectionStatus.errorCount++;
      return [];
    }
  }

  /**
   * Get account balance from broker with credentials
   */
  async getAccountBalance(credentials: { apiKey: string; identifier: string; password: string; isDemo?: boolean }): Promise<AccountBalance> {
    try {
      loggerService.info("[BrokerIntegration] Fetching account balance from Capital.com API");

      // Check cache
      const cacheKey = `account_balance_${credentials.apiKey.substring(0, 8)}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTimeout) {
        return cached.data;
      }

      const capitalApi = this.getCapitalApiWithCredentials(credentials);

      // Get real account balance from Capital.com API
      const accountDetails = await capitalApi.getAccountDetails();

      const balance: AccountBalance = {
        currency: accountDetails.currency || "USD",
        balance: accountDetails.balance || 0,
        available: accountDetails.available || 0,
        reserved: accountDetails.deposit || 0,
        equity: accountDetails.balance || 0,
        margin: accountDetails.profitLoss || 0,
        freeMargin: accountDetails.available || 0,
        marginLevel: accountDetails.available > 0 ? (accountDetails.balance / accountDetails.available) * 100 : 0,
        lastUpdated: new Date(),
      };

      // Update local cache
      this.accountBalance = balance;

      // Cache the result
      this.cache.set(cacheKey, { data: balance, timestamp: new Date() });

      loggerService.info(`[BrokerIntegration] Account balance retrieved: ${balance.balance} ${balance.currency}`);
      return balance;
    } catch (error) {
      loggerService.error("[BrokerIntegration] Error fetching account balance from Capital.com:", error);
      this.connectionStatus.errorCount++;
      throw new Error(`Failed to fetch account balance: ${error instanceof Error ? error.message : "Unknown error"}`);
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
    }
  ): Promise<BrokerOrder> {
    try {
      loggerService.info(`[BrokerIntegration] Creating ${orderRequest.type} order for ${orderRequest.symbol}`);

      const capitalApi = this.getCapitalApiWithCredentials(credentials);

      // Map our symbol to Capital.com epic if needed
      const epic = (await capitalApi.getEpicForSymbol(orderRequest.symbol)) || orderRequest.symbol;

      let result;

      if (orderRequest.type === "MARKET") {
        // Create market position (immediate execution)
        result = await capitalApi.createPosition(epic, orderRequest.side, orderRequest.size, orderRequest.stopLoss, orderRequest.takeProfit);
      } else {
        // Create limit order
        if (!orderRequest.price) {
          throw new Error("Price is required for limit orders");
        }

        result = await capitalApi.createLimitOrder(epic, orderRequest.side, orderRequest.size, orderRequest.price, orderRequest.stopLoss, orderRequest.takeProfit);
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

      loggerService.info(`[BrokerIntegration] Order created successfully: ${order.id} (${order.status})`);
      return order;
    } catch (error) {
      loggerService.error(`[BrokerIntegration] Error creating order:`, error);
      this.connectionStatus.errorCount++;
      throw new Error(`Failed to create order: ${error instanceof Error ? error.message : "Unknown error"}`);
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
    }
  ): Promise<boolean> {
    try {
      loggerService.info(`[BrokerIntegration] Closing position: ${positionId}`);

      const capitalApi = this.getCapitalApiWithCredentials(credentials);

      // Get position details first to determine close parameters
      const position = await capitalApi.getPositionById(positionId);
      if (!position) {
        throw new Error(`Position ${positionId} not found`);
      }

      // Close the position
      const result = await capitalApi.closePosition(positionId, position.direction === "BUY" ? "SELL" : "BUY", Math.abs(position.size));

      const success = result.dealStatus === "ACCEPTED";

      if (success) {
        // Remove from local cache
        this.positions.delete(positionId);
        loggerService.info(`[BrokerIntegration] Position ${positionId} closed successfully`);
      } else {
        loggerService.warn(`[BrokerIntegration] Position close may have failed: ${result.reason || "Unknown reason"}`);
      }

      return success;
    } catch (error) {
      loggerService.error(`[BrokerIntegration] Error closing position ${positionId}:`, error);
      this.connectionStatus.errorCount++;
      return false;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(
    orderId: string,
    credentials: {
      apiKey: string;
      identifier: string;
      password: string;
      isDemo?: boolean;
    }
  ): Promise<boolean> {
    try {
      loggerService.info(`[BrokerIntegration] Cancelling order: ${orderId}`);

      const capitalApi = this.getCapitalApiWithCredentials(credentials);

      const result = await capitalApi.cancelWorkingOrder(orderId);
      const success = result.dealStatus === "ACCEPTED";

      if (success) {
        // Update local cache
        const order = this.orders.get(orderId);
        if (order) {
          order.status = "CANCELLED";
          this.orders.set(orderId, order);
        }
        loggerService.info(`[BrokerIntegration] Order ${orderId} cancelled successfully`);
      } else {
        loggerService.warn(`[BrokerIntegration] Order cancellation may have failed: ${result.reason || "Unknown reason"}`);
      }

      return success;
    } catch (error) {
      loggerService.error(`[BrokerIntegration] Error cancelling order ${orderId}:`, error);
      this.connectionStatus.errorCount++;
      return false;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): BrokerConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.positions.clear();
    this.orders.clear();
    this.accountBalance = null;
    loggerService.info("[BrokerIntegration] All caches cleared");
  }

  /**
   * Get all open positions from broker - REAL IMPLEMENTATION
   */
  private async fetchPositionsFromBroker(capitalApi: CapitalMainService): Promise<BrokerPosition[]> {
    try {
      // Get real positions from Capital.com API
      const capitalPositions = await capitalApi.getOpenPositions();

      if (!capitalPositions || !capitalPositions.positions) {
        loggerService.debug("[BrokerIntegration] No open positions found");
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
          pnlPercentage: pos.profit && pos.openLevel ? (pos.profit / (pos.openLevel * Math.abs(pos.dealSize))) * 100 : 0,
          openTime: new Date(pos.createdDate),
          stopLoss: pos.stopLevel,
          takeProfit: pos.limitLevel,
          status: "OPEN",
        })
      );

      loggerService.debug(`[BrokerIntegration] Retrieved ${positions.length} real positions from Capital.com`);
      return positions;
    } catch (error) {
      loggerService.error("[BrokerIntegration] Error fetching real positions:", error);
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
        loggerService.debug("[BrokerIntegration] No pending orders found");
        return [];
      }

      // Convert Capital.com orders to our format
      const orders: BrokerOrder[] = capitalOrders.workingOrders.map(
        (order: any): BrokerOrder => ({
          id: order.dealId,
          symbol: order.epic,
          side: order.direction === "BUY" ? "BUY" : "SELL",
          type: order.orderType === "LIMIT" ? "LIMIT" : order.orderType === "STOP" ? "STOP" : "MARKET",
          size: Math.abs(order.orderSize),
          price: order.orderLevel,
          stopPrice: order.orderType === "STOP" ? order.orderLevel : undefined,
          status: "PENDING",
          createdAt: new Date(order.createdDate),
        })
      );

      loggerService.debug(`[BrokerIntegration] Retrieved ${orders.length} real orders from Capital.com`);
      return orders;
    } catch (error) {
      loggerService.error("[BrokerIntegration] Error fetching real orders:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const brokerIntegrationService = new BrokerIntegrationService();
