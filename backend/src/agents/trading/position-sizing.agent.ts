import { BaseAgent } from "../../ai/base-agent";
import { logger } from "../../logger";
import { TechnicalAnalysisResult } from "../core/technical-analysis.agent";
import { RiskLevels } from "../risk/smart-risk-management.agent";

export interface PositionSizingParams {
  symbol: string;
  accountBalance: number;
  baseRiskPercentage: number;
  technicalAnalysis: TechnicalAnalysisResult;
  riskLevels: RiskLevels;
  botMaxPositionSize: number;
  currentPrice: number;
}

export interface PositionSizingResult {
  finalPositionSize: number;
  finalPositionValue: number;
  percentageOfAccount: number;
  riskAmount: number;
  reasoning: string[];
  confidence: number;
}

export class PositionSizingAgent extends BaseAgent {
  constructor() {
    super("PositionSizingAgent");
  }

  async analyze(data: any): Promise<any> {
    return this.calculatePositionSize(data);
  }

  async calculatePositionSize(params: PositionSizingParams): Promise<PositionSizingResult> {
    try {
      logger.info(`[POSITION-SIZING] Calculating position size for ${params.symbol}`);

      // Calculate risk amount (max 2% of account)
      const riskPercent = Math.min(params.baseRiskPercentage / 100, 0.02);
      const riskAmount = params.accountBalance * riskPercent;

      // Calculate stop distance from risk levels (use current price if entryPrice is undefined)
      const entryPrice = params.riskLevels.entryPrice || params.currentPrice;
      const stopDistance = Math.abs(params.riskLevels.stopLoss - entryPrice);
      const stopPercent = stopDistance / entryPrice;

      // DEBUGGING: Log all intermediate values
      logger.info(
        `[POSITION-SIZING-DEBUG] accountBalance=${params.accountBalance}, riskPercent=${riskPercent}, riskAmount=${riskAmount}`,
      );
      logger.info(
        `[POSITION-SIZING-DEBUG] entryPrice=${entryPrice}, stopLoss=${params.riskLevels.stopLoss}, stopDistance=${stopDistance}`,
      );

      // Calculate position size based on risk
      let positionSize = riskAmount / stopDistance;
      logger.info(
        `[POSITION-SIZING-DEBUG] Initial positionSize = ${riskAmount} / ${stopDistance} = ${positionSize}`,
      );

      // Apply safety limits
      const maxPositionValue = params.accountBalance * 0.05; // 5% max
      const maxPositionByValue = maxPositionValue / entryPrice;

      // Handle undefined botMaxPositionSize to prevent NaN
      const safeBotMaxPositionSize = params.botMaxPositionSize || 1000; // Default to 1000 if undefined

      logger.info(
        `[POSITION-SIZING-DEBUG] maxPositionValue=${maxPositionValue}, maxPositionByValue=${maxPositionByValue}, botMaxPositionSize=${params.botMaxPositionSize}, safeBotMaxPositionSize=${safeBotMaxPositionSize}`,
      );

      // Use the more conservative limit (now with safe bot max position size)
      positionSize = Math.min(positionSize, maxPositionByValue, safeBotMaxPositionSize);
      logger.info(`[POSITION-SIZING-DEBUG] After safety limits: positionSize=${positionSize}`);

      // Minimum viable position
      const minPositionValue = 10; // $10 minimum
      const minPositionSize = minPositionValue / entryPrice;
      positionSize = Math.max(positionSize, minPositionSize);
      logger.info(
        `[POSITION-SIZING-DEBUG] minPositionSize=${minPositionSize}, final positionSize=${positionSize}`,
      );

      const finalPositionValue = positionSize * entryPrice;
      const percentageOfAccount = (finalPositionValue / params.accountBalance) * 100;

      // Check for NaN values
      if (isNaN(positionSize) || isNaN(finalPositionValue) || isNaN(percentageOfAccount)) {
        logger.error(
          `[POSITION-SIZING-ERROR] NaN detected! positionSize=${positionSize}, finalPositionValue=${finalPositionValue}, percentageOfAccount=${percentageOfAccount}`,
        );
        logger.error(`[POSITION-SIZING-ERROR] Input params:`, JSON.stringify(params, null, 2));
      }

      // Calculate confidence based on technical analysis and risk/reward
      let confidence = 0.7; // Base confidence
      if (params.technicalAnalysis.trendStrength > 7) confidence += 0.1;
      if (params.riskLevels.riskRewardRatio > 2) confidence += 0.1;
      if (params.riskLevels.riskRewardRatio < 1.5) confidence -= 0.2;
      confidence = Math.max(0.3, Math.min(1.0, confidence));

      const reasoning = [
        `Risk amount: $${riskAmount.toFixed(2)} (${(riskPercent * 100).toFixed(1)}%)`,
        `Stop distance: ${(stopPercent * 100).toFixed(2)}%`,
        `Position size: ${positionSize.toFixed(6)} units`,
        `Position value: $${finalPositionValue.toFixed(2)}`,
        `Account allocation: ${percentageOfAccount.toFixed(2)}%`,
        `R/R ratio: ${params.riskLevels.riskRewardRatio.toFixed(2)}:1`,
      ];

      logger.info(
        `[POSITION-SIZING] ${params.symbol}: ${positionSize.toFixed(6)} units ($${finalPositionValue.toFixed(2)})`,
      );

      return {
        finalPositionSize: positionSize,
        finalPositionValue,
        percentageOfAccount,
        riskAmount,
        reasoning,
        confidence,
      };
    } catch (error) {
      logger.error(`[POSITION-SIZING] Error calculating position size:`, error);

      // Conservative fallback
      const entryPrice = params.riskLevels.entryPrice || params.currentPrice;
      const fallbackSize = 0.001; // Very small fallback
      return {
        finalPositionSize: fallbackSize,
        finalPositionValue: fallbackSize * entryPrice,
        percentageOfAccount: 0.1,
        riskAmount: 10,
        reasoning: ["Error in calculation, using conservative fallback"],
        confidence: 0.3,
      };
    }
  }
}
