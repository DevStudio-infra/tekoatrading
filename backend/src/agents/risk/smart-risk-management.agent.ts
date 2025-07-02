import { BaseAgent } from "../../ai/base-agent";
import { logger } from "../../logger";
import { TechnicalAnalysisResult } from "../core/technical-analysis.agent";

export interface RiskCalculationParams {
  symbol: string;
  direction: "BUY" | "SELL";
  currentPrice: number;
  timeframe: string;
  technicalAnalysis: TechnicalAnalysisResult;
  accountBalance: number;
  riskPercentage: number; // % of account to risk
  strategy?: string;
}

export interface RiskLevels {
  stopLoss: number;
  takeProfit: number;
  riskAmount: number;
  rewardAmount: number;
  riskRewardRatio: number;
  positionSize: number;
  reasoning: string[];
  confidence: number; // 0-1 based on technical analysis quality
  orderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
  entryPrice?: number; // For limit/stop orders
  orderReasoning: string;
}

export class SmartRiskManagementAgent extends BaseAgent {
  constructor() {
    super("SmartRiskManagementAgent");
  }

  async analyze(params: any): Promise<any> {
    return await this.calculateRiskLevels(params);
  }

  async calculateRiskLevels(params: RiskCalculationParams): Promise<RiskLevels> {
    try {
      logger.info(`[RISK] Calculating risk levels for ${params.symbol} ${params.direction}`);

      const {
        technicalAnalysis,
        direction,
        currentPrice,
        timeframe,
        riskPercentage,
        accountBalance,
      } = params;

      // Calculate stop loss using multiple methods
      const stopLoss = this.calculateSmartStopLoss(
        technicalAnalysis,
        direction,
        currentPrice,
        timeframe,
      );

      // Calculate take profit using technical levels
      const takeProfit = this.calculateSmartTakeProfit(
        technicalAnalysis,
        direction,
        currentPrice,
        timeframe,
      );

      // Calculate position size based on risk amount
      const riskAmount = accountBalance * (riskPercentage / 100);
      const stopDistance = Math.abs(stopLoss - currentPrice);

      // Add safety checks for position size calculation
      if (
        !isFinite(stopLoss) ||
        !isFinite(currentPrice) ||
        stopDistance === 0 ||
        isNaN(stopDistance)
      ) {
        logger.error(
          `[RISK] Invalid stop loss calculation: stopLoss=${stopLoss}, currentPrice=${currentPrice}, stopDistance=${stopDistance}`,
        );
        return this.getFallbackRiskLevels(params);
      }

      // Ensure minimum stop distance (0.01% of price for tighter stops)
      const minStopDistance = currentPrice * 0.0001;
      const validStopDistance = Math.max(stopDistance, minStopDistance);

      // HYBRID: Use percentage-based position sizing with absolute limits
      const stopLossPercentage = validStopDistance / currentPrice;

      // Method 1: Absolute risk divided by stop distance
      const absolutePositionSize = riskAmount / validStopDistance;

      // Method 2: Percentage-based approach (max 2% risk of account)
      const maxRiskPercent = Math.min(riskPercentage / 100, 0.02); // Cap at 2%
      const percentagePositionSize =
        (accountBalance * maxRiskPercent) / (currentPrice * stopLossPercentage);

      // Use the smaller of the two methods for safety
      const positionSize = Math.min(absolutePositionSize, percentagePositionSize);

      // Apply maximum position limits (0.01 BTC for crypto, 5% of account value)
      const maxPositionValue = accountBalance * 0.05; // 5% of account
      const maxPositionUnits = Math.min(0.01, maxPositionValue / currentPrice); // 0.01 BTC or 5% account value
      const finalPositionSize = Math.min(positionSize, maxPositionUnits);

      logger.info(
        `[RISK] Position calc: riskAmount=${riskAmount.toFixed(2)}, stopDistance=${stopDistance.toFixed(4)}, validStopDistance=${validStopDistance.toFixed(4)}, stopLossPercentage=${(stopLossPercentage * 100).toFixed(3)}%, absoluteSize=${absolutePositionSize.toFixed(6)}, percentageSize=${percentagePositionSize.toFixed(6)}, finalSize=${finalPositionSize.toFixed(6)}`,
      );

      // Validate position size
      if (!isFinite(finalPositionSize) || finalPositionSize <= 0 || isNaN(finalPositionSize)) {
        logger.error(
          `[RISK] Invalid position size: ${finalPositionSize}, riskAmount=${riskAmount}, stopDistance=${validStopDistance}`,
        );
        return this.getFallbackRiskLevels(params);
      }

      // Calculate reward metrics
      const profitDistance = Math.abs(takeProfit - currentPrice);
      const rewardAmount = finalPositionSize * profitDistance;
      const riskRewardRatio = profitDistance / validStopDistance;

      // Calculate confidence based on technical analysis quality
      const confidence = this.calculateConfidence(technicalAnalysis, riskRewardRatio);

      // Determine professional order type and entry strategy
      const orderDecision = this.determineOrderType(technicalAnalysis, direction, currentPrice);

      const reasoning = [
        `Stop Loss Method: ${this.getStopLossMethod(technicalAnalysis, timeframe)}`,
        `Take Profit Method: ${this.getTakeProfitMethod(technicalAnalysis, timeframe)}`,
        `ATR-based calculation: ${technicalAnalysis.atr.toFixed(2)}`,
        `Risk/Reward Ratio: ${riskRewardRatio.toFixed(2)}:1`,
        `Position Size: ${finalPositionSize.toFixed(6)} units`,
        `Risk Amount: $${riskAmount.toFixed(2)} (${riskPercentage}% of account)`,
        `Technical Confidence: ${(confidence * 100).toFixed(1)}%`,
        `Order Strategy: ${orderDecision.orderReasoning}`,
      ];

      const result: RiskLevels = {
        stopLoss,
        takeProfit,
        riskAmount,
        rewardAmount,
        riskRewardRatio,
        positionSize: finalPositionSize,
        reasoning,
        confidence,
        orderType: orderDecision.orderType,
        entryPrice: orderDecision.entryPrice,
        orderReasoning: orderDecision.orderReasoning,
      };

      logger.info(
        `[RISK] ${params.symbol} risk calculation complete: SL=${stopLoss.toFixed(2)}, TP=${takeProfit.toFixed(2)}, R/R=${riskRewardRatio.toFixed(2)}`,
      );
      return result;
    } catch (error) {
      logger.error(`[RISK] Risk calculation error:`, error);
      return this.getFallbackRiskLevels(params);
    }
  }

  /**
   * Calculate sophisticated stop loss using technical analysis
   */
  private calculateSmartStopLoss(
    analysis: TechnicalAnalysisResult,
    direction: "BUY" | "SELL",
    currentPrice: number,
    timeframe: string,
  ): number {
    const { atr, keyLevels, swingLevels, supportResistance } = analysis;

    // Get timeframe-specific ATR multiplier
    const atrMultiplier = this.getATRMultiplier(timeframe, "stop");

    let stopLoss: number;

    if (direction === "BUY") {
      // For BUY: Stop below support levels
      const atrStop = currentPrice - atr * atrMultiplier;
      const supportStop = keyLevels.nearestSupport - atr * 0.3; // Small buffer below support
      const swingLowStop =
        swingLevels.swingLows.length > 0
          ? Math.min(...swingLevels.swingLows.slice(-3)) - atr * 0.2
          : atrStop;

      // Use the most conservative (highest) stop that makes sense
      stopLoss = Math.max(atrStop, Math.max(supportStop, swingLowStop));

      // Ensure it's below current price
      if (stopLoss >= currentPrice) {
        stopLoss = currentPrice - atr * atrMultiplier;
      }
    } else {
      // For SELL: Stop above resistance levels
      const atrStop = currentPrice + atr * atrMultiplier;
      const resistanceStop = keyLevels.nearestResistance + atr * 0.3; // Small buffer above resistance
      const swingHighStop =
        swingLevels.swingHighs.length > 0
          ? Math.max(...swingLevels.swingHighs.slice(-3)) + atr * 0.2
          : atrStop;

      // Use the most conservative (lowest) stop that makes sense
      stopLoss = Math.min(atrStop, Math.min(resistanceStop, swingHighStop));

      // Ensure it's above current price
      if (stopLoss <= currentPrice) {
        stopLoss = currentPrice + atr * atrMultiplier;
      }
    }

    // Apply minimum distance requirements (0.1% minimum for major pairs)
    const minDistance = currentPrice * 0.001;
    if (Math.abs(stopLoss - currentPrice) < minDistance) {
      stopLoss = direction === "BUY" ? currentPrice - minDistance : currentPrice + minDistance;
    }

    return stopLoss;
  }

  /**
   * Calculate sophisticated take profit using technical analysis
   */
  private calculateSmartTakeProfit(
    analysis: TechnicalAnalysisResult,
    direction: "BUY" | "SELL",
    currentPrice: number,
    timeframe: string,
  ): number {
    const { atr, keyLevels, swingLevels, trend, trendStrength } = analysis;

    // Get timeframe-specific ATR multiplier
    const atrMultiplier = this.getATRMultiplier(timeframe, "profit");

    let takeProfit: number;

    if (direction === "BUY") {
      // For BUY: Target resistance levels
      const atrTarget = currentPrice + atr * atrMultiplier;
      const resistanceTarget = keyLevels.nearestResistance - atr * 0.2; // Small buffer below resistance
      const swingHighTarget =
        swingLevels.swingHighs.length > 0
          ? Math.max(...swingLevels.swingHighs.slice(-3)) - atr * 0.1
          : atrTarget;

      // Use the most conservative (lowest) target
      takeProfit = Math.min(atrTarget, Math.min(resistanceTarget, swingHighTarget));

      // Adjust for trend strength - stronger trends get bigger targets
      if (trend === "BULLISH" && trendStrength > 7) {
        takeProfit = Math.max(takeProfit, currentPrice + atr * atrMultiplier * 1.5);
      }

      // Ensure it's above current price
      if (takeProfit <= currentPrice) {
        takeProfit = currentPrice + atr * atrMultiplier;
      }
    } else {
      // For SELL: Target support levels
      const atrTarget = currentPrice - atr * atrMultiplier;
      const supportTarget = keyLevels.nearestSupport + atr * 0.2; // Small buffer above support
      const swingLowTarget =
        swingLevels.swingLows.length > 0
          ? Math.min(...swingLevels.swingLows.slice(-3)) + atr * 0.1
          : atrTarget;

      // Use the most conservative (highest) target
      takeProfit = Math.max(atrTarget, Math.max(supportTarget, swingLowTarget));

      // Adjust for trend strength - stronger trends get bigger targets
      if (trend === "BEARISH" && trendStrength > 7) {
        takeProfit = Math.min(takeProfit, currentPrice - atr * atrMultiplier * 1.5);
      }

      // Ensure it's below current price
      if (takeProfit >= currentPrice) {
        takeProfit = currentPrice - atr * atrMultiplier;
      }
    }

    // Apply minimum distance requirements
    const minDistance = currentPrice * 0.001;
    if (Math.abs(takeProfit - currentPrice) < minDistance) {
      takeProfit = direction === "BUY" ? currentPrice + minDistance : currentPrice - minDistance;
    }

    return takeProfit;
  }

  /**
   * Get ATR multiplier based on timeframe and purpose
   */
  private getATRMultiplier(timeframe: string, purpose: "stop" | "profit"): number {
    const multipliers: { [key: string]: { stop: number; profit: number } } = {
      M1: { stop: 0.6, profit: 2.5 }, // Aggressive scalping R/R (4.2:1)
      M5: { stop: 0.8, profit: 3.0 }, // Strong short-term R/R (3.8:1)
      M15: { stop: 1.0, profit: 3.5 }, // Excellent swing R/R (3.5:1)
      M30: { stop: 1.2, profit: 4.0 }, // Great intraday R/R (3.3:1)
      H1: { stop: 1.5, profit: 5.0 }, // Outstanding hourly R/R (3.3:1)
      H4: { stop: 2.0, profit: 6.0 }, // Superb swing R/R (3.0:1)
      D1: { stop: 2.5, profit: 7.0 }, // Exceptional position R/R (2.8:1)
    };

    const config = multipliers[timeframe] || multipliers["H1"];
    return config[purpose];
  }

  /**
   * Calculate confidence based on technical analysis quality
   */
  private calculateConfidence(analysis: TechnicalAnalysisResult, riskRewardRatio: number): number {
    let confidence = 0.5; // Base confidence

    // Adjust for trend strength
    if (analysis.trend !== "NEUTRAL") {
      confidence += (analysis.trendStrength / 10) * 0.2;
    }

    // Adjust for swing levels quality
    const totalSwings =
      analysis.swingLevels.swingHighs.length + analysis.swingLevels.swingLows.length;
    confidence += Math.min(totalSwings / 20, 0.2); // More swings = better analysis

    // Adjust for support/resistance strength
    confidence += Math.min(analysis.supportResistance.strength / 10, 0.1);

    // Adjust for risk/reward ratio
    if (riskRewardRatio >= 2.0) confidence += 0.1;
    else if (riskRewardRatio < 1.0) confidence -= 0.2;

    // Adjust for volatility (prefer medium volatility)
    if (analysis.priceAction.volatilityRank === "MEDIUM") confidence += 0.1;
    else if (analysis.priceAction.volatilityRank === "HIGH") confidence -= 0.1;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Get description of stop loss method used
   */
  private getStopLossMethod(analysis: TechnicalAnalysisResult, timeframe: string): string {
    const hasSwings =
      analysis.swingLevels.swingHighs.length > 0 || analysis.swingLevels.swingLows.length > 0;
    const hasStrongLevels = analysis.supportResistance.strength > 2;

    if (hasSwings && hasStrongLevels) {
      return `Technical levels (swing + S/R) with ATR buffer`;
    } else if (hasSwings) {
      return `Swing levels with ATR buffer`;
    } else if (hasStrongLevels) {
      return `Support/Resistance with ATR buffer`;
    } else {
      return `ATR-based (${timeframe} timeframe)`;
    }
  }

  /**
   * Get description of take profit method used
   */
  private getTakeProfitMethod(analysis: TechnicalAnalysisResult, timeframe: string): string {
    const trendAdjusted = analysis.trend !== "NEUTRAL" && analysis.trendStrength > 7;

    if (trendAdjusted) {
      return `Technical levels with trend adjustment (${analysis.trend})`;
    } else {
      return `Technical levels with ATR targeting`;
    }
  }

  /**
   * Fallback risk calculation for errors
   */
  private getFallbackRiskLevels(params: RiskCalculationParams): RiskLevels {
    logger.warn(`[RISK] Using fallback risk calculation for ${params.symbol}`);

    const { currentPrice, direction, riskPercentage, accountBalance, timeframe } = params;

    // Simple percentage-based fallback
    const stopPercent = this.getFallbackStopPercent(timeframe);
    const profitPercent = stopPercent * 2; // 2:1 R/R

    const stopLoss =
      direction === "BUY"
        ? currentPrice * (1 - stopPercent / 100)
        : currentPrice * (1 + stopPercent / 100);

    const takeProfit =
      direction === "BUY"
        ? currentPrice * (1 + profitPercent / 100)
        : currentPrice * (1 - profitPercent / 100);

    const riskAmount = accountBalance * (riskPercentage / 100);
    const stopDistance = Math.abs(stopLoss - currentPrice);

    // Ensure minimum stop distance for fallback calculation
    const minStopDistance = currentPrice * 0.001; // 0.1% minimum
    const validStopDistance = Math.max(stopDistance, minStopDistance);
    const positionSize = riskAmount / validStopDistance;

    const profitDistance = Math.abs(takeProfit - currentPrice);
    const rewardAmount = positionSize * profitDistance;

    return {
      stopLoss,
      takeProfit,
      riskAmount,
      rewardAmount,
      riskRewardRatio: profitDistance / validStopDistance,
      positionSize,
      reasoning: ["Fallback percentage-based calculation due to technical analysis error"],
      confidence: 0.3,
      orderType: "MARKET",
      orderReasoning: "Fallback to market order due to analysis error",
    };
  }

  /**
   * Determine professional order type based on technical analysis
   */
  private determineOrderType(
    analysis: TechnicalAnalysisResult,
    direction: "BUY" | "SELL",
    currentPrice: number,
  ): {
    orderType: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
    entryPrice?: number;
    orderReasoning: string;
  } {
    const { trend, trendStrength, keyLevels, priceAction } = analysis;

    // Market conditions analysis
    const isStrongTrend = trendStrength > 7;
    const isNearSupport = Math.abs(currentPrice - keyLevels.nearestSupport) < analysis.atr;
    const isNearResistance = Math.abs(currentPrice - keyLevels.nearestResistance) < analysis.atr;
    const isHighVolatility = priceAction.volatilityRank === "HIGH";

    // MARKET ORDER: Strong trend momentum + high volatility
    if (isStrongTrend && isHighVolatility) {
      return {
        orderType: "MARKET",
        orderReasoning: `Strong ${trend} momentum with high volatility - immediate execution preferred`,
      };
    }

    // LIMIT ORDER: Price near key levels, wait for better entry
    if (direction === "BUY" && isNearSupport) {
      const entryPrice = keyLevels.nearestSupport + analysis.atr * 0.1; // Slightly above support
      return {
        orderType: "LIMIT",
        entryPrice,
        orderReasoning: `Price near support level - limit buy at ${entryPrice.toFixed(2)} for better entry`,
      };
    }

    if (direction === "SELL" && isNearResistance) {
      const entryPrice = keyLevels.nearestResistance - analysis.atr * 0.1; // Slightly below resistance
      return {
        orderType: "LIMIT",
        entryPrice,
        orderReasoning: `Price near resistance level - limit sell at ${entryPrice.toFixed(2)} for better entry`,
      };
    }

    // STOP ORDER: Breakout strategy
    if (direction === "BUY" && currentPrice < keyLevels.nearestResistance) {
      const entryPrice = keyLevels.nearestResistance + analysis.atr * 0.2; // Breakout above resistance
      return {
        orderType: "STOP",
        entryPrice,
        orderReasoning: `Breakout strategy - buy stop at ${entryPrice.toFixed(2)} above resistance`,
      };
    }

    if (direction === "SELL" && currentPrice > keyLevels.nearestSupport) {
      const entryPrice = keyLevels.nearestSupport - analysis.atr * 0.2; // Breakdown below support
      return {
        orderType: "STOP",
        entryPrice,
        orderReasoning: `Breakdown strategy - sell stop at ${entryPrice.toFixed(2)} below support`,
      };
    }

    // STOP_LIMIT: Conservative approach for uncertain conditions
    if (trend === "NEUTRAL" || trendStrength < 5) {
      const buffer = analysis.atr * 0.3;
      const entryPrice = direction === "BUY" ? currentPrice + buffer : currentPrice - buffer;

      return {
        orderType: "STOP_LIMIT",
        entryPrice,
        orderReasoning: `Uncertain market conditions - stop-limit at ${entryPrice.toFixed(2)} for controlled entry`,
      };
    }

    // DEFAULT: Market order for standard conditions
    return {
      orderType: "MARKET",
      orderReasoning: "Standard market conditions - immediate market execution",
    };
  }

  /**
   * Fallback stop loss percentage by timeframe
   */
  private getFallbackStopPercent(timeframe: string): number {
    const percentages: { [key: string]: number } = {
      M1: 0.5,
      M5: 0.8,
      M15: 1.2,
      M30: 1.5,
      H1: 2.0,
      H4: 3.0,
      D1: 4.0,
    };

    return percentages[timeframe] || 2.0;
  }
}
