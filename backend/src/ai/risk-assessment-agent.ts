import { BaseAgent } from "./base-agent";

interface RiskData {
  portfolioBalance: number;
  currentPositions: number;
  symbol: string;
  proposedTradeSize: number;
  marketVolatility: number;
}

interface RiskAssessment {
  riskLevel: "low" | "medium" | "high";
  maxPositionSize: number;
  stopLoss: number;
  takeProfit: number;
  recommendation: "approve" | "reduce" | "reject";
  reasoning: string[];
}

export class RiskAssessmentAgent extends BaseAgent {
  constructor() {
    super("RiskAssessmentAgent");
  }

  async analyze(riskData: RiskData): Promise<RiskAssessment> {
    const prompt = `
      Assess the risk for the following trading scenario:
      Portfolio Balance: $${riskData.portfolioBalance}
      Current Positions: ${riskData.currentPositions}
      Symbol: ${riskData.symbol}
      Proposed Trade Size: $${riskData.proposedTradeSize}
      Market Volatility: ${riskData.marketVolatility}%

      Provide risk assessment with:
      1. Risk level (low/medium/high)
      2. Maximum recommended position size
      3. Suggested stop loss percentage
      4. Suggested take profit percentage
      5. Final recommendation (approve/reduce/reject)
      6. Reasoning for the decision

      Follow conservative risk management principles:
      - Never risk more than 2% of portfolio on single trade
      - Consider position sizing based on volatility
      - Account for existing positions

      Respond in JSON format with keys: riskLevel, maxPositionSize, stopLoss, takeProfit, recommendation, reasoning
    `;

    try {
      const response = await this.callLLM(prompt);
      const assessment = JSON.parse(response);

      // Apply hard limits
      const maxAllowed = riskData.portfolioBalance * 0.02; // 2% max risk
      const adjustedSize = Math.min(assessment.maxPositionSize || maxAllowed, maxAllowed);

      return {
        riskLevel: assessment.riskLevel || "medium",
        maxPositionSize: adjustedSize,
        stopLoss: assessment.stopLoss || 5,
        takeProfit: assessment.takeProfit || 10,
        recommendation: assessment.recommendation || "reduce",
        reasoning: assessment.reasoning || ["Conservative default applied"],
      };
    } catch (error) {
      // Conservative fallback
      return {
        riskLevel: "high",
        maxPositionSize: riskData.portfolioBalance * 0.01, // 1% max
        stopLoss: 3,
        takeProfit: 6,
        recommendation: "reduce",
        reasoning: ["Error in analysis - applying conservative limits"],
      };
    }
  }
}
