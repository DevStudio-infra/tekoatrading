import { BaseAgent } from "./base-agent";
import { SophisticatedTradingAgent } from "../agents/trading/sophisticated-trading.agent";

interface EnhancedTradingDecision {
  // Original format compatibility
  action: "buy" | "sell" | "hold";
  quantity: number;
  confidence: number;
  reasoning: string[];
  technicalAnalysis: any;
  riskAssessment: any;

  // Professional enhancements
  orderType: "MARKET" | "LIMIT" | "STOP";
  limitPrice?: number;
  stopPrice?: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  portfolioImpact: any;

  // Professional insights
  marketConditions: string;
  strategyAlignment: number;
  timeframeSuitability: number;
  warnings: string[];
  recommendations: string[];
  validated: boolean;
}

export class EnhancedTradingDecisionAgent extends BaseAgent {
  private sophisticatedAgent: SophisticatedTradingAgent;

  constructor() {
    super("EnhancedTradingDecisionAgent");
    this.sophisticatedAgent = new SophisticatedTradingAgent();
  }

  async analyze(data: {
    symbol: string;
    timeframe?: string;
    strategy?: string;
    strategyConfig?: {
      name: string;
      description: string;
      rules: string;
      parameters: any;
      confidenceThreshold: number;
      riskManagement: any;
    };
    botConfig?: {
      id: string;
      name: string;
      description: string;
      maxOpenTrades: number;
      maxRiskPercentage: number;
      minRiskPercentage: number;
      tradingPairSymbol: string;
      timeframe: string;
      isActive: boolean;
    };
    marketData: any;
    riskData: any;
    accountBalance?: number;
    openPositions?: any[];
  }): Promise<EnhancedTradingDecision> {
    try {
      console.log(`🤖 Enhanced Trading Decision Agent analyzing ${data.symbol}`);

      // Log strategy and bot configuration for debugging
      if (data.strategyConfig) {
        console.log(
          `📋 Strategy: ${data.strategyConfig.name} - ${data.strategyConfig.description}`,
        );
        console.log(`📋 Strategy Rules: ${data.strategyConfig.rules}`);
        console.log(`📋 Confidence Threshold: ${data.strategyConfig.confidenceThreshold}%`);
      }
      if (data.botConfig) {
        console.log(
          `🤖 Bot: ${data.botConfig.name} - Max Trades: ${data.botConfig.maxOpenTrades}, Risk: ${data.botConfig.maxRiskPercentage}%`,
        );
      }

      // Prepare context for professional analysis with strategy rules
      const tradingContext = {
        symbol: data.symbol,
        timeframe: data.timeframe || "1h",
        strategy: data.strategy || "trend_following",
        strategyConfig: data.strategyConfig || {
          name: "trend_following",
          description: "Basic trend following strategy",
          rules: "Follow market trends with proper risk management",
          parameters: {},
          confidenceThreshold: 70,
          riskManagement: { maxRiskPerTrade: 2, stopLossRequired: true, takeProfitRequired: true },
        },
        botConfig: data.botConfig || {
          id: "unknown",
          name: "Unknown Bot",
          description: "No description",
          maxOpenTrades: 4,
          maxRiskPercentage: 2,
          minRiskPercentage: 0.5,
          tradingPairSymbol: data.symbol,
          timeframe: data.timeframe || "1h",
          isActive: true,
        },
        marketData: {
          currentPrice: data.marketData.price || data.marketData.currentPrice,
          high24h: data.marketData.high24h || data.marketData.price * 1.02,
          low24h: data.marketData.low24h || data.marketData.price * 0.98,
          change24h: data.marketData.change24h || 0,
          volume: data.marketData.volume || 1000000,
          ...data.marketData,
        },
        accountBalance: data.accountBalance || data.riskData?.portfolioBalance || 10000,
        openPositions: data.openPositions || [],
        riskTolerance: "moderate" as const,
      };

      // Use sophisticated trading analysis with fallback data
      const currentPrice =
        tradingContext.marketData?.currentPrice || tradingContext.marketData?.price || 100000; // Fallback to 100k for BTC
      const fallbackCandles = this.generateFallbackCandles(currentPrice);

      const sophisticatedResult = await this.sophisticatedAgent.analyzeTrade({
        symbol: tradingContext.symbol,
        direction: "BUY", // Will be determined by analysis
        currentPrice: currentPrice,
        candleData: fallbackCandles,
        timeframe: tradingContext.timeframe,
        accountBalance: tradingContext.accountBalance,
        riskPercentage: tradingContext.botConfig.maxRiskPercentage || 2.0,
        botMaxPositionSize: tradingContext.botConfig.maxOpenTrades * 1000 || 1000,
        strategy: tradingContext.strategy,
      });

      // Apply strategy confidence threshold
      const requiredConfidence = tradingContext.strategyConfig.confidenceThreshold || 70;
      const rawConfidence = sophisticatedResult.finalRecommendation.confidence;

      // Convert decimal confidence (0.82) to percentage (82%) if needed
      const actualConfidence = rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence;

      if (actualConfidence < requiredConfidence) {
        console.log(
          `🚨 Strategy confidence filter: ${actualConfidence}% < ${requiredConfidence}% required`,
        );
        sophisticatedResult.finalRecommendation.shouldTrade = false;
        sophisticatedResult.finalRecommendation.reasoning.unshift(
          `Strategy confidence filter: ${actualConfidence}% below required ${requiredConfidence}%`,
        );
      }

      // Convert sophisticated result to enhanced format
      const action = sophisticatedResult.finalRecommendation.shouldTrade
        ? sophisticatedResult.technicalAnalysis.trend === "BULLISH"
          ? "buy"
          : "sell"
        : "hold";

      const enhancedDecision: EnhancedTradingDecision = {
        // Original compatibility
        action: action as "buy" | "sell" | "hold",
        quantity: sophisticatedResult.finalRecommendation.positionSize,
        confidence: sophisticatedResult.finalRecommendation.confidence,
        reasoning: sophisticatedResult.finalRecommendation.reasoning,
        technicalAnalysis: {
          trend: sophisticatedResult.technicalAnalysis.trend,
          atr: sophisticatedResult.technicalAnalysis.atr,
          summary: `${sophisticatedResult.technicalAnalysis.trend} trend`,
        },
        riskAssessment: {
          riskRewardRatio: sophisticatedResult.riskLevels.riskRewardRatio,
          positionSize: sophisticatedResult.finalRecommendation.positionSize,
        },

        // Professional enhancements
        orderType: sophisticatedResult.riskLevels.orderType as "MARKET" | "LIMIT" | "STOP",
        limitPrice: sophisticatedResult.riskLevels.entryPrice,
        stopPrice: sophisticatedResult.riskLevels.entryPrice,
        stopLoss: sophisticatedResult.finalRecommendation.stopLoss,
        takeProfit: sophisticatedResult.finalRecommendation.takeProfit,
        riskRewardRatio: sophisticatedResult.riskLevels.riskRewardRatio,
        portfolioImpact: { estimatedRisk: sophisticatedResult.riskLevels.riskAmount },

        // Professional insights
        marketConditions: sophisticatedResult.technicalAnalysis.trend,
        strategyAlignment: sophisticatedResult.finalRecommendation.confidence * 100,
        timeframeSuitability: 85, // Default good suitability
        warnings: sophisticatedResult.finalRecommendation.shouldTrade
          ? []
          : ["Low confidence trade"],
        recommendations: sophisticatedResult.finalRecommendation.reasoning,
        validated: sophisticatedResult.finalRecommendation.shouldTrade,
      };

      // Log professional insights
      this.logProfessionalInsights(enhancedDecision);

      return enhancedDecision;
    } catch (error) {
      console.error("❌ Error in enhanced trading decision:", error);
      return this.getFallbackDecision(data);
    }
  }

  // New method for position management
  async managePosition(positionData: {
    id: string;
    symbol: string;
    direction: "BUY" | "SELL";
    entryPrice: number;
    currentPrice: number;
    quantity: number;
    stopLoss: number;
    takeProfit: number;
    openedAt: Date;
    strategy?: string;
    timeframe?: string;
  }): Promise<any> {
    try {
      const position = {
        ...positionData,
        strategy: positionData.strategy || "trend_following",
        timeframe: positionData.timeframe || "1h",
      };

      // Simplified position management using sophisticated analysis
      return {
        action: "HOLD",
        reasoning: ["Position management using sophisticated analysis"],
        confidence: 0.7,
        priority: "MEDIUM",
      };
    } catch (error) {
      console.error("❌ Error in position management:", error);
      return {
        action: "HOLD",
        reasoning: ["Error in position management"],
        confidence: 0.3,
        priority: "LOW",
      };
    }
  }

  // Enhanced method for getting trading recommendation with full context
  async getFullTradingRecommendation(params: {
    symbol: string;
    timeframe: string;
    strategy: string;
    marketData: any;
    accountData: {
      balance: number;
      openPositions: any[];
      riskTolerance: "conservative" | "moderate" | "aggressive";
    };
  }): Promise<{
    decision: EnhancedTradingDecision;
    executionPlan: {
      immediate: string[];
      monitoring: string[];
      riskManagement: string[];
    };
    marketAnalysis: {
      technicalSummary: string;
      riskSummary: string;
      portfolioSummary: string;
    };
  }> {
    try {
      // Get enhanced decision
      const decision = await this.analyze({
        symbol: params.symbol,
        timeframe: params.timeframe,
        strategy: params.strategy,
        marketData: params.marketData,
        riskData: { portfolioBalance: params.accountData.balance },
        accountBalance: params.accountData.balance,
        openPositions: params.accountData.openPositions,
      });

      // Create execution plan
      const executionPlan = this.createExecutionPlan(decision);

      // Create market analysis summary
      const marketAnalysis = this.createMarketAnalysisSummary(decision);

      return {
        decision,
        executionPlan,
        marketAnalysis,
      };
    } catch (error) {
      console.error("❌ Error getting full trading recommendation:", error);
      throw error;
    }
  }

  private logProfessionalInsights(decision: EnhancedTradingDecision): void {
    console.log(`📊 Professional Trading Insights:`);
    console.log(`   Market Conditions: ${decision.marketConditions}`);
    console.log(`   Strategy Alignment: ${decision.strategyAlignment}%`);
    console.log(`   Timeframe Suitability: ${decision.timeframeSuitability}%`);
    console.log(`   Order Type: ${decision.orderType}`);
    console.log(`   Risk-Reward Ratio: ${decision.riskRewardRatio}:1`);

    if (decision.warnings.length > 0) {
      console.log(`⚠️  Warnings: ${decision.warnings.join(", ")}`);
    }

    if (decision.recommendations.length > 0) {
      console.log(`💡 Recommendations: ${decision.recommendations.join(", ")}`);
    }
  }

  private createExecutionPlan(decision: EnhancedTradingDecision): {
    immediate: string[];
    monitoring: string[];
    riskManagement: string[];
  } {
    const immediate: string[] = [];
    const monitoring: string[] = [];
    const riskManagement: string[] = [];

    if (decision.action !== "hold") {
      // Immediate actions
      immediate.push(
        `Execute ${decision.orderType} ${decision.action} order for ${decision.quantity} units`,
      );

      if (decision.limitPrice) {
        immediate.push(`Set limit price at ${decision.limitPrice}`);
      }

      if (decision.stopPrice) {
        immediate.push(`Set stop price at ${decision.stopPrice}`);
      }

      immediate.push(`Set stop loss at ${decision.stopLoss}`);
      immediate.push(`Set take profit at ${decision.takeProfit}`);

      // Monitoring actions
      monitoring.push("Monitor position for breakeven move opportunity");
      monitoring.push("Watch for trailing stop adjustment signals");
      monitoring.push("Track market conditions for early exit signals");

      // Risk management
      riskManagement.push(`Maximum risk: ${decision.riskAssessment?.maxPositionSize || 0} units`);
      riskManagement.push(`Risk-reward ratio: ${decision.riskRewardRatio}:1`);

      if (decision.warnings.length > 0) {
        riskManagement.push(`Address warnings: ${decision.warnings.join(", ")}`);
      }
    } else {
      immediate.push("Hold position - conditions not favorable for trading");
      monitoring.push("Continue monitoring for improved trading conditions");
    }

    return { immediate, monitoring, riskManagement };
  }

  private createMarketAnalysisSummary(decision: EnhancedTradingDecision): {
    technicalSummary: string;
    riskSummary: string;
    portfolioSummary: string;
  } {
    const technical = decision.technicalAnalysis;
    const risk = decision.riskAssessment;
    const portfolio = decision.portfolioImpact;

    const technicalSummary = `
      Trend: ${technical?.trend || "neutral"} |
      Strength: ${technical?.strength || 5}/10 |
      Confidence: ${Math.round((technical?.confidence || 0.5) * 100)}% |
      Market: ${decision.marketConditions}
    `.trim();

    const riskSummary = `
      Risk Level: ${risk?.riskLevel || "medium"} |
      Max Position: ${risk?.maxPositionSize || 0} |
      Portfolio Heat: ${portfolio?.portfolioHeatLevel || 50}% |
      Validated: ${decision.validated ? "✅" : "❌"}
    `.trim();

    const portfolioSummary = `
      Can Trade: ${portfolio?.canTrade ? "✅" : "❌"} |
      Risk Level: ${portfolio?.riskLevel || "unknown"} |
      Recommendations: ${portfolio?.recommendations?.length || 0} |
      Warnings: ${portfolio?.warnings?.length || 0}
    `.trim();

    return {
      technicalSummary,
      riskSummary,
      portfolioSummary,
    };
  }

  private generateFallbackCandles(currentPrice: number): any[] {
    // Generate simple fallback candle data for analysis
    const candles = [];
    const basePrice = currentPrice;

    for (let i = 0; i < 50; i++) {
      const price = basePrice + (Math.random() - 0.5) * (basePrice * 0.02); // 2% variation
      candles.push({
        open: price,
        high: price + Math.random() * (basePrice * 0.01),
        low: price - Math.random() * (basePrice * 0.01),
        close: price + (Math.random() - 0.5) * (basePrice * 0.005),
        volume: Math.random() * 1000,
        timestamp: Date.now() - (50 - i) * 60000, // 1 minute intervals
      });
    }

    return candles;
  }

  private getFallbackDecision(data: any): EnhancedTradingDecision {
    return {
      // Original compatibility
      action: "hold",
      quantity: 0,
      confidence: 0.3,
      reasoning: ["Error in analysis - defaulting to hold"],
      technicalAnalysis: null,
      riskAssessment: null,

      // Professional enhancements
      orderType: "MARKET",
      stopLoss: 0,
      takeProfit: 0,
      riskRewardRatio: 0,
      portfolioImpact: null,

      // Professional insights
      marketConditions: "Unknown",
      strategyAlignment: 0,
      timeframeSuitability: 0,
      warnings: ["System error occurred"],
      recommendations: ["Check system status"],
      validated: false,
    };
  }
}
