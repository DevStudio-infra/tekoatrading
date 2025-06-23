import { RiskAssessmentAgent } from "../trading/risk-assessment.agent";
import { TechnicalAnalysisAgent } from "../trading/technical-analysis.agent";
import { PositionSizingAgent } from "../trading/position-sizing.agent";
import { AccountBalanceAgent } from "../trading/account-balance.agent";
import { RiskAnalysisChain } from "../chains/risk-analysis-chain";
import { RiskCalculationTool } from "../tools/risk-calculation.tool";
import { DatabaseTool } from "../tools/database.tool";
import { loggerService } from "../../services/logger.service";
import { RobustJSONParser } from "../../services/ai/json-parser";

export interface RiskCheckInput {
  symbol: string;
  side: "BUY" | "SELL";
  amount: number;
  price?: number;
  tradeType: "MARKET" | "LIMIT";
  botId: string;
  strategy: string;
  timeframe: string;
}

export interface RiskCheckResult {
  approved: boolean;
  riskScore: number;
  recommendation: "PROCEED" | "CAUTION" | "ABORT";
  reasoning: string;
  adjustments?: {
    suggestedAmount?: number;
    suggestedPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
  };
  checks: {
    positionRisk: any;
    portfolioRisk: any;
    technicalRisk: any;
    accountRisk: any;
    marketRisk: any;
  };
  timestamp: string;
}

export class RiskCheckWorkflow {
  private riskAssessmentAgent: RiskAssessmentAgent;
  private technicalAnalysisAgent: TechnicalAnalysisAgent;
  private positionSizingAgent: PositionSizingAgent;
  private accountBalanceAgent: AccountBalanceAgent;
  private riskAnalysisChain: RiskAnalysisChain;
  private riskCalculationTool: RiskCalculationTool;
  private databaseTool: DatabaseTool;

  constructor() {
    this.riskAssessmentAgent = new RiskAssessmentAgent();
    this.technicalAnalysisAgent = new TechnicalAnalysisAgent();
    this.positionSizingAgent = new PositionSizingAgent();
    this.accountBalanceAgent = new AccountBalanceAgent();
    this.riskAnalysisChain = new RiskAnalysisChain();
    this.riskCalculationTool = new RiskCalculationTool();
    this.databaseTool = new DatabaseTool();
  }

  async executeRiskCheck(input: RiskCheckInput): Promise<RiskCheckResult> {
    try {
      console.log(`Starting risk check workflow for ${input.symbol} ${input.side} ${input.amount}`);

      // Phase 1: Gather current state data
      const [accountData, portfolioData, technicalData] = await Promise.all([
        this.gatherAccountData(input.botId),
        this.gatherPortfolioData(input.botId, input.symbol),
        this.gatherTechnicalData(input.symbol, input.timeframe),
      ]);

      // Phase 2: Perform individual risk assessments
      const riskChecks = await this.performRiskAssessments(input, {
        account: accountData,
        portfolio: portfolioData,
        technical: technicalData,
      });

      // Phase 3: Consolidate risk analysis using LLM chain
      const consolidatedRisk = await this.consolidateRiskAnalysis(input, riskChecks);

      // Phase 4: Make final recommendation
      const finalRecommendation = await this.makeFinalRecommendation(input, riskChecks, consolidatedRisk);

      return {
        approved: finalRecommendation.approved,
        riskScore: finalRecommendation.riskScore,
        recommendation: finalRecommendation.recommendation,
        reasoning: finalRecommendation.reasoning,
        adjustments: finalRecommendation.adjustments,
        checks: riskChecks,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error("Risk Check Workflow Error:", error);

      // Conservative fallback - reject the trade
      return {
        approved: false,
        riskScore: 10,
        recommendation: "ABORT",
        reasoning: `Risk check failed due to system error: ${error.message}`,
        checks: {
          positionRisk: { error: error.message },
          portfolioRisk: { error: error.message },
          technicalRisk: { error: error.message },
          accountRisk: { error: error.message },
          marketRisk: { error: error.message },
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async gatherAccountData(botId: string): Promise<any> {
    try {
      // Get account balance and margin info
      const balanceResult = await this.accountBalanceAgent.getCurrentBalance();

      // Get account risk metrics from database
      const riskMetricsResult = await this.databaseTool.invoke(
        JSON.stringify({
          action: "get_risk_metrics",
          filters: { botId },
        })
      );

      return {
        balance: balanceResult,
        riskMetrics: RobustJSONParser.parseWithFallback(riskMetricsResult),
      };
    } catch (error: any) {
      console.error("Error gathering account data:", error);
      return { error: error.message };
    }
  }

  private async gatherPortfolioData(botId: string, symbol: string): Promise<any> {
    try {
      // Get current positions
      const positionsResult = await this.databaseTool.invoke(
        JSON.stringify({
          action: "get_positions",
          filters: { botId },
        })
      );

      // Get performance data
      const performanceResult = await this.databaseTool.invoke(
        JSON.stringify({
          action: "get_performance_data",
          filters: { botId },
        })
      );

      return {
        positions: RobustJSONParser.parseWithFallback(positionsResult),
        performance: RobustJSONParser.parseWithFallback(performanceResult),
      };
    } catch (error: any) {
      console.error("Error gathering portfolio data:", error);
      return { error: error.message };
    }
  }

  private async gatherTechnicalData(symbol: string, timeframe: string): Promise<any> {
    try {
      // Get technical analysis from agent using the correct method
      const technicalAnalysis = await this.technicalAnalysisAgent.analyzeMarket({
        symbol,
        timeframe,
        prices: [], // Would need real price data
        volumes: [],
      });

      return technicalAnalysis.data || { error: "No technical data available" };
    } catch (error: any) {
      console.error("Error gathering technical data:", error);
      return { error: error.message };
    }
  }

  private async performRiskAssessments(input: RiskCheckInput, data: any): Promise<any> {
    try {
      // Position Risk Assessment
      const positionRisk = await this.assessPositionRisk(input, data);

      // Portfolio Risk Assessment
      const portfolioRisk = await this.assessPortfolioRisk(input, data);

      // Technical Risk Assessment
      const technicalRisk = await this.assessTechnicalRisk(input, data);

      // Account Risk Assessment
      const accountRisk = await this.assessAccountRisk(input, data);

      // Market Risk Assessment
      const marketRisk = await this.assessMarketRisk(input, data);

      return {
        positionRisk,
        portfolioRisk,
        technicalRisk,
        accountRisk,
        marketRisk,
      };
    } catch (error: any) {
      throw new Error(`Risk assessment failed: ${error.message}`);
    }
  }

  private async assessPositionRisk(input: RiskCheckInput, data: any): Promise<any> {
    try {
      // Calculate position value and risk
      const positionValue = input.amount * (input.price || data.technical.currentPrice || 0);
      const accountBalance = data.account.balance?.availableBalance || 10000;
      const riskPercentage = (positionValue / accountBalance) * 100;

      // Use risk calculation tool
      const riskCalcResult = await this.riskCalculationTool.invoke(
        JSON.stringify({
          action: "calculate_position_risk",
          params: {
            position: {
              symbol: input.symbol,
              size: input.amount,
              entryPrice: input.price || data.technical.currentPrice,
              currentPrice: data.technical.currentPrice,
              side: input.side,
            },
          },
        })
      );

      const riskData = RobustJSONParser.parseWithFallback(riskCalcResult);

      return {
        riskPercentage,
        positionValue,
        riskLevel: riskPercentage > 5 ? "HIGH" : riskPercentage > 2 ? "MEDIUM" : "LOW",
        calculatedRisk: riskData,
        approved: riskPercentage <= 10, // Maximum 10% per position
        reasoning: `Position represents ${riskPercentage.toFixed(2)}% of account`,
      };
    } catch (error: any) {
      return {
        error: error.message,
        approved: false,
        riskLevel: "CRITICAL",
      };
    }
  }

  private async assessPortfolioRisk(input: RiskCheckInput, data: any): Promise<any> {
    try {
      const positions = data.portfolio.positions?.data || [];
      const totalPositions = positions.length;
      const maxPositions = 5; // Configuration

      // Check position limits
      const exceedsPositionLimit = totalPositions >= maxPositions;

      // Calculate portfolio concentration
      const symbolPositions = positions.filter((p: any) => p.symbol === input.symbol);
      const hasExistingPosition = symbolPositions.length > 0;

      // Risk assessment by portfolio agent
      const portfolioAssessment = await this.riskAssessmentAgent.assessRisk({
        symbol: input.symbol,
        amount: input.amount,
        side: input.side,
        currentPositions: positions,
        accountBalance: data.account.balance?.availableBalance || 10000,
      });

      return {
        totalPositions,
        maxPositions,
        exceedsPositionLimit,
        hasExistingPosition,
        portfolioAssessment,
        approved: !exceedsPositionLimit,
        reasoning: exceedsPositionLimit ? `Position limit exceeded: ${totalPositions}/${maxPositions}` : "Portfolio risk within acceptable limits",
      };
    } catch (error: any) {
      return {
        error: error.message,
        approved: false,
        riskLevel: "CRITICAL",
      };
    }
  }

  private async assessTechnicalRisk(input: RiskCheckInput, data: any): Promise<any> {
    try {
      const technical = data.technical;

      // Check if technical analysis supports the trade direction
      const supportsTrade = this.checkTechnicalAlignment(input.side, technical);

      // Check volatility risk
      const volatilityRisk = technical.volatility > 0.8 ? "HIGH" : technical.volatility > 0.4 ? "MEDIUM" : "LOW";

      // Check trend alignment
      const trendAlignment = this.checkTrendAlignment(input.side, technical);

      return {
        supportsTrade,
        volatilityRisk,
        trendAlignment,
        technicalScore: technical.overallScore || 5,
        approved: supportsTrade && volatilityRisk !== "HIGH",
        reasoning: `Technical analysis ${supportsTrade ? "supports" : "opposes"} ${input.side} trade`,
      };
    } catch (error: any) {
      return {
        error: error.message,
        approved: false,
        riskLevel: "CRITICAL",
      };
    }
  }

  private async assessAccountRisk(input: RiskCheckInput, data: any): Promise<any> {
    try {
      const balance = data.account.balance;
      const availableBalance = balance?.availableBalance || 0;
      const usedMargin = balance?.usedMargin || 0;
      const freeMargin = balance?.freeMargin || 0;

      // Calculate trade cost
      const tradeCost = input.amount * (input.price || data.technical.currentPrice || 0);

      // Check if sufficient funds
      const sufficientFunds = availableBalance >= tradeCost;
      const marginSafe = freeMargin > tradeCost * 2; // 50% margin safety

      return {
        availableBalance,
        tradeCost,
        sufficientFunds,
        marginSafe,
        marginUtilization: (usedMargin / (usedMargin + freeMargin)) * 100,
        approved: sufficientFunds && marginSafe,
        reasoning: !sufficientFunds ? "Insufficient funds" : !marginSafe ? "Insufficient margin safety" : "Account risk acceptable",
      };
    } catch (error: any) {
      return {
        error: error.message,
        approved: false,
        riskLevel: "CRITICAL",
      };
    }
  }

  private async assessMarketRisk(input: RiskCheckInput, data: any): Promise<any> {
    try {
      // Market condition assessment
      const marketCondition = this.assessMarketCondition(data.technical);

      // Liquidity risk
      const liquidityRisk = data.technical.volume < 1000000 ? "HIGH" : "LOW";

      // News/event risk (simplified)
      const eventRisk = "LOW"; // Would integrate with news API

      return {
        marketCondition,
        liquidityRisk,
        eventRisk,
        approved: liquidityRisk !== "HIGH" && marketCondition !== "EXTREME_VOLATILITY",
        reasoning: `Market conditions: ${marketCondition}, Liquidity: ${liquidityRisk}`,
      };
    } catch (error: any) {
      return {
        error: error.message,
        approved: false,
        riskLevel: "CRITICAL",
      };
    }
  }

  private async consolidateRiskAnalysis(input: RiskCheckInput, checks: any): Promise<any> {
    try {
      // Use LLM chain for sophisticated risk analysis
      const consolidatedAnalysis = await this.riskAnalysisChain.analyzeRisk({
        symbol: input.symbol,
        positionDetails: input,
        accountBalance: checks.accountRisk.availableBalance || 10000,
        portfolioInfo: checks.portfolioRisk.portfolioAssessment || {},
        marketConditions: checks.marketRisk,
        riskMetrics: checks.positionRisk.calculatedRisk || {},
        technicalAnalysis: checks.technicalRisk,
      });

      return consolidatedAnalysis;
    } catch (error: any) {
      console.error("Risk consolidation error:", error);
      return {
        success: false,
        fallbackAnalysis: {
          overallAssessment: {
            riskScore: 8,
            recommendation: "ABORT",
            reasoning: "Risk consolidation failed - proceeding conservatively",
          },
        },
      };
    }
  }

  private async makeFinalRecommendation(input: RiskCheckInput, checks: any, consolidatedRisk: any): Promise<any> {
    try {
      // Count approvals
      const approvals = Object.values(checks).filter((check: any) => check.approved).length;
      const totalChecks = Object.keys(checks).length;

      // Get LLM recommendation
      const llmRecommendation = consolidatedRisk.analysis?.overallAssessment?.recommendation || "ABORT";
      const llmRiskScore = consolidatedRisk.analysis?.overallAssessment?.riskScore || 10;

      // Final decision logic
      let finalApproved = false;
      let finalRecommendation = "ABORT";
      let reasoning = "Risk checks failed";

      if (approvals === totalChecks && llmRecommendation === "PROCEED") {
        finalApproved = true;
        finalRecommendation = "PROCEED";
        reasoning = "All risk checks passed";
      } else if (approvals >= totalChecks * 0.8 && llmRecommendation !== "ABORT") {
        finalApproved = false;
        finalRecommendation = "CAUTION";
        reasoning = "Most risk checks passed but proceed with caution";
      }

      // Calculate position sizing adjustments
      const adjustments = await this.calculateAdjustments(input, checks, llmRiskScore);

      return {
        approved: finalApproved,
        riskScore: llmRiskScore,
        recommendation: finalRecommendation,
        reasoning,
        adjustments,
        checksPassed: approvals,
        totalChecks,
      };
    } catch (error: any) {
      return {
        approved: false,
        riskScore: 10,
        recommendation: "ABORT",
        reasoning: `Final recommendation failed: ${error.message}`,
      };
    }
  }

  private async calculateAdjustments(input: RiskCheckInput, checks: any, riskScore: number): Promise<any> {
    try {
      // Use position sizing agent for adjustments
      const tradeParams = {
        symbol: input.symbol,
        direction: input.side,
        entryPrice: input.price || checks.technicalRisk.currentPrice || 100,
        stopLossPrice: (input.price || 100) * 0.97, // 3% stop loss
        confidence: 70, // Default confidence
      };

      const accountData = {
        balance: checks.accountRisk.availableBalance || 10000,
        availableBalance: checks.accountRisk.availableBalance || 10000,
        currency: "USD",
        riskPerTrade: Math.max(0.01, 0.05 - riskScore / 200), // Reduce risk as score increases
      };

      const sizingRecommendation = await this.positionSizingAgent.calculatePositionSize(tradeParams, accountData);

      return {
        suggestedAmount: sizingRecommendation.data?.recommendedSize || input.amount * 0.5,
        suggestedPrice: input.price,
        stopLoss: tradeParams.stopLossPrice,
        takeProfit: tradeParams.entryPrice * 1.02, // 2% take profit
      };
    } catch (error: any) {
      return {
        suggestedAmount: input.amount * 0.5, // Reduce by 50% as fallback
        reasoning: "Fallback position sizing due to calculation error",
      };
    }
  }

  // Helper methods
  private checkTechnicalAlignment(side: string, technical: any): boolean {
    if (!technical || !technical.signals) return false;

    const signals = technical.signals;
    const bullishSignals = signals.filter((s: any) => s.type === "BUY").length;
    const bearishSignals = signals.filter((s: any) => s.type === "SELL").length;

    if (side === "BUY") return bullishSignals > bearishSignals;
    if (side === "SELL") return bearishSignals > bullishSignals;

    return false;
  }

  private checkTrendAlignment(side: string, technical: any): boolean {
    if (!technical || !technical.trend) return false;

    const trend = technical.trend.trend;

    if (side === "BUY") return trend === "bullish";
    if (side === "SELL") return trend === "bearish";

    return false;
  }

  private assessMarketCondition(technical: any): string {
    if (!technical) return "UNKNOWN";

    const volatility = technical.volatility || 0.3;

    if (volatility > 1.0) return "EXTREME_VOLATILITY";
    if (volatility > 0.6) return "HIGH_VOLATILITY";
    if (volatility > 0.3) return "NORMAL";
    return "LOW_VOLATILITY";
  }

  async quickRiskCheck(symbol: string, amount: number, side: string, accountBalance: number): Promise<boolean> {
    try {
      // Get approximate current price for the symbol
      let approximatePrice = 50000; // Default fallback

      // Set more realistic price estimates for common symbols
      const symbolUpper = symbol.toUpperCase();
      if (symbolUpper.includes("BTC") || symbolUpper.includes("BITCOIN")) {
        approximatePrice = 100000; // Approximate BTC price
      } else if (symbolUpper.includes("ETH") || symbolUpper.includes("ETHEREUM")) {
        approximatePrice = 3500; // Approximate ETH price
      } else if (symbolUpper.includes("EUR/USD") || symbolUpper.includes("GBP/USD")) {
        approximatePrice = 1.1; // Approximate forex price
      } else if (symbolUpper.includes("SPX") || symbolUpper.includes("S&P")) {
        approximatePrice = 5000; // Approximate index price
      } else if (symbolUpper.includes("GOLD") || symbolUpper.includes("XAU")) {
        approximatePrice = 2000; // Approximate gold price per oz
      }

      // Calculate position value
      const positionValue = amount * approximatePrice;
      const riskPercentage = (positionValue / accountBalance) * 100;

      // Adjust risk limits based on asset type
      let maxRiskPercentage = 10; // Default 10% max

      // More conservative limits for high-value assets
      if (symbolUpper.includes("BTC") && approximatePrice > 50000) {
        maxRiskPercentage = 5; // 5% max for BTC due to high price
      } else if (symbolUpper.includes("ETH") && approximatePrice > 2000) {
        maxRiskPercentage = 7; // 7% max for ETH
      }

      // Basic risk limits
      if (riskPercentage > maxRiskPercentage) {
        console.log(`❌ Risk check failed: Position value (${riskPercentage.toFixed(2)}%) exceeds maximum ${maxRiskPercentage}% for ${symbol}`);
        return false;
      }
      if (amount <= 0) {
        console.log(`❌ Risk check failed: Invalid amount ${amount}`);
        return false;
      }
      if (accountBalance < positionValue) {
        console.log(`❌ Risk check failed: Insufficient funds. Need ${positionValue}, have ${accountBalance}`);
        return false;
      }

      console.log(`✅ Risk check passed: Position value ${positionValue} (${riskPercentage.toFixed(2)}%) within limits for ${symbol}`);
      return true;
    } catch (error) {
      console.log(`❌ Risk check error: ${error}`);
      return false; // Conservative default
    }
  }
}
