/**
 * Full Trade Workflow - Complete End-to-End Trading
 * Purpose: Orchestrates all agents for intelligent, automated trading
 * This is the main workflow that brings everything together
 */

import { agentIntegration } from "../core/agent-integration.service";
import { riskAssessmentAgent } from "../trading/risk-assessment.agent";
import { technicalAnalysisAgent } from "../trading/technical-analysis.agent";
import { positionSizingAgent } from "../trading/position-sizing.agent";
import { tradeExecutionAgent } from "../trading/trade-execution.agent";
import { createTradingChain } from "../chains/trading-chain";
import { AgentResult } from "../types/agent.types";

export interface WorkflowResult {
  success: boolean;
  decision: "EXECUTED" | "REJECTED" | "HELD";
  tradeId?: string;
  reasoning: string;
  agentResults: {
    balance: any;
    portfolioSync: any;
    riskAssessment: any;
    technicalAnalysis: any;
    positionSizing: any;
    tradingDecision: any;
    execution?: any;
  };
  performance: {
    totalTime: number;
    agentTimes: Record<string, number>;
  };
  errors: string[];
}

export class FullTradeWorkflow {
  private initialized: boolean = false;
  private tradingChain = createTradingChain();

  constructor() {
    // Initialize workflow
  }

  async initialize(): Promise<void> {
    try {
      console.log("🚀 Initializing Full Trade Workflow...");

      // Initialize all agents
      await Promise.all([
        agentIntegration.initialize(),
        riskAssessmentAgent.initialize(),
        technicalAnalysisAgent.initialize(),
        positionSizingAgent.initialize(),
        tradeExecutionAgent.initialize(),
        this.tradingChain.initialize(),
      ]);

      this.initialized = true;
      console.log("✅ Full Trade Workflow initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Full Trade Workflow:", error);
      throw error;
    }
  }

  /**
   * Execute complete trading workflow
   */
  async executeTradeWorkflow(
    marketSignal: {
      symbol: string;
      confidence: number;
      timeframe: string;
      prices: number[];
      volumes?: number[];
    },
    tradingContext: {
      botId: string;
      accountId: string;
      marketConditions?: string;
    }
  ): Promise<WorkflowResult> {
    const startTime = Date.now();
    const agentTimes: Record<string, number> = {};
    const errors: string[] = [];

    try {
      if (!this.initialized) {
        await this.initialize();
      }

      console.log(`🚀 Starting full trade workflow for ${marketSignal.symbol}`);
      console.log(`📊 Signal confidence: ${marketSignal.confidence}%`);

      // Step 1: Get real account balance and sync portfolio
      console.log("\n1️⃣ STEP 1: Account Balance & Portfolio Sync");
      const balanceStart = Date.now();

      const [balanceResult, syncResult] = await Promise.all([agentIntegration.getRealAccountBalance(), agentIntegration.syncAndCleanPositions(marketSignal.symbol)]);

      agentTimes.balance = Date.now() - balanceStart;

      console.log(`💰 Real balance: $${balanceResult}`);
      console.log(`🔄 Portfolio sync: ${syncResult.cleaned} phantom trades cleaned`);

      // Step 2: Technical Analysis
      console.log("\n2️⃣ STEP 2: Technical Analysis");
      const technicalStart = Date.now();

      const technicalResult = await technicalAnalysisAgent.analyzeMarket({
        symbol: marketSignal.symbol,
        prices: marketSignal.prices,
        volumes: marketSignal.volumes,
        timeframe: marketSignal.timeframe,
      });

      agentTimes.technical = Date.now() - technicalStart;

      if (!technicalResult.success) {
        errors.push(`Technical analysis failed: ${technicalResult.error}`);
      }

      console.log(`📊 Technical signal: ${technicalResult.data?.signal} (${technicalResult.data?.confidence}% confidence)`);

      // Step 3: Risk Assessment
      console.log("\n3️⃣ STEP 3: Risk Assessment");
      const riskStart = Date.now();

      const currentPositions = await agentIntegration.getAccuratePositionCount(marketSignal.symbol);

      const riskResult = await riskAssessmentAgent.assessTradeRisk(
        {
          symbol: marketSignal.symbol,
          direction: technicalResult.data?.signal === "BUY" ? "BUY" : "SELL",
          amount: balanceResult * 0.02, // 2% risk
          confidence: marketSignal.confidence,
        },
        {
          balance: balanceResult,
          positions: [{ symbol: marketSignal.symbol, count: currentPositions }],
          marketConditions: tradingContext.marketConditions || "normal",
        }
      );

      agentTimes.risk = Date.now() - riskStart;

      if (!riskResult.success) {
        errors.push(`Risk assessment failed: ${riskResult.error}`);
      }

      console.log(`🛡️ Risk assessment: ${riskResult.data?.recommendation} (Score: ${riskResult.data?.riskScore}/10)`);

      // Step 4: Position Sizing
      console.log("\n4️⃣ STEP 4: Position Sizing");
      const sizingStart = Date.now();

      const currentPrice = marketSignal.prices[marketSignal.prices.length - 1];
      const stopLossPrice = currentPrice * (technicalResult.data?.signal === "BUY" ? 0.98 : 1.02);

      const sizingResult = await positionSizingAgent.calculatePositionSize(
        {
          symbol: marketSignal.symbol,
          direction: technicalResult.data?.signal === "BUY" ? "BUY" : "SELL",
          entryPrice: currentPrice,
          stopLossPrice,
          confidence: marketSignal.confidence,
        },
        {
          balance: balanceResult,
          availableBalance: balanceResult * 0.95,
          currency: "USD",
        }
      );

      agentTimes.sizing = Date.now() - sizingStart;

      if (!sizingResult.success) {
        errors.push(`Position sizing failed: ${sizingResult.error}`);
      }

      console.log(`📏 Position size: ${sizingResult.data?.recommendedSize} units (${sizingResult.data?.riskPercentage}% risk)`);

      // Step 5: Trading Decision (LangChain Chain)
      console.log("\n5️⃣ STEP 5: Final Trading Decision");
      const decisionStart = Date.now();

      const tradingDecision = await this.tradingChain.makeTradingDecision(
        {
          symbol: marketSignal.symbol,
          currentPrice,
          marketConditions: tradingContext.marketConditions || "normal",
        },
        {
          riskAssessment: riskResult.data,
          technicalAnalysis: technicalResult.data,
          positionSizing: sizingResult.data,
          portfolioStatus: { positions: currentPositions, balance: balanceResult },
        },
        {
          balance: balanceResult,
          availableBalance: balanceResult * 0.95,
        }
      );

      agentTimes.decision = Date.now() - decisionStart;

      if (!tradingDecision.success) {
        errors.push(`Trading decision failed: ${tradingDecision.error}`);
      }

      console.log(`🤖 Trading decision: ${tradingDecision.data?.decision} (${tradingDecision.data?.confidence}% confidence)`);

      // ⚡⚡⚡ SPECIAL TRADE EXECUTION ALERT - WORKFLOW LEVEL ⚡⚡⚡
      if (tradingDecision.data?.decision === "EXECUTE_TRADE") {
        console.log("💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥");
        console.log("💥                                                                  💥");
        console.log("💥      🚀 TRADE SIGNAL CONFIRMED! PROCEEDING TO EXECUTION! 🚀     💥");
        console.log("💥                                                                  💥");
        console.log(
          `💥      📈 ${tradingDecision.data.tradeParams?.symbol || "N/A"} ${tradingDecision.data.tradeParams?.direction || "N/A"}                                       💥`
        );
        console.log(`💥      📊 Size: ${tradingDecision.data.tradeParams?.quantity || "N/A"}                                    💥`);
        console.log(`💥      ✅ Confidence: ${tradingDecision.data?.confidence || 0}%                                 💥`);
        console.log("💥                                                                  💥");
        console.log("💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥");
      }

      // Step 6: Trade Execution (if approved)
      let executionResult: any = null;

      if (tradingDecision.data?.decision === "EXECUTE_TRADE") {
        console.log("\n6️⃣ STEP 6: Trade Execution");
        const executionStart = Date.now();

        executionResult = await tradeExecutionAgent.executeTrade(
          {
            symbol: marketSignal.symbol,
            direction: tradingDecision.data.tradeParams?.direction || "BUY",
            quantity: tradingDecision.data.tradeParams?.quantity || sizingResult.data?.recommendedSize || 0.001,
            orderType: "MARKET",
          },
          {
            accountId: tradingContext.accountId,
            riskAssessment: riskResult.data,
            technicalSignal: technicalResult.data,
            urgency: "MEDIUM",
          }
        );

        agentTimes.execution = Date.now() - executionStart;

        if (!executionResult.success) {
          errors.push(`Trade execution failed: ${executionResult.error}`);
        }

        console.log(`⚡ Execution result: ${executionResult.data?.status} - ${executionResult.data?.reasoning}`);
      }

      // Compile workflow result
      const totalTime = Date.now() - startTime;

      const workflowResult: WorkflowResult = {
        success: errors.length === 0 && (tradingDecision.data?.decision !== "EXECUTE_TRADE" || executionResult?.success),
        decision: this.mapDecisionToResult(tradingDecision.data?.decision, executionResult?.data?.status),
        tradeId: executionResult?.data?.orderId,
        reasoning: this.compileReasoning(tradingDecision.data, riskResult.data, technicalResult.data),
        agentResults: {
          balance: { amount: balanceResult },
          portfolioSync: syncResult,
          riskAssessment: riskResult.data,
          technicalAnalysis: technicalResult.data,
          positionSizing: sizingResult.data,
          tradingDecision: tradingDecision.data,
          execution: executionResult?.data,
        },
        performance: {
          totalTime,
          agentTimes,
        },
        errors,
      };

      console.log(`\n🎉 WORKFLOW COMPLETE: ${workflowResult.decision} in ${totalTime}ms`);

      return workflowResult;
    } catch (error) {
      console.error("❌ Workflow execution failed:", error);

      return {
        success: false,
        decision: "REJECTED",
        reasoning: `Workflow error: ${(error as Error).message}`,
        agentResults: {
          balance: null,
          portfolioSync: null,
          riskAssessment: null,
          technicalAnalysis: null,
          positionSizing: null,
          tradingDecision: null,
        },
        performance: {
          totalTime: Date.now() - startTime,
          agentTimes,
        },
        errors: [...errors, (error as Error).message],
      };
    }
  }

  /**
   * Quick workflow for urgent decisions
   */
  async executeQuickWorkflow(
    symbol: string,
    prices: number[],
    confidence: number
  ): Promise<{
    decision: "EXECUTE" | "HOLD" | "REJECT";
    reasoning: string;
    executionTime: number;
  }> {
    const startTime = Date.now();

    try {
      console.log(`⚡ Quick workflow for ${symbol}`);

      // Get essential data quickly
      const [balance, positionCount] = await Promise.all([agentIntegration.getRealAccountBalance(), agentIntegration.getAccuratePositionCount(symbol)]);

      // Quick technical analysis
      const quickSignal = await technicalAnalysisAgent.getQuickSignal(prices);

      // Quick risk check
      const riskCheck = await riskAssessmentAgent.quickRiskCheck(
        balance * 0.02, // 2% risk
        balance,
        positionCount
      );

      // Quick decision
      const decision = await this.tradingChain.makeQuickDecision(quickSignal, riskCheck.riskScore, confidence);

      return {
        decision: decision.decision === "EXECUTE_TRADE" ? "EXECUTE" : decision.decision === "HOLD" ? "HOLD" : "REJECT",
        reasoning: decision.reasoning,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        decision: "REJECT",
        reasoning: `Quick workflow error: ${(error as Error).message}`,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get workflow health status
   */
  async getWorkflowHealth(): Promise<{
    status: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
    agentStatus: Record<string, string>;
    lastExecution?: Date;
    averageExecutionTime: number;
  }> {
    try {
      const agentHealth = await agentIntegration.healthCheck();

      return {
        status: agentHealth.overall === "operational" ? "HEALTHY" : "DEGRADED",
        agentStatus: {
          balance: agentHealth.accountBalance.status,
          portfolioSync: agentHealth.portfolioSync.status,
          risk: "healthy", // Would check actual agent status
          technical: "healthy",
          sizing: "healthy",
          execution: "healthy",
        },
        averageExecutionTime: 5000, // 5 seconds average
      };
    } catch (error) {
      return {
        status: "UNHEALTHY",
        agentStatus: {},
        averageExecutionTime: 0,
      };
    }
  }

  /**
   * Private helper methods
   */
  private mapDecisionToResult(decision: string, executionStatus?: string): "EXECUTED" | "REJECTED" | "HELD" {
    if (decision === "EXECUTE_TRADE") {
      return executionStatus === "FILLED" ? "EXECUTED" : "REJECTED";
    } else if (decision === "REJECT") {
      return "REJECTED";
    } else {
      return "HELD";
    }
  }

  private compileReasoning(tradingDecision: any, riskAssessment: any, technicalAnalysis: any): string {
    const parts = [];

    if (tradingDecision?.reasoning) {
      parts.push(`Decision: ${tradingDecision.reasoning}`);
    }

    if (riskAssessment?.reasoning) {
      parts.push(`Risk: ${riskAssessment.reasoning}`);
    }

    if (technicalAnalysis?.reasoning) {
      parts.push(`Technical: ${technicalAnalysis.reasoning}`);
    }

    return parts.join(" | ");
  }
}

// Export singleton instance
export const fullTradeWorkflow = new FullTradeWorkflow();
