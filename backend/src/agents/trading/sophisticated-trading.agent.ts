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
  ProfessionalPositionSizingAgent,
  ProfessionalPositionSizingParams,
  ProfessionalPositionSizingResult,
} from "./professional-position-sizing.agent";

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
  positionSizing: ProfessionalPositionSizingResult;
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
  private professionalPositionSizingAgent: ProfessionalPositionSizingAgent;

  constructor() {
    super("SophisticatedTradingAgent");
    this.technicalAnalysisAgent = new TechnicalAnalysisAgent();
    this.riskManagementAgent = new SmartRiskManagementAgent();
    this.professionalPositionSizingAgent = new ProfessionalPositionSizingAgent();
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
      const technicalAnalysis = await this.technicalAnalysisAgent.analyzeTechnical(
        params.candleData,
        params.currentPrice,
        params.symbol,
      );

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

      // Step 3: Professional Position Sizing
      const professionalPositionParams: ProfessionalPositionSizingParams = {
        symbol: params.symbol,
        accountBalance: params.accountBalance,
        availableBalance: params.accountBalance * 0.9, // Assume 90% available
        currentPrice: params.currentPrice,
        baseRiskPercentage: params.riskPercentage,
        technicalAnalysis,
        riskLevels,
        botMaxPositionSize: params.botMaxPositionSize,

        // Professional factors
        currentDrawdown: 0, // TODO: Calculate from portfolio
        openPositionsCount: 0, // TODO: Get from portfolio context
        totalPortfolioRisk: 0, // TODO: Calculate total risk
        marketCondition:
          technicalAnalysis.priceAction?.volatilityRank === "HIGH" ? "VOLATILE" : "STABLE",
        timeOfDay: "NEW_YORK", // TODO: Determine based on time
        signalConfidence: riskLevels.confidence,

        // Portfolio context
        correlatedPositions: 0, // TODO: Calculate correlations
        maxPortfolioAllocation: 5.0, // 5% max allocation per asset
      };

      const positionSizing =
        await this.professionalPositionSizingAgent.calculateProfessionalPositionSize(
          professionalPositionParams,
        );

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
    positionSizing: ProfessionalPositionSizingResult,
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

    // Trade approval criteria
    let shouldTrade = true;
    const rejectionReasons: string[] = [];

    if (overallConfidence < 0.6) {
      shouldTrade = false;
      rejectionReasons.push(`Low confidence: ${(overallConfidence * 100).toFixed(1)}%`);
    }

    if (riskLevels.riskRewardRatio < 1.2) {
      shouldTrade = false;
      rejectionReasons.push(`Poor R/R: ${riskLevels.riskRewardRatio.toFixed(2)}:1`);
    }

    const reasoning: string[] = [];
    if (shouldTrade) {
      reasoning.push(`✅ Trade APPROVED with ${(overallConfidence * 100).toFixed(1)}% confidence`);
      reasoning.push(
        `📊 ${technicalAnalysis.trend} trend, R/R: ${riskLevels.riskRewardRatio.toFixed(2)}:1`,
      );
    } else {
      reasoning.push(`❌ Trade REJECTED:`);
      reasoning.push(...rejectionReasons);
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
