import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

// Enhanced interfaces for real-time data
interface PerformanceUpdate {
  botId: string;
  data: {
    totalPnL: number;
    totalTrades: number;
    winRate: number;
    maxDrawdown: number;
    lastPerformanceUpdate: Date;
    sharpeRatio?: number;
    currentPnL?: number;
  };
  timestamp: string;
}

interface TradeUpdate {
  tradeId: string;
  botId: string;
  symbol: string;
  type: "OPENED" | "CLOSED" | "UPDATED" | "CANCELLED";
  data: {
    direction: "BUY" | "SELL";
    entryPrice?: number;
    exitPrice?: number;
    quantity: number;
    currentPrice?: number;
    profitLoss?: number;
    profitLossPercent?: number;
    status: "OPEN" | "CLOSED" | "CANCELLED";
    openedAt?: string;
    closedAt?: string;
  };
  timestamp: string;
}

interface MarketDataUpdate {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: string;
}

interface OrderUpdate {
  orderId: string;
  botId: string;
  status: "PENDING" | "FILLED" | "CANCELLED" | "REJECTED";
  symbol: string;
  type: "MARKET" | "LIMIT" | "STOP";
  direction: "BUY" | "SELL";
  quantity: number;
  price?: number;
  filledQuantity?: number;
  averagePrice?: number;
  timestamp: string;
}

interface SystemAlert {
  id: string;
  type: "INFO" | "WARNING" | "ERROR" | "SUCCESS";
  title: string;
  message: string;
  botId?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  timestamp: string;
  actions?: Array<{
    label: string;
    action: string;
  }>;
}

interface ConnectionStats {
  connected: boolean;
  reconnectAttempts: number;
  lastConnected?: Date;
  lastDisconnected?: Date;
  latency?: number;
}

interface UseRealTimeDataProps {
  userId?: string;
  botIds?: string[];
  symbols?: string[];
  enabled?: boolean;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;

  // Event handlers
  onPerformanceUpdate?: (update: PerformanceUpdate) => void;
  onTradeUpdate?: (update: TradeUpdate) => void;
  onMarketDataUpdate?: (update: MarketDataUpdate) => void;
  onOrderUpdate?: (update: OrderUpdate) => void;
  onSystemAlert?: (alert: SystemAlert) => void;
  onConnectionChange?: (stats: ConnectionStats) => void;
  onError?: (error: string) => void;
}

export const useRealTimeData = ({
  userId,
  botIds = [],
  symbols = [],
  enabled = true,
  autoReconnect = true,
  reconnectDelay = 5000,
  maxReconnectAttempts = 10,
  onPerformanceUpdate,
  onTradeUpdate,
  onMarketDataUpdate,
  onOrderUpdate,
  onSystemAlert,
  onConnectionChange,
  onError,
}: UseRealTimeDataProps) => {
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    connected: false,
    reconnectAttempts: 0,
  });

  const [lastData, setLastData] = useState<{
    performance?: PerformanceUpdate;
    trade?: TradeUpdate;
    marketData?: MarketDataUpdate;
    order?: OrderUpdate;
    alert?: SystemAlert;
  }>({});

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // Update connection stats
  const updateConnectionStats = useCallback(
    (updates: Partial<ConnectionStats>) => {
      setConnectionStats((prev) => {
        const newStats = { ...prev, ...updates };
        onConnectionChange?.(newStats);
        return newStats;
      });
    },
    [onConnectionChange]
  );

  // Reconnect function
  const reconnect = useCallback(() => {
    if (!autoReconnect || reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log("[WebSocket] Max reconnect attempts reached");
      onError?.("Max reconnection attempts reached");
      return;
    }

    reconnectAttemptsRef.current += 1;
    updateConnectionStats({
      reconnectAttempts: reconnectAttemptsRef.current,
    });

    console.log(`[WebSocket] Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (enabled) {
        connect();
      }
    }, reconnectDelay);
  }, [autoReconnect, maxReconnectAttempts, reconnectDelay, enabled, onError, updateConnectionStats]);

  // Heartbeat to monitor connection health
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        const start = Date.now();
        socketRef.current.emit("ping", start, (response: number) => {
          const latency = Date.now() - response;
          updateConnectionStats({ latency });
        });
      }
    }, 30000); // Every 30 seconds
  }, [updateConnectionStats]);

  // Connect function
  const connect = useCallback(() => {
    if (!enabled || socketRef.current?.connected) {
      return;
    }

    const socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || "http://localhost:5000", {
      transports: ["websocket", "polling"],
      timeout: 10000,
      autoConnect: true,
      forceNew: true,
      auth: {
        userId,
        timestamp: Date.now(),
      },
    });

    socketRef.current = socket;

    // Connection events
    socket.on("connect", () => {
      console.log("[WebSocket] Connected successfully");
      reconnectAttemptsRef.current = 0;

      updateConnectionStats({
        connected: true,
        lastConnected: new Date(),
        reconnectAttempts: 0,
      });

      startHeartbeat();

      // Subscribe to channels
      if (userId) {
        socket.emit("subscribe:user", userId);
      }

      if (botIds.length > 0) {
        socket.emit("subscribe:bots", botIds);
      }

      if (symbols.length > 0) {
        socket.emit("subscribe:market-data", symbols);
      }

      // Request initial data
      socket.emit("request:initial-state");
    });

    socket.on("disconnect", (reason) => {
      console.log("[WebSocket] Disconnected:", reason);

      updateConnectionStats({
        connected: false,
        lastDisconnected: new Date(),
      });

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      // Auto-reconnect on unexpected disconnection
      if (reason === "io server disconnect") {
        // Server disconnected us, don't reconnect automatically
        onError?.("Server disconnected the connection");
      } else if (autoReconnect && enabled) {
        reconnect();
      }
    });

    socket.on("connect_error", (error) => {
      console.warn("[WebSocket] Connection error:", error.message);
      updateConnectionStats({ connected: false });
      onError?.(error.message);

      if (autoReconnect && enabled) {
        reconnect();
      }
    });

    // Data event handlers
    socket.on("performance:updated", (update: PerformanceUpdate) => {
      console.log("[WebSocket] Performance update:", update);
      setLastData((prev) => ({ ...prev, performance: update }));
      onPerformanceUpdate?.(update);
    });

    socket.on("trade:updated", (update: TradeUpdate) => {
      console.log("[WebSocket] Trade update:", update);
      setLastData((prev) => ({ ...prev, trade: update }));
      onTradeUpdate?.(update);
    });

    socket.on("market-data:updated", (update: MarketDataUpdate) => {
      console.log("[WebSocket] Market data update:", update);
      setLastData((prev) => ({ ...prev, marketData: update }));
      onMarketDataUpdate?.(update);
    });

    socket.on("order:updated", (update: OrderUpdate) => {
      console.log("[WebSocket] Order update:", update);
      setLastData((prev) => ({ ...prev, order: update }));
      onOrderUpdate?.(update);
    });

    socket.on("system:alert", (alert: SystemAlert) => {
      console.log("[WebSocket] System alert:", alert);
      setLastData((prev) => ({ ...prev, alert }));
      onSystemAlert?.(alert);
    });

    // Handle subscription confirmations
    socket.on("subscribed:user", (data) => {
      console.log("[WebSocket] User subscription confirmed:", data);
    });

    socket.on("subscribed:bots", (data) => {
      console.log("[WebSocket] Bot subscriptions confirmed:", data);
    });

    socket.on("subscribed:market-data", (data) => {
      console.log("[WebSocket] Market data subscriptions confirmed:", data);
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error("[WebSocket] Socket error:", error);
      onError?.(error.message || "Unknown socket error");
    });
  }, [
    enabled,
    userId,
    botIds,
    symbols,
    autoReconnect,
    onPerformanceUpdate,
    onTradeUpdate,
    onMarketDataUpdate,
    onOrderUpdate,
    onSystemAlert,
    onError,
    updateConnectionStats,
    startHeartbeat,
    reconnect,
  ]);

  // Initialize connection
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return cleanup;
  }, [enabled, connect, cleanup]);

  // Update subscriptions when dependencies change
  useEffect(() => {
    if (socketRef.current?.connected) {
      if (botIds.length > 0) {
        socketRef.current.emit("subscribe:bots", botIds);
      }
      if (symbols.length > 0) {
        socketRef.current.emit("subscribe:market-data", symbols);
      }
    }
  }, [botIds, symbols]);

  // Public methods
  const subscribe = useCallback((channel: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(`subscribe:${channel}`, data);
    }
  }, []);

  const unsubscribe = useCallback((channel: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(`unsubscribe:${channel}`, data);
    }
  }, []);

  const sendMessage = useCallback(
    (event: string, data?: unknown) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit(event, data);
      } else {
        onError?.("WebSocket not connected");
      }
    },
    [onError]
  );

  const requestRefresh = useCallback((type?: "performance" | "trades" | "market-data" | "orders") => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("request:refresh", type);
    }
  }, []);

  const forceReconnect = useCallback(() => {
    cleanup();
    reconnectAttemptsRef.current = 0;
    if (enabled) {
      setTimeout(connect, 1000);
    }
  }, [cleanup, connect, enabled]);

  return {
    // Connection state
    isConnected: connectionStats.connected,
    connectionStats,
    lastData,

    // Methods
    subscribe,
    unsubscribe,
    sendMessage,
    requestRefresh,
    forceReconnect,
    disconnect: cleanup,
  };
};

// Convenience hooks for specific use cases
export const useTradeUpdates = (botIds: string[], onTradeUpdate?: (update: TradeUpdate) => void) => {
  return useRealTimeData({
    botIds,
    onTradeUpdate,
    enabled: botIds.length > 0,
  });
};

export const useMarketData = (symbols: string[], onMarketDataUpdate?: (update: MarketDataUpdate) => void) => {
  return useRealTimeData({
    symbols,
    onMarketDataUpdate,
    enabled: symbols.length > 0,
  });
};

export const usePerformanceUpdates = (botIds: string[], onPerformanceUpdate?: (update: PerformanceUpdate) => void) => {
  return useRealTimeData({
    botIds,
    onPerformanceUpdate,
    enabled: botIds.length > 0,
  });
};

// Legacy exports for backward compatibility
export const useAnalyticsWebSocket = useRealTimeData;
