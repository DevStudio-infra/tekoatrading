import winston from "winston";
import "winston-daily-rotate-file";
import path from "path";
import fs from "fs";

// Define log directory
const logDir = path.join(process.cwd(), "logs");

// Create logs directory if it doesn't exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define level based on environment
const level = () => {
  const env = process.env.NODE_ENV || "development";
  return env === "development" ? "debug" : "info";
};

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
};

// Add colors to winston
winston.addColors(colors);

// Add environment-based log level configuration
const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const TRADE_LOGS_ONLY = process.env.TRADE_LOGS_ONLY === "true";
const ENABLE_DEBUG_LOGS = process.env.ENABLE_DEBUG_LOGS === "true";

// Clean console format for trade tracking
const tradeConsoleFormat = winston.format.printf(({ level, message, timestamp, event, botId, symbol, ...meta }: any) => {
  if (TRADE_LOGS_ONLY && (!event || (!event.includes("TRADE") && !event.includes("BOT_DECISION") && !event.includes("PORTFOLIO")))) {
    return "";
  }

  const time = timestamp ? new Date(timestamp as string).toLocaleTimeString() : "";

  if (event) {
    // Structured event logs
    switch (event) {
      case "TRADE_OPENED":
        return `[${time}] ${message} | Bot: ${meta.botName} | ${meta.symbol} ${meta.action} ${meta.quantity} @ ${meta.entryPrice} | SL: ${meta.stopLoss} | TP: ${meta.takeProfit} | Confidence: ${meta.confidence}%`;

      case "TRADE_CLOSED":
        return `[${time}] ${message} | Bot: ${meta.botName} | ${meta.symbol} ${meta.action} | PnL: ${(meta.pnl as number) > 0 ? "+" : ""}${meta.pnl} (${
          meta.pnlPercent
        }%) | Reason: ${meta.reason}`;

      case "BOT_DECISION":
        return `[${time}] ${message} | Bot: ${meta.botName || "Unknown"} | ${meta.symbol || "Unknown"} | Decision: ${meta.decision} (${meta.confidence}%) | Price: ${
          meta.currentPrice
        } | Trades: ${meta.openTrades}/${meta.maxTrades}`;

      case "PORTFOLIO_UPDATE":
        return `[${time}] ${message} | Balance: $${(meta.totalBalance as number).toLocaleString()} | PnL: ${(meta.totalPnl as number) > 0 ? "+" : ""}${
          meta.totalPnl
        } | Positions: ${meta.openPositions} | Exposure: ${meta.totalExposure}%`;

      case "RISK_ALERT":
        return `[${time}] ${message} | Bot: ${botId} | ${meta.symbol} | ${meta.alertType}: ${meta.message}`;

      case "SYSTEM_STATUS":
        return `[${time}] ${message}`;

      case "API_STATUS":
        return `[${time}] ${message} | ${meta.service}: ${meta.status} | ${meta.message}`;

      default:
        return `[${time}] ${message}`;
    }
  }

  // Fallback for non-structured logs
  return `[${time}] ${message}`;
});

// Define format for console logs
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
);

// Define format for file logs (with JSON formatting)
const fileFormat = winston.format.combine(winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }), winston.format.json());

// Define daily rotate file transport for error logs
const errorRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, "error-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
  level: "error",
  format: fileFormat,
});

// Define daily rotate file transport for all logs
const combinedRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, "combined-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
  format: fileFormat,
});

// Define transports
const transports = [
  new winston.transports.Console({
    level: ENABLE_DEBUG_LOGS ? "debug" : "info",
    format: winston.format.combine(winston.format.colorize(), winston.format.timestamp(), tradeConsoleFormat),
  }),
  errorRotateTransport,
  combinedRotateTransport,
];

// Create the logger
const logger = winston.createLogger({
  level: LOG_LEVEL,
  levels,
  format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
  transports,
});

// Create HTTP stream for Morgan middleware
const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Additional methods for structured logging
const enhancedLogger = {
  // Standard winston methods
  error: (message: string, meta?: any) => logger.error(formatMessage(message, meta)),
  warn: (message: string, meta?: any) => logger.warn(formatMessage(message, meta)),
  info: (message: string, meta?: any) => logger.info(formatMessage(message, meta)),
  http: (message: string, meta?: any) => logger.http(formatMessage(message, meta)),
  debug: (message: string, meta?: any) => logger.debug(formatMessage(message, meta)),

  // Structured logging for API requests
  apiRequest: (method: string, endpoint: string, statusCode: number, responseTime: number, userId?: number) => {
    logger.http(`API ${method} ${endpoint} ${statusCode} ${responseTime}ms`, {
      method,
      endpoint,
      statusCode,
      responseTime,
      userId,
    });
  },

  // Structured logging for bot actions
  botAction: (botId: number, action: string, result: string, details?: any) => {
    logger.info(`Bot ${botId} ${action}: ${result}`, {
      botId,
      action,
      result,
      ...details,
    });
  },

  // Structured logging for trade executions
  tradeExecution: (botId: number, action: string, symbol: string, price: number, size: number, details?: any) => {
    logger.info(`Trade ${action} by Bot ${botId}: ${symbol} @ ${price} x ${size}`, {
      botId,
      action,
      symbol,
      price,
      size,
      ...details,
    });
  },

  // Structured logging for errors with stack traces
  errorWithStack: (message: string, error: Error, meta?: any) => {
    logger.error(
      formatMessage(message, {
        ...meta,
        error: error.message,
        stack: error.stack,
      })
    );
  },

  // Access to the stream for Morgan middleware
  stream,

  /**
   * STRUCTURED TRADE LOGGING - Clean and organized for trade tracking
   */

  // Trade Lifecycle Events
  tradeOpened: (data: {
    botId: string;
    botName: string;
    symbol: string;
    action: string;
    quantity: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    confidence: number;
    reasoning: string;
  }) => {
    logger.info(`🟢 TRADE OPENED`, {
      event: "TRADE_OPENED",
      botId: data.botId,
      botName: data.botName,
      symbol: data.symbol,
      action: data.action,
      quantity: data.quantity,
      entryPrice: data.entryPrice,
      stopLoss: data.stopLoss,
      takeProfit: data.takeProfit,
      confidence: data.confidence,
      reasoning: data.reasoning,
      timestamp: new Date().toISOString(),
    });
  },

  tradeClosed: (data: {
    botId: string;
    botName: string;
    symbol: string;
    action: string;
    quantity: number;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    pnlPercent: number;
    reason: string;
    duration?: string;
  }) => {
    const pnlEmoji = data.pnl >= 0 ? "💚" : "🔴";
    logger.info(`${pnlEmoji} TRADE CLOSED`, {
      event: "TRADE_CLOSED",
      botId: data.botId,
      botName: data.botName,
      symbol: data.symbol,
      action: data.action,
      quantity: data.quantity,
      entryPrice: data.entryPrice,
      exitPrice: data.exitPrice,
      pnl: data.pnl,
      pnlPercent: data.pnlPercent,
      reason: data.reason,
      duration: data.duration,
      timestamp: new Date().toISOString(),
    });
  },

  tradeUpdated: (data: {
    botId: string;
    symbol: string;
    action: string;
    newStopLoss?: number;
    newTakeProfit?: number;
    currentPrice: number;
    unrealizedPnl: number;
    reason: string;
  }) => {
    logger.info(`🔄 TRADE UPDATED`, {
      event: "TRADE_UPDATED",
      botId: data.botId,
      symbol: data.symbol,
      action: data.action,
      newStopLoss: data.newStopLoss,
      newTakeProfit: data.newTakeProfit,
      currentPrice: data.currentPrice,
      unrealizedPnl: data.unrealizedPnl,
      reason: data.reason,
      timestamp: new Date().toISOString(),
    });
  },

  // Bot Decision Events
  botDecision: (data: {
    botId: string;
    botName: string;
    symbol: string;
    decision: string;
    confidence: number;
    reasoning: string;
    currentPrice: number;
    accountBalance: number;
    openTrades: number;
    maxTrades: number;
  }) => {
    const decisionEmoji = data.decision === "BUY" ? "🟢" : data.decision === "SELL" ? "🔴" : "⏸️";
    logger.info(`${decisionEmoji} BOT DECISION`, {
      event: "BOT_DECISION",
      botId: data.botId,
      botName: data.botName,
      symbol: data.symbol,
      decision: data.decision,
      confidence: data.confidence,
      reasoning: data.reasoning,
      currentPrice: data.currentPrice,
      accountBalance: data.accountBalance,
      openTrades: data.openTrades,
      maxTrades: data.maxTrades,
      timestamp: new Date().toISOString(),
    });
  },

  // Portfolio Events
  portfolioUpdate: (data: { userId: string; totalBalance: number; availableBalance: number; totalPnl: number; openPositions: number; totalExposure: number; dayPnl?: number }) => {
    logger.info(`📊 PORTFOLIO UPDATE`, {
      event: "PORTFOLIO_UPDATE",
      userId: data.userId,
      totalBalance: data.totalBalance,
      availableBalance: data.availableBalance,
      totalPnl: data.totalPnl,
      openPositions: data.openPositions,
      totalExposure: data.totalExposure,
      dayPnl: data.dayPnl,
      timestamp: new Date().toISOString(),
    });
  },

  // Risk Management Events
  riskAlert: (data: {
    botId: string;
    symbol: string;
    alertType: "STOP_LOSS" | "TAKE_PROFIT" | "MAX_DRAWDOWN" | "MAX_EXPOSURE" | "API_ERROR";
    message: string;
    currentPrice?: number;
    triggerLevel?: number;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  }) => {
    const severityEmoji = {
      LOW: "🟡",
      MEDIUM: "🟠",
      HIGH: "🔴",
      CRITICAL: "🚨",
    };

    logger.warn(`${severityEmoji[data.severity]} RISK ALERT`, {
      event: "RISK_ALERT",
      botId: data.botId,
      symbol: data.symbol,
      alertType: data.alertType,
      message: data.message,
      currentPrice: data.currentPrice,
      triggerLevel: data.triggerLevel,
      severity: data.severity,
      timestamp: new Date().toISOString(),
    });
  },

  // Market Events
  marketAlert: (data: { symbol: string; alertType: "PRICE_MOVEMENT" | "VOLATILITY" | "VOLUME" | "NEWS"; message: string; currentPrice: number; changePercent?: number }) => {
    logger.info(`📈 MARKET ALERT`, {
      event: "MARKET_ALERT",
      symbol: data.symbol,
      alertType: data.alertType,
      message: data.message,
      currentPrice: data.currentPrice,
      changePercent: data.changePercent,
      timestamp: new Date().toISOString(),
    });
  },

  // Performance Tracking
  botPerformance: (data: {
    botId: string;
    botName: string;
    symbol: string;
    totalTrades: number;
    winRate: number;
    totalPnl: number;
    bestTrade: number;
    worstTrade: number;
    avgTradeTime: string;
    sharpeRatio?: number;
  }) => {
    logger.info(`📊 BOT PERFORMANCE`, {
      event: "BOT_PERFORMANCE",
      botId: data.botId,
      botName: data.botName,
      symbol: data.symbol,
      totalTrades: data.totalTrades,
      winRate: data.winRate,
      totalPnl: data.totalPnl,
      bestTrade: data.bestTrade,
      worstTrade: data.worstTrade,
      avgTradeTime: data.avgTradeTime,
      sharpeRatio: data.sharpeRatio,
      timestamp: new Date().toISOString(),
    });
  },

  // Clean system status logs
  systemStatus: (message: string, data?: any) => {
    logger.info(`⚙️ SYSTEM`, {
      event: "SYSTEM_STATUS",
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  },

  // API Status
  apiStatus: (data: { service: string; status: "CONNECTED" | "DISCONNECTED" | "ERROR" | "RATE_LIMITED"; message: string; latency?: number }) => {
    const statusEmoji = {
      CONNECTED: "🟢",
      DISCONNECTED: "🔴",
      ERROR: "❌",
      RATE_LIMITED: "⏱️",
    };

    logger.info(`${statusEmoji[data.status]} API STATUS`, {
      event: "API_STATUS",
      service: data.service,
      status: data.status,
      message: data.message,
      latency: data.latency,
      timestamp: new Date().toISOString(),
    });
  },
};

// Helper function to format message with metadata
function formatMessage(message: string, meta?: any): string {
  if (!meta) return message;

  // For console output, keep it simple
  if (process.env.NODE_ENV === "development") {
    return `${message} ${JSON.stringify(meta)}`;
  }

  // For production/file output, Winston's JSON formatter will handle this properly
  return message;
}

export const loggerService = enhancedLogger;
