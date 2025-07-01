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

      // For now, implement rule-based logic until LLM integration is needed
      const decision = this.performRuleBasedTradeManagement(context);

      logger.info(
        `[TRADE-MGT] ${context.symbol} decision: ${decision.action} (${(decision.confidence * 100).toFixed(1)}% confidence)`,
      );

      return decision;
    } catch (error) {
      logger.error(`[TRADE-MGT] Trade management analysis failed:`, error);
      return this.getConservativeDecision(context);
    }
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
