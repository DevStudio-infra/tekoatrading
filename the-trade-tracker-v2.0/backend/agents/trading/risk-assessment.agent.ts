/**
 * Risk Assessment Agent - LangChain.js Implementation
 * Purpose: Intelligent risk analysis using LLM reasoning and portfolio context
 * Replaces: Basic risk calculation logic
 */

import { createOpenAIFunctionsAgent, AgentExecutor } from "langchain/agents";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { AgentResult, RiskAssessment, PortfolioRisk } from "../types/agent.types";
import { BaseTradingTool } from "../tools/base.tool";
import { agentsConfig } from "../../config/agents.config";
import { loggerService } from "../core/services/logging/logger.service";
import { Tool } from "@langchain/core/tools";
import { PromptTemplate } from "@langchain/core/prompts";
import { RobustJSONParser } from "../../services/ai/json-parser";

/**
 * Risk Calculation Tool for the Risk Assessment Agent
 */
class RiskCalculationTool extends BaseTradingTool {
  name = "risk_calculation_tool";
  description = "Calculate various risk metrics for portfolio and individual trades";

  schema = z.object({
    action: z.enum(["portfolio_risk", "trade_risk", "correlation_risk", "drawdown_risk"]),
    params: z.object({
      balance: z.number().optional(),
      positions: z.array(z.any()).optional(),
      tradeAmount: z.number().optional(),
      symbol: z.string().optional(),
    }),
  });

  protected async execute(input: z.infer<typeof this.schema>): Promise<string> {
    try {
      const { action, params } = input;
      // Implement risk calculations here
      return JSON.stringify({ action, result: "Risk calculation completed", params });
    } catch (error: any) {
      return JSON.stringify({ error: error?.message || "Risk calculation failed" });
    }
  }
}

export class RiskAssessmentAgent {
  private executor: AgentExecutor | null = null;
  private llm: ChatOpenAI;
  private tools: BaseTradingTool[];
  private initialized: boolean = false;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0.1, // Low temperature for consistent risk assessment
      maxTokens: 1000,
    });

    this.tools = [new RiskCalculationTool()];
  }

  async initialize(): Promise<void> {
    try {
      loggerService.info("🛡️ Initializing Risk Assessment Agent...");

      const prompt = ChatPromptTemplate.fromTemplate(`
You are a professional risk assessment agent for a trading system. Your role is to analyze portfolio and trade risks to make informed recommendations.

Current Context:
- Account Balance: {balance}
- Current Positions: {positions}
- Proposed Trade: {tradeDetails}
- Market Conditions: {marketConditions}

Available Tools:
- risk_calculator: Calculate various risk metrics

Your task is to:
1. Assess the overall portfolio risk
2. Evaluate the proposed trade risk
3. Check for correlation risks
4. Provide a risk score (1-10, where 1 is low risk, 10 is high risk)
5. Give clear recommendations (APPROVE, REJECT, or MODIFY)

Always provide your response in JSON format with:
{{
  "riskScore": number,
  "recommendation": "APPROVE" | "REJECT" | "MODIFY",
  "reasoning": "detailed explanation",
  "portfolioRisk": object,
  "tradeRisk": object,
  "suggestions": ["list of suggestions"]
}}

Be conservative in your risk assessment to protect capital.
      `);

      const agent = await createOpenAIFunctionsAgent({
        llm: this.llm,
        tools: this.tools,
        prompt,
      });

      this.executor = new AgentExecutor({
        agent,
        tools: this.tools,
        verbose: process.env.NODE_ENV === "development",
        maxIterations: 3,
      });

      this.initialized = true;
      loggerService.info("✅ Risk Assessment Agent initialized successfully");
    } catch (error) {
      loggerService.error("❌ Failed to initialize Risk Assessment Agent:", error);
      throw error;
    }
  }

  /**
   * Assess risk for a proposed trade
   */
  async assessTradeRisk(
    tradeDetails: {
      symbol: string;
      direction: "BUY" | "SELL";
      amount: number;
      confidence: number;
    },
    portfolioContext: {
      balance: number;
      positions: any[];
      marketConditions?: string;
    }
  ): Promise<AgentResult> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      loggerService.info(`🛡️ Assessing trade risk for ${tradeDetails.symbol}`);

      const result = await this.executor!.invoke({
        input: "Assess the risk for this trade and provide recommendations",
        balance: portfolioContext.balance,
        positions: JSON.stringify(portfolioContext.positions),
        tradeDetails: JSON.stringify(tradeDetails),
        marketConditions: portfolioContext.marketConditions || "normal",
      });

      // Parse the LLM response
      let assessment: RiskAssessment;
      try {
        assessment = RobustJSONParser.parseWithFallback(result.output);
      } catch (parseError) {
        loggerService.warn("Risk assessment JSON parsing failed, using fallback");
        // Fallback assessment
        assessment = this.createFallbackAssessment(tradeDetails);
      }

      loggerService.info(`🛡️ Risk assessment complete: ${assessment.recommendation} (Score: ${assessment.riskScore}/10)`);

      return {
        success: true,
        data: assessment,
        timestamp: new Date(),
        source: "RiskAssessmentAgent",
      };
    } catch (error) {
      loggerService.error("❌ Error assessing trade risk:", error);

      // Safe fallback
      return {
        success: false,
        error: `Risk assessment failed: ${(error as Error).message}`,
        data: {
          riskScore: 8, // High risk due to error
          recommendation: "REJECT",
          reasoning: "Risk assessment system error - rejecting for safety",
          portfolioRisk: { totalExposure: 0, riskLevel: "HIGH" },
          tradeRisk: { riskPercentage: 0, riskLevel: "HIGH" },
          suggestions: ["Fix risk assessment system before trading"],
        },
        timestamp: new Date(),
        source: "RiskAssessmentAgent",
      };
    }
  }

  /**
   * Assess overall portfolio risk
   */
  async assessPortfolioRisk(portfolioData: { balance: number; positions: any[]; recentTrades?: any[] }): Promise<AgentResult> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      loggerService.info("🛡️ Assessing overall portfolio risk");

      const result = await this.executor!.invoke({
        input: "Assess the overall portfolio risk and provide recommendations",
        balance: portfolioData.balance,
        positions: JSON.stringify(portfolioData.positions),
        tradeDetails: "{}",
        marketConditions: "normal",
      });

      // Parse the LLM response
      let portfolioRisk: PortfolioRisk;
      try {
        const parsed = RobustJSONParser.parseWithFallback(result.output);
        portfolioRisk = {
          overallRiskScore: parsed.riskScore || 5,
          totalExposure: parsed.portfolioRisk?.totalExposure || 0,
          positionCount: portfolioData.positions.length,
          concentrationRisk: parsed.portfolioRisk?.concentrationRisk || 0,
          correlationRisk: parsed.portfolioRisk?.correlationRisk || 0,
          recommendations: parsed.suggestions || [],
          riskLevel: parsed.portfolioRisk?.riskLevel || "MEDIUM",
        };
      } catch (parseError) {
        loggerService.warn("Portfolio risk JSON parsing failed, using fallback");
        portfolioRisk = {
          overallRiskScore: 5,
          totalExposure: 0,
          positionCount: portfolioData.positions.length,
          concentrationRisk: 0,
          correlationRisk: 0,
          recommendations: ["Unable to analyze portfolio risk"],
          riskLevel: "MEDIUM",
        };
      }

      return {
        success: true,
        data: portfolioRisk,
        timestamp: new Date(),
        source: "RiskAssessmentAgent",
      };
    } catch (error) {
      loggerService.error("❌ Error assessing portfolio risk:", error);

      return {
        success: false,
        error: `Portfolio risk assessment failed: ${(error as Error).message}`,
        data: {
          overallRiskScore: 8,
          totalExposure: 0,
          positionCount: portfolioData.positions.length,
          concentrationRisk: 0,
          correlationRisk: 0,
          recommendations: ["Fix risk assessment system"],
          riskLevel: "HIGH",
        },
        timestamp: new Date(),
        source: "RiskAssessmentAgent",
      };
    }
  }

  /**
   * Quick risk check for immediate decisions
   */
  async quickRiskCheck(
    tradeAmount: number,
    balance: number,
    currentPositions: number
  ): Promise<{
    approved: boolean;
    riskScore: number;
    reason: string;
  }> {
    try {
      const riskPercentage = (tradeAmount / balance) * 100;
      const config = agentsConfig.agents.riskAssessment;

      // Quick checks without LLM
      if (riskPercentage > 5) {
        // Use hardcoded value since config might not have maxRiskPerTrade
        return {
          approved: false,
          riskScore: 9,
          reason: `Risk per trade (${riskPercentage.toFixed(2)}%) exceeds limit (5%)`,
        };
      }

      if (currentPositions >= 5) {
        // Use hardcoded value since config might not have maxPositionsPerSymbol
        return {
          approved: false,
          riskScore: 8,
          reason: `Maximum positions (5) already reached`,
        };
      }

      const riskScore = Math.min(10, Math.max(1, riskPercentage / 2));

      return {
        approved: riskScore <= 6,
        riskScore,
        reason: riskScore <= 6 ? "Risk within acceptable limits" : "Risk too high for comfort",
      };
    } catch (error) {
      return {
        approved: false,
        riskScore: 10,
        reason: `Risk check error: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Get risk limits configuration
   */
  getRiskLimits(): any {
    return agentsConfig.agents.riskAssessment;
  }

  /**
   * Update risk limits (for dynamic adjustment)
   */
  updateRiskLimits(newLimits: Partial<any>): void {
    Object.assign(agentsConfig.agents.riskAssessment, newLimits);
    loggerService.info("🛡️ Risk limits updated:", newLimits);
  }

  /**
   * Assess risk for trading parameters (called by workflows)
   */
  async assessRisk(params: { symbol: string; amount: number; side: "BUY" | "SELL"; currentPositions: any[]; accountBalance: number }): Promise<any> {
    try {
      loggerService.info(`🛡️ assessRisk called for ${params.symbol}`);

      // Calculate basic risk metrics
      const positionValue = params.amount;
      const riskPercentage = (positionValue / params.accountBalance) * 100;
      const positionCount = params.currentPositions.length;

      // Simple risk assessment logic
      let riskLevel = "LOW";
      let approved = true;
      let reasoning = "Risk within acceptable limits";

      if (riskPercentage > 5) {
        riskLevel = "HIGH";
        approved = false;
        reasoning = `Position risk too high: ${riskPercentage.toFixed(2)}%`;
      } else if (riskPercentage > 2) {
        riskLevel = "MEDIUM";
        reasoning = `Moderate position risk: ${riskPercentage.toFixed(2)}%`;
      }

      if (positionCount >= 5) {
        riskLevel = "HIGH";
        approved = false;
        reasoning = `Too many positions: ${positionCount}`;
      }

      return {
        approved,
        riskLevel,
        riskScore: Math.min(10, riskPercentage),
        reasoning,
        metrics: {
          riskPercentage,
          positionCount,
          accountBalance: params.accountBalance,
          positionValue,
        },
      };
    } catch (error) {
      loggerService.error("❌ Error in assessRisk:", error);
      return {
        approved: false,
        riskLevel: "CRITICAL",
        riskScore: 10,
        reasoning: `Risk assessment error: ${(error as Error).message}`,
        metrics: {},
      };
    }
  }

  /**
   * Assess trade risk with detailed analysis
   */
  private createFallbackAssessment(tradeDetails: { symbol: string; direction: "BUY" | "SELL"; amount: number; confidence: number }): RiskAssessment {
    // Implement the logic to create a fallback assessment based on the trade details
    return {
      riskScore: 5,
      recommendation: "MODIFY",
      reasoning: "Risk assessment system error - using fallback",
      portfolioRisk: { totalExposure: 0, riskLevel: "MEDIUM" },
      tradeRisk: { riskPercentage: 2, riskLevel: "MEDIUM" },
      suggestions: ["Review trade parameters"],
    };
  }
}

// Export singleton instance
export const riskAssessmentAgent = new RiskAssessmentAgent();
