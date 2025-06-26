import { BaseAgent } from "./base-agent";

interface RiskCalculationParams {
  symbol: string;
  action: "buy" | "sell";
  currentPrice: number;
  timeframe: string;
  strategy: string;
  volatility: number; // ATR or volatility measure
  support: number;
  resistance: number;
  accountBalance: number;
  positionSize: number;
}

interface RiskLevels {
  stopLoss: number;
  takeProfit: number;
  riskAmount: number;
  rewardAmount: number;
  riskRewardRatio: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  reasoning: string[];
}

export class ProfessionalRiskCalculator extends BaseAgent {
  constructor() {
    super("ProfessionalRiskCalculator");
  }

  async analyze(data: any): Promise<any> {
    return this.calculateRiskLevels(data);
  }

  async calculateRiskLevels(params: RiskCalculationParams): Promise<RiskLevels> {
    try {
      // Calculate base levels using multiple methods
      const timeframeLevels = this.calculateTimeframeLevels(params);
      const strategyLevels = this.calculateStrategyLevels(params);
      const volatilityLevels = this.calculateVolatilityLevels(params);
      const technicalLevels = this.calculateTechnicalLevels(params);

      // Combine and optimize levels
      const optimizedLevels = this.optimizeLevels(
        params,
        timeframeLevels,
        strategyLevels,
        volatilityLevels,
        technicalLevels,
      );

      return optimizedLevels;
    } catch (error) {
      // Conservative fallback
      return this.getConservativeFallback(params);
    }
  }

  private calculateTimeframeLevels(params: RiskCalculationParams): Partial<RiskLevels> {
    const { timeframe, currentPrice, action } = params;
    let stopLossPercent: number;
    let takeProfitPercent: number;

    // Professional timeframe-based risk levels
    switch (timeframe.toUpperCase()) {
      case "1M":
        stopLossPercent = 0.3; // 0.3% for 1-minute scalping
        takeProfitPercent = 0.6;
        break;
      case "5M":
        stopLossPercent = 0.5; // 0.5% for 5-minute scalping
        takeProfitPercent = 1.0;
        break;
      case "15M":
        stopLossPercent = 1.0; // 1% for 15-minute swings
        takeProfitPercent = 2.0;
        break;
      case "30M":
        stopLossPercent = 1.5; // 1.5% for 30-minute swings
        takeProfitPercent = 3.0;
        break;
      case "1H":
        stopLossPercent = 2.0; // 2% for hourly positions
        takeProfitPercent = 4.0;
        break;
      case "4H":
        stopLossPercent = 3.0; // 3% for 4-hour positions
        takeProfitPercent = 6.0;
        break;
      case "1D":
        stopLossPercent = 4.0; // 4% for daily positions
        takeProfitPercent = 8.0;
        break;
      case "1W":
        stopLossPercent = 6.0; // 6% for weekly positions
        takeProfitPercent = 12.0;
        break;
      default:
        stopLossPercent = 2.0; // Default 2%
        takeProfitPercent = 4.0;
    }

    // Calculate actual prices
    const stopLoss =
      action === "buy"
        ? currentPrice * (1 - stopLossPercent / 100)
        : currentPrice * (1 + stopLossPercent / 100);

    const takeProfit =
      action === "buy"
        ? currentPrice * (1 + takeProfitPercent / 100)
        : currentPrice * (1 - takeProfitPercent / 100);

    return {
      stopLoss,
      takeProfit,
      stopLossPercent,
      takeProfitPercent,
      reasoning: [`Timeframe ${timeframe}: ${stopLossPercent}% SL, ${takeProfitPercent}% TP`],
    };
  }

  private calculateStrategyLevels(params: RiskCalculationParams): Partial<RiskLevels> {
    const { strategy, currentPrice, action } = params;
    const reasoning: string[] = [];
    let stopLossMultiplier = 1.0;
    let takeProfitMultiplier = 1.0;

    // Strategy-specific adjustments
    switch (strategy.toLowerCase()) {
      case "scalping":
        stopLossMultiplier = 0.5; // Tighter stops for scalping
        takeProfitMultiplier = 0.7;
        reasoning.push("Scalping: Tighter levels for quick profits");
        break;

      case "momentum":
      case "breakout":
        stopLossMultiplier = 0.8; // Slightly tighter for momentum
        takeProfitMultiplier = 1.5; // Bigger targets for trends
        reasoning.push("Momentum/Breakout: Let winners run");
        break;

      case "mean_reversion":
        stopLossMultiplier = 1.2; // Wider stops for reversions
        takeProfitMultiplier = 0.8; // Smaller targets
        reasoning.push("Mean Reversion: Wider stops, modest targets");
        break;

      case "swing_trading":
        stopLossMultiplier = 1.1; // Standard swing levels
        takeProfitMultiplier = 1.2;
        reasoning.push("Swing Trading: Balanced risk-reward");
        break;

      case "trend_following":
        stopLossMultiplier = 1.0;
        takeProfitMultiplier = 2.0; // Large targets for trends
        reasoning.push("Trend Following: Large profit targets");
        break;

      case "support_resistance":
        // Use technical levels (handled separately)
        stopLossMultiplier = 0.9;
        takeProfitMultiplier = 1.1;
        reasoning.push("Support/Resistance: Level-based targets");
        break;

      default:
        reasoning.push("Default strategy levels applied");
    }

    return {
      reasoning,
    };
  }

  private calculateVolatilityLevels(params: RiskCalculationParams): Partial<RiskLevels> {
    const { volatility, currentPrice } = params;
    const reasoning: string[] = [];

    // Volatility-based adjustments (using ATR-like concept)
    let volatilityMultiplier = 1.0;

    if (volatility > 3.0) {
      // High volatility - wider stops
      volatilityMultiplier = 1.5;
      reasoning.push(`High volatility (${volatility.toFixed(2)}): Wider stops needed`);
    } else if (volatility > 2.0) {
      // Medium volatility
      volatilityMultiplier = 1.2;
      reasoning.push(`Medium volatility (${volatility.toFixed(2)}): Moderate adjustment`);
    } else if (volatility < 1.0) {
      // Low volatility - tighter stops
      volatilityMultiplier = 0.8;
      reasoning.push(`Low volatility (${volatility.toFixed(2)}): Tighter stops possible`);
    } else {
      reasoning.push(`Normal volatility (${volatility.toFixed(2)}): Standard levels`);
    }

    return {
      reasoning,
    };
  }

  private calculateTechnicalLevels(params: RiskCalculationParams): Partial<RiskLevels> {
    const { action, currentPrice, support, resistance } = params;
    const reasoning: string[] = [];

    // Align stops with technical levels
    let technicalStopLoss: number;
    let technicalTakeProfit: number;

    if (action === "buy") {
      // For long positions
      technicalStopLoss = support * 0.999; // Just below support
      technicalTakeProfit = resistance * 0.999; // Just below resistance
      reasoning.push(
        `Long: SL below support (${support.toFixed(4)}), TP near resistance (${resistance.toFixed(4)})`,
      );
    } else {
      // For short positions
      technicalStopLoss = resistance * 1.001; // Just above resistance
      technicalTakeProfit = support * 1.001; // Just above support
      reasoning.push(
        `Short: SL above resistance (${resistance.toFixed(4)}), TP near support (${support.toFixed(4)})`,
      );
    }

    return {
      stopLoss: technicalStopLoss,
      takeProfit: technicalTakeProfit,
      reasoning,
    };
  }

  private optimizeLevels(
    params: RiskCalculationParams,
    timeframeLevels: Partial<RiskLevels>,
    strategyLevels: Partial<RiskLevels>,
    volatilityLevels: Partial<RiskLevels>,
    technicalLevels: Partial<RiskLevels>,
  ): RiskLevels {
    const reasoning: string[] = [];

    // Start with timeframe-based levels
    let stopLoss = timeframeLevels.stopLoss!;
    let takeProfit = timeframeLevels.takeProfit!;

    // Compare with technical levels and choose the more conservative
    if (params.action === "buy") {
      // For long positions, use the higher stop loss (more conservative)
      if (technicalLevels.stopLoss! > stopLoss) {
        stopLoss = technicalLevels.stopLoss!;
        reasoning.push("Using technical support level for more conservative SL");
      }
      // For take profit, use the closer target
      if (technicalLevels.takeProfit! < takeProfit) {
        takeProfit = technicalLevels.takeProfit!;
        reasoning.push("Using resistance level as realistic TP target");
      }
    } else {
      // For short positions, use the lower stop loss (more conservative)
      if (technicalLevels.stopLoss! < stopLoss) {
        stopLoss = technicalLevels.stopLoss!;
        reasoning.push("Using technical resistance level for more conservative SL");
      }
      // For take profit, use the closer target
      if (technicalLevels.takeProfit! > takeProfit) {
        takeProfit = technicalLevels.takeProfit!;
        reasoning.push("Using support level as realistic TP target");
      }
    }

    // Apply volatility adjustments
    const volatilityAdjustment = this.getVolatilityAdjustment(params.volatility);
    const adjustedStopDistance = Math.abs(stopLoss - params.currentPrice) * volatilityAdjustment;

    if (params.action === "buy") {
      stopLoss = params.currentPrice - adjustedStopDistance;
    } else {
      stopLoss = params.currentPrice + adjustedStopDistance;
    }

    // Calculate risk metrics
    const riskAmount = Math.abs(stopLoss - params.currentPrice) * params.positionSize;
    const rewardAmount = Math.abs(takeProfit - params.currentPrice) * params.positionSize;
    const riskRewardRatio = rewardAmount / riskAmount;

    const stopLossPercent = (Math.abs(stopLoss - params.currentPrice) / params.currentPrice) * 100;
    const takeProfitPercent =
      (Math.abs(takeProfit - params.currentPrice) / params.currentPrice) * 100;

    // Combine all reasoning
    const allReasoning = [
      ...timeframeLevels.reasoning!,
      ...strategyLevels.reasoning!,
      ...volatilityLevels.reasoning!,
      ...technicalLevels.reasoning!,
      ...reasoning,
      `Final R:R ratio: ${riskRewardRatio.toFixed(2)}:1`,
    ];

    return {
      stopLoss: parseFloat(stopLoss.toFixed(6)),
      takeProfit: parseFloat(takeProfit.toFixed(6)),
      riskAmount: parseFloat(riskAmount.toFixed(2)),
      rewardAmount: parseFloat(rewardAmount.toFixed(2)),
      riskRewardRatio: parseFloat(riskRewardRatio.toFixed(2)),
      stopLossPercent: parseFloat(stopLossPercent.toFixed(2)),
      takeProfitPercent: parseFloat(takeProfitPercent.toFixed(2)),
      reasoning: allReasoning,
    };
  }

  private getVolatilityAdjustment(volatility: number): number {
    // Adjust stop distance based on volatility
    if (volatility > 3.0) return 1.5; // 50% wider stops
    if (volatility > 2.0) return 1.2; // 20% wider stops
    if (volatility < 1.0) return 0.8; // 20% tighter stops
    return 1.0; // Normal volatility
  }

  private getConservativeFallback(params: RiskCalculationParams): RiskLevels {
    const stopLossPercent = 2.0; // Conservative 2%
    const takeProfitPercent = 4.0; // Conservative 2:1 R:R

    const stopLoss =
      params.action === "buy"
        ? params.currentPrice * (1 - stopLossPercent / 100)
        : params.currentPrice * (1 + stopLossPercent / 100);

    const takeProfit =
      params.action === "buy"
        ? params.currentPrice * (1 + takeProfitPercent / 100)
        : params.currentPrice * (1 - takeProfitPercent / 100);

    const riskAmount = Math.abs(stopLoss - params.currentPrice) * params.positionSize;
    const rewardAmount = Math.abs(takeProfit - params.currentPrice) * params.positionSize;

    return {
      stopLoss: parseFloat(stopLoss.toFixed(6)),
      takeProfit: parseFloat(takeProfit.toFixed(6)),
      riskAmount: parseFloat(riskAmount.toFixed(2)),
      rewardAmount: parseFloat(rewardAmount.toFixed(2)),
      riskRewardRatio: 2.0,
      stopLossPercent,
      takeProfitPercent,
      reasoning: ["Error in calculation - using conservative 2% SL, 4% TP"],
    };
  }
}
