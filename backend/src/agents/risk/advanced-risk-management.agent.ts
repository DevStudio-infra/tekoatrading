import { BaseAgent } from "../../ai/base-agent";
import { logger } from "../../logger";

export interface RiskManagementInput {
  symbol: string;
  timeframe: string;
  entryPrice: number;
  direction: "BUY" | "SELL";
  accountBalance: number;
  riskPercentage: number; // Max risk per trade (e.g., 2%)
  candleData: any[];
  atr: number;
  supportResistanceLevels: {
    support: number[];
    resistance: number[];
  };
  recentVolatility: number;
  marketStructure: "TRENDING" | "RANGING" | "BREAKOUT";
}

export interface RiskManagementResult {
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  riskRewardRatio: number;
  maxRiskAmount: number;
  reasoning: string;
  confidence: number;
  warnings: string[];
}

export class AdvancedRiskManagementAgent extends BaseAgent {
  constructor() {
    super("AdvancedRiskManagementAgent");
  }

  // Implement abstract analyze method
  async analyze(data: RiskManagementInput): Promise<RiskManagementResult> {
    return this.calculateOptimalRiskLevels(data);
  }

  async calculateOptimalRiskLevels(data: RiskManagementInput): Promise<RiskManagementResult> {
    try {
      logger.info(`🎯 Risk Management Agent analyzing ${data.symbol} ${data.timeframe}`);

      // 1. Calculate timeframe-appropriate constraints
      const timeframeConstraints = this.getTimeframeConstraints(data.timeframe);

      // 2. Calculate multiple SL/TP scenarios
      const scenarios = this.calculateMultipleScenarios(data, timeframeConstraints);

      // 3. Get LLM evaluation for best scenario
      const llmEvaluation = await this.getLLMRiskEvaluation(data, scenarios);

      // 4. Select optimal scenario with validation
      const optimalScenario = this.selectOptimalScenario(scenarios, llmEvaluation, data);

      // 5. Calculate position size
      const positionSize = this.calculatePositionSize(
        data.accountBalance,
        data.riskPercentage,
        data.entryPrice,
        optimalScenario.stopLoss,
      );

      const result: RiskManagementResult = {
        stopLoss: optimalScenario.stopLoss,
        takeProfit: optimalScenario.takeProfit,
        positionSize: positionSize,
        riskRewardRatio: optimalScenario.riskRewardRatio,
        maxRiskAmount: (data.accountBalance * data.riskPercentage) / 100,
        reasoning: optimalScenario.reasoning,
        confidence: optimalScenario.confidence,
        warnings: optimalScenario.warnings,
      };

      logger.info(
        `✅ Risk Management: SL=${result.stopLoss}, TP=${result.takeProfit}, RR=${result.riskRewardRatio}`,
      );
      return result;
    } catch (error) {
      logger.error(`❌ Risk Management Agent failed:`, error);
      throw error;
    }
  }

  private getTimeframeConstraints(timeframe: string) {
    const constraints = {
      "1m": { maxSLPips: 10, maxTPPips: 30, maxRR: 3, minRR: 1.2 },
      "5m": { maxSLPips: 20, maxTPPips: 60, maxRR: 4, minRR: 1.5 },
      "15m": { maxSLPips: 30, maxTPPips: 90, maxRR: 5, minRR: 1.8 },
      "1h": { maxSLPips: 50, maxTPPips: 150, maxRR: 6, minRR: 2.0 },
      "4h": { maxSLPips: 100, maxTPPips: 300, maxRR: 8, minRR: 2.5 },
      "1d": { maxSLPips: 200, maxTPPips: 600, maxRR: 10, minRR: 3.0 },
    };

    return constraints[timeframe as keyof typeof constraints] || constraints["1h"];
  }

  private calculateMultipleScenarios(data: RiskManagementInput, constraints: any) {
    const scenarios = [];

    // Scenario 1: ATR-based (Conservative)
    scenarios.push(this.calculateATRScenario(data, constraints, 0.8));

    // Scenario 2: ATR-based (Moderate)
    scenarios.push(this.calculateATRScenario(data, constraints, 1.2));

    // Scenario 3: Support/Resistance based
    scenarios.push(this.calculateSupportResistanceScenario(data, constraints));

    // Scenario 4: Volatility-adjusted
    scenarios.push(this.calculateVolatilityScenario(data, constraints));

    // Scenario 5: Market structure based
    scenarios.push(this.calculateMarketStructureScenario(data, constraints));

    return scenarios;
  }

  private calculateATRScenario(data: RiskManagementInput, constraints: any, multiplier: number) {
    const atrSL = data.atr * multiplier;
    const atrTP = atrSL * 2.5; // 2.5:1 RR ratio

    let stopLoss, takeProfit;

    if (data.direction === "BUY") {
      stopLoss = data.entryPrice - atrSL;
      takeProfit = data.entryPrice + atrTP;
    } else {
      stopLoss = data.entryPrice + atrSL;
      takeProfit = data.entryPrice - atrTP;
    }

    const riskRewardRatio =
      Math.abs(takeProfit - data.entryPrice) / Math.abs(data.entryPrice - stopLoss);

    return {
      type: `ATR-${multiplier}x`,
      stopLoss: Number(stopLoss.toFixed(5)),
      takeProfit: Number(takeProfit.toFixed(5)),
      riskRewardRatio: Number(riskRewardRatio.toFixed(2)),
      reasoning: `ATR-based with ${multiplier}x multiplier`,
      confidence: 0.7,
      warnings: [],
    };
  }

  private calculateSupportResistanceScenario(data: RiskManagementInput, constraints: any) {
    const { support, resistance } = data.supportResistanceLevels;
    let stopLoss, takeProfit;

    if (data.direction === "BUY") {
      // Stop loss below nearest support
      const nearestSupport = support.filter((s) => s < data.entryPrice).sort((a, b) => b - a)[0];
      stopLoss = nearestSupport
        ? nearestSupport - data.atr * 0.2
        : data.entryPrice - data.atr * 1.5;

      // Take profit at resistance
      const nearestResistance = resistance
        .filter((r) => r > data.entryPrice)
        .sort((a, b) => a - b)[0];
      takeProfit = nearestResistance
        ? nearestResistance - data.atr * 0.1
        : data.entryPrice + data.atr * 3;
    } else {
      // Stop loss above nearest resistance
      const nearestResistance = resistance
        .filter((r) => r > data.entryPrice)
        .sort((a, b) => a - b)[0];
      stopLoss = nearestResistance
        ? nearestResistance + data.atr * 0.2
        : data.entryPrice + data.atr * 1.5;

      // Take profit at support
      const nearestSupport = support.filter((s) => s < data.entryPrice).sort((a, b) => b - a)[0];
      takeProfit = nearestSupport
        ? nearestSupport + data.atr * 0.1
        : data.entryPrice - data.atr * 3;
    }

    const riskRewardRatio =
      Math.abs(takeProfit - data.entryPrice) / Math.abs(data.entryPrice - stopLoss);

    return {
      type: "Support/Resistance",
      stopLoss: Number(stopLoss.toFixed(5)),
      takeProfit: Number(takeProfit.toFixed(5)),
      riskRewardRatio: Number(riskRewardRatio.toFixed(2)),
      reasoning: "Based on key support/resistance levels",
      confidence: 0.8,
      warnings: [],
    };
  }

  private calculateVolatilityScenario(data: RiskManagementInput, constraints: any) {
    // Adjust based on recent volatility
    const volatilityMultiplier = Math.min(Math.max(data.recentVolatility / 100, 0.5), 2.0);
    const adjustedATR = data.atr * volatilityMultiplier;

    let stopLoss, takeProfit;

    if (data.direction === "BUY") {
      stopLoss = data.entryPrice - adjustedATR;
      takeProfit = data.entryPrice + adjustedATR * 2.2;
    } else {
      stopLoss = data.entryPrice + adjustedATR;
      takeProfit = data.entryPrice - adjustedATR * 2.2;
    }

    const riskRewardRatio =
      Math.abs(takeProfit - data.entryPrice) / Math.abs(data.entryPrice - stopLoss);

    return {
      type: "Volatility-Adjusted",
      stopLoss: Number(stopLoss.toFixed(5)),
      takeProfit: Number(takeProfit.toFixed(5)),
      riskRewardRatio: Number(riskRewardRatio.toFixed(2)),
      reasoning: `Volatility-adjusted (${volatilityMultiplier.toFixed(2)}x)`,
      confidence: 0.75,
      warnings: [],
    };
  }

  private calculateMarketStructureScenario(data: RiskManagementInput, constraints: any) {
    let atrMultiplier;
    let rrTarget;

    switch (data.marketStructure) {
      case "TRENDING":
        atrMultiplier = 1.0;
        rrTarget = 3.0;
        break;
      case "RANGING":
        atrMultiplier = 0.6;
        rrTarget = 1.8;
        break;
      case "BREAKOUT":
        atrMultiplier = 1.5;
        rrTarget = 2.5;
        break;
      default:
        atrMultiplier = 1.0;
        rrTarget = 2.5;
    }

    const adjustedATR = data.atr * atrMultiplier;
    let stopLoss, takeProfit;

    if (data.direction === "BUY") {
      stopLoss = data.entryPrice - adjustedATR;
      takeProfit = data.entryPrice + adjustedATR * rrTarget;
    } else {
      stopLoss = data.entryPrice + adjustedATR;
      takeProfit = data.entryPrice - adjustedATR * rrTarget;
    }

    const riskRewardRatio =
      Math.abs(takeProfit - data.entryPrice) / Math.abs(data.entryPrice - stopLoss);

    return {
      type: "Market Structure",
      stopLoss: Number(stopLoss.toFixed(5)),
      takeProfit: Number(takeProfit.toFixed(5)),
      riskRewardRatio: Number(riskRewardRatio.toFixed(2)),
      reasoning: `${data.marketStructure} market structure approach`,
      confidence: 0.85,
      warnings: [],
    };
  }

  private async getLLMRiskEvaluation(data: RiskManagementInput, scenarios: any[]) {
    const prompt = `
You are a professional risk management expert analyzing trading scenarios for ${data.symbol} on ${data.timeframe} timeframe.

CURRENT SITUATION:
- Symbol: ${data.symbol}
- Timeframe: ${data.timeframe}
- Entry Price: ${data.entryPrice}
- Direction: ${data.direction}
- Account Balance: $${data.accountBalance}
- Risk Percentage: ${data.riskPercentage}%
- ATR: ${data.atr}
- Market Structure: ${data.marketStructure}

SCENARIOS TO EVALUATE:
${scenarios
  .map(
    (s, i) => `
${i + 1}. ${s.type}:
   - Stop Loss: ${s.stopLoss}
   - Take Profit: ${s.takeProfit}
   - Risk/Reward: ${s.riskRewardRatio}:1
   - Reasoning: ${s.reasoning}
`,
  )
  .join("\n")}

EVALUATE EACH SCENARIO considering:
1. Timeframe appropriateness (${data.timeframe} should have realistic levels)
2. Market structure compatibility
3. Risk/reward ratio quality
4. Probability of success
5. Account preservation

CRITICAL CONSTRAINTS for ${data.timeframe}:
- 1m: SL should be 5-15 pips, TP should be 10-40 pips
- 5m: SL should be 10-25 pips, TP should be 20-75 pips
- 15m: SL should be 15-35 pips, TP should be 30-105 pips
- 1h+: Can be larger but still reasonable

Rank scenarios 1-5 (best to worst) and explain why. Focus on REALISTIC levels for the timeframe.

Response format:
RANKING: [1,2,3,4,5]
BEST_SCENARIO: [scenario number]
REASONING: [detailed explanation]
TIMEFRAME_APPROPRIATE: [yes/no]
RECOMMENDED_ADJUSTMENTS: [any suggestions]
`;

    try {
      const response = await this.queryLLM(prompt, {
        temperature: 0.3,
        maxTokens: 1000,
      });

      return this.parseRiskEvaluation(response);
    } catch (error) {
      logger.error("❌ LLM Risk Evaluation failed:", error);
      return {
        ranking: [1, 2, 3, 4, 5],
        bestScenario: 1,
        reasoning: "Default ranking due to LLM error",
        timeframeAppropriate: false,
        adjustments: ["Manual review required"],
      };
    }
  }

  private parseRiskEvaluation(response: string) {
    try {
      const rankingMatch = response.match(/RANKING:\s*\[([^\]]+)\]/);
      const bestScenarioMatch = response.match(/BEST_SCENARIO:\s*(\d+)/);
      const reasoningMatch = response.match(/REASONING:\s*([^\n]+)/);
      const timeframeMatch = response.match(/TIMEFRAME_APPROPRIATE:\s*(yes|no)/i);
      const adjustmentsMatch = response.match(/RECOMMENDED_ADJUSTMENTS:\s*([^\n]+)/);

      return {
        ranking: rankingMatch
          ? rankingMatch[1].split(",").map((n) => parseInt(n.trim()))
          : [1, 2, 3, 4, 5],
        bestScenario: bestScenarioMatch ? parseInt(bestScenarioMatch[1]) : 1,
        reasoning: reasoningMatch ? reasoningMatch[1] : "No reasoning provided",
        timeframeAppropriate: timeframeMatch ? timeframeMatch[1].toLowerCase() === "yes" : false,
        adjustments: adjustmentsMatch ? [adjustmentsMatch[1]] : [],
      };
    } catch (error) {
      logger.error("❌ Failed to parse risk evaluation:", error);
      return {
        ranking: [1, 2, 3, 4, 5],
        bestScenario: 1,
        reasoning: "Parse error - using default",
        timeframeAppropriate: false,
        adjustments: ["Manual review required"],
      };
    }
  }

  private selectOptimalScenario(scenarios: any[], llmEvaluation: any, data: RiskManagementInput) {
    const bestScenarioIndex = llmEvaluation.bestScenario - 1 || 0;
    let selectedScenario = scenarios[bestScenarioIndex];

    // Apply constraints and validation
    const constraints = this.getTimeframeConstraints(data.timeframe);
    const warnings = [];

    // Validate risk/reward ratio
    if (selectedScenario.riskRewardRatio < constraints.minRR) {
      warnings.push(
        `Risk/Reward ratio ${selectedScenario.riskRewardRatio} is below minimum ${constraints.minRR}`,
      );
    }

    if (selectedScenario.riskRewardRatio > constraints.maxRR) {
      warnings.push(
        `Risk/Reward ratio ${selectedScenario.riskRewardRatio} is above maximum ${constraints.maxRR}`,
      );
      selectedScenario.riskRewardRatio = constraints.maxRR;
    }

    // Validate pip distances for timeframe
    const slPips = Math.abs(data.entryPrice - selectedScenario.stopLoss) * 10000;
    const tpPips = Math.abs(selectedScenario.takeProfit - data.entryPrice) * 10000;

    if (slPips > constraints.maxSLPips) {
      warnings.push(
        `Stop loss ${slPips.toFixed(1)} pips exceeds maximum ${constraints.maxSLPips} for ${data.timeframe}`,
      );
    }

    if (tpPips > constraints.maxTPPips) {
      warnings.push(
        `Take profit ${tpPips.toFixed(1)} pips exceeds maximum ${constraints.maxTPPips} for ${data.timeframe}`,
      );
    }

    // Add LLM evaluation insights
    selectedScenario.reasoning = `${selectedScenario.reasoning}. ${llmEvaluation.reasoning}`;
    selectedScenario.warnings = warnings;

    // Adjust confidence based on timeframe appropriateness
    if (!llmEvaluation.timeframeAppropriate) {
      selectedScenario.confidence *= 0.7;
      warnings.push("Levels may not be appropriate for this timeframe");
    }

    return selectedScenario;
  }

  private calculatePositionSize(
    accountBalance: number,
    riskPercentage: number,
    entryPrice: number,
    stopLoss: number,
  ) {
    const riskAmount = (accountBalance * riskPercentage) / 100;
    const stopLossDistance = Math.abs(entryPrice - stopLoss);
    const positionSize = riskAmount / stopLossDistance;

    return Number(positionSize.toFixed(2));
  }
}

// Export singleton instance
export const advancedRiskManagementAgent = new AdvancedRiskManagementAgent();
