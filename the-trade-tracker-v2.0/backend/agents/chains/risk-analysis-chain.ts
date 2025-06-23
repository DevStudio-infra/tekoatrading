import { LLMChain } from "langchain/chains";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { HumanMessage } from "@langchain/core/messages";
import { AgentResult } from "../types/agent.types";
import { loggerService } from "../../services/logger.service";
import { langchainConfig } from "../../config/langchain.config";
import { RobustJSONParser } from "../../services/ai/json-parser";

export class RiskAnalysisChain extends LLMChain {
  private hasLLM: boolean = false;

  constructor(llm?: ChatGoogleGenerativeAI) {
    let model;
    let hasLLM = false;

    if (llm) {
      model = llm;
      hasLLM = true;
    } else if (langchainConfig.llm.googleApiKey) {
      model = new ChatGoogleGenerativeAI({
        model: langchainConfig.llm.modelName,
        temperature: langchainConfig.llm.temperature,
        maxOutputTokens: langchainConfig.llm.maxOutputTokens,
        apiKey: langchainConfig.llm.googleApiKey,
      });
      hasLLM = true;
    } else {
      // Create a dummy model for initialization - won't be used
      console.warn("⚠️  GOOGLE_API_KEY not found - RiskAnalysisChain will use fallback mode");
      model = {} as ChatGoogleGenerativeAI;
      hasLLM = false;
    }

    const prompt = PromptTemplate.fromTemplate(`
You are an expert risk analyst specializing in trading and portfolio management.
Analyze the provided trading scenario and provide comprehensive risk assessment.

Current Context:
- Symbol: {symbol}
- Position Details: {positionDetails}
- Account Balance: {accountBalance}
- Portfolio Information: {portfolioInfo}
- Market Conditions: {marketConditions}
- Risk Metrics: {riskMetrics}
- Technical Analysis: {technicalAnalysis}

Please provide a comprehensive risk analysis including:

1. POSITION RISK ASSESSMENT
   - Individual position risk level (1-10 scale)
   - Key risk factors for this position
   - Recommended position size adjustments

2. PORTFOLIO RISK ASSESSMENT
   - Overall portfolio risk level (1-10 scale)
   - Concentration risk analysis
   - Correlation risk between positions
   - Diversification recommendations

3. MARKET RISK ASSESSMENT
   - Current market regime assessment
   - Volatility risk analysis
   - Liquidity risk considerations
   - External risk factors (news, events)

4. RISK MITIGATION STRATEGIES
   - Specific stop-loss recommendations
   - Hedging strategies if applicable
   - Position sizing adjustments
   - Portfolio rebalancing suggestions

5. OVERALL RISK SCORE AND RECOMMENDATION
   - Combined risk score (1-10, where 10 is highest risk)
   - Clear PROCEED/CAUTION/ABORT recommendation
   - Key monitoring points going forward

Return your response as a valid JSON object containing positionRisk, portfolioRisk, marketRisk, mitigationStrategies, and overallAssessment sections with appropriate risk scores, levels, and recommendations.

Be precise, actionable, and conservative in your risk assessment. Better to be overly cautious than to underestimate risk.
    `);

    super({ llm: model, prompt });

    // Set instance variables after super call
    this.hasLLM = hasLLM;
  }

  async analyzeRisk(input: {
    symbol: string;
    positionDetails: any;
    accountBalance: number;
    portfolioInfo: any;
    marketConditions: any;
    riskMetrics: any;
    technicalAnalysis: any;
  }): Promise<any> {
    try {
      // If no LLM available, use fallback logic
      if (!this.hasLLM) {
        console.warn("⚠️  RiskAnalysisChain: Using fallback risk analysis (no LLM available)");
        return this.fallbackRiskAnalysis(input);
      }

      const result = await this.call({
        symbol: input.symbol,
        positionDetails: JSON.stringify(input.positionDetails, null, 2),
        accountBalance: input.accountBalance.toString(),
        portfolioInfo: JSON.stringify(input.portfolioInfo, null, 2),
        marketConditions: JSON.stringify(input.marketConditions, null, 2),
        riskMetrics: JSON.stringify(input.riskMetrics, null, 2),
        technicalAnalysis: JSON.stringify(input.technicalAnalysis, null, 2),
      });

      // Parse the result
      let parsedResult;
      try {
        parsedResult = RobustJSONParser.parseWithFallback(result.text);
      } catch (parseError) {
        loggerService.warn("Risk analysis JSON parsing failed, using fallback");
        parsedResult = {
          riskScore: 7,
          riskLevel: "HIGH",
          recommendation: "REVIEW",
          reasoning: "Risk analysis parsing failed - defaulting to conservative approach",
          portfolioRisk: { exposure: 0, concentration: 0 },
          tradeRisk: { volatility: "HIGH", liquidityRisk: "MEDIUM" },
          suggestions: ["Review risk analysis system before proceeding"],
        };
      }

      return {
        success: true,
        analysis: parsedResult,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error("Risk Analysis Chain Error:", error);

      // Fallback conservative risk assessment
      return {
        success: false,
        error: error.message,
        fallbackAnalysis: {
          overallAssessment: {
            riskScore: 8,
            recommendation: "ABORT",
            reasoning: "Unable to perform risk analysis due to system error - proceeding conservatively",
            monitoringPoints: ["Wait for system recovery", "Manual risk review required"],
          },
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  private fallbackRiskAnalysis(input: {
    symbol: string;
    positionDetails: any;
    accountBalance: number;
    portfolioInfo: any;
    marketConditions: any;
    riskMetrics: any;
    technicalAnalysis: any;
  }): any {
    // Calculate basic risk metrics
    const positionValue = input.positionDetails?.value || 0;
    const riskPercentage = (positionValue / input.accountBalance) * 100;

    let riskScore = 1;
    let recommendation = "PROCEED";
    let level = "LOW";

    if (riskPercentage > 10) {
      riskScore = 9;
      recommendation = "ABORT";
      level = "VERY HIGH";
    } else if (riskPercentage > 5) {
      riskScore = 6;
      recommendation = "CAUTION";
      level = "HIGH";
    } else if (riskPercentage > 2) {
      riskScore = 4;
      recommendation = "PROCEED";
      level = "MEDIUM";
    } else {
      riskScore = 2;
      recommendation = "PROCEED";
      level = "LOW";
    }

    return {
      success: true,
      analysis: {
        positionRisk: {
          score: riskScore,
          level,
          factors: [`Position represents ${riskPercentage.toFixed(2)}% of account`],
          recommendations: ["Monitor position size", "Consider stop-loss placement"],
        },
        portfolioRisk: {
          score: riskScore,
          level,
          concentrationRisk: riskPercentage > 5 ? 7 : 3,
          correlationRisk: 5,
          recommendations: ["Review portfolio diversification"],
        },
        marketRisk: {
          score: 5,
          regime: "NEUTRAL",
          volatilityLevel: "MEDIUM",
          liquidityRisk: 5,
          externalFactors: ["General market conditions"],
        },
        mitigationStrategies: {
          stopLoss: positionValue * 0.02, // 2% stop loss
          hedging: ["Consider position sizing"],
          positionSizing: "Keep position under 5% of account",
          rebalancing: ["Regular portfolio review"],
        },
        overallAssessment: {
          riskScore,
          recommendation,
          reasoning: `Fallback risk analysis - Position represents ${riskPercentage.toFixed(2)}% of account`,
          monitoringPoints: ["Monitor position performance", "Review market conditions"],
        },
      },
      timestamp: new Date().toISOString(),
      fallbackMode: true,
    };
  }

  async quickRiskCheck(symbol: string, positionSize: number, accountBalance: number): Promise<any> {
    try {
      // Quick risk assessment without full analysis
      const riskPercentage = (positionSize / accountBalance) * 100;

      let riskScore = 1;
      let recommendation = "PROCEED";
      let reasoning = "Low risk position";

      if (riskPercentage > 10) {
        riskScore = 9;
        recommendation = "ABORT";
        reasoning = "Position size exceeds 10% of account - too risky";
      } else if (riskPercentage > 5) {
        riskScore = 6;
        recommendation = "CAUTION";
        reasoning = "Position size is significant (>5% of account)";
      } else if (riskPercentage > 2) {
        riskScore = 3;
        recommendation = "PROCEED";
        reasoning = "Moderate position size within acceptable risk limits";
      }

      return {
        success: true,
        quickAssessment: {
          riskScore,
          recommendation,
          reasoning,
          riskPercentage,
          positionSize,
          accountBalance,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        quickAssessment: {
          riskScore: 10,
          recommendation: "ABORT",
          reasoning: "Unable to assess risk - defaulting to maximum caution",
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async validateRiskLimits(input: {
    currentPositions: number;
    maxPositions: number;
    portfolioRisk: number;
    maxRiskPercentage: number;
    correlationRisk: number;
    maxCorrelation: number;
  }): Promise<any> {
    try {
      const violations = [];
      let overallRisk = 1;

      // Check position limits
      if (input.currentPositions >= input.maxPositions) {
        violations.push(`Position limit exceeded: ${input.currentPositions}/${input.maxPositions}`);
        overallRisk = Math.max(overallRisk, 8);
      }

      // Check portfolio risk
      if (input.portfolioRisk > input.maxRiskPercentage) {
        violations.push(`Portfolio risk too high: ${input.portfolioRisk}% > ${input.maxRiskPercentage}%`);
        overallRisk = Math.max(overallRisk, 7);
      }

      // Check correlation risk
      if (input.correlationRisk > input.maxCorrelation) {
        violations.push(`Correlation risk too high: ${input.correlationRisk} > ${input.maxCorrelation}`);
        overallRisk = Math.max(overallRisk, 6);
      }

      const isValid = violations.length === 0;
      const recommendation = isValid ? "PROCEED" : "ABORT";

      return {
        success: true,
        validation: {
          isValid,
          violations,
          overallRisk,
          recommendation,
          checks: {
            positionLimit: input.currentPositions < input.maxPositions,
            portfolioRisk: input.portfolioRisk <= input.maxRiskPercentage,
            correlationRisk: input.correlationRisk <= input.maxCorrelation,
          },
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        validation: {
          isValid: false,
          violations: ["Risk validation system error"],
          overallRisk: 10,
          recommendation: "ABORT",
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
