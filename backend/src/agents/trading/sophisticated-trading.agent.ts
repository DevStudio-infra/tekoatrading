import { BaseAgent } from "../../ai/base-agent";
import { logger } from "../../logger";
import {
  TechnicalAnalysisAgent,
  TechnicalAnalysisResult,
  CandleData,
} from "../core/technical-analysis.agent";
import {
  SmartRiskManagementAgent,
  RiskCalculationParams,
  RiskLevels,
} from "../risk/smart-risk-management.agent";
import {
  PositionSizingAgent,
  PositionSizingParams,
  PositionSizingResult,
} from "./position-sizing.agent";

export interface SophisticatedTradeParams {
  symbol: string;
  direction: "BUY" | "SELL";
  currentPrice: number;
  candleData: CandleData[];
  timeframe: string;
  accountBalance: number;
  riskPercentage: number;
  botMaxPositionSize: number;
  strategy?: string;
}

export interface SophisticatedTradeResult {
  technicalAnalysis: TechnicalAnalysisResult;
  riskLevels: RiskLevels;
  positionSizing: PositionSizingResult;
  finalRecommendation: {
    shouldTrade: boolean;
    stopLoss: number;
    takeProfit: number;
    positionSize: number;
    confidence: number;
    reasoning: string[];
  };
}

export class SophisticatedTradingAgent extends BaseAgent {
  private technicalAnalysisAgent: TechnicalAnalysisAgent;
  private riskManagementAgent: SmartRiskManagementAgent;
  private positionSizingAgent: PositionSizingAgent;

  constructor() {
    super("SophisticatedTradingAgent");
    this.technicalAnalysisAgent = new TechnicalAnalysisAgent();
    this.riskManagementAgent = new SmartRiskManagementAgent();
    this.positionSizingAgent = new PositionSizingAgent();
  }

  async analyze(data: any): Promise<any> {
    return this.analyzeTrade(data);
  }

  async analyzeTrade(params: SophisticatedTradeParams): Promise<SophisticatedTradeResult> {
    try {
      logger.info(
        `[SOPHISTICATED] Starting comprehensive trade analysis for ${params.symbol} ${params.direction}`,
      );

      // Step 1: Technical Analysis
      const technicalAnalysis = await this.technicalAnalysisAgent.analyze({
        candleData: params.candleData,
        currentPrice: params.currentPrice,
        symbol: params.symbol,
      });

      // Step 2: Risk Management Calculation
      const riskParams: RiskCalculationParams = {
        symbol: params.symbol,
        direction: params.direction,
        currentPrice: params.currentPrice,
        timeframe: params.timeframe,
        technicalAnalysis,
        accountBalance: params.accountBalance,
        riskPercentage: params.riskPercentage,
        strategy: params.strategy,
      };

      const riskLevels = await this.riskManagementAgent.calculateRiskLevels(riskParams);

      // Step 3: Position Sizing
      const positionParams: PositionSizingParams = {
        symbol: params.symbol,
        accountBalance: params.accountBalance,
        baseRiskPercentage: params.riskPercentage,
        technicalAnalysis,
        riskLevels,
        botMaxPositionSize: params.botMaxPositionSize,
        currentPrice: params.currentPrice,
      };

      const positionSizing = await this.positionSizingAgent.calculatePositionSize(positionParams);

      // Step 4: Final Trade Recommendation
      const finalRecommendation = this.generateFinalRecommendation(
        technicalAnalysis,
        riskLevels,
        positionSizing,
        params,
      );

      const result: SophisticatedTradeResult = {
        technicalAnalysis,
        riskLevels,
        positionSizing,
        finalRecommendation,
      };

      logger.info(
        `[SOPHISTICATED] Complete analysis for ${params.symbol}: ${finalRecommendation.shouldTrade ? "TRADE APPROVED" : "TRADE REJECTED"}`,
      );

      return result;
    } catch (error) {
      logger.error(`[SOPHISTICATED] Trade analysis error for ${params.symbol}:`, error);
      throw error;
    }
  }

  private generateFinalRecommendation(
    technicalAnalysis: TechnicalAnalysisResult,
    riskLevels: RiskLevels,
    positionSizing: PositionSizingResult,
    params: SophisticatedTradeParams,
  ): {
    shouldTrade: boolean;
    stopLoss: number;
    takeProfit: number;
    positionSize: number;
    confidence: number;
    reasoning: string[];
  } {
    // Overall confidence calculation
    const overallConfidence =
      riskLevels.confidence * 0.4 +
      positionSizing.confidence * 0.3 +
      (technicalAnalysis.trend !== "NEUTRAL" ? 0.7 : 0.5) * 0.3;

    // Enhanced logging for debugging
    logger.info(
      `[SOPHISTICATED] Confidence breakdown: risk=${(riskLevels.confidence * 100).toFixed(1)}%, position=${(positionSizing.confidence * 100).toFixed(1)}%, technical=${technicalAnalysis.trend}, overall=${(overallConfidence * 100).toFixed(1)}%`,
    );
    logger.info(`[SOPHISTICATED] R/R ratio: ${riskLevels.riskRewardRatio.toFixed(2)}:1`);

    // Trade approval criteria - RELAXED FOR M1 SCALPING
    let shouldTrade = true;
    const rejectionReasons: string[] = [];

    // Lowered confidence threshold from 0.6 to 0.5 (60% to 50%)
    if (overallConfidence < 0.5) {
      shouldTrade = false;
      rejectionReasons.push(`Low confidence: ${(overallConfidence * 100).toFixed(1)}%`);
    }

    // Lowered R/R requirement from 1.2 to 0.8 for M1 scalping
    if (riskLevels.riskRewardRatio < 0.8) {
      shouldTrade = false;
      rejectionReasons.push(`Poor R/R: ${riskLevels.riskRewardRatio.toFixed(2)}:1`);
    }

    const reasoning: string[] = [];
    if (shouldTrade) {
      reasoning.push(`✅ Trade APPROVED with ${(overallConfidence * 100).toFixed(1)}% confidence`);
      reasoning.push(
        `📊 ${technicalAnalysis.trend} trend, R/R: ${riskLevels.riskRewardRatio.toFixed(2)}:1`,
      );
      logger.info(
        `[SOPHISTICATED] ✅ TRADE APPROVED: ${(overallConfidence * 100).toFixed(1)}% confidence, ${riskLevels.riskRewardRatio.toFixed(2)}:1 R/R`,
      );
    } else {
      reasoning.push(`❌ Trade REJECTED:`);
      reasoning.push(...rejectionReasons);
      logger.info(`[SOPHISTICATED] ❌ TRADE REJECTED: ${rejectionReasons.join(", ")}`);
    }

    return {
      shouldTrade,
      stopLoss: riskLevels.stopLoss,
      takeProfit: riskLevels.takeProfit,
      positionSize: positionSizing.finalPositionSize,
      confidence: overallConfidence,
      reasoning,
    };
  }
}
