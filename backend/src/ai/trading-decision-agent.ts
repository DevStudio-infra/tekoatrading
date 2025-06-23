import { BaseAgent } from "./base-agent";
import { TechnicalAnalysisAgent } from "./technical-analysis-agent";
import { RiskAssessmentAgent } from "./risk-assessment-agent";

interface TradingDecision {
  action: "buy" | "sell" | "hold";
  quantity: number;
  confidence: number;
  reasoning: string[];
  technicalAnalysis: any;
  riskAssessment: any;
}

export class TradingDecisionAgent extends BaseAgent {
  private technicalAgent: TechnicalAnalysisAgent;
  private riskAgent: RiskAssessmentAgent;

  constructor() {
    super("TradingDecisionAgent");
    this.technicalAgent = new TechnicalAnalysisAgent();
    this.riskAgent = new RiskAssessmentAgent();
  }

  async analyze(data: { marketData: any; riskData: any }): Promise<TradingDecision> {
    try {
      // Get technical analysis
      const technicalAnalysis = await this.technicalAgent.analyze(data.marketData);

      // Get risk assessment
      const riskAssessment = await this.riskAgent.analyze(data.riskData);

      // Make final decision
      const decision = await this.makeFinalDecision(technicalAnalysis, riskAssessment);

      return {
        action: decision.action,
        quantity: decision.quantity,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        technicalAnalysis,
        riskAssessment,
      };
    } catch (error) {
      return {
        action: "hold",
        quantity: 0,
        confidence: 0,
        reasoning: ["Error in decision making - defaulting to hold"],
        technicalAnalysis: null,
        riskAssessment: null,
      };
    }
  }

  private async makeFinalDecision(technical: any, risk: any) {
    const prompt = `
      Make a final trading decision based on:

      Technical Analysis:
      - Trend: ${technical.trend}
      - Strength: ${technical.strength}/10
      - Recommendation: ${technical.recommendation}
      - Confidence: ${technical.confidence}

      Risk Assessment:
      - Risk Level: ${risk.riskLevel}
      - Max Position Size: $${risk.maxPositionSize}
      - Recommendation: ${risk.recommendation}

      Rules:
      1. If risk recommendation is "reject", action must be "hold"
      2. If technical confidence < 0.6, be conservative
      3. Consider both technical and risk factors equally
      4. Provide clear reasoning

      Respond in JSON format with keys: action, quantity, confidence, reasoning
    `;

    try {
      const response = await this.callLLM(prompt);
      const decision = JSON.parse(response);

      // Apply safety checks
      if (risk.recommendation === "reject") {
        return {
          action: "hold",
          quantity: 0,
          confidence: 0,
          reasoning: ["Risk assessment rejected the trade"],
        };
      }

      return {
        action: decision.action || "hold",
        quantity: Math.min(decision.quantity || 0, risk.maxPositionSize),
        confidence: decision.confidence || 0,
        reasoning: decision.reasoning || ["Default decision applied"],
      };
    } catch (error) {
      return {
        action: "hold",
        quantity: 0,
        confidence: 0,
        reasoning: ["Error in final decision - defaulting to hold"],
      };
    }
  }
}
