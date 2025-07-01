import { BaseAgent } from "../../ai/base-agent";
import { logger } from "../../logger";
import { TechnicalAnalysisResult } from "../core/technical-analysis.agent";
import { RiskLevels } from "../risk/smart-risk-management.agent";

export interface ProfessionalPositionSizingParams {
  symbol: string;
  accountBalance: number;
  availableBalance: number;
  currentPrice: number;
  baseRiskPercentage: number;
  technicalAnalysis: TechnicalAnalysisResult;
  riskLevels: RiskLevels;
  botMaxPositionSize: number;

  // Professional factors
  currentDrawdown: number; // % account drawdown
  openPositionsCount: number;
  totalPortfolioRisk: number; // % of account already at risk
  marketCondition: "VOLATILE" | "STABLE" | "TRENDING";
  timeOfDay: "ASIAN" | "LONDON" | "NEW_YORK" | "OVERLAP";
  signalConfidence: number; // 0-1

  // Portfolio context
  correlatedPositions: number; // count of similar positions
  maxPortfolioAllocation: number; // % max allocation to this asset
}

export interface ProfessionalPositionSizingResult {
  finalPositionSize: number; // in asset units (e.g., BTC)
  finalPositionValue: number; // in USD
  percentageOfAccount: number;
  riskAmount: number;
  reasoning: string[];
  confidence: number;
  adjustmentFactors: {
    signalQuality: number;
    portfolioRisk: number;
    marketCondition: number;
    drawdown: number;
    correlation: number;
  };
  warnings: string[];
}

export class ProfessionalPositionSizingAgent extends BaseAgent {
  constructor() {
    super("ProfessionalPositionSizingAgent");
  }

  async analyze(data: any): Promise<any> {
    return this.calculateProfessionalPositionSize(data);
  }

  async calculateProfessionalPositionSize(
    params: ProfessionalPositionSizingParams,
  ): Promise<ProfessionalPositionSizingResult> {
    try {
      logger.info(`[PROF-POSITION] Starting professional position sizing for ${params.symbol}`);
      logger.info(
        `[PROF-POSITION] Account: $${params.accountBalance}, Price: $${params.currentPrice}, Signal Confidence: ${(params.signalConfidence * 100).toFixed(1)}%`,
      );

      // Apply professional position sizing logic
      const result = this.calculateProfessionalPosition(params);

      logger.info(
        `[PROF-POSITION] ${params.symbol} professional sizing complete: ${result.finalPositionSize.toFixed(6)} units ($${result.finalPositionValue.toFixed(2)})`,
      );

      return result;
    } catch (error) {
      logger.error(`[PROF-POSITION] Professional position sizing error:`, error);
      return this.getConservativeFallback(params);
    }
  }

  private calculateProfessionalPosition(
    params: ProfessionalPositionSizingParams,
  ): ProfessionalPositionSizingResult {
    const warnings: string[] = [];

    // Step 1: Calculate base risk amount (start conservative)
    let baseRiskPercent = Math.min(params.baseRiskPercentage / 100, 0.02); // Max 2%

    // Step 2: Apply professional adjustments
    const adjustmentFactors = this.calculateAdjustmentFactors(params);

    // Step 3: Adjust risk based on factors
    const adjustedRiskPercent =
      baseRiskPercent *
      adjustmentFactors.signalQuality *
      adjustmentFactors.portfolioRisk *
      adjustmentFactors.marketCondition *
      adjustmentFactors.drawdown *
      adjustmentFactors.correlation;

    const riskAmount = params.accountBalance * adjustedRiskPercent;

    // Step 4: Calculate position size based on stop loss
    const stopDistance = Math.abs(params.riskLevels.stopLoss - params.currentPrice);
    const positionValueUSD = riskAmount / (stopDistance / params.currentPrice); // Risk per dollar movement

    // Step 5: Convert to asset units
    let positionSizeUnits = positionValueUSD / params.currentPrice;

    // Step 6: Apply hard safety limits
    const maxPositionValue = params.accountBalance * 0.05; // 5% max of account
    const maxUnitsForAsset = this.getMaxUnitsForAsset(params.symbol);

    if (positionValueUSD > maxPositionValue) {
      positionSizeUnits = maxPositionValue / params.currentPrice;
      warnings.push(`Position limited to 5% of account value`);
    }

    if (positionSizeUnits > maxUnitsForAsset) {
      positionSizeUnits = maxUnitsForAsset;
      warnings.push(`Position limited to ${maxUnitsForAsset} ${params.symbol} units maximum`);
    }

    if (positionSizeUnits > params.botMaxPositionSize) {
      positionSizeUnits = params.botMaxPositionSize;
      warnings.push(`Position limited by bot configuration`);
    }

    // Step 7: Minimum position check
    const minPositionValue = 10; // $10 minimum
    const finalPositionValue = positionSizeUnits * params.currentPrice;

    if (finalPositionValue < minPositionValue) {
      positionSizeUnits = minPositionValue / params.currentPrice;
      warnings.push("Position increased to minimum viable size");
    }

    // Step 8: Build reasoning
    const reasoning = [
      `Base risk: ${(baseRiskPercent * 100).toFixed(2)}% of account`,
      `Signal confidence adjustment: ${(adjustmentFactors.signalQuality * 100).toFixed(1)}%`,
      `Portfolio risk adjustment: ${(adjustmentFactors.portfolioRisk * 100).toFixed(1)}%`,
      `Market condition adjustment: ${(adjustmentFactors.marketCondition * 100).toFixed(1)}%`,
      `Drawdown adjustment: ${(adjustmentFactors.drawdown * 100).toFixed(1)}%`,
      `Final risk amount: $${riskAmount.toFixed(2)}`,
      `Position size: ${positionSizeUnits.toFixed(6)} ${params.symbol} units`,
      `Position value: $${(positionSizeUnits * params.currentPrice).toFixed(2)}`,
      `Account allocation: ${(((positionSizeUnits * params.currentPrice) / params.accountBalance) * 100).toFixed(2)}%`,
    ];

    return {
      finalPositionSize: positionSizeUnits,
      finalPositionValue: positionSizeUnits * params.currentPrice,
      percentageOfAccount:
        ((positionSizeUnits * params.currentPrice) / params.accountBalance) * 100,
      riskAmount,
      reasoning,
      confidence: this.calculateOverallConfidence(adjustmentFactors, params),
      adjustmentFactors,
      warnings,
    };
  }

  private calculateAdjustmentFactors(params: ProfessionalPositionSizingParams) {
    // Signal quality adjustment (0.5 - 1.2)
    let signalQuality = 0.7 + params.signalConfidence * 0.5;
    if (params.riskLevels.riskRewardRatio < 1.5) signalQuality *= 0.8;
    if (params.technicalAnalysis.trendStrength < 5) signalQuality *= 0.9;

    // Portfolio risk adjustment (0.2 - 1.0)
    let portfolioRisk = 1.0;
    if (params.totalPortfolioRisk > 10) portfolioRisk = 0.5;
    else if (params.totalPortfolioRisk > 5) portfolioRisk = 0.7;
    else if (params.totalPortfolioRisk > 2) portfolioRisk = 0.9;

    // Market condition adjustment (0.6 - 1.1)
    let marketCondition = 1.0;
    if (params.marketCondition === "VOLATILE") marketCondition = 0.6;
    else if (params.marketCondition === "TRENDING") marketCondition = 1.1;

    // Drawdown adjustment (0.3 - 1.0)
    let drawdown = 1.0;
    if (params.currentDrawdown > 20) drawdown = 0.3;
    else if (params.currentDrawdown > 10) drawdown = 0.5;
    else if (params.currentDrawdown > 5) drawdown = 0.7;

    // Correlation adjustment (0.5 - 1.0)
    let correlation = 1.0;
    if (params.correlatedPositions > 3) correlation = 0.5;
    else if (params.correlatedPositions > 1) correlation = 0.8;

    return {
      signalQuality: Math.max(0.3, Math.min(1.2, signalQuality)),
      portfolioRisk: Math.max(0.2, Math.min(1.0, portfolioRisk)),
      marketCondition: Math.max(0.6, Math.min(1.1, marketCondition)),
      drawdown: Math.max(0.3, Math.min(1.0, drawdown)),
      correlation: Math.max(0.5, Math.min(1.0, correlation)),
    };
  }

  private getMaxUnitsForAsset(symbol: string): number {
    const maxUnits: { [key: string]: number } = {
      "BTC/USD": 0.1,
      BTCUSD: 0.1,
      "ETH/USD": 2.0,
      ETHUSD: 2.0,
      "EUR/USD": 10000,
      EURUSD: 10000,
      "GBP/USD": 10000,
      GBPUSD: 10000,
    };

    return maxUnits[symbol] || 1.0;
  }

  private calculateOverallConfidence(
    adjustmentFactors: any,
    params: ProfessionalPositionSizingParams,
  ): number {
    const factorAverage =
      (adjustmentFactors.signalQuality +
        adjustmentFactors.portfolioRisk +
        adjustmentFactors.marketCondition +
        adjustmentFactors.drawdown +
        adjustmentFactors.correlation) /
      5;

    return Math.max(0.1, Math.min(1.0, factorAverage * params.signalConfidence));
  }

  private getConservativeFallback(
    params: ProfessionalPositionSizingParams,
  ): ProfessionalPositionSizingResult {
    const riskAmount = params.accountBalance * 0.01; // 1% risk
    const positionValue = riskAmount * 5; // Conservative 5:1 position
    const positionSize = Math.min(positionValue / params.currentPrice, 0.01); // Very small for safety

    return {
      finalPositionSize: positionSize,
      finalPositionValue: positionSize * params.currentPrice,
      percentageOfAccount: ((positionSize * params.currentPrice) / params.accountBalance) * 100,
      riskAmount,
      reasoning: ["Emergency conservative fallback due to calculation errors"],
      confidence: 0.3,
      adjustmentFactors: {
        signalQuality: 0.5,
        portfolioRisk: 0.5,
        marketCondition: 0.5,
        drawdown: 0.5,
        correlation: 0.5,
      },
      warnings: ["EMERGENCY FALLBACK - Manual review required immediately"],
    };
  }
}
