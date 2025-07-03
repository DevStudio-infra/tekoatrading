import { logger } from "../../logger";

export interface ProfessionalRiskAssessment {
  adjustedStopLoss: number;
  adjustedTakeProfit: number;
  optimalPositionSize: number;
  riskScore: number; // 0-10 where 10 is highest risk
  riskRewardRatio: number;
  maxDrawdown: number;
  reasoning: string;
  riskWarnings: string[];
}

export class ProfessionalRiskManager {
  /**
   * Calculate professional risk assessment with strategy compliance
   */
  async calculateProfessionalRisk(
    analysis: any,
    strategy: any,
    portfolioContext: any,
    orderType: string,
    timeframe: string,
  ): Promise<ProfessionalRiskAssessment> {
    logger.info(`🛡️ Professional Risk Assessment for ${strategy.name} (${orderType})`);

    try {
      // 1. STRATEGY-BASED RISK PARAMETERS
      const strategyRiskLevels = this.getStrategyRiskLevels(strategy, timeframe);

      // 2. PORTFOLIO-AWARE RISK MANAGEMENT
      const portfolioRisk = this.calculatePortfolioRisk(portfolioContext, strategy);

      // 3. TECHNICAL ANALYSIS RISK ADJUSTMENT
      const technicalRisk = this.calculateTechnicalRisk(analysis, timeframe);

      // 4. ORDER TYPE RISK CONSIDERATION
      const orderTypeRisk = this.getOrderTypeRiskAdjustment(orderType, analysis);

      // 5. SYNTHESIZE PROFESSIONAL RISK LEVELS
      const finalRiskAssessment = this.synthesizeRiskAssessment(
        strategyRiskLevels,
        portfolioRisk,
        technicalRisk,
        orderTypeRisk,
        analysis,
        strategy,
      );

      logger.info(
        `✅ Risk Assessment Complete: R/R ${finalRiskAssessment.riskRewardRatio.toFixed(2)}:1, Risk Score: ${finalRiskAssessment.riskScore}/10`,
      );

      return finalRiskAssessment;
    } catch (error) {
      logger.error(`❌ Professional Risk Assessment Error:`, error);

      // Safe fallback risk assessment
      return {
        adjustedStopLoss: analysis.stopLoss || 0,
        adjustedTakeProfit: analysis.takeProfit || 0,
        optimalPositionSize: 0.001, // Very conservative fallback
        riskScore: 10, // Highest risk for errors
        riskRewardRatio: 1.0,
        maxDrawdown: 0.1, // 10% max drawdown fallback
        reasoning: `Risk assessment error: ${error instanceof Error ? error.message : "Unknown error"}. Using conservative fallback.`,
        riskWarnings: ["RISK_CALCULATION_ERROR", "USING_CONSERVATIVE_FALLBACK"],
      };
    }
  }

  /**
   * Get strategy-based risk parameters
   */
  private getStrategyRiskLevels(strategy: any, timeframe: string): any {
    const riskMgmt = strategy.riskManagement || {};
    const category = strategy.category?.toLowerCase() || "unknown";

    // Base risk levels by category
    let baseRiskPercent = 1.0; // Default 1%
    let targetRR = 2.0; // Default 2:1

    switch (category) {
      case "scalping":
        baseRiskPercent = 0.5; // Lower risk for scalping
        targetRR = 1.5; // Lower R/R for scalping
        break;
      case "day_trade":
        baseRiskPercent = 1.0; // Standard risk
        targetRR = 2.0; // Standard R/R
        break;
      case "swing_trade":
        baseRiskPercent = 1.5; // Higher risk for swing
        targetRR = 2.5; // Higher R/R for swing
        break;
    }

    // Override with strategy-specific values
    if (riskMgmt.riskPerTrade) {
      const riskValue = parseFloat(riskMgmt.riskPerTrade.replace("%", ""));
      if (!isNaN(riskValue)) {
        baseRiskPercent = riskValue;
      }
    }

    if (riskMgmt.riskRewardRatio) {
      targetRR = riskMgmt.riskRewardRatio;
    }

    // Timeframe adjustments
    const timeframeMultiplier = this.getTimeframeRiskMultiplier(timeframe);

    return {
      riskPercent: baseRiskPercent * timeframeMultiplier,
      targetRiskReward: targetRR,
      stopLossType: riskMgmt.stopLossType || "atr_based",
      takeProfitType: riskMgmt.takeProfitType || "ratio_based",
      trailingStop: riskMgmt.trailingStop,
      category,
    };
  }

  /**
   * Calculate portfolio-aware risk
   */
  private calculatePortfolioRisk(portfolioContext: any, strategy: any): any {
    const warnings: string[] = [];
    let portfolioRiskMultiplier = 1.0;

    // Check portfolio exposure
    if (portfolioContext.totalPositions > 5) {
      portfolioRiskMultiplier *= 0.8; // Reduce risk with many positions
      warnings.push("HIGH_PORTFOLIO_EXPOSURE");
    }

    // Check account drawdown
    if (portfolioContext.currentDrawdown > 0.1) {
      // 10% drawdown
      portfolioRiskMultiplier *= 0.5; // Significantly reduce risk
      warnings.push("HIGH_ACCOUNT_DRAWDOWN");
    }

    // Check correlation risk
    if (portfolioContext.correlationRisk === "HIGH") {
      portfolioRiskMultiplier *= 0.7; // Reduce for high correlation
      warnings.push("HIGH_CORRELATION_RISK");
    }

    return {
      riskMultiplier: portfolioRiskMultiplier,
      warnings,
      maxPositionValue: portfolioContext.accountBalance * 0.05, // Max 5% per position in USD
      availableCapital: portfolioContext.availableCapital || portfolioContext.accountBalance,
    };
  }

  /**
   * Calculate technical analysis-based risk
   */
  private calculateTechnicalRisk(analysis: any, timeframe: string): any {
    let technicalRiskScore = 5; // Base score 5/10
    const warnings: string[] = [];

    // Trend strength assessment
    if (analysis.trendStrength > 8) {
      technicalRiskScore -= 1; // Strong trend reduces risk
    } else if (analysis.trendStrength < 3) {
      technicalRiskScore += 2; // Weak trend increases risk
      warnings.push("WEAK_TREND_CONDITIONS");
    }

    // Volatility assessment
    if (analysis.volatility === "HIGH") {
      technicalRiskScore += 1;
      warnings.push("HIGH_VOLATILITY");
    } else if (analysis.volatility === "LOW") {
      technicalRiskScore -= 1;
    }

    // Support/Resistance strength
    if (analysis.supportResistance?.strength > 5) {
      technicalRiskScore -= 1; // Strong levels reduce risk
    } else if (analysis.supportResistance?.strength < 2) {
      technicalRiskScore += 1; // Weak levels increase risk
    }

    // ATR-based position sizing adjustment
    const atrMultiplier = this.getATRPositionMultiplier(
      analysis.atr,
      analysis.marketPrice?.price || 0,
    );

    return {
      riskScore: Math.max(1, Math.min(10, technicalRiskScore)),
      atrMultiplier,
      warnings,
      volatilityAdjustment: analysis.volatility === "HIGH" ? 0.8 : 1.0,
    };
  }

  /**
   * Get order type risk adjustment
   */
  private getOrderTypeRiskAdjustment(orderType: string, analysis: any): any {
    switch (orderType) {
      case "MARKET":
        return {
          riskMultiplier: 1.0,
          slippageRisk: analysis.volatility === "HIGH" ? 0.95 : 1.0,
          executionCertainty: 0.95,
        };

      case "LIMIT":
        return {
          riskMultiplier: 0.9, // Lower risk due to better pricing
          slippageRisk: 1.0, // No slippage risk
          executionCertainty: 0.7, // May not fill
        };

      case "STOP":
        return {
          riskMultiplier: 1.1, // Slightly higher risk
          slippageRisk: 0.95,
          executionCertainty: 0.85,
        };

      default:
        return {
          riskMultiplier: 1.0,
          slippageRisk: 1.0,
          executionCertainty: 0.8,
        };
    }
  }

  /**
   * Synthesize all risk factors into final assessment
   */
  private synthesizeRiskAssessment(
    strategyRisk: any,
    portfolioRisk: any,
    technicalRisk: any,
    orderTypeRisk: any,
    analysis: any,
    strategy: any,
  ): ProfessionalRiskAssessment {
    // Calculate optimal position size
    const basePositionSize = this.calculateBasePositionSize(
      portfolioRisk.availableCapital,
      strategyRisk.riskPercent,
      analysis.marketPrice?.price || 0,
      analysis.stopLoss || 0,
    );

    // Apply all risk multipliers
    const totalRiskMultiplier =
      portfolioRisk.riskMultiplier *
      technicalRisk.atrMultiplier *
      orderTypeRisk.riskMultiplier *
      technicalRisk.volatilityAdjustment *
      orderTypeRisk.slippageRisk;

    // Convert max position value to units
    const entryPrice = analysis.marketPrice?.price || 100000;
    const maxPositionSizeInUnits = portfolioRisk.maxPositionValue / entryPrice;

    const optimalPositionSize = Math.min(
      basePositionSize * totalRiskMultiplier,
      maxPositionSizeInUnits,
      0.1, // Max 0.1 BTC units for safety
    );

    // Calculate professional stop loss and take profit
    const professionalLevels = this.calculateProfessionalLevels(
      analysis,
      strategyRisk,
      technicalRisk,
    );

    // Debug risk manager values
    console.log(`🔍 Professional Risk Manager Debug:`, {
      analysisStopLoss: analysis.stopLoss,
      analysisTakeProfit: analysis.takeProfit,
      analysisAction: analysis.action,
      analysisDirection: analysis.direction,
      professionalStopLoss: professionalLevels.stopLoss,
      professionalTakeProfit: professionalLevels.takeProfit,
      strategyStopLossType: strategyRisk.stopLossType,
      strategyTakeProfitType: strategyRisk.takeProfitType,
    });

    // Calculate final risk metrics
    const finalRiskScore = Math.max(
      1,
      Math.min(10, technicalRisk.riskScore * (2 - portfolioRisk.riskMultiplier)),
    );

    const riskRewardRatio =
      professionalLevels.takeProfit && professionalLevels.stopLoss && analysis.marketPrice?.price
        ? Math.abs(professionalLevels.takeProfit - analysis.marketPrice.price) /
          Math.abs(analysis.marketPrice.price - professionalLevels.stopLoss)
        : strategyRisk.targetRiskReward;

    // Compile warnings
    const allWarnings = [...portfolioRisk.warnings, ...technicalRisk.warnings];

    // Compile reasoning
    const reasoningParts = [
      `Position: ${(optimalPositionSize * 1000).toFixed(3)}k units`,
      `Risk: ${strategyRisk.riskPercent}% account risk`,
      `Category: ${strategyRisk.category}`,
      `Technical Score: ${technicalRisk.riskScore}/10`,
      `R/R Target: ${strategyRisk.targetRiskReward}:1`,
    ];

    return {
      adjustedStopLoss: professionalLevels.stopLoss,
      adjustedTakeProfit: professionalLevels.takeProfit,
      optimalPositionSize,
      riskScore: finalRiskScore,
      riskRewardRatio,
      maxDrawdown: Math.min(0.2, (strategyRisk.riskPercent / 100) * 5), // Max 20% or 5x risk per trade
      reasoning: reasoningParts.join(" | "),
      riskWarnings: allWarnings,
    };
  }

  /**
   * Calculate base position size using professional formula
   */
  private calculateBasePositionSize(
    accountBalance: number,
    riskPercentage: number,
    entryPrice: number,
    stopLoss: number,
  ): number {
    if (!entryPrice || !stopLoss || entryPrice === stopLoss) {
      return accountBalance * 0.001; // 0.1% fallback
    }

    const riskAmount = accountBalance * (riskPercentage / 100);
    const stopDistance = Math.abs(entryPrice - stopLoss);

    // FIXED: Correct formula for crypto position sizing
    // Risk Amount ÷ Stop Distance = Position Size in Units
    const positionSizeInUnits = riskAmount / stopDistance;

    // Apply realistic limits for crypto trading
    const accountBalanceUSD = accountBalance;
    const maxPositionValue = Math.min(accountBalanceUSD * 0.05, 500); // Max 5% of account or $500
    const maxPositionSize = maxPositionValue / entryPrice;

    const finalPositionSize = Math.min(
      positionSizeInUnits,
      maxPositionSize,
      0.1, // Max 0.1 BTC units for safety
    );

    // Log debug info
    console.log(`🔍 Professional Risk Manager Position Size Calculation:`, {
      accountBalance: accountBalanceUSD,
      riskPercentage,
      riskAmount,
      entryPrice,
      stopLoss,
      stopDistance,
      positionSizeInUnits,
      maxPositionValue,
      maxPositionSize,
      finalPositionSize,
      positionValueUSD: finalPositionSize * entryPrice,
    });

    return finalPositionSize;
  }

  /**
   * Calculate professional stop loss and take profit levels
   */
  private calculateProfessionalLevels(analysis: any, strategyRisk: any, technicalRisk: any): any {
    // Get current price from multiple possible sources
    const currentPrice =
      analysis.marketPrice?.price || analysis.currentPrice || analysis.entryPrice || 0;
    const atr = analysis.atr || currentPrice * 0.01; // Default 1% ATR

    let stopLoss = analysis.stopLoss;
    let takeProfit = analysis.takeProfit;

    // Determine direction from analysis (Enhanced Decision uses 'action', not 'direction')
    const direction =
      analysis.direction ||
      (analysis.action === "buy" ? "BUY" : analysis.action === "sell" ? "SELL" : "BUY");

    console.log(`🔍 Professional Levels Debug:`, {
      currentPrice,
      atr,
      direction,
      originalStopLoss: analysis.stopLoss,
      originalTakeProfit: analysis.takeProfit,
      strategyStopLossType: strategyRisk.stopLossType,
      strategyTakeProfitType: strategyRisk.takeProfitType,
    });

    // 🚨 CRITICAL FIX: Only override if analysis doesn't have stop loss OR if current price is invalid
    // Trust the AI's calculated stop loss unless there's a compelling reason to override
    if (
      (!analysis.stopLoss || analysis.stopLoss <= 0) &&
      strategyRisk.stopLossType === "atr_based" &&
      currentPrice > 0
    ) {
      const atrMultiplier = technicalRisk.riskScore > 6 ? 2.5 : 2.0; // Wider stops for higher risk
      stopLoss =
        direction === "BUY"
          ? currentPrice - atr * atrMultiplier
          : currentPrice + atr * atrMultiplier;

      console.log(
        `🔧 ATR-based stop loss override: ${stopLoss} (currentPrice: ${currentPrice}, atr: ${atr}, direction: ${direction})`,
      );
    } else {
      console.log(
        `🎯 Using AI-calculated stop loss: ${stopLoss} (analysis.stopLoss: ${analysis.stopLoss})`,
      );
    }

    // Professional take profit calculation - only override if needed
    if (
      (!analysis.takeProfit || analysis.takeProfit <= 0) &&
      strategyRisk.takeProfitType === "ratio_based" &&
      stopLoss &&
      currentPrice > 0
    ) {
      const stopDistance = Math.abs(currentPrice - stopLoss);
      takeProfit =
        direction === "BUY"
          ? currentPrice + stopDistance * strategyRisk.targetRiskReward
          : currentPrice - stopDistance * strategyRisk.targetRiskReward;

      console.log(`🔧 Ratio-based take profit override: ${takeProfit}`);
    } else {
      console.log(
        `🎯 Using AI-calculated take profit: ${takeProfit} (analysis.takeProfit: ${analysis.takeProfit})`,
      );
    }

    // Fallback values only if we still don't have valid levels
    const finalStopLoss =
      stopLoss && stopLoss > 0 ? stopLoss : currentPrice > 0 ? currentPrice * 0.99 : 0;
    const finalTakeProfit =
      takeProfit && takeProfit > 0 ? takeProfit : currentPrice > 0 ? currentPrice * 1.02 : 0;

    console.log(
      `📊 Final Professional Levels: SL=${finalStopLoss}, TP=${finalTakeProfit}, Price=${currentPrice}`,
    );

    return {
      stopLoss: finalStopLoss,
      takeProfit: finalTakeProfit,
    };
  }

  /**
   * Get timeframe-based risk multiplier
   */
  private getTimeframeRiskMultiplier(timeframe: string): number {
    const multipliers: { [key: string]: number } = {
      M1: 0.5, // Very conservative for 1-minute
      M5: 0.7, // Conservative for 5-minute
      M15: 0.8, // Slightly conservative for 15-minute
      M30: 0.9, // Near standard for 30-minute
      H1: 1.0, // Standard for 1-hour
      H4: 1.1, // Slightly higher for 4-hour
      D1: 1.2, // Higher for daily
    };

    return multipliers[timeframe] || 1.0;
  }

  /**
   * Get ATR-based position multiplier
   */
  private getATRPositionMultiplier(atr: number, price: number): number {
    if (!atr || !price) return 1.0;

    const atrPercent = (atr / price) * 100;

    // Reduce position size for high ATR (high volatility)
    if (atrPercent > 2) return 0.7; // Very volatile
    if (atrPercent > 1) return 0.85; // Volatile
    if (atrPercent < 0.3) return 1.1; // Low volatility, can increase slightly

    return 1.0; // Normal volatility
  }
}
