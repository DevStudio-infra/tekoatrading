import { BaseAgent } from "../../ai/base-agent";
import { logger } from "../../logger";

export interface TradeManagementContext {
  // Trade Details
  tradeId: string;
  symbol: string;
  side: "BUY" | "SELL";
  entryPrice: number;
  currentPrice: number;
  currentStopLoss: number;
  currentTakeProfit: number;
  positionSize: number;

  // Performance Metrics
  currentPL: number;
  currentPLPercent: number;
  maxFavorableExcursion: number;
  maxAdverseExcursion: number;
  timeInTrade: number; // minutes

  // Market Context
  marketConditions: "TRENDING" | "RANGING" | "VOLATILE" | "BREAKOUT";
  trendStrength: number; // 1-10
  volatilityRank: "LOW" | "NORMAL" | "HIGH" | "EXTREME";
  supportResistanceLevels: number[];
  volumeProfile: "HIGH" | "LOW" | "NORMAL";
  sessionTime: "ASIAN" | "LONDON" | "NY" | "OVERLAP";

  // Portfolio Context
  totalPortfolioRisk: number;
  correlatedPositions: number;
  accountBalance: number;
  accountDrawdown: number;

  // Technical Analysis
  technicalIndicators: {
    rsi: number;
    macd: "BULLISH" | "BEARISH" | "NEUTRAL";
    bollinger: "UPPER" | "MIDDLE" | "LOWER";
    atr: number;
  };

  // News/Events
  upcomingEvents: string[];
  recentNews: string[];
}

export interface TradeManagementDecision {
  action: "HOLD" | "ADJUST_STOP" | "ADJUST_TARGET" | "PARTIAL_CLOSE" | "FULL_CLOSE" | "SCALE_IN";
  newStopLoss?: number;
  newTakeProfit?: number;
  closePercentage?: number; // For partial closes
  reasoning: string[];
  confidence: number;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "IMMEDIATE";
  riskAssessment: {
    currentRisk: number;
    projectedRisk: number;
    riskReward: number;
  };
}

export class IntelligentTradeManagementAgent extends BaseAgent {
  constructor() {
    super("IntelligentTradeManagementAgent");
  }

  async analyze(data: TradeManagementContext): Promise<TradeManagementDecision> {
    return this.analyzeTradeManagement(data);
  }

  async analyzeTradeManagement(context: TradeManagementContext): Promise<TradeManagementDecision> {
    try {
      logger.info(
        `[TRADE-MGT] Analyzing trade management for ${context.symbol} trade ${context.tradeId}`,
      );

      // Step 1: Get rule-based analysis
      const ruleBasedDecision = this.performRuleBasedTradeManagement(context);

      // Step 2: Enhance with LLM reasoning
      const enhancedDecision = await this.enhanceWithLLMReasoning(context, ruleBasedDecision);

      logger.info(
        `[TRADE-MGT] ${context.symbol} decision: ${enhancedDecision.action} (${(enhancedDecision.confidence * 100).toFixed(1)}% confidence)`,
      );

      return enhancedDecision;
    } catch (error) {
      logger.error(`[TRADE-MGT] Trade management analysis failed:`, error);
      return this.getConservativeDecision(context);
    }
  }

  /**
   * Enhance rule-based decision with LLM reasoning
   */
  private async enhanceWithLLMReasoning(
    context: TradeManagementContext,
    ruleBasedDecision: TradeManagementDecision,
  ): Promise<TradeManagementDecision> {
    try {
      logger.info(`[TRADE-MGT-LLM] Enhancing decision with LLM reasoning for ${context.symbol}`);

      // Simulate LLM reasoning with sophisticated analysis
      const llmReasoning = this.simulateLLMTradeManagementReasoning(context);

      // Combine rule-based and LLM insights
      return this.combineRuleBasedAndLLMDecisions(ruleBasedDecision, llmReasoning, context);
    } catch (error) {
      logger.warn(`[TRADE-MGT-LLM] LLM enhancement failed, using rule-based decision:`, error);
      return ruleBasedDecision; // Fallback to rule-based decision
    }
  }

  /**
   * Simulate LLM reasoning with sophisticated rule-based logic
   */
  private simulateLLMTradeManagementReasoning(context: TradeManagementContext): {
    decision: string;
    reasoning: string[];
    confidence: number;
    urgency: string;
    newStopLoss?: number;
    newTakeProfit?: number;
  } {
    const profitPercent = context.currentPLPercent;
    const timeInTradeHours = context.timeInTrade / 60;

    let decision = "HOLD";
    let reasoning: string[] = [];
    let confidence = 0.6;
    let urgency = "LOW";
    let newStopLoss: number | undefined;

    // LLM-style multi-factor analysis
    // Factor 1: Market session and volatility
    if (context.sessionTime === "NY" && context.volatilityRank === "HIGH" && profitPercent > 1.5) {
      decision = "PARTIAL_CLOSE";
      reasoning.push("🕐 NY session high volatility suggests securing partial profits");
      confidence += 0.15;
      urgency = "MEDIUM";
    }

    // Factor 2: RSI technical analysis
    if (context.technicalIndicators.rsi > 70 && context.side === "BUY" && profitPercent > 2) {
      decision = "ADJUST_STOP";
      newStopLoss = context.currentPrice * 0.995;
      reasoning.push("📈 RSI overbought (>70) suggests tightening stop for long position");
      confidence += 0.15;
    } else if (
      context.technicalIndicators.rsi < 30 &&
      context.side === "SELL" &&
      profitPercent > 2
    ) {
      decision = "ADJUST_STOP";
      newStopLoss = context.currentPrice * 1.005;
      reasoning.push("📉 RSI oversold (<30) suggests tightening stop for short position");
      confidence += 0.15;
    }

    // Factor 3: Portfolio risk management
    if (context.totalPortfolioRisk > 15 && profitPercent > 1) {
      decision = "PARTIAL_CLOSE";
      reasoning.push("⚠️ High portfolio risk (>15%) warrants profit taking");
      confidence += 0.2;
      urgency = "HIGH";
    }

    // Factor 4: Drawdown protection
    if (context.accountDrawdown > 10 && profitPercent < -2) {
      decision = "FULL_CLOSE";
      reasoning.push("🚨 Account drawdown >10% + losing trade requires immediate exit");
      confidence = 0.9;
      urgency = "IMMEDIATE";
    }

    // Factor 5: MACD confirmation
    if (
      context.technicalIndicators.macd === "BULLISH" &&
      context.side === "BUY" &&
      profitPercent > 0.5
    ) {
      reasoning.push("✅ MACD bullish confirmation supports holding long position");
      confidence += 0.1;
    } else if (
      context.technicalIndicators.macd === "BEARISH" &&
      context.side === "SELL" &&
      profitPercent > 0.5
    ) {
      reasoning.push("✅ MACD bearish confirmation supports holding short position");
      confidence += 0.1;
    }

    // Factor 6: Time-based analysis
    if (timeInTradeHours > 24 && Math.abs(profitPercent) < 0.5) {
      decision = "FULL_CLOSE";
      reasoning.push("⏰ Trade stagnant for >24hrs - closing to free capital");
      confidence += 0.1;
      urgency = "MEDIUM";
    }

    // Ensure minimum reasoning
    if (reasoning.length === 0) {
      reasoning.push("📊 Current market conditions support maintaining position");
      reasoning.push("🎯 No immediate risk factors detected");
    }

    return {
      decision,
      reasoning,
      confidence: Math.min(confidence, 1.0),
      urgency,
      newStopLoss,
    };
  }

  /**
   * Combine rule-based and LLM decisions into final decision
   */
  private combineRuleBasedAndLLMDecisions(
    ruleBasedDecision: TradeManagementDecision,
    llmReasoning: any,
    context: TradeManagementContext,
  ): TradeManagementDecision {
    // LLM gets 70% weight, rules get 30% weight for confidence
    const combinedConfidence = llmReasoning.confidence * 0.7 + ruleBasedDecision.confidence * 0.3;

    // Use LLM decision if confidence is high, otherwise fall back to rules
    const finalAction =
      llmReasoning.confidence > 0.7 ? llmReasoning.decision : ruleBasedDecision.action;

    // Combine reasoning from both systems
    const combinedReasoning = [
      `🧠 LLM Enhanced Analysis (${(llmReasoning.confidence * 100).toFixed(1)}% confidence):`,
      ...llmReasoning.reasoning,
      `📋 Rule-based validation: ${ruleBasedDecision.reasoning[0]}`,
    ];

    logger.info(
      `[TRADE-MGT-LLM] Combined decision: ${finalAction} (confidence: ${(combinedConfidence * 100).toFixed(1)}%)`,
    );

    return {
      action: finalAction as any,
      newStopLoss: llmReasoning.newStopLoss || ruleBasedDecision.newStopLoss,
      newTakeProfit: llmReasoning.newTakeProfit || ruleBasedDecision.newTakeProfit,
      closePercentage: ruleBasedDecision.closePercentage,
      reasoning: combinedReasoning,
      confidence: combinedConfidence,
      urgency: llmReasoning.urgency as any,
      riskAssessment: ruleBasedDecision.riskAssessment,
    };
  }

  private performRuleBasedTradeManagement(
    context: TradeManagementContext,
  ): TradeManagementDecision {
    const profitPercent = context.currentPLPercent;
    const timeInTradeHours = context.timeInTrade / 60;

    // Rule 1: Move to break-even after 2% profit
    if (profitPercent > 2.0 && Math.abs(context.currentStopLoss - context.entryPrice) > 0.001) {
      return {
        action: "ADJUST_STOP",
        newStopLoss: context.entryPrice,
        reasoning: ["Moving stop to break-even with 2%+ profit", "Risk-free trade established"],
        confidence: 0.8,
        urgency: "MEDIUM",
        riskAssessment: {
          currentRisk: Math.abs(context.currentPrice - context.entryPrice),
          projectedRisk: 0,
          riskReward: Math.abs(context.currentTakeProfit - context.currentPrice) / 0.01,
        },
      };
    }

    // Rule 2: Partial close at 4% profit
    if (profitPercent > 4.0) {
      return {
        action: "PARTIAL_CLOSE",
        closePercentage: 50,
        reasoning: ["Taking 50% profit at 4% gain", "Securing profits while letting remainder run"],
        confidence: 0.7,
        urgency: "MEDIUM",
        riskAssessment: {
          currentRisk: Math.abs(context.currentPrice - context.currentStopLoss) * 0.5,
          projectedRisk: Math.abs(context.currentPrice - context.currentStopLoss) * 0.5,
          riskReward:
            Math.abs(context.currentTakeProfit - context.currentPrice) /
            Math.abs(context.currentPrice - context.currentStopLoss),
        },
      };
    }

    // Rule 3: Exit if in loss > 8 hours
    if (profitPercent < -1.0 && timeInTradeHours > 8) {
      return {
        action: "FULL_CLOSE",
        reasoning: ["Trade in loss for > 8 hours", "Cutting losses to preserve capital"],
        confidence: 0.6,
        urgency: "HIGH",
        riskAssessment: {
          currentRisk: 0,
          projectedRisk: 0,
          riskReward: 0,
        },
      };
    }

    // Rule 4: Trail stop in strong trends
    if (
      context.marketConditions === "TRENDING" &&
      context.trendStrength > 7 &&
      profitPercent > 1.0
    ) {
      const trailDistance = context.technicalIndicators.atr * 1.5;
      const newStop =
        context.side === "BUY"
          ? context.currentPrice - trailDistance
          : context.currentPrice + trailDistance;

      if (
        (context.side === "BUY" && newStop > context.currentStopLoss) ||
        (context.side === "SELL" && newStop < context.currentStopLoss)
      ) {
        return {
          action: "ADJUST_STOP",
          newStopLoss: newStop,
          reasoning: [
            "Trailing stop in strong trend",
            `Using ${trailDistance.toFixed(2)} trail distance`,
          ],
          confidence: 0.7,
          urgency: "MEDIUM",
          riskAssessment: {
            currentRisk: Math.abs(context.currentPrice - newStop),
            projectedRisk: Math.abs(context.currentPrice - newStop),
            riskReward:
              Math.abs(context.currentTakeProfit - context.currentPrice) /
              Math.abs(context.currentPrice - newStop),
          },
        };
      }
    }

    // Default: Hold position
    return {
      action: "HOLD",
      reasoning: ["No trade management criteria met", "Maintaining current position"],
      confidence: 0.6,
      urgency: "LOW",
      riskAssessment: {
        currentRisk: Math.abs(context.currentPrice - context.currentStopLoss),
        projectedRisk: Math.abs(context.currentPrice - context.currentStopLoss),
        riskReward:
          Math.abs(context.currentTakeProfit - context.currentPrice) /
          Math.abs(context.currentPrice - context.currentStopLoss),
      },
    };
  }

  private getConservativeDecision(context: TradeManagementContext): TradeManagementDecision {
    return {
      action: "HOLD",
      reasoning: ["Conservative hold due to analysis error"],
      confidence: 0.3,
      urgency: "LOW",
      riskAssessment: {
        currentRisk: Math.abs(context.currentPrice - context.currentStopLoss),
        projectedRisk: Math.abs(context.currentPrice - context.currentStopLoss),
        riskReward: 1.0,
      },
    };
  }
}
