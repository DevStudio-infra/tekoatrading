import { createLogger, transports, format } from "winston";
import path from "path";
import fs from "fs";

export interface TradingError {
  timestamp: string;
  botId: string;
  symbol: string;
  errorType:
    | "BROKER_REJECTION"
    | "RISK_MANAGEMENT"
    | "POSITION_SIZING"
    | "API_ERROR"
    | "VALIDATION_ERROR";
  errorCode?: string;
  errorMessage: string;
  context: {
    entryPrice?: number;
    stopLevel?: number;
    profitLevel?: number;
    positionSize?: number;
    accountBalance?: number;
    brokerLimits?: any;
    requestData?: any;
    responseData?: any;
  };
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  actionTaken?: string;
  resolution?: string;
}

export class TradingErrorLogger {
  private errorLogger;
  private errorLogPath: string;

  constructor() {
    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    this.errorLogPath = path.join(logsDir, "trading-errors.log");

    // Create dedicated error logger
    this.errorLogger = createLogger({
      level: "error",
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
        format.prettyPrint(),
      ),
      transports: [
        new transports.File({
          filename: this.errorLogPath,
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10,
          tailable: true,
        }),
        new transports.Console({
          format: format.combine(format.colorize(), format.simple()),
        }),
      ],
    });
  }

  /**
   * Log broker rejection errors with detailed context
   */
  async logBrokerRejection(params: {
    botId: string;
    symbol: string;
    errorCode: string;
    errorMessage: string;
    requestData: any;
    responseData?: any;
    brokerLimits?: any;
  }) {
    const error: TradingError = {
      timestamp: new Date().toISOString(),
      botId: params.botId,
      symbol: params.symbol,
      errorType: "BROKER_REJECTION",
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      context: {
        entryPrice: params.requestData?.entryPrice,
        stopLevel: params.requestData?.stopLevel,
        profitLevel: params.requestData?.profitLevel,
        positionSize: params.requestData?.size,
        requestData: params.requestData,
        responseData: params.responseData,
        brokerLimits: params.brokerLimits,
      },
      severity: this.determineSeverity(params.errorCode),
      actionTaken: "Order rejected by broker",
    };

    this.errorLogger.error("BROKER_REJECTION", error);

    // Also log to console with clear formatting
    console.log("\n🚨 =============== TRADING ERROR DETECTED ===============");
    console.log(`🤖 Bot: ${params.botId}`);
    console.log(`📊 Symbol: ${params.symbol}`);
    console.log(`❌ Error: ${params.errorMessage}`);
    console.log(`🔧 Stop Level Sent: ${params.requestData?.stopLevel}`);
    console.log(`🏛️ Broker Max Allowed: ${this.extractBrokerLimit(params.errorCode)}`);
    console.log(`📋 Full Request:`, JSON.stringify(params.requestData, null, 2));
    console.log("========================================================\n");

    return error;
  }

  /**
   * Log risk management calculation errors
   */
  async logRiskManagementError(params: {
    botId: string;
    symbol: string;
    errorMessage: string;
    calculatedValues: any;
    constraints: any;
    warnings: string[];
  }) {
    const error: TradingError = {
      timestamp: new Date().toISOString(),
      botId: params.botId,
      symbol: params.symbol,
      errorType: "RISK_MANAGEMENT",
      errorMessage: params.errorMessage,
      context: {
        entryPrice: params.calculatedValues?.entryPrice,
        stopLevel: params.calculatedValues?.stopLoss,
        profitLevel: params.calculatedValues?.takeProfit,
        positionSize: params.calculatedValues?.positionSize,
        brokerLimits: params.constraints,
      },
      severity: params.warnings?.length > 2 ? "HIGH" : "MEDIUM",
      actionTaken: "Risk management calculation failed",
    };

    this.errorLogger.error("RISK_MANAGEMENT", error);

    console.log("\n⚠️ ============= RISK MANAGEMENT ERROR =============");
    console.log(`🤖 Bot: ${params.botId}`);
    console.log(`📊 Symbol: ${params.symbol}`);
    console.log(`❌ Error: ${params.errorMessage}`);
    console.log(`⚠️ Warnings: ${params.warnings?.join(", ")}`);
    console.log(`📋 Calculated Values:`, params.calculatedValues);
    console.log("================================================\n");

    return error;
  }

  /**
   * Log position sizing errors
   */
  async logPositionSizingError(params: {
    botId: string;
    symbol: string;
    errorMessage: string;
    accountBalance: number;
    requestedSize: number;
    adjustedSize?: number;
    minSize?: number;
    maxSize?: number;
  }) {
    const error: TradingError = {
      timestamp: new Date().toISOString(),
      botId: params.botId,
      symbol: params.symbol,
      errorType: "POSITION_SIZING",
      errorMessage: params.errorMessage,
      context: {
        positionSize: params.requestedSize,
        accountBalance: params.accountBalance,
      },
      severity: "MEDIUM",
      actionTaken: params.adjustedSize
        ? `Size adjusted to ${params.adjustedSize}`
        : "Position sizing failed",
    };

    this.errorLogger.error("POSITION_SIZING", error);

    console.log("\n📏 ============= POSITION SIZING ERROR =============");
    console.log(`🤖 Bot: ${params.botId}`);
    console.log(`📊 Symbol: ${params.symbol}`);
    console.log(`💰 Account Balance: $${params.accountBalance}`);
    console.log(`📐 Requested Size: ${params.requestedSize}`);
    console.log(`🔧 Adjusted Size: ${params.adjustedSize || "N/A"}`);
    console.log(`📋 Min/Max: ${params.minSize}/${params.maxSize}`);
    console.log("================================================\n");

    return error;
  }

  /**
   * Log API connection errors
   */
  async logApiError(params: {
    botId: string;
    symbol: string;
    api: string;
    errorMessage: string;
    statusCode?: number;
    endpoint?: string;
  }) {
    const error: TradingError = {
      timestamp: new Date().toISOString(),
      botId: params.botId,
      symbol: params.symbol,
      errorType: "API_ERROR",
      errorMessage: `${params.api}: ${params.errorMessage}`,
      context: {
        requestData: {
          endpoint: params.endpoint,
          statusCode: params.statusCode,
        },
      },
      severity: params.statusCode === 401 ? "HIGH" : "MEDIUM",
      actionTaken: "API call failed",
    };

    this.errorLogger.error("API_ERROR", error);

    console.log("\n🌐 ================ API ERROR ================");
    console.log(`🤖 Bot: ${params.botId}`);
    console.log(`📊 Symbol: ${params.symbol}`);
    console.log(`🔌 API: ${params.api}`);
    console.log(`📍 Endpoint: ${params.endpoint}`);
    console.log(`🔢 Status: ${params.statusCode}`);
    console.log(`❌ Error: ${params.errorMessage}`);
    console.log("==========================================\n");

    return error;
  }

  /**
   * Log validation errors
   */
  async logValidationError(params: {
    botId: string;
    symbol: string;
    errorMessage: string;
    requestData: any;
  }) {
    const error: TradingError = {
      timestamp: new Date().toISOString(),
      botId: params.botId,
      symbol: params.symbol,
      errorType: "VALIDATION_ERROR",
      errorMessage: params.errorMessage,
      context: {
        requestData: params.requestData,
      },
      severity: "MEDIUM",
      actionTaken: "Order validation failed",
    };

    this.errorLogger.error("VALIDATION_ERROR", error);

    console.log("\n🚫 ============ VALIDATION ERROR ============");
    console.log(`🤖 Bot: ${params.botId}`);
    console.log(`📊 Symbol: ${params.symbol}`);
    console.log(`❌ Error: ${params.errorMessage}`);
    console.log(`📋 Request Data:`, params.requestData);
    console.log("==========================================\n");

    return error;
  }

  /**
   * Get error statistics for monitoring
   */
  async getErrorStats(timeRange: "hour" | "day" | "week" = "day") {
    // In a real implementation, you'd read from the log file or database
    // For now, return basic structure
    return {
      timeRange,
      totalErrors: 0,
      errorsByType: {
        BROKER_REJECTION: 0,
        RISK_MANAGEMENT: 0,
        POSITION_SIZING: 0,
        API_ERROR: 0,
        VALIDATION_ERROR: 0,
      },
      mostCommonErrors: [],
      recommendedActions: [],
    };
  }

  private determineSeverity(errorCode: string): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    if (errorCode.includes("stoploss.maxvalue") || errorCode.includes("takeprofit.maxvalue")) {
      return "HIGH"; // These are easily fixable but cause trade failures
    }
    if (errorCode.includes("insufficient.funds") || errorCode.includes("account.disabled")) {
      return "CRITICAL";
    }
    if (errorCode.includes("invalid.size") || errorCode.includes("market.closed")) {
      return "MEDIUM";
    }
    return "LOW";
  }

  private extractBrokerLimit(errorCode: string): string | null {
    const match = errorCode.match(/maxvalue:\s*([\d.]+)/);
    return match ? match[1] : null;
  }

  /**
   * Create error report for debugging
   */
  async generateErrorReport(botId: string, timeRange: "hour" | "day" | "week" = "day") {
    const report = {
      botId,
      timeRange,
      generatedAt: new Date().toISOString(),
      summary: await this.getErrorStats(timeRange),
      recommendations: this.generateRecommendations(botId),
    };

    console.log("\n📊 ============= ERROR REPORT =============");
    console.log(`🤖 Bot: ${botId}`);
    console.log(`⏰ Time Range: ${timeRange}`);
    console.log(`📋 Recommendations:`, report.recommendations);
    console.log("========================================\n");

    return report;
  }

  private generateRecommendations(botId: string): string[] {
    return [
      "Implement broker limit validation before order placement",
      "Add position size validation based on account balance",
      "Implement retry logic with adjusted parameters",
      "Add market hours validation",
      "Implement dynamic risk management based on volatility",
    ];
  }
}

// Export singleton instance
export const tradingErrorLogger = new TradingErrorLogger();
