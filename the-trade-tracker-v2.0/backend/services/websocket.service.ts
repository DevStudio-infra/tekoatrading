import { Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { loggerService } from "./logger.service";

/**
 * WebSocket service for real-time communication
 * Handles market data, position updates, and system notifications
 */
export class WebSocketService {
  private io: SocketIOServer;
  private marketDataSubscriptions: Map<string, Set<string>> = new Map(); // socketId -> Set of symbols
  private priceSubscriptions: Map<string, Set<string>> = new Map(); // socketId -> Set of symbols

  constructor(server: Server) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    this.setupEventHandlers();
    loggerService.info("WebSocket service initialized");
  }

  private setupEventHandlers(): void {
    this.io.on("connection", (socket) => {
      loggerService.info(`Client connected: ${socket.id}`);

      // Handle market data subscription
      socket.on("subscribe_market_data", (symbol: string) => {
        try {
          loggerService.info(`Client ${socket.id} subscribing to market data for ${symbol}`);

          // Store subscription
          if (!this.marketDataSubscriptions.has(socket.id)) {
            this.marketDataSubscriptions.set(socket.id, new Set());
          }
          this.marketDataSubscriptions.get(socket.id)?.add(symbol);

          // TODO: Subscribe to Capital.com market data when user credentials are available
          // This will be handled by individual trading services with user-specific credentials
          loggerService.debug(`Market data subscription stored for ${symbol}, waiting for user credentials`);

          socket.emit("subscription_confirmed", { type: "market_data", symbol });
        } catch (error) {
          loggerService.error(`Failed to subscribe to market data for ${symbol}: ${error instanceof Error ? error.message : "Unknown error"}`);
          socket.emit("subscription_error", { type: "market_data", symbol, error: "Subscription failed" });
        }
      });

      // Handle price subscription
      socket.on("subscribe_prices", (data: { symbol: string; resolution: string }) => {
        try {
          const { symbol, resolution } = data;
          loggerService.info(`Client ${socket.id} subscribing to prices for ${symbol} with resolution ${resolution}`);

          // Store subscription
          if (!this.priceSubscriptions.has(socket.id)) {
            this.priceSubscriptions.set(socket.id, new Set());
          }
          this.priceSubscriptions.get(socket.id)?.add(`${symbol}:${resolution}`);

          // TODO: Subscribe to Capital.com OHLC data when user credentials are available
          // This will be handled by individual trading services with user-specific credentials
          loggerService.debug(`Price subscription stored for ${symbol}:${resolution}, waiting for user credentials`);

          socket.emit("subscription_confirmed", { type: "prices", symbol, resolution });
        } catch (error) {
          loggerService.error(`Failed to subscribe to prices for ${data?.symbol}: ${error instanceof Error ? error.message : "Unknown error"}`);
          socket.emit("subscription_error", { type: "prices", symbol: data?.symbol, error: "Subscription failed" });
        }
      });

      // Handle unsubscribe
      socket.on("unsubscribe", (data: { type: string; symbol: string }) => {
        try {
          const { type, symbol } = data;
          loggerService.info(`Client ${socket.id} unsubscribing from ${type} for ${symbol}`);

          if (type === "market_data") {
            this.marketDataSubscriptions.get(socket.id)?.delete(symbol);
          } else if (type === "prices") {
            // For prices, we need to remove all resolutions for this symbol
            const priceSubscriptions = this.priceSubscriptions.get(socket.id);
            if (priceSubscriptions) {
              Array.from(priceSubscriptions).forEach((sub) => {
                if (sub.startsWith(`${symbol}:`)) {
                  priceSubscriptions.delete(sub);
                }
              });
            }
          }

          socket.emit("unsubscribe_confirmed", { type, symbol });
        } catch (error) {
          loggerService.error(`Failed to unsubscribe from ${data?.type} for ${data?.symbol}: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        loggerService.info(`Client disconnected: ${socket.id}`);

        // Clean up subscriptions
        this.marketDataSubscriptions.delete(socket.id);
        this.priceSubscriptions.delete(socket.id);
      });
    });

    // TODO: Set up Capital.com event forwarding when user credentials are available
    // Individual services will handle this with their own Capital.com instances
    loggerService.info("WebSocket event handlers configured");
  }

  /**
   * Broadcast market data to subscribed clients
   */
  broadcastMarketData(symbol: string, data: any): void {
    this.io.emit("market_data", { symbol, data });
    loggerService.debug(`Broadcasted market data for ${symbol}`);
  }

  /**
   * Broadcast price data to subscribed clients
   */
  broadcastPriceData(symbol: string, resolution: string, data: any): void {
    this.io.emit("price_data", { symbol, resolution, data });
    loggerService.debug(`Broadcasted price data for ${symbol}:${resolution}`);
  }

  /**
   * Broadcast position update to specific user
   */
  broadcastPositionUpdate(userId: string, positionData: any): void {
    this.io.emit("position_update", { userId, data: positionData });
    loggerService.debug(`Broadcasted position update for user ${userId}`);
  }

  /**
   * Broadcast trade execution result to specific user
   */
  broadcastTradeUpdate(userId: string, tradeData: any): void {
    this.io.emit("trade_update", { userId, data: tradeData });
    loggerService.debug(`Broadcasted trade update for user ${userId}`);
  }

  /**
   * Broadcast system notification to all clients
   */
  broadcastSystemNotification(message: string, level: "info" | "warning" | "error" = "info"): void {
    this.io.emit("system_notification", { message, level, timestamp: new Date().toISOString() });
    loggerService.info(`Broadcasted system notification: ${message}`);
  }

  /**
   * Get number of connected clients
   */
  getConnectedClientsCount(): number {
    return this.io.sockets.sockets.size;
  }

  /**
   * Get subscription statistics
   */
  getSubscriptionStats(): { marketData: number; prices: number } {
    let marketDataCount = 0;
    let pricesCount = 0;

    this.marketDataSubscriptions.forEach((symbols) => {
      marketDataCount += symbols.size;
    });

    this.priceSubscriptions.forEach((symbols) => {
      pricesCount += symbols.size;
    });

    return { marketData: marketDataCount, prices: pricesCount };
  }
}

// Don't create a singleton instance here - it will be created when the HTTP server is initialized
