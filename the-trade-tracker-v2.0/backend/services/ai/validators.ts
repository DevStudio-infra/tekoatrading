import { TechnicalIndicator, ChartPattern, ChartAnalysis, StrategyAnalysis, TradingDecision } from "./types";

/**
 * JSON Schema validator for AI responses
 */
export class AIResponseValidator {
  static validateTradingDecision(decision: any): TradingDecision {
    const validActions = ["BUY", "SELL", "HOLD", "CLOSE"];
    const validUrgencies = ["LOW", "MEDIUM", "HIGH"];

    return {
      action: validActions.includes(decision?.action) ? decision.action : "HOLD",
      confidence: this.validateNumber(decision?.confidence, 0, 100, 50),
      positionSize: this.validatePositiveNumber(decision?.positionSize, 0),
      positionSizeReasoning: decision?.positionSizeReasoning || "No reasoning provided",
      stopLoss: this.validatePositiveNumber(decision?.stopLoss, 0),
      stopLossReasoning: decision?.stopLossReasoning || "No reasoning provided",
      takeProfit: this.validatePositiveNumber(decision?.takeProfit, 0),
      takeProfitReasoning: decision?.takeProfitReasoning || "No reasoning provided",
      rationale: decision?.rationale || "No clear signal",
      riskScore: this.validateNumber(decision?.riskScore, 1, 5, 3),
      timeframe: decision?.timeframe || "M15",
      urgency: validUrgencies.includes(decision?.urgency) ? decision.urgency : "LOW",
      portfolioImpact: decision?.portfolioImpact || "Unknown impact",
    };
  }

  static validateChartAnalysis(analysis: any): ChartAnalysis {
    const validTrends = ["BULLISH", "BEARISH", "SIDEWAYS"];

    return {
      technicalIndicators: Array.isArray(analysis?.technicalIndicators) ? analysis.technicalIndicators.map(this.validateTechnicalIndicator) : [],
      trendDirection: validTrends.includes(analysis?.trendDirection) ? analysis.trendDirection : "SIDEWAYS",
      supportLevels: this.validateNumberArray(analysis?.supportLevels),
      resistanceLevels: this.validateNumberArray(analysis?.resistanceLevels),
      patternRecognition: Array.isArray(analysis?.patternRecognition) ? analysis.patternRecognition.map(this.validateChartPattern) : [],
      volatility: this.validateNumber(analysis?.volatility, 0, 100, 50),
      momentum: this.validateNumber(analysis?.momentum, -100, 100, 0),
      priceAction: {
        currentPrice: this.validatePositiveNumber(analysis?.priceAction?.currentPrice, 0),
        priceChange: this.validateNumber(analysis?.priceAction?.priceChange, -Infinity, Infinity, 0),
        priceChangePercent: this.validateNumber(analysis?.priceAction?.priceChangePercent, -100, 100, 0),
      },
    };
  }

  static validateStrategyAnalysis(analysis: any): StrategyAnalysis {
    return {
      strategyAlignment: this.validateNumber(analysis?.strategyAlignment, 0, 100, 50),
      entryConditions: Array.isArray(analysis?.entryConditions) ? analysis.entryConditions : [],
      exitConditions: Array.isArray(analysis?.exitConditions) ? analysis.exitConditions : [],
      riskFactors: Array.isArray(analysis?.riskFactors) ? analysis.riskFactors : [],
      recommendations: Array.isArray(analysis?.recommendations) ? analysis.recommendations : [],
    };
  }

  private static validateTechnicalIndicator(indicator: any): TechnicalIndicator {
    const validSignals = ["BUY", "SELL", "NEUTRAL"];

    return {
      name: indicator?.name || "Unknown",
      value: this.validateNumber(indicator?.value, -Infinity, Infinity, 0),
      signal: validSignals.includes(indicator?.signal) ? indicator.signal : "NEUTRAL",
      strength: this.validateNumber(indicator?.strength, 0, 100, 50),
    };
  }

  private static validateChartPattern(pattern: any): ChartPattern {
    const validTypes = ["BULLISH", "BEARISH", "NEUTRAL"];

    return {
      name: pattern?.name || "Unknown Pattern",
      confidence: this.validateNumber(pattern?.confidence, 0, 100, 50),
      type: validTypes.includes(pattern?.type) ? pattern.type : "NEUTRAL",
      description: pattern?.description || "No description",
    };
  }

  private static validateNumber(value: any, min: number, max: number, defaultValue: number): number {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) return defaultValue;
    return Math.max(min, Math.min(max, num));
  }

  private static validatePositiveNumber(value: any, defaultValue: number): number {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num) || num < 0) return defaultValue;
    return num;
  }

  private static validateNumberArray(arr: any): number[] {
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((item) => {
        const num = Number(item);
        return !isNaN(num) && isFinite(num);
      })
      .map(Number);
  }

  static validateMarketCondition(condition: any): "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE" {
    const validConditions = ["BULLISH", "BEARISH", "NEUTRAL", "VOLATILE"];
    return validConditions.includes(condition) ? condition : "NEUTRAL";
  }

  static validateNumericValue(value: any): number | undefined {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num) || num <= 0) return undefined;
    return num;
  }

  static validatePercentage(value: any): number | undefined {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num) || num <= 0 || num > 100) return undefined;
    return num;
  }
}
