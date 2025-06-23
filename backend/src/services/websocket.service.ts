import { Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { logger } from "../logger";

/**
 * WebSocket service for real-time communication
 * Handles market data, position updates, and system notifications
 */
export class WebSocketService {
  private io: SocketIOServer;
  private marketDataSubscriptions: Map<string, Set<string>> = new Map(); // socketId -> Set of symbols
  private priceSubscriptions: Map<string, Set<string>> = new Map(); // socketId -> Set of symbols
  private botSubscriptions: Map<string, Set<string>> = new Map(); // socketId -> Set of botIds
  private userSockets: Map<string, string> = new Map(); // userId -> socketId

  constructor(server: Server) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    this.setupEventHandlers();
    logger.info("WebSocket service initialized");
  }

  private setupEventHandlers(): void {
    this.io.on("connection", (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Handle user authentication
      socket.on("authenticate", (userId: string) => {
        try {
          this.userSockets.set(userId, socket.id);
          socket.join(`user:${userId}`);
          socket.emit("authenticated", { userId, socketId: socket.id });
          logger.info(`User ${userId} authenticated with socket ${socket.id}`);
        } catch (error) {
          logger.error(`Authentication failed for user ${userId}:`, error);
          socket.emit("authentication_error", { error: "Authentication failed" });
        }
      });

      // Handle market data subscription
      socket.on("subscribe_market_data", (symbol: string) => {
        try {
          logger.info(`Client ${socket.id} subscribing to market data for ${symbol}`);

          // Store subscription
          if (!this.marketDataSubscriptions.has(socket.id)) {
            this.marketDataSubscriptions.set(socket.id, new Set());
          }
          this.marketDataSubscriptions.get(socket.id)?.add(symbol);

          // Join symbol-specific room
          socket.join(`market:${symbol}`);

          socket.emit("subscription_confirmed", { type: "market_data", symbol });
          logger.debug(`Market data subscription confirmed for ${symbol}`);
        } catch (error) {
          logger.error(`Failed to subscribe to market data for ${symbol}:`, error);
          socket.emit("subscription_error", {
            type: "market_data",
            symbol,
            error: "Subscription failed",
          });
        }
      });

      // Handle price subscription
      socket.on("subscribe_prices", (symbol: string) => {
        try {
          logger.info(`Client ${socket.id} subscribing to prices for ${symbol}`);

          if (!this.priceSubscriptions.has(socket.id)) {
            this.priceSubscriptions.set(socket.id, new Set());
          }
          this.priceSubscriptions.get(socket.id)?.add(symbol);

          socket.join(`prices:${symbol}`);
          socket.emit("subscription_confirmed", { type: "prices", symbol });
        } catch (error) {
          logger.error(`Failed to subscribe to prices for ${symbol}:`, error);
          socket.emit("subscription_error", {
            type: "prices",
            symbol,
            error: "Subscription failed",
          });
        }
      });

      // Handle bot monitoring subscription
      socket.on("subscribe_bot", (botId: string) => {
        try {
          logger.info(`Client ${socket.id} subscribing to bot ${botId}`);

          if (!this.botSubscriptions.has(socket.id)) {
            this.botSubscriptions.set(socket.id, new Set());
          }
          this.botSubscriptions.get(socket.id)?.add(botId);

          socket.join(`bot:${botId}`);
          socket.emit("subscription_confirmed", { type: "bot", botId });
        } catch (error) {
          logger.error(`Failed to subscribe to bot ${botId}:`, error);
          socket.emit("subscription_error", { type: "bot", botId, error: "Subscription failed" });
        }
      });

      // Handle unsubscribe requests
      socket.on("unsubscribe_market_data", (symbol: string) => {
        this.marketDataSubscriptions.get(socket.id)?.delete(symbol);
        socket.leave(`market:${symbol}`);
        socket.emit("unsubscribed", { type: "market_data", symbol });
      });

      socket.on("unsubscribe_prices", (symbol: string) => {
        this.priceSubscriptions.get(socket.id)?.delete(symbol);
        socket.leave(`prices:${symbol}`);
        socket.emit("unsubscribed", { type: "prices", symbol });
      });

      socket.on("unsubscribe_bot", (botId: string) => {
        this.botSubscriptions.get(socket.id)?.delete(botId);
        socket.leave(`bot:${botId}`);
        socket.emit("unsubscribed", { type: "bot", botId });
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        logger.info(`Client disconnected: ${socket.id}`);

        // Clean up subscriptions
        this.marketDataSubscriptions.delete(socket.id);
        this.priceSubscriptions.delete(socket.id);
        this.botSubscriptions.delete(socket.id);

        // Remove from user mapping
        for (const [userId, socketId] of this.userSockets.entries()) {
          if (socketId === socket.id) {
            this.userSockets.delete(userId);
            break;
          }
        }
      });

      // Handle ping/pong for connection health
      socket.on("ping", () => {
        socket.emit("pong", { timestamp: Date.now() });
      });
    });
  }

  /**
   * Broadcast market data to subscribed clients
   */
  broadcastMarketData(symbol: string, data: any): void {
    this.io.to(`market:${symbol}`).emit("market_data", { symbol, data, timestamp: Date.now() });
    logger.debug(
      `Broadcasted market data for ${symbol} to ${this.io.sockets.adapter.rooms.get(`market:${symbol}`)?.size || 0} clients`,
    );
  }

  /**
   * Broadcast price updates
   */
  broadcastPriceUpdate(symbol: string, price: any): void {
    this.io.to(`prices:${symbol}`).emit("price_update", { symbol, price, timestamp: Date.now() });
    logger.debug(`Broadcasted price update for ${symbol}`);
  }

  /**
   * Broadcast bot status updates
   */
  broadcastBotUpdate(botId: string, update: any): void {
    this.io.to(`bot:${botId}`).emit("bot_update", { botId, update, timestamp: Date.now() });
    logger.debug(`Broadcasted bot update for ${botId}`);
  }

  /**
   * Send notification to specific user
   */
  sendUserNotification(
    userId: string,
    notification: {
      type: string;
      title: string;
      message: string;
      data?: any;
    },
  ): void {
    this.io.to(`user:${userId}`).emit("notification", {
      ...notification,
      timestamp: Date.now(),
    });
    logger.debug(`Sent notification to user ${userId}: ${notification.title}`);
  }

  /**
   * Broadcast system-wide notification
   */
  broadcastSystemNotification(notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }): void {
    this.io.emit("system_notification", {
      ...notification,
      timestamp: Date.now(),
    });
    logger.info(`Broadcasted system notification: ${notification.title}`);
  }

  /**
   * Send trade execution update
   */
  sendTradeUpdate(
    userId: string,
    tradeUpdate: {
      tradeId: string;
      status: string;
      data: any;
    },
  ): void {
    this.io.to(`user:${userId}`).emit("trade_update", {
      ...tradeUpdate,
      timestamp: Date.now(),
    });
    logger.debug(`Sent trade update to user ${userId}: ${tradeUpdate.tradeId}`);
  }

  /**
   * Send bot evaluation result
   */
  sendBotEvaluation(botId: string, evaluation: any): void {
    this.io.to(`bot:${botId}`).emit("bot_evaluation", {
      botId,
      evaluation,
      timestamp: Date.now(),
    });
    logger.debug(`Sent bot evaluation for ${botId}`);
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.io.sockets.sockets.size;
  }

  /**
   * Get subscription statistics
   */
  getSubscriptionStats(): {
    connectedClients: number;
    marketDataSubscriptions: number;
    priceSubscriptions: number;
    botSubscriptions: number;
    authenticatedUsers: number;
  } {
    let marketDataCount = 0;
    let priceCount = 0;
    let botCount = 0;

    this.marketDataSubscriptions.forEach((symbols) => {
      marketDataCount += symbols.size;
    });

    this.priceSubscriptions.forEach((symbols) => {
      priceCount += symbols.size;
    });

    this.botSubscriptions.forEach((bots) => {
      botCount += bots.size;
    });

    return {
      connectedClients: this.getConnectedClientsCount(),
      marketDataSubscriptions: marketDataCount,
      priceSubscriptions: priceCount,
      botSubscriptions: botCount,
      authenticatedUsers: this.userSockets.size,
    };
  }

  /**
   * Get WebSocket server instance
   */
  getIO(): SocketIOServer {
    return this.io;
  }

  /**
   * Cleanup and close connections
   */
  close(): void {
    this.io.close();
    logger.info("WebSocket service closed");
  }
}
