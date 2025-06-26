import { BaseAgent } from "./base-agent";
import { TechnicalAnalysisAgent } from "./technical-analysis-agent";
import { RiskAssessmentAgent } from "./risk-assessment-agent";
import { ProfessionalOrderDecisionAgent } from "./professional-order-decision-agent";
import { ProfessionalRiskCalculator } from "./professional-risk-calculator";
import { PortfolioContextAgent } from "./portfolio-context-agent";
import { TradeManagementAgent } from "./trade-management-agent";

interface TradingContext {
  symbol: string;
  timeframe: string;
  strategy: string;
  marketData: any;
  accountBalance: number;
  openPositions: any[];
  riskTolerance: "conservative" | "moderate" | "aggressive";
}

interface ProfessionalTradingDecision {
  // Decision outcome
  action: "BUY" | "SELL" | "HOLD" | "CLOSE" | "MODIFY";
  confidence: number;

  // Order details
  orderType: "MARKET" | "LIMIT" | "STOP";
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;

  // Risk management
  stopLoss: number;
  takeProfit: number;
  maxRisk: number;
  riskRewardRatio: number;

  // Analysis summary
  technicalAnalysis: any;
  riskAssessment: any;
  portfolioImpact: any;

  // Professional insights
  reasoning: string[];
  marketConditions: string;
  strategyAlignment: number; // 0-100 how well trade aligns with strategy
  timeframeSuitability: number; // 0-100 how suitable trade is for timeframe

  // Validation
  validated: boolean;
  warnings: string[];
  recommendations: string[];
}

export class MasterProfessionalTradingAgent extends BaseAgent {
  private technicalAgent: TechnicalAnalysisAgent;
  private riskAgent: RiskAssessmentAgent;
  private orderDecisionAgent: ProfessionalOrderDecisionAgent;
  private riskCalculator: ProfessionalRiskCalculator;
  private portfolioAgent: PortfolioContextAgent;
  private tradeManagementAgent: TradeManagementAgent;

  constructor() {
    super("MasterProfessionalTradingAgent");
    this.technicalAgent = new TechnicalAnalysisAgent();
    this.riskAgent = new RiskAssessmentAgent();
    this.orderDecisionAgent = new ProfessionalOrderDecisionAgent();
    this.riskCalculator = new ProfessionalRiskCalculator();
    this.portfolioAgent = new PortfolioContextAgent();
    this.tradeManagementAgent = new TradeManagementAgent();
  }

  async analyze(data: any): Promise<any> {
    return this.analyzeTradingDecision(data);
  }

  async analyzeTradingDecision(context: TradingContext): Promise<ProfessionalTradingDecision> {
    try {
      console.log(
        `🤖 Master Trading Agent analyzing ${context.symbol} on ${context.timeframe} using ${context.strategy}`,
      );

      // Phase 1: Multi-Agent Analysis (Parallel)
      const analysisResults = await this.conductMultiAgentAnalysis(context);

      // Phase 2: Professional Decision Making
      const decision = await this.makeProfessionalDecision(context, analysisResults);

      // Phase 3: Validation & Risk Checks
      const validatedDecision = await this.validateDecision(context, decision);

      console.log(
        `✅ Professional decision: ${validatedDecision.action} ${validatedDecision.quantity} ${context.symbol} (Confidence: ${validatedDecision.confidence})`,
      );

      return validatedDecision;
    } catch (error) {
      console.error("❌ Error in professional trading decision:", error);
      return this.getConservativeDecision(context);
    }
  }

  async manageExistingPosition(positionId: string, position: any): Promise<any> {
    try {
      console.log(`📊 Managing position ${positionId} for ${position.symbol}`);

      // Use trade management agent
      const managementAction = await this.tradeManagementAgent.analyzePosition(position);

      // Additional validation based on portfolio context
      if (managementAction.action !== "HOLD") {
        const portfolioContext = await this.portfolioAgent.analyzePortfolio({
          accountContext: {
            balance: position.account || 10000,
            availableMargin: (position.account || 10000) * 0.5,
            equity: position.account || 10000,
            marginLevel: 300,
            currency: "USD",
            unrealizedPnL: 0,
          },
          openPositions: position.openPositions || [],
          proposedTrade: {
            symbol: position.symbol,
            amount: 0,
            action: "buy",
            price: position.currentPrice,
          },
        });

        // Adjust action based on portfolio risk
        if (
          portfolioContext.riskLevel === "CRITICAL" &&
          managementAction.action === "EXTEND_TARGET"
        ) {
          managementAction.action = "PARTIAL_CLOSE";
          managementAction.reasoning.push(
            "Portfolio risk critical - converting target extension to partial close",
          );
        }
      }

      return managementAction;
    } catch (error) {
      console.error("❌ Error in position management:", error);
      return { action: "HOLD", reasoning: ["Error in analysis"], confidence: 0.3, priority: "LOW" };
    }
  }

  private async conductMultiAgentAnalysis(context: TradingContext): Promise<any> {
    try {
      // Run all analyses in parallel for efficiency
      const [technicalAnalysis, portfolioContext, riskAssessment] = await Promise.all([
        this.technicalAgent.analyze(context.marketData),
        this.portfolioAgent.analyzePortfolio({
          accountContext: {
            balance: context.accountBalance,
            availableMargin: context.accountBalance * 0.5, // Assume 50% available as margin
            equity: context.accountBalance,
            marginLevel: 300, // Safe default margin level
            currency: "USD",
            unrealizedPnL: 0,
          },
          openPositions: context.openPositions,
          proposedTrade: {
            symbol: context.symbol,
            amount: 1000, // Default amount
            action: "buy",
            price: context.marketData?.price || 100,
          },
        }),
        this.riskAgent.analyze({
          symbol: context.symbol,
          portfolioBalance: context.accountBalance,
          currentPositions: context.openPositions.length,
          proposedTradeSize: 1000,
          marketVolatility: 10,
        }),
      ]);

      return {
        technical: technicalAnalysis,
        portfolio: portfolioContext,
        risk: riskAssessment,
      };
    } catch (error) {
      console.error("Error in multi-agent analysis:", error);
      throw error;
    }
  }

  private async makeProfessionalDecision(
    context: TradingContext,
    analysis: any,
  ): Promise<ProfessionalTradingDecision> {
    const reasoning: string[] = [];

    // Step 1: Determine base action from technical analysis
    let baseAction: "BUY" | "SELL" | "HOLD" = "HOLD";
    if (analysis.technical.recommendation === "buy") baseAction = "BUY";
    else if (analysis.technical.recommendation === "sell") baseAction = "SELL";

    reasoning.push(
      `Technical analysis suggests: ${analysis.technical.recommendation} (confidence: ${analysis.technical.confidence})`,
    );

    // Step 2: Check portfolio constraints
    if (!analysis.portfolio.canTrade) {
      baseAction = "HOLD";
      reasoning.push("Portfolio constraints prevent trading");
    }

    // Step 3: Check risk assessment
    if (analysis.risk.recommendation === "reject") {
      baseAction = "HOLD";
      reasoning.push("Risk assessment rejected the trade");
    }

    // Step 4: Calculate position size
    let quantity = 0;
    if (baseAction !== "HOLD") {
      quantity = Math.min(
        analysis.portfolio.recommendedPositionSize,
        analysis.risk.maxPositionSize || 1000,
      );
      reasoning.push(
        `Position size: ${quantity} (portfolio: ${analysis.portfolio.recommendedPositionSize}, risk: ${analysis.risk.maxPositionSize})`,
      );
    }

    // Step 5: Determine order type
    let orderType: "MARKET" | "LIMIT" | "STOP" = "MARKET";
    let limitPrice: number | undefined;
    let stopPrice: number | undefined;

    if (baseAction !== "HOLD") {
      const orderDecision = await this.orderDecisionAgent.determineOrderType({
        symbol: context.symbol,
        action: baseAction.toLowerCase() as "buy" | "sell",
        confidence: analysis.technical.confidence,
        strategy: context.strategy,
        timeframe: context.timeframe,
        currentPrice: context.marketData?.price || 100,
        marketConditions: {
          volatility: "medium",
          spread: 0.0001,
          volume: "normal",
        },
      });

      orderType = orderDecision.orderType;
      limitPrice = orderDecision.limitPrice;
      stopPrice = orderDecision.stopPrice;
      reasoning.push(...orderDecision.reasoning);
    }

    // Step 6: Calculate stop loss and take profit
    let stopLoss = 0;
    let takeProfit = 0;
    let riskRewardRatio = 2.0;

    if (baseAction !== "HOLD" && quantity > 0) {
      const riskLevels = await this.riskCalculator.calculateRiskLevels({
        symbol: context.symbol,
        action: baseAction,
        currentPrice: context.marketData.currentPrice,
        timeframe: context.timeframe,
        strategy: context.strategy,
        volatility: this.calculateVolatility(context.marketData),
        support: context.marketData.currentPrice * 0.98, // Simplified
        resistance: context.marketData.currentPrice * 1.02, // Simplified
        accountBalance: context.accountBalance,
        positionSize: quantity,
      });

      stopLoss = riskLevels.stopLoss;
      takeProfit = riskLevels.takeProfit;
      riskRewardRatio = riskLevels.riskRewardRatio;
      reasoning.push(...riskLevels.reasoning);
    }

    // Step 7: Calculate final confidence
    const confidence = this.calculateOverallConfidence(analysis, context);

    // Step 8: Assess strategy alignment and timeframe suitability
    const strategyAlignment = this.assessStrategyAlignment(context, analysis);
    const timeframeSuitability = this.assessTimeframeSuitability(context, analysis);

    return {
      action: baseAction,
      confidence,
      orderType,
      quantity,
      limitPrice,
      stopPrice,
      stopLoss,
      takeProfit,
      maxRisk: Math.abs(stopLoss - context.marketData.currentPrice) * quantity,
      riskRewardRatio,
      technicalAnalysis: analysis.technical,
      riskAssessment: analysis.risk,
      portfolioImpact: analysis.portfolio,
      reasoning,
      marketConditions: this.assessMarketConditions(context.marketData),
      strategyAlignment,
      timeframeSuitability,
      validated: false, // Will be set in validation step
      warnings: analysis.portfolio.warnings || [],
      recommendations: analysis.portfolio.recommendations || [],
    };
  }

  private async validateDecision(
    context: TradingContext,
    decision: ProfessionalTradingDecision,
  ): Promise<ProfessionalTradingDecision> {
    const validationWarnings: string[] = [...decision.warnings];
    const validationRecommendations: string[] = [...decision.recommendations];

    // Validation 1: Minimum confidence threshold
    if (decision.confidence < 0.6 && decision.action !== "HOLD") {
      validationWarnings.push("Low confidence trade - consider paper trading first");
    }

    // Validation 2: Risk-reward ratio
    if (decision.riskRewardRatio < 1.5 && decision.action !== "HOLD") {
      validationWarnings.push("Poor risk-reward ratio - consider adjusting targets");
    }

    // Validation 3: Strategy alignment
    if (decision.strategyAlignment < 70) {
      validationWarnings.push("Trade doesn't align well with chosen strategy");
    }

    // Validation 4: Timeframe suitability
    if (decision.timeframeSuitability < 60) {
      validationWarnings.push("Trade may not be suitable for chosen timeframe");
    }

    // Validation 5: Check for critical portfolio warnings
    const criticalWarnings = validationWarnings.filter((w) => w.includes("CRITICAL"));
    const validated = criticalWarnings.length === 0;

    if (!validated && decision.action !== "HOLD") {
      decision.action = "HOLD";
      decision.quantity = 0;
      validationRecommendations.push("Trade blocked due to critical warnings");
    }

    return {
      ...decision,
      validated,
      warnings: validationWarnings,
      recommendations: validationRecommendations,
    };
  }

  private calculateOverallConfidence(analysis: any, context: TradingContext): number {
    let confidence = 0;

    // Technical confidence (40% weight)
    confidence += (analysis.technical.confidence || 0.5) * 0.4;

    // Portfolio health (30% weight)
    const portfolioHealth = analysis.portfolio.portfolioHeatLevel
      ? (100 - analysis.portfolio.portfolioHeatLevel) / 100
      : 0.7;
    confidence += portfolioHealth * 0.3;

    // Risk assessment (20% weight)
    const riskConfidence =
      analysis.risk.recommendation === "approve"
        ? 0.8
        : analysis.risk.recommendation === "reduce"
          ? 0.6
          : 0.3;
    confidence += riskConfidence * 0.2;

    // Market conditions (10% weight)
    const marketConfidence = this.assessMarketConfidence(context.marketData);
    confidence += marketConfidence * 0.1;

    return Math.max(0.1, Math.min(0.95, confidence));
  }

  private assessStrategyAlignment(context: TradingContext, analysis: any): number {
    // Simplified strategy alignment scoring
    let score = 50; // Base score

    if (context.strategy.includes("trend") && analysis.technical.trend !== "neutral") {
      score += 30;
    }

    if (context.strategy.includes("breakout") && analysis.technical.signals?.includes("breakout")) {
      score += 25;
    }

    if (context.strategy.includes("scalping") && context.timeframe.includes("m")) {
      score += 20;
    }

    return Math.min(100, score);
  }

  private assessTimeframeSuitability(context: TradingContext, analysis: any): number {
    // Simplified timeframe suitability scoring
    let score = 60; // Base score

    // Short timeframes need high confidence
    if (
      (context.timeframe === "1m" || context.timeframe === "5m") &&
      analysis.technical.confidence > 0.8
    ) {
      score += 30;
    }

    // Long timeframes can tolerate lower confidence
    if (
      (context.timeframe === "1h" || context.timeframe === "4h") &&
      analysis.technical.confidence > 0.6
    ) {
      score += 20;
    }

    return Math.min(100, score);
  }

  private assessMarketConditions(marketData: any): string {
    const volatility = this.calculateVolatility(marketData);

    if (volatility > 3.0) return "High Volatility";
    if (volatility > 2.0) return "Medium Volatility";
    if (volatility < 1.0) return "Low Volatility";
    return "Normal Conditions";
  }

  private assessMarketConfidence(marketData: any): number {
    const volatility = this.calculateVolatility(marketData);

    // Moderate volatility is best for trading
    if (volatility > 1.5 && volatility < 3.0) return 0.8;
    if (volatility > 3.0) return 0.5; // Too volatile
    if (volatility < 1.0) return 0.6; // Too quiet
    return 0.7;
  }

  private calculateVolatility(marketData: any): number {
    // Simplified volatility calculation
    if (!marketData.high24h || !marketData.low24h) return 2.0;

    const range = marketData.high24h - marketData.low24h;
    const average = (marketData.high24h + marketData.low24h) / 2;

    return (range / average) * 100;
  }

  private getConservativeDecision(context: TradingContext): ProfessionalTradingDecision {
    return {
      action: "HOLD",
      confidence: 0.3,
      orderType: "MARKET",
      quantity: 0,
      stopLoss: 0,
      takeProfit: 0,
      maxRisk: 0,
      riskRewardRatio: 0,
      technicalAnalysis: null,
      riskAssessment: null,
      portfolioImpact: null,
      reasoning: ["Error in analysis - defaulting to conservative hold"],
      marketConditions: "Unknown",
      strategyAlignment: 0,
      timeframeSuitability: 0,
      validated: false,
      warnings: ["System error occurred"],
      recommendations: ["Check system status before trading"],
    };
  }
}
