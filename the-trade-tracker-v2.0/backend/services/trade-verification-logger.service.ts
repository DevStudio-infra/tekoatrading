import fs from "fs";
import path from "path";
import { loggerService } from "../agents/core/services/logging/logger.service";

interface LLMTradeDecision {
  timestamp: string;
  botId: string;
  symbol: string;
  action: "BUY" | "SELL" | "CLOSE" | "HOLD";
  reasoning: string;
  confidence: number;
  marketData: any;
  technicalIndicators: any;
  llmResponse: string; // Raw LLM output
}

interface ActualTradeExecution {
  timestamp: string;
  botId: string;
  symbol: string;
  action: "BUY" | "SELL" | "CLOSE";
  amount: number;
  price: number;
  capitalComResponse: any;
  success: boolean;
  error?: string;
  tradeId?: string;
}

interface TradeVerificationLog {
  llmDecision: LLMTradeDecision;
  actualExecution?: ActualTradeExecution;
  matched: boolean;
  discrepancy?: string;
}

export class TradeVerificationLoggerService {
  private static instance: TradeVerificationLoggerService;
  private logFilePath: string;
  private pendingDecisions: Map<string, LLMTradeDecision> = new Map();

  constructor() {
    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    this.logFilePath = path.join(logsDir, "trade-verification.log");

    // Create log file with headers if it doesn't exist
    if (!fs.existsSync(this.logFilePath)) {
      const header = "=== TRADE VERIFICATION LOG ===\n" + "LLM Decisions vs Capital.com Executions\n" + "=====================================\n\n";
      fs.writeFileSync(this.logFilePath, header);
    }
  }

  static getInstance(): TradeVerificationLoggerService {
    if (!TradeVerificationLoggerService.instance) {
      TradeVerificationLoggerService.instance = new TradeVerificationLoggerService();
    }
    return TradeVerificationLoggerService.instance;
  }

  /**
   * Log LLM trading decision
   */
  logLLMDecision(decision: Omit<LLMTradeDecision, "timestamp">): void {
    const fullDecision: LLMTradeDecision = {
      ...decision,
      timestamp: new Date().toISOString(),
    };

    // Store pending decision for matching with execution
    const key = `${decision.botId}_${decision.symbol}_${Date.now()}`;
    this.pendingDecisions.set(key, fullDecision);

    // Log to file immediately
    const logEntry = this.formatLLMDecisionLog(fullDecision);
    this.appendToLog(logEntry);

    // Also log to console for immediate visibility
    console.log(`🧠 LLM: ${decision.action} ${decision.symbol} (${decision.confidence}%) - ${decision.reasoning}`);
  }

  /**
   * Log actual trade execution
   */
  logTradeExecution(execution: Omit<ActualTradeExecution, "timestamp">): void {
    const fullExecution: ActualTradeExecution = {
      ...execution,
      timestamp: new Date().toISOString(),
    };

    // Try to match with pending LLM decision
    const matchingDecision = this.findMatchingDecision(fullExecution);

    const verificationLog: TradeVerificationLog = {
      llmDecision: matchingDecision || this.createPlaceholderDecision(fullExecution),
      actualExecution: fullExecution,
      matched: !!matchingDecision,
      discrepancy: matchingDecision ? undefined : "No matching LLM decision found",
    };

    // Log to file
    const logEntry = this.formatVerificationLog(verificationLog);
    this.appendToLog(logEntry);

    // Log to console with color coding
    if (fullExecution.success) {
      console.log(`✅ CAPITAL.COM: ${execution.action} ${execution.amount} ${execution.symbol} at ${execution.price}`);
      console.log(`🔗 Trade ID: ${execution.tradeId || "N/A"}`);
    } else {
      console.log(`❌ CAPITAL.COM: ${execution.action} ${execution.symbol} - ${execution.error}`);
    }

    if (!matchingDecision) {
      console.log(`⚠️  WARNING: No matching LLM decision found for this execution!`);
    }

    // Clean up matched decision
    if (matchingDecision) {
      this.removePendingDecision(matchingDecision);
    }
  }

  /**
   * Log when LLM decides NOT to trade
   */
  logNoTradeDecision(botId: string, symbol: string, reasoning: string, marketData: any): void {
    const decision: LLMTradeDecision = {
      timestamp: new Date().toISOString(),
      botId,
      symbol,
      action: "HOLD",
      reasoning,
      confidence: 0,
      marketData,
      technicalIndicators: {},
      llmResponse: `No trade decision: ${reasoning}`,
    };

    const logEntry = this.formatLLMDecisionLog(decision);
    this.appendToLog(logEntry);

    console.log(`💤 NO TRADE: ${symbol} (Bot: ${botId}) - ${reasoning}`);
  }

  /**
   * Get recent trade verification summary
   */
  getRecentTradeSummary(hours: number = 24): {
    totalDecisions: number;
    totalExecutions: number;
    successfulTrades: number;
    failedTrades: number;
    unmatchedDecisions: number;
    unmatchedExecutions: number;
  } {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentDecisions = Array.from(this.pendingDecisions.values()).filter((d) => new Date(d.timestamp) > cutoff);

    // This is a simplified summary - in a real implementation,
    // you'd parse the log file to get execution stats
    return {
      totalDecisions: recentDecisions.length,
      totalExecutions: 0, // Would need to parse log file
      successfulTrades: 0,
      failedTrades: 0,
      unmatchedDecisions: recentDecisions.length,
      unmatchedExecutions: 0,
    };
  }

  private findMatchingDecision(execution: ActualTradeExecution): LLMTradeDecision | null {
    // Look for matching decision within last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    for (const [key, decision] of this.pendingDecisions.entries()) {
      if (decision.botId === execution.botId && decision.symbol === execution.symbol && decision.action === execution.action && new Date(decision.timestamp) > fiveMinutesAgo) {
        return decision;
      }
    }

    return null;
  }

  private removePendingDecision(decision: LLMTradeDecision): void {
    for (const [key, pendingDecision] of this.pendingDecisions.entries()) {
      if (pendingDecision === decision) {
        this.pendingDecisions.delete(key);
        break;
      }
    }
  }

  private createPlaceholderDecision(execution: ActualTradeExecution): LLMTradeDecision {
    return {
      timestamp: execution.timestamp,
      botId: execution.botId,
      symbol: execution.symbol,
      action: execution.action,
      reasoning: "NO LLM DECISION LOGGED",
      confidence: 0,
      marketData: {},
      technicalIndicators: {},
      llmResponse: "No LLM decision found for this execution",
    };
  }

  private formatLLMDecisionLog(decision: LLMTradeDecision): string {
    return `
🧠 LLM DECISION [${decision.timestamp}]
Bot: ${decision.botId}
Symbol: ${decision.symbol}
Action: ${decision.action}
Confidence: ${decision.confidence}%
Reasoning: ${decision.reasoning}
Market Data: ${JSON.stringify(decision.marketData, null, 2)}
Technical Indicators: ${JSON.stringify(decision.technicalIndicators, null, 2)}
Raw LLM Response: ${decision.llmResponse}
${"=".repeat(80)}
`;
  }

  private formatVerificationLog(log: TradeVerificationLog): string {
    const status = log.matched ? "✅ MATCHED" : "❌ UNMATCHED";
    const execution = log.actualExecution;

    return `
${status} TRADE VERIFICATION [${execution?.timestamp}]
LLM Decision: ${log.llmDecision.action} ${log.llmDecision.symbol} (${log.llmDecision.confidence}%)
Actual Execution: ${execution?.action} ${execution?.amount} ${execution?.symbol} at ${execution?.price}
Success: ${execution?.success ? "YES" : "NO"}
Capital.com Response: ${JSON.stringify(execution?.capitalComResponse, null, 2)}
Trade ID: ${execution?.tradeId || "N/A"}
${log.discrepancy ? `Discrepancy: ${log.discrepancy}` : ""}
${"=".repeat(80)}
`;
  }

  private appendToLog(content: string): void {
    try {
      fs.appendFileSync(this.logFilePath, content + "\n");
    } catch (error) {
      loggerService.error("Failed to write to trade verification log:", error);
    }
  }

  /**
   * Get the log file path for manual inspection
   */
  getLogFilePath(): string {
    return this.logFilePath;
  }

  /**
   * Clear old logs (keep last N days)
   */
  cleanupOldLogs(daysToKeep: number = 7): void {
    // This would implement log rotation - for now just log the action
    loggerService.info(`Trade verification log cleanup requested (keep ${daysToKeep} days)`);
  }
}
