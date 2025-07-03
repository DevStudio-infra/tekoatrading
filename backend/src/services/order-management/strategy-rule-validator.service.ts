import { logger } from "../../logger";

export interface StrategyCompliance {
  isCompliant: boolean;
  violations: string[];
  recommendations: string[];
  score: number; // 0-100 compliance score
}

export class StrategyRuleValidator {
  /**
   * CRITICAL strategy rule validation - this is the core enforcement mechanism
   */
  async validateOrderRequest(
    strategy: any,
    analysis: any,
    marketConditions: any,
    timeframe: string,
  ): Promise<StrategyCompliance> {
    const violations: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    try {
      logger.info(
        `🔍 CRITICAL Strategy Rule Validation for: ${strategy?.name || "Unknown Strategy"}`,
      );

      // 1. TIMEFRAME COMPLIANCE (CRITICAL)
      if (!this.validateTimeframe(strategy, timeframe)) {
        const allowedTimeframes = strategy?.timeframes
          ? strategy.timeframes.join(", ")
          : "undefined";
        // Only add violation if timeframes are explicitly defined but don't match
        if (strategy?.timeframes && strategy.timeframes.length > 0) {
          violations.push(
            `TIMEFRAME_VIOLATION: ${timeframe} not in allowed [${allowedTimeframes}]`,
          );
          score -= 30;
        } else {
          // If no timeframes specified, allow all timeframes (strategy is flexible)
          logger.info(
            `📊 No timeframes specified for strategy ${strategy?.name || "Unknown"}, allowing ${timeframe}`,
          );
        }
      }

      // 2. MARKET CONDITION COMPLIANCE (CRITICAL)
      const marketConditionCompliance = this.validateMarketConditions(strategy, marketConditions);
      if (!marketConditionCompliance.isValid) {
        violations.push(`MARKET_CONDITION_VIOLATION: ${marketConditionCompliance.reason}`);
        score -= 25;
      }

      // 3. ENTRY CONDITIONS COMPLIANCE (CRITICAL)
      const entryCompliance = this.validateEntryConditions(strategy, analysis, marketConditions);
      if (!entryCompliance.isValid) {
        const entryViolations = entryCompliance.violations
          ? entryCompliance.violations.join(", ")
          : "Unknown violations";
        violations.push(`ENTRY_CONDITION_VIOLATION: ${entryViolations}`);
        score -= 20;
      } else {
        recommendations.push(...(entryCompliance.recommendations || []));
      }

      // 4. RISK MANAGEMENT COMPLIANCE (CRITICAL)
      const riskCompliance = this.validateRiskManagement(strategy, analysis);
      if (!riskCompliance.isValid) {
        const riskViolations = riskCompliance.violations
          ? riskCompliance.violations.join(", ")
          : "Unknown violations";
        violations.push(`RISK_MANAGEMENT_VIOLATION: ${riskViolations}`);
        score -= 15;
      }

      // 5. CONFIDENCE THRESHOLD COMPLIANCE (CRITICAL)
      if (analysis.confidence * 100 < strategy.confidenceThreshold) {
        violations.push(
          `CONFIDENCE_VIOLATION: ${(analysis.confidence * 100).toFixed(1)}% < required ${strategy.confidenceThreshold}%`,
        );
        score -= 10;
      }

      // 6. INDICATOR REQUIREMENTS (if specified)
      const indicatorCompliance = this.validateIndicatorRequirements(strategy, analysis);
      if (!indicatorCompliance.isValid) {
        recommendations.push(...indicatorCompliance.recommendations);
        // Don't fail for missing indicators, but reduce score
        score -= 5;
      }

      // 7. CATEGORY-SPECIFIC RULES
      const categoryCompliance = this.validateCategoryRules(strategy, analysis, marketConditions);
      if (!categoryCompliance.isValid) {
        violations.push(...categoryCompliance.violations);
        score -= 10;
      }

      const isCompliant = violations.length === 0 && score >= 70; // Minimum 70% compliance required

      logger.info(
        `✅ Strategy Compliance Result: ${isCompliant ? "COMPLIANT" : "NON-COMPLIANT"} (Score: ${score})`,
      );

      if (violations.length > 0) {
        logger.warn(`❌ Strategy Violations:`, violations);
      }

      return {
        isCompliant,
        violations,
        recommendations,
        score: Math.max(0, score),
      };
    } catch (error) {
      logger.error(`❌ Strategy Validation Error:`, error);
      return {
        isCompliant: false,
        violations: [
          `VALIDATION_ERROR: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
        recommendations: ["Manual review required"],
        score: 0,
      };
    }
  }

  /**
   * Validate timeframe compliance
   */
  private validateTimeframe(strategy: any, timeframe: string): boolean {
    // If no timeframes specified, allow all timeframes (strategy is flexible)
    if (!strategy?.timeframes || strategy.timeframes.length === 0) {
      return true;
    }

    // If timeframes are specified, check if current timeframe is allowed
    return strategy.timeframes.includes(timeframe);
  }

  /**
   * Validate market condition requirements
   */
  private validateMarketConditions(
    strategy: any,
    marketConditions: any,
  ): { isValid: boolean; reason?: string } {
    if (!strategy.marketCondition || strategy.marketCondition === "any") {
      return { isValid: true };
    }

    const requiredCondition = strategy.marketCondition.toLowerCase();
    const actualCondition = marketConditions.condition?.toLowerCase() || "unknown";

    // Map conditions
    const conditionMap: { [key: string]: string[] } = {
      trending: ["trending", "strong_trend", "uptrend", "downtrend"],
      ranging: ["ranging", "sideways", "consolidation", "neutral"],
      volatile: ["volatile", "high_volatility", "choppy"],
    };

    const allowedConditions = conditionMap[requiredCondition] || [requiredCondition];
    const isValid = allowedConditions.some(
      (condition) => actualCondition.includes(condition) || condition.includes(actualCondition),
    );

    return {
      isValid,
      reason: isValid
        ? undefined
        : `Strategy requires ${requiredCondition} market, current: ${actualCondition}`,
    };
  }

  /**
   * Validate entry conditions from strategy
   */
  private validateEntryConditions(
    strategy: any,
    analysis: any,
    marketConditions: any,
  ): { isValid: boolean; violations: string[]; recommendations: string[] } {
    const violations: string[] = [];
    const recommendations: string[] = [];

    if (!strategy.entryConditions || strategy.entryConditions.length === 0) {
      return { isValid: true, violations, recommendations };
    }

    // Check each entry condition based on strategy type
    for (const condition of strategy.entryConditions) {
      const conditionLower = condition.toLowerCase();

      // Moving Average conditions
      if (conditionLower.includes("ema") || conditionLower.includes("moving average")) {
        if (!analysis.indicators?.ema) {
          violations.push(`Missing EMA analysis for condition: ${condition}`);
        }
      }

      // RSI conditions
      if (conditionLower.includes("rsi")) {
        if (!analysis.indicators?.rsi) {
          violations.push(`Missing RSI analysis for condition: ${condition}`);
        } else {
          if (conditionLower.includes("oversold") && analysis.indicators.rsi > 35) {
            violations.push(
              `RSI not oversold for condition: ${condition} (Current: ${analysis.indicators.rsi})`,
            );
          }
          if (conditionLower.includes("overbought") && analysis.indicators.rsi < 65) {
            violations.push(
              `RSI not overbought for condition: ${condition} (Current: ${analysis.indicators.rsi})`,
            );
          }
        }
      }

      // Bollinger Bands conditions
      if (conditionLower.includes("bollinger") || conditionLower.includes("band")) {
        if (!analysis.indicators?.bollingerBands) {
          violations.push(`Missing Bollinger Bands analysis for condition: ${condition}`);
        }
      }

      // Support/Resistance conditions
      if (conditionLower.includes("support") || conditionLower.includes("resistance")) {
        if (!analysis.supportResistance) {
          violations.push(`Missing Support/Resistance analysis for condition: ${condition}`);
        } else {
          recommendations.push("Verify price action at key levels");
        }
      }

      // Volume conditions
      if (conditionLower.includes("volume")) {
        if (!analysis.volume || !analysis.volume.volumeSpike) {
          violations.push(`Missing volume confirmation for condition: ${condition}`);
        }
      }

      // Divergence conditions
      if (conditionLower.includes("divergence")) {
        recommendations.push("Manual divergence verification recommended");
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      recommendations,
    };
  }

  /**
   * Validate risk management rules
   */
  private validateRiskManagement(
    strategy: any,
    analysis: any,
  ): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];

    if (!strategy.riskManagement) {
      return { isValid: true, violations };
    }

    const riskMgmt = strategy.riskManagement;

    // Risk/Reward ratio validation
    if (riskMgmt.riskRewardRatio && analysis.riskRewardRatio) {
      if (analysis.riskRewardRatio < riskMgmt.riskRewardRatio) {
        violations.push(
          `R/R ratio too low: ${analysis.riskRewardRatio.toFixed(2)} < required ${riskMgmt.riskRewardRatio}`,
        );
      }
    }

    // Stop loss type validation
    if (riskMgmt.stopLossType && analysis.stopLossMethod) {
      const requiredType = riskMgmt.stopLossType;
      const actualMethod = analysis.stopLossMethod.toLowerCase();

      if (requiredType === "swing_points" && !actualMethod.includes("swing")) {
        violations.push(
          `Stop loss should use swing points, current method: ${analysis.stopLossMethod}`,
        );
      }

      if (
        requiredType === "fixed_pips" &&
        !actualMethod.includes("atr") &&
        !actualMethod.includes("fixed")
      ) {
        violations.push(
          `Stop loss should use fixed pips, current method: ${analysis.stopLossMethod}`,
        );
      }

      if (
        requiredType === "level_based" &&
        !actualMethod.includes("level") &&
        !actualMethod.includes("support") &&
        !actualMethod.includes("resistance")
      ) {
        violations.push(
          `Stop loss should be level-based, current method: ${analysis.stopLossMethod}`,
        );
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }

  /**
   * Validate indicator requirements
   */
  private validateIndicatorRequirements(
    strategy: any,
    analysis: any,
  ): { isValid: boolean; recommendations: string[] } {
    const recommendations: string[] = [];

    if (!strategy.indicators || strategy.indicators.length === 0) {
      return { isValid: true, recommendations };
    }

    for (const indicator of strategy.indicators) {
      if (indicator.required) {
        const indicatorType = indicator.type.toLowerCase();

        if (!analysis.indicators || !analysis.indicators[indicatorType]) {
          recommendations.push(
            `Consider adding ${indicator.type.toUpperCase()} analysis: ${indicator.description}`,
          );
        }
      }
    }

    return {
      isValid: true, // Don't fail for missing indicators, just recommend
      recommendations,
    };
  }

  /**
   * Validate category-specific rules (scalping, day_trade, swing_trade)
   */
  private validateCategoryRules(
    strategy: any,
    analysis: any,
    marketConditions: any,
  ): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];

    if (!strategy.category) {
      return { isValid: true, violations };
    }

    const category = strategy.category.toLowerCase();

    switch (category) {
      case "scalping":
        // Scalping requires tight spreads and high liquidity
        if (marketConditions.spread && marketConditions.spread > 2) {
          violations.push(`Spread too wide for scalping: ${marketConditions.spread} pips`);
        }
        if (marketConditions.liquidity === "LOW") {
          violations.push("Low liquidity not suitable for scalping");
        }
        break;

      case "swing_trade":
        // Swing trading requires clear trend or key levels
        if (!analysis.trend || analysis.trend === "NEUTRAL") {
          if (!analysis.supportResistance || analysis.supportResistance.strength < 3) {
            violations.push("Swing trading requires clear trend or strong support/resistance");
          }
        }
        break;

      case "day_trade":
        // Day trading requires sufficient volatility
        if (marketConditions.volatility === "LOW") {
          violations.push("Insufficient volatility for day trading");
        }
        break;
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }
}
