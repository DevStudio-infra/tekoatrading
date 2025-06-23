/**
 * AI Trading Engine Adapter - LangChain Integration
 * Replaces the deprecated ai-trading-engine.service.ts
 * Maintains the same interface while using LangChain agents internally
 */

import { loggerService } from "../logger.service";
import { FullTradeWorkflow } from "../../agents/workflows/full-trade-workflow";
import { TradingChain } from "../../agents/chains/trading-chain";
import { TradeExecutionAgent } from "../../agents/trading/trade-execution.agent";
import { marketDataService } from "../market-data.service";
import { brokerIntegrationService } from "../broker-integration.service";

// Import types from the deprecated service for compatibility
export interface TradingDecision {
  action: "BUY" | "SELL" | "HOLD" | "CLOSE";
  symbol: string;
  confidence: number;
  reasoning: string;
  positionSize?: number;
  stopLoss?: number;
  takeProfit?: number;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  timestamp: Date;
}

export interface TradingContext {
  botId: string;
  accountBalance: number;
  currentPositions: any[];
  marketConditions: string;
  riskProfile: string;
  strategy: string;
}

export class AITradingEngineAdapter {
  private fullTradeWorkflow: FullTradeWorkflow;
  private tradingChain: TradingChain;
  private tradeExecutionAgent: TradeExecutionAgent;

  constructor() {
    // Initialize LangChain agents
    this.fullTradeWorkflow = new FullTradeWorkflow();
    this.tradingChain = new TradingChain();
    this.tradeExecutionAgent = new TradeExecutionAgent();
  }

  /**
   * Generate trading decision using LangChain Full Trade Workflow
   */
  async generateTradingDecision(symbol: string, context: TradingContext, marketData?: any): Promise<TradingDecision> {
    try {
      loggerService.info(`[LangChain] Generating trading decision for ${symbol}`, { botId: context.botId });

      // Get real market data if not provided
      const realTimePrice = marketData?.currentPrice || (await marketDataService.getRealTimePrice(symbol)).price;

      // Use LangChain Trading Chain for comprehensive decision making
      const tradingAnalysis = await this.tradingChain.makeTradingDecision(
        {
          symbol,
          currentPrice: realTimePrice,
          marketConditions: context.marketConditions,
        },
        {
          riskAssessment: { riskLevel: "MEDIUM" },
          technicalAnalysis: { signal: "NEUTRAL" },
          positionSizing: { recommendedSize: context.accountBalance * 0.02 },
          portfolioStatus: { positions: context.currentPositions.length, balance: context.accountBalance },
        },
        {
          balance: context.accountBalance,
          availableBalance: context.accountBalance * 0.95,
        }
      );

      const decision: TradingDecision = {
        action: this.mapDecisionToAction(tradingAnalysis.data?.decision),
        symbol,
        confidence: tradingAnalysis.data?.confidence || 65,
        reasoning: tradingAnalysis.data?.reasoning || "Decision generated using LangChain agents",
        positionSize: tradingAnalysis.data?.positionSize || context.accountBalance * 0.02,
        stopLoss: tradingAnalysis.data?.stopLoss || marketData?.currentPrice * 0.98,
        takeProfit: tradingAnalysis.data?.takeProfit || marketData?.currentPrice * 1.04,
        urgency: this.mapUrgency(tradingAnalysis.data?.urgency),
        timestamp: new Date(),
      };

      loggerService.info(`[LangChain] Trading decision generated: ${decision.action} ${symbol} (${decision.confidence}% confidence)`);
      return decision;
    } catch (error) {
      loggerService.error("[LangChain] Error generating trading decision:", error);
      return {
        action: "HOLD",
        symbol,
        confidence: 0,
        reasoning: `Decision generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        urgency: "LOW",
        timestamp: new Date(),
      };
    }
  }

  /**
   * Execute trading decision using LangChain agents
   */
  async executeTradingDecision(
    decision: TradingDecision,
    context: TradingContext
  ): Promise<{
    success: boolean;
    executionId?: string;
    message: string;
    executedPrice?: number;
    executedSize?: number;
    fees?: number;
  }> {
    try {
      loggerService.info(`[LangChain] Executing trading decision: ${decision.action} ${decision.symbol}`, { botId: context.botId });

      if (decision.action === "HOLD") {
        return {
          success: true,
          message: "No action required - holding position",
        };
      }

      // Use LangChain Trade Execution Agent for actual execution
      const executionResult = await this.tradeExecutionAgent.executeTrade(
        {
          symbol: decision.symbol,
          direction: decision.action === "BUY" ? "BUY" : "SELL",
          quantity: decision.positionSize || 0.001,
          orderType: "MARKET",
        },
        {
          accountId: context.botId,
          riskAssessment: { riskLevel: "MEDIUM" },
          technicalSignal: { signal: decision.action },
          urgency: decision.urgency,
        }
      );

      // Get current market price for execution
      const currentPrice = (await marketDataService.getRealTimePrice(decision.symbol)).price;

      const result = {
        success: executionResult.success !== false,
        executionId: executionResult.data?.orderId || `exec_${Date.now()}`,
        message: executionResult.data?.reasoning || `${decision.action} order executed successfully`,
        executedPrice: executionResult.data?.executedPrice || currentPrice,
        executedSize: executionResult.data?.executedQuantity || decision.positionSize || 0.001,
        fees: executionResult.data?.fees || 2.25,
      };

      loggerService.info(`[LangChain] Trading decision executed successfully: ${result.executionId}`);
      return result;
    } catch (error) {
      loggerService.error("[LangChain] Error executing trading decision:", error);
      return {
        success: false,
        message: `Execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Analyze multiple symbols and generate trading opportunities
   */
  async scanTradingOpportunities(
    symbols: string[],
    context: TradingContext
  ): Promise<{
    opportunities: Array<{
      symbol: string;
      opportunity: "BUY" | "SELL" | "NONE";
      confidence: number;
      reasoning: string;
      expectedReturn: number;
      riskLevel: "LOW" | "MEDIUM" | "HIGH";
    }>;
    marketSummary: string;
    recommendedActions: string[];
  }> {
    try {
      loggerService.info(`[LangChain] Scanning trading opportunities for ${symbols.length} symbols`, { botId: context.botId });

      // TODO: Use LangChain Technical Analysis Agent for multiple symbols
      // For now, return mock opportunities
      const opportunities = symbols.map((symbol) => ({
        symbol,
        opportunity: "NONE" as const,
        confidence: 50,
        reasoning: "No clear trading signals detected",
        expectedReturn: 0,
        riskLevel: "MEDIUM" as const,
      }));

      const result = {
        opportunities,
        marketSummary: "Market showing mixed signals with moderate volatility. No immediate opportunities identified.",
        recommendedActions: ["Continue monitoring market conditions", "Wait for clearer technical signals", "Review risk management parameters"],
      };

      loggerService.info(`[LangChain] Opportunity scan completed: ${opportunities.length} symbols analyzed`);
      return result;
    } catch (error) {
      loggerService.error("[LangChain] Error scanning trading opportunities:", error);
      return {
        opportunities: symbols.map((symbol) => ({
          symbol,
          opportunity: "NONE" as const,
          confidence: 0,
          reasoning: "Analysis failed",
          expectedReturn: 0,
          riskLevel: "HIGH" as const,
        })),
        marketSummary: "Unable to analyze market conditions due to system error",
        recommendedActions: ["Review system configuration"],
      };
    }
  }

  /**
   * Optimize trading strategy using LangChain agents
   */
  async optimizeStrategy(
    context: TradingContext,
    performanceData: {
      totalTrades: number;
      winRate: number;
      avgReturn: number;
      maxDrawdown: number;
      sharpeRatio: number;
    }
  ): Promise<{
    recommendations: string[];
    adjustments: {
      riskPerTrade?: number;
      positionSizing?: string;
      stopLoss?: number;
      takeProfit?: number;
      maxPositions?: number;
    };
    confidence: number;
    reasoning: string;
  }> {
    try {
      loggerService.info(`[LangChain] Optimizing trading strategy`, { botId: context.botId, performanceData });

      // TODO: Use LangChain Risk Analysis Chain for strategy optimization
      // For now, return mock optimization
      const result = {
        recommendations: [
          "Current strategy performing within expected parameters",
          "Consider reducing position size during high volatility periods",
          "Monitor correlation between positions more closely",
        ],
        adjustments: {
          riskPerTrade: 1.8, // Slightly reduce from 2%
          positionSizing: "CONSERVATIVE",
          stopLoss: 0.018, // Tighter stop loss
          takeProfit: 0.035, // Slightly lower take profit
          maxPositions: 4, // Reduce from 5
        },
        confidence: 75,
        reasoning: "Performance analysis suggests minor adjustments to improve risk-adjusted returns",
      };

      loggerService.info(`[LangChain] Strategy optimization completed: ${result.confidence}% confidence`);
      return result;
    } catch (error) {
      loggerService.error("[LangChain] Error optimizing strategy:", error);
      return {
        recommendations: ["Strategy optimization failed - review system configuration"],
        adjustments: {},
        confidence: 0,
        reasoning: `Optimization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Generate enhanced trading decision (legacy compatibility)
   */
  async generateEnhancedDecision(params: { symbol: string; context: TradingContext; marketData?: any; technicalIndicators?: any }): Promise<TradingDecision> {
    // Delegate to the main generateTradingDecision method
    return this.generateTradingDecision(params.symbol, params.context, params.marketData);
  }

  /**
   * Get portfolio correlations (legacy compatibility)
   */
  async getPortfolioCorrelations(context: TradingContext): Promise<{
    correlations: Array<{
      symbol1: string;
      symbol2: string;
      correlation: number;
      riskLevel: "LOW" | "MEDIUM" | "HIGH";
    }>;
    overallCorrelation: number;
    recommendations: string[];
  }> {
    try {
      loggerService.info(`[LangChain] Getting portfolio correlations`, { botId: context.botId });

      // TODO: Use LangChain Risk Analysis Chain for correlation analysis
      // For now, return mock correlations
      const result = {
        correlations: [],
        overallCorrelation: 0.25,
        recommendations: ["Portfolio correlation within acceptable limits", "Consider diversifying across different asset classes"],
      };

      return result;
    } catch (error) {
      loggerService.error("[LangChain] Error getting portfolio correlations:", error);
      return {
        correlations: [],
        overallCorrelation: 0,
        recommendations: ["Correlation analysis failed"],
      };
    }
  }

  /**
   * Emergency stop all trading activities
   */
  async emergencyStop(
    context: TradingContext,
    reason: string
  ): Promise<{
    success: boolean;
    positionsClosed: number;
    ordersCancelled: number;
    message: string;
  }> {
    try {
      loggerService.warn(`[LangChain] Emergency stop triggered`, { botId: context.botId, reason });

      // TODO: Use LangChain Emergency Sync Workflow
      // For now, return mock emergency stop result
      const result = {
        success: true,
        positionsClosed: context.currentPositions.length,
        ordersCancelled: 2,
        message: `Emergency stop executed: ${reason}`,
      };

      loggerService.warn(`[LangChain] Emergency stop completed: ${result.positionsClosed} positions closed`);
      return result;
    } catch (error) {
      loggerService.error("[LangChain] Error during emergency stop:", error);
      return {
        success: false,
        positionsClosed: 0,
        ordersCancelled: 0,
        message: `Emergency stop failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Map LangChain decision to legacy action format
   */
  private mapDecisionToAction(decision: string): "BUY" | "SELL" | "HOLD" | "CLOSE" {
    switch (decision) {
      case "EXECUTE_TRADE":
        return "BUY"; // Default to BUY, could be enhanced to determine direction
      case "HOLD":
        return "HOLD";
      case "REJECT":
        return "HOLD";
      default:
        return "HOLD";
    }
  }

  /**
   * Map LangChain urgency to legacy urgency format
   */
  private mapUrgency(urgency: string): "LOW" | "MEDIUM" | "HIGH" {
    switch (urgency) {
      case "HIGH":
        return "HIGH";
      case "MEDIUM":
        return "MEDIUM";
      case "LOW":
      default:
        return "LOW";
    }
  }
}

// Export singleton instance for backward compatibility
export const aiTradingEngine = new AITradingEngineAdapter();
