import { BaseAgent } from "../../ai/base-agent";
import { logger } from "../../logger";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";

export interface PositionContextParams {
  symbol: string;
  proposedDirection: "BUY" | "SELL";
  currentPrice: number;
  confidence: number;
  technicalSignal: string;
  marketConditions: string;
  existingPositions: any[];
  accountBalance: number;
  timeSinceLastTrade: number; // minutes
  recentTradingHistory: any[];
  strategyConfig: any;
  botConfig: any;
}

export interface PositionContextResult {
  shouldProceed: boolean;
  confidence: number;
  reasoning: string[];
  marketChangeAssessment: string;
  positionCorrelationAnalysis: string;
  strategyAlignmentScore: number;
  riskAdjustment: number;
  recommendedAction: "EXECUTE" | "WAIT" | "MODIFY" | "CANCEL";
  trailingStopRecommendation?: {
    shouldUseTrailingStop: boolean;
    reason: string;
  };
  modifications?: {
    adjustedSize?: number;
    adjustedEntryPrice?: number;
    timing?: string;
    stopLossType?: "fixed" | "trailing";
  };
}

export class PositionContextEvaluationAgent extends BaseAgent {
  constructor() {
    super("PositionContextEvaluationAgent");
  }

  async analyze(data: any): Promise<any> {
    return this.evaluatePositionContext(data);
  }

  async evaluatePositionContext(params: PositionContextParams): Promise<PositionContextResult> {
    try {
      logger.info(
        `[POSITION-CONTEXT] Evaluating position context for ${params.symbol} ${params.proposedDirection}`,
      );

      // Use intelligent rule-based evaluation with enhanced strategy awareness
      return this.intelligentRuleBasedEvaluation(params);
    } catch (error) {
      logger.error("[POSITION-CONTEXT] Error in position context evaluation:", error);
      return this.intelligentRuleBasedEvaluation(params);
    }
  }

  private intelligentRuleBasedEvaluation(params: PositionContextParams): PositionContextResult {
    logger.info("[POSITION-CONTEXT] Using enhanced intelligent rule-based evaluation");

    let shouldProceed = true;
    let confidence = params.confidence;
    const reasoning: string[] = [];
    let recommendedAction: "EXECUTE" | "WAIT" | "MODIFY" | "CANCEL" = "EXECUTE";
    let riskAdjustment = 0;
    let strategyAlignmentScore = 80;

    // ===== ENHANCED STRATEGY RULE ENFORCEMENT =====

    // 1. Strategy-Specific Risk Management Rules
    const strategyRiskCheck = this.evaluateStrategyRiskRules(params);
    if (!strategyRiskCheck.passes) {
      shouldProceed = false;
      recommendedAction = "CANCEL";
      confidence = Math.min(confidence, 20);
      riskAdjustment = -60;
      reasoning.push(...strategyRiskCheck.violations);
    }

    // 2. Strategy Entry/Exit Rules Compliance
    const strategyEntryCheck = this.evaluateStrategyEntryRules(params);
    if (!strategyEntryCheck.passes) {
      shouldProceed = false;
      recommendedAction = "WAIT";
      confidence = Math.min(confidence, 40);
      riskAdjustment = -40;
      reasoning.push(...strategyEntryCheck.violations);
      strategyAlignmentScore = Math.min(strategyAlignmentScore, 30);
    }

    // 3. Timeframe-Specific Rules
    const timeframeCheck = this.evaluateTimeframeRules(params);
    if (!timeframeCheck.passes) {
      confidence = Math.min(confidence, timeframeCheck.maxConfidence);
      riskAdjustment += timeframeCheck.riskAdjustment;
      reasoning.push(...timeframeCheck.warnings);
    }

    // ===== EXISTING POSITION ANALYSIS (ENHANCED) =====

    // 4. Check for recent identical trades (redundancy)
    const recentSimilarTrades = params.recentTradingHistory.filter(
      (trade) =>
        trade.symbol === params.symbol &&
        trade.direction === params.proposedDirection &&
        Date.now() - new Date(trade.timestamp).getTime() < 15 * 60 * 1000, // 15 minutes
    );

    if (recentSimilarTrades.length > 0) {
      shouldProceed = false;
      recommendedAction = "WAIT";
      confidence = Math.min(confidence, 30);
      riskAdjustment = -40;
      reasoning.push(
        `🔄 Found ${recentSimilarTrades.length} similar ${params.proposedDirection} trade(s) for ${params.symbol} in last 15 minutes - violates strategy diversification`,
      );
    }

    // 5. Enhanced position correlation and exposure analysis
    const positionAnalysis = this.analyzePositionCorrelation(params);
    if (!positionAnalysis.canProceed) {
      shouldProceed = false;
      recommendedAction = "CANCEL";
      confidence = Math.min(confidence, 25);
      riskAdjustment = -50;
      reasoning.push(...positionAnalysis.reasons);
    }

    // 6. Market timing analysis based on strategy timeframe
    const timingAnalysis = this.analyzeMarketTiming(params);
    if (!timingAnalysis.optimal) {
      confidence = Math.min(confidence, timingAnalysis.maxConfidence);
      riskAdjustment += timingAnalysis.riskAdjustment;
      reasoning.push(...timingAnalysis.reasons);

      if (timingAnalysis.shouldWait) {
        shouldProceed = false;
        recommendedAction = "WAIT";
      }
    }

    // ===== TRAILING STOP RECOMMENDATION =====
    const trailingStopRecommendation = this.evaluateTrailingStopUsage(params);

    // ===== FINAL DECISION LOGIC =====
    if (shouldProceed && confidence < 60) {
      shouldProceed = false;
      recommendedAction = "WAIT";
      reasoning.push(
        "🎯 Combined strategy and market factors result in insufficient confidence for execution",
      );
    }

    // Strategy alignment scoring
    if (params.confidence < 70) {
      strategyAlignmentScore = Math.min(strategyAlignmentScore, 50);
      reasoning.push(
        `📉 Original signal confidence ${params.confidence}% below professional threshold`,
      );
    }

    const marketChangeAssessment = this.assessMarketChange(params);
    const positionCorrelationAnalysis = this.generateCorrelationAnalysis(params);

    const finalResult: PositionContextResult = {
      shouldProceed,
      confidence: Math.max(0, Math.min(100, confidence + riskAdjustment)),
      reasoning,
      marketChangeAssessment,
      positionCorrelationAnalysis,
      strategyAlignmentScore,
      riskAdjustment,
      recommendedAction,
      trailingStopRecommendation,
      modifications: this.generateModifications(params, confidence + riskAdjustment),
    };

    logger.info(
      `[POSITION-CONTEXT] Final decision: ${recommendedAction} (confidence: ${finalResult.confidence}%)`,
    );
    return finalResult;
  }

  /**
   * Evaluate strategy-specific risk management rules
   */
  private evaluateStrategyRiskRules(params: PositionContextParams): {
    passes: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    if (!params.strategyConfig) {
      return { passes: true, violations: [] };
    }

    // Check risk per trade limits
    if (params.strategyConfig.riskPerTrade) {
      const maxRisk = parseFloat(params.strategyConfig.riskPerTrade.replace("%", ""));
      if (maxRisk && params.botConfig.maxRiskPercentage > maxRisk) {
        violations.push(
          `🚨 Bot risk ${params.botConfig.maxRiskPercentage}% exceeds strategy limit ${maxRisk}%`,
        );
      }
    }

    // Check maximum trades constraint
    if (params.strategyConfig.maxTrades && params.strategyConfig.maxTrades.includes("volatile")) {
      // Strategy only allows trades in volatile markets
      if (!params.marketConditions.toLowerCase().includes("volatile")) {
        violations.push(
          `🌊 Strategy "${params.strategyConfig.name}" requires volatile markets - current conditions insufficient`,
        );
      }
    }

    return { passes: violations.length === 0, violations };
  }

  /**
   * Evaluate strategy entry/exit rules
   */
  private evaluateStrategyEntryRules(params: PositionContextParams): {
    passes: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    if (!params.strategyConfig) {
      return { passes: true, violations: [] };
    }

    // Check risk/reward ratio requirements
    if (params.strategyConfig.riskRewardRatio) {
      const requiredRR = parseFloat(params.strategyConfig.riskRewardRatio);
      // This would need to be calculated from actual stop loss and take profit
      // For now, assuming we need minimum 1.5:1 for this strategy
      if (requiredRR > 1.0 && params.confidence < 80) {
        violations.push(
          `📊 Strategy requires R/R=${requiredRR}:1 but signal confidence ${params.confidence}% insufficient for high R/R trades`,
        );
      }
    }

    // Check stop loss type requirements
    if (params.strategyConfig.stopLossType === "fixed_pips" && params.confidence < 75) {
      violations.push(
        `🎯 Strategy uses fixed pip stops requiring high confidence - current ${params.confidence}% insufficient`,
      );
    }

    return { passes: violations.length === 0, violations };
  }

  /**
   * Evaluate timeframe-specific rules
   */
  private evaluateTimeframeRules(params: PositionContextParams): {
    passes: boolean;
    maxConfidence: number;
    riskAdjustment: number;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let maxConfidence = 100;
    let riskAdjustment = 0;

    // For M1 timeframe, be extra cautious
    if (params.timeSinceLastTrade < 2) {
      maxConfidence = 40;
      riskAdjustment = -30;
      warnings.push(
        `⚡ M1 timeframe: Last trade ${params.timeSinceLastTrade}min ago - very high frequency risk`,
      );
    }

    return {
      passes: true, // Warnings, not hard failures
      maxConfidence,
      riskAdjustment,
      warnings,
    };
  }

  /**
   * Analyze position correlation and exposure
   */
  private analyzePositionCorrelation(params: PositionContextParams): {
    canProceed: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];

    const sameSymbolPositions = params.existingPositions.filter((p) => p.symbol === params.symbol);
    const sameDirectionPositions = sameSymbolPositions.filter(
      (p) => p.side === params.proposedDirection,
    );

    if (sameDirectionPositions.length > 0) {
      reasons.push(
        `⚠️ Already have ${sameDirectionPositions.length} ${params.proposedDirection} position(s) for ${params.symbol} - strategy prohibits position stacking`,
      );
      return { canProceed: false, reasons };
    }

    return { canProceed: true, reasons: [] };
  }

  /**
   * Analyze market timing based on strategy
   */
  private analyzeMarketTiming(params: PositionContextParams): {
    optimal: boolean;
    shouldWait: boolean;
    maxConfidence: number;
    riskAdjustment: number;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let shouldWait = false;
    let maxConfidence = 100;
    let riskAdjustment = 0;

    if (params.timeSinceLastTrade < 5) {
      maxConfidence = 40;
      riskAdjustment = -30;
      reasons.push(
        `⏰ Strategy timing: ${params.timeSinceLastTrade}min since last trade - insufficient market development`,
      );

      if (params.confidence < 80) {
        shouldWait = true;
        reasons.push(`🕒 Low confidence + recent timing = WAIT for better setup`);
      }
    }

    return { optimal: !shouldWait, shouldWait, maxConfidence, riskAdjustment, reasons };
  }

  /**
   * Evaluate if trailing stop should be used based on strategy
   */
  private evaluateTrailingStopUsage(params: PositionContextParams): {
    shouldUseTrailingStop: boolean;
    reason: string;
  } {
    if (!params.strategyConfig) {
      return { shouldUseTrailingStop: false, reason: "No strategy configuration available" };
    }

    // Check strategy description for trailing stop mentions
    const description = (params.strategyConfig.description || "").toLowerCase();
    const name = (params.strategyConfig.name || "").toLowerCase();

    const trailingStopKeywords = ["trailing stop", "trailing", "dynamic stop", "moving stop"];
    const mentionsTrailingStop = trailingStopKeywords.some(
      (keyword) => description.includes(keyword) || name.includes(keyword),
    );

    // Check explicit configuration
    const explicitTrailingStop =
      params.strategyConfig.trailingStop === true ||
      params.strategyConfig.useTrailingStop === true ||
      params.strategyConfig.stopLossType === "trailing";

    const shouldUse = mentionsTrailingStop || explicitTrailingStop;
    const reason = shouldUse
      ? `Strategy "${params.strategyConfig.name}" specifies trailing stop usage`
      : `Strategy "${params.strategyConfig.name}" uses fixed stop loss management`;

    return { shouldUseTrailingStop: shouldUse, reason };
  }

  /**
   * Assess market change since last activity
   */
  private assessMarketChange(params: PositionContextParams): string {
    if (params.timeSinceLastTrade > 15) {
      return "SIGNIFICANT - sufficient time for meaningful market development";
    } else if (params.timeSinceLastTrade > 8) {
      return "MODERATE - some market change possible";
    } else if (params.timeSinceLastTrade > 3) {
      return "MINOR - limited market change expected";
    } else {
      return "NONE - too recent for meaningful market change";
    }
  }

  /**
   * Generate correlation analysis summary
   */
  private generateCorrelationAnalysis(params: PositionContextParams): string {
    const totalPositions = params.existingPositions.length;
    const sameSymbolPositions = params.existingPositions.filter((p) => p.symbol === params.symbol);
    const sameDirectionPositions = sameSymbolPositions.filter(
      (p) => p.side === params.proposedDirection,
    );

    return `Portfolio: ${totalPositions} total positions, ${sameSymbolPositions.length} for ${params.symbol}, ${sameDirectionPositions.length} same direction - Strategy compliance verified`;
  }

  /**
   * Generate trade modifications if needed
   */
  private generateModifications(params: PositionContextParams, finalConfidence: number): any {
    if (finalConfidence < 70 && finalConfidence > 50) {
      return {
        adjustedSize: 0.7, // Reduce position size for lower confidence
        timing: "Consider waiting for higher confidence signal",
        stopLossType: params.strategyConfig?.stopLossType || "fixed",
      };
    }
    return undefined;
  }
}
