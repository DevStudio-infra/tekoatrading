import { loggerService } from "./logger.service";
import { SimplifiedTimeframeAnalysisService, TwoTimeframeContext } from "./simplified-timeframe-analysis.service";
import { BrokerIntegrationService } from "./broker-integration.service";
import { TradingService } from "./trading.service";
import { prisma } from "../utils/prisma";

export interface EnhancedAccountContext {
  // Real-time account data
  balance: {
    total: number;
    available: number;
    equity: number;
    margin: number;
    freeMargin: number;
    marginLevel: number;
    currency: string;
    unrealizedPnL: number;
  };

  // Current positions and risk
  positions: {
    open: any[];
    totalExposure: number;
    riskExposurePercent: number;
    marginUsed: number;
    symbolExposure: Record<string, number>;
  };

  // Performance analytics
  performance: {
    todayPnL: number;
    weeklyPnL: number;
    monthlyPnL: number;
    winRate: number;
    averageWin: number;
    averageLoss: number;
    profitFactor: number;
    maxDrawdown: number;
    consecutiveWins: number;
    consecutiveLosses: number;
    tradesThisSession: number;
  };
}

export interface UserTradingProfile {
  // Risk preferences
  riskTolerance: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
  maxRiskPerTrade: number;
  maxSimultaneousPositions: number;

  // Trading patterns
  bestPerformingHours: number[];
  worstPerformingHours: number[];
  bestPerformingDays: string[];
  tradingStyle: "SCALPING" | "DAY_TRADING" | "SWING" | "POSITION";

  // Preferences
  preferredSymbols: string[];
  avoidedSymbols: string[];
  preferredTimeframes: string[];

  // Current session data
  sessionPerformance: {
    tradesCount: number;
    winRate: number;
    netPnL: number;
    hoursTrading: number;
    fatigueFactor: number; // 0-1, higher = more fatigued
  };
}

export interface MarketIntelligence {
  // Current market conditions
  volatility: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  spread: number;
  liquidityScore: number; // 1-10
  sessionType: string;

  // Symbol-specific data
  symbolAnalysis: {
    averageDailyRange: number;
    currentRangePosition: number; // 0-1
    supportLevels: number[];
    resistanceLevels: number[];
    lastBreakoutDirection: "UP" | "DOWN" | "NONE";
    breakoutStrength: number; // 0-1
    volumeProfile: "LOW" | "NORMAL" | "HIGH" | "EXTREME";
  };

  // Recent events
  recentEvents: Array<{
    type: string;
    impact: "LOW" | "MEDIUM" | "HIGH";
    timeAgo: string;
    description: string;
  }>;
}

export interface ComprehensiveContext extends TwoTimeframeContext {
  accountContext: EnhancedAccountContext;
  userProfile: UserTradingProfile;
  marketIntelligence: MarketIntelligence;
  riskAssessment: {
    currentRiskLevel: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
    recommendedPositionSize: number;
    maxRecommendedRisk: number;
    riskFactors: string[];
    riskMitigation: string[];
  };
}

export class EnhancedContextAnalysisService {
  private simplifiedTimeframeService: SimplifiedTimeframeAnalysisService;
  private brokerIntegrationService: BrokerIntegrationService;
  private tradingService: TradingService;

  constructor() {
    this.simplifiedTimeframeService = new SimplifiedTimeframeAnalysisService();
    this.brokerIntegrationService = new BrokerIntegrationService();
    this.tradingService = new TradingService();
  }

  /**
   * Gather comprehensive context for AI trading decisions
   */
  async gatherComprehensiveContext(symbol: string, primaryTimeframe: string, botId: string, userId: string, brokerCredentials: any): Promise<ComprehensiveContext> {
    let basicPortfolioContext: any;

    try {
      loggerService.info(`🔍 Gathering comprehensive context for ${symbol} - Bot ${botId}`);

      // Get basic portfolio context
      basicPortfolioContext = await this.getBasicPortfolioContext(userId, botId);

      // Get simplified timeframe analysis (our existing implementation)
      const timeframeContext = await this.simplifiedTimeframeService.analyzeHigherTimeframe(symbol, primaryTimeframe, brokerCredentials, basicPortfolioContext);

      // Gather enhanced account context
      const accountContext = await this.gatherAccountContext(brokerCredentials, botId);

      // Analyze user trading profile
      const userProfile = await this.analyzeUserTradingProfile(userId, botId);

      // Gather market intelligence
      const marketIntelligence = await this.gatherMarketIntelligence(symbol, brokerCredentials);

      // Perform comprehensive risk assessment
      const riskAssessment = this.performRiskAssessment(accountContext, userProfile, marketIntelligence, symbol);

      const comprehensiveContext: ComprehensiveContext = {
        ...timeframeContext,
        accountContext,
        userProfile,
        marketIntelligence,
        riskAssessment,
      };

      loggerService.info(`✅ Comprehensive context gathered for ${symbol} - Risk Level: ${riskAssessment.currentRiskLevel}`);
      return comprehensiveContext;
    } catch (error) {
      loggerService.error("❌ Error gathering comprehensive context:", error);
      // Get basic portfolio context for minimal fallback if not already available
      if (!basicPortfolioContext) {
        basicPortfolioContext = await this.getBasicPortfolioContext(userId, botId);
      }
      // Return minimal context to prevent blocking
      return this.createMinimalContext(symbol, primaryTimeframe, basicPortfolioContext || {});
    }
  }

  /**
   * Gather real-time account context from Capital.com
   */
  private async gatherAccountContext(brokerCredentials: any, botId: string): Promise<EnhancedAccountContext> {
    try {
      // Get account balance from broker
      const accountBalance = await this.brokerIntegrationService.getAccountBalance(brokerCredentials);

      // Get current positions
      const openPositions = await this.getOpenPositions(brokerCredentials);

      // Calculate position metrics
      const totalExposure = openPositions.reduce((sum, pos) => sum + pos.size * pos.currentPrice, 0);
      const marginUsed = openPositions.reduce((sum, pos) => sum + pos.marginUsed, 0);
      const riskExposurePercent = (totalExposure / accountBalance.balance) * 100;

      // Group positions by symbol
      const symbolExposure: Record<string, number> = {};
      openPositions.forEach((pos) => {
        symbolExposure[pos.symbol] = (symbolExposure[pos.symbol] || 0) + pos.size * pos.currentPrice;
      });

      // Get performance metrics
      const performance = await this.calculatePerformanceMetrics(botId);

      return {
        balance: {
          total: accountBalance.balance,
          available: accountBalance.available,
          equity: accountBalance.equity,
          margin: accountBalance.margin,
          freeMargin: accountBalance.freeMargin,
          marginLevel: accountBalance.marginLevel,
          currency: accountBalance.currency,
          unrealizedPnL: openPositions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0),
        },
        positions: {
          open: openPositions,
          totalExposure,
          riskExposurePercent,
          marginUsed,
          symbolExposure,
        },
        performance,
      };
    } catch (error) {
      loggerService.warn("⚠️ Failed to gather account context, using defaults:", error);
      return this.getDefaultAccountContext();
    }
  }

  /**
   * Analyze user's trading profile and patterns
   */
  private async analyzeUserTradingProfile(userId: string, botId: string): Promise<UserTradingProfile> {
    try {
      // Get user's bots and their configurations
      const userBots = await prisma.bot.findMany({
        where: { userId },
        include: { strategy: true },
      });

      // Get recent trading history
      const recentTrades = await this.tradingService.getTradeHistory(botId, 100);

      // Analyze trading patterns
      const tradingPatterns = this.analyzeTradingPatterns(recentTrades);
      const sessionPerformance = this.calculateSessionPerformance(recentTrades);

      // Determine risk tolerance from bot configurations
      const riskTolerance = this.determineRiskTolerance(userBots);

      return {
        riskTolerance,
        maxRiskPerTrade: 2.0, // Default, could be from user preferences
        maxSimultaneousPositions: Math.max(...userBots.map((bot) => bot.maxSimultaneousTrades)),
        bestPerformingHours: tradingPatterns.bestHours,
        worstPerformingHours: tradingPatterns.worstHours,
        bestPerformingDays: tradingPatterns.bestDays,
        tradingStyle: this.determineTradingStyle(userBots),
        preferredSymbols: [...new Set(userBots.map((bot) => bot.tradingPairSymbol).filter((symbol): symbol is string => symbol !== null))],
        avoidedSymbols: [], // Could be derived from consistently losing symbols
        preferredTimeframes: [...new Set(userBots.map((bot) => bot.timeframe))],
        sessionPerformance,
      };
    } catch (error) {
      loggerService.warn("⚠️ Failed to analyze user trading profile, using defaults:", error);
      return this.getDefaultUserProfile();
    }
  }

  /**
   * Gather current market intelligence
   */
  private async gatherMarketIntelligence(symbol: string, brokerCredentials: any): Promise<MarketIntelligence> {
    try {
      // This would integrate with Capital.com market data APIs
      // For now, we'll return a structured format that could be populated

      const volatility = this.calculateCurrentVolatility(symbol);
      const symbolAnalysis = await this.analyzeSymbolConditions(symbol, brokerCredentials);

      return {
        volatility,
        spread: 2.5, // Would get from real market data
        liquidityScore: 8.5, // Would calculate from volume/spread
        sessionType: this.getCurrentTradingSession(),
        symbolAnalysis,
        recentEvents: [], // Would integrate with news APIs
      };
    } catch (error) {
      loggerService.warn("⚠️ Failed to gather market intelligence, using defaults:", error);
      return this.getDefaultMarketIntelligence();
    }
  }

  /**
   * Perform comprehensive risk assessment
   */
  private performRiskAssessment(accountContext: EnhancedAccountContext, userProfile: UserTradingProfile, marketIntelligence: MarketIntelligence, symbol: string): any {
    const riskFactors: string[] = [];
    const riskMitigation: string[] = [];
    let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "EXTREME" = "LOW";

    // Account-based risk factors
    if (accountContext.positions.riskExposurePercent > 50) {
      riskFactors.push("High account exposure (>50%)");
      riskLevel = "HIGH";
    }

    if (accountContext.balance.marginLevel < 200) {
      riskFactors.push("Low margin level (<200%)");
      riskLevel = "EXTREME";
    }

    // Performance-based risk factors
    if (accountContext.performance.consecutiveLosses >= 3) {
      riskFactors.push("3+ consecutive losses - potential drawdown period");
      riskMitigation.push("Consider reducing position size by 50%");
      riskLevel = "HIGH";
    }

    // Market-based risk factors
    if (marketIntelligence.volatility === "EXTREME") {
      riskFactors.push("Extreme market volatility");
      riskMitigation.push("Use tighter stop losses");
      riskLevel = "HIGH";
    }

    // User pattern-based risk factors
    if (userProfile.sessionPerformance.fatigueFactor > 0.7) {
      riskFactors.push("High fatigue factor - extended trading session");
      riskMitigation.push("Consider ending trading session");
    }

    // Calculate recommended position size
    const baseRiskAmount = accountContext.balance.available * (userProfile.maxRiskPerTrade / 100);
    const riskAdjustment = riskLevel === "HIGH" ? 0.5 : riskLevel === "EXTREME" ? 0.25 : 1.0;
    const recommendedPositionSize = baseRiskAmount * riskAdjustment;

    return {
      currentRiskLevel: riskLevel,
      recommendedPositionSize,
      maxRecommendedRisk: userProfile.maxRiskPerTrade * riskAdjustment,
      riskFactors,
      riskMitigation,
    };
  }

  /**
   * Format comprehensive context for LLM consumption
   */
  formatComprehensiveContextForLLM(context: ComprehensiveContext): string {
    const { accountContext, userProfile, marketIntelligence, riskAssessment } = context;

    return `
COMPREHENSIVE TRADING CONTEXT:

HIGHER TIMEFRAME ANALYSIS (${context.higherTimeframe}):
- Trend: ${context.higherTimeframeAnalysis.trend}
- Momentum: ${context.higherTimeframeAnalysis.momentum}
- Confidence: ${context.higherTimeframeAnalysis.confidence}%
- Summary: ${context.higherTimeframeAnalysis.summary}

REAL-TIME ACCOUNT STATUS:
- Balance: ${accountContext.balance.total.toFixed(2)} ${accountContext.balance.currency}
- Available: ${accountContext.balance.available.toFixed(2)} ${accountContext.balance.currency}
- Current P&L: ${accountContext.balance.unrealizedPnL.toFixed(2)} ${accountContext.balance.currency}
- Risk Exposure: ${accountContext.positions.riskExposurePercent.toFixed(1)}%
- Open Positions: ${accountContext.positions.open.length}
- Margin Level: ${accountContext.balance.marginLevel.toFixed(0)}%

PERFORMANCE ANALYTICS:
- Today's P&L: ${accountContext.performance.todayPnL.toFixed(2)}
- Win Rate: ${accountContext.performance.winRate.toFixed(1)}%
- Consecutive Wins/Losses: ${accountContext.performance.consecutiveWins}/${accountContext.performance.consecutiveLosses}
- Session Trades: ${userProfile.sessionPerformance.tradesCount}
- Fatigue Factor: ${(userProfile.sessionPerformance.fatigueFactor * 100).toFixed(0)}%

USER TRADING PROFILE:
- Risk Tolerance: ${userProfile.riskTolerance}
- Trading Style: ${userProfile.tradingStyle}
- Max Risk Per Trade: ${userProfile.maxRiskPerTrade}%
- Preferred Timeframes: ${userProfile.preferredTimeframes.join(", ")}

MARKET CONDITIONS:
- Volatility: ${marketIntelligence.volatility}
- Session: ${marketIntelligence.sessionType}
- Symbol Range Position: ${(marketIntelligence.symbolAnalysis.currentRangePosition * 100).toFixed(0)}%

RISK ASSESSMENT:
- Risk Level: ${riskAssessment.currentRiskLevel}
- Recommended Position Size: ${riskAssessment.recommendedPositionSize.toFixed(2)}
- Risk Factors: ${riskAssessment.riskFactors.join("; ")}
- Risk Mitigation: ${riskAssessment.riskMitigation.join("; ")}

CRITICAL TRADING GUIDELINES:
1. NEVER exceed recommended position size of ${riskAssessment.recommendedPositionSize.toFixed(2)}
2. Current risk level is ${riskAssessment.currentRiskLevel} - adjust strategy accordingly
3. Account exposure is ${accountContext.positions.riskExposurePercent.toFixed(1)}% - consider this in position sizing
4. ${riskAssessment.riskFactors.length > 0 ? "RISK FACTORS PRESENT: " + riskAssessment.riskFactors.join(", ") : "No major risk factors detected"}
    `.trim();
  }

  // Helper methods (implementations would be more detailed)
  private async getBasicPortfolioContext(userId: string, botId: string): Promise<any> {
    // Existing implementation from bot-evaluation.service.ts
    return {
      accountBalance: 10000,
      availableBalance: 9500,
      openPositions: 0,
      riskExposure: 0,
    };
  }

  private async getOpenPositions(brokerCredentials: any): Promise<any[]> {
    // Would call Capital.com API to get real positions
    return [];
  }

  private async calculatePerformanceMetrics(botId: string): Promise<any> {
    // Calculate from trading history
    return {
      todayPnL: 0,
      weeklyPnL: 0,
      monthlyPnL: 0,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 1,
      maxDrawdown: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      tradesThisSession: 0,
    };
  }

  private analyzeTradingPatterns(trades: any[]): any {
    // Analyze when user trades most successfully
    return {
      bestHours: [9, 10, 14, 15],
      worstHours: [2, 3, 22, 23],
      bestDays: ["TUESDAY", "WEDNESDAY"],
    };
  }

  private calculateSessionPerformance(trades: any[]): any {
    return {
      tradesCount: 0,
      winRate: 0,
      netPnL: 0,
      hoursTrading: 0,
      fatigueFactor: 0,
    };
  }

  private determineRiskTolerance(bots: any[]): "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE" {
    // Analyze bot configurations to determine risk tolerance
    return "MODERATE";
  }

  private determineTradingStyle(bots: any[]): "SCALPING" | "DAY_TRADING" | "SWING" | "POSITION" {
    // Analyze timeframes to determine style
    return "SCALPING";
  }

  private calculateCurrentVolatility(symbol: string): "LOW" | "MEDIUM" | "HIGH" | "EXTREME" {
    // Would calculate from recent price data
    return "MEDIUM";
  }

  private async analyzeSymbolConditions(symbol: string, brokerCredentials: any): Promise<any> {
    return {
      averageDailyRange: 1250,
      currentRangePosition: 0.65,
      supportLevels: [101200, 100800],
      resistanceLevels: [102000, 102500],
      lastBreakoutDirection: "UP",
      breakoutStrength: 0.8,
      volumeProfile: "ABOVE_AVERAGE",
    };
  }

  private getCurrentTradingSession(): string {
    const hour = new Date().getUTCHours();
    if (hour >= 0 && hour < 8) return "ASIAN_SESSION";
    if (hour >= 8 && hour < 16) return "LONDON_SESSION";
    return "NEW_YORK_SESSION";
  }

  private getDefaultAccountContext(): EnhancedAccountContext {
    return {
      balance: {
        total: 10000,
        available: 9500,
        equity: 10000,
        margin: 500,
        freeMargin: 9500,
        marginLevel: 2000,
        currency: "USD",
        unrealizedPnL: 0,
      },
      positions: {
        open: [],
        totalExposure: 0,
        riskExposurePercent: 0,
        marginUsed: 0,
        symbolExposure: {},
      },
      performance: {
        todayPnL: 0,
        weeklyPnL: 0,
        monthlyPnL: 0,
        winRate: 0,
        averageWin: 0,
        averageLoss: 0,
        profitFactor: 1,
        maxDrawdown: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0,
        tradesThisSession: 0,
      },
    };
  }

  private getDefaultUserProfile(): UserTradingProfile {
    return {
      riskTolerance: "MODERATE",
      maxRiskPerTrade: 2.0,
      maxSimultaneousPositions: 3,
      bestPerformingHours: [9, 10, 14, 15],
      worstPerformingHours: [2, 3, 22, 23],
      bestPerformingDays: ["TUESDAY", "WEDNESDAY"],
      tradingStyle: "SCALPING",
      preferredSymbols: ["BTCUSD"],
      avoidedSymbols: [],
      preferredTimeframes: ["M1"],
      sessionPerformance: {
        tradesCount: 0,
        winRate: 0,
        netPnL: 0,
        hoursTrading: 0,
        fatigueFactor: 0,
      },
    };
  }

  private getDefaultMarketIntelligence(): MarketIntelligence {
    return {
      volatility: "MEDIUM",
      spread: 2.5,
      liquidityScore: 7.5,
      sessionType: "LONDON_SESSION",
      symbolAnalysis: {
        averageDailyRange: 1250,
        currentRangePosition: 0.5,
        supportLevels: [],
        resistanceLevels: [],
        lastBreakoutDirection: "NONE",
        breakoutStrength: 0.5,
        volumeProfile: "NORMAL",
      },
      recentEvents: [],
    };
  }

  private createMinimalContext(symbol: string, primaryTimeframe: string, portfolioContext: any): ComprehensiveContext {
    // Simple timeframe mapping without accessing private method
    const timeframeMappings: Record<string, string> = {
      M1: "M15",
      M5: "H1",
      M15: "H4",
      M30: "D1",
      H1: "D1",
      H4: "W1",
      D1: "W1",
    };
    const higherTimeframe = timeframeMappings[primaryTimeframe] || "H4";

    return {
      symbol,
      primaryTimeframe,
      higherTimeframe,
      higherTimeframeAnalysis: {
        timeframe: higherTimeframe,
        trend: "NEUTRAL",
        momentum: "NEUTRAL",
        confidence: 50,
        supportLevel: 0,
        resistanceLevel: 0,
        volume: "NORMAL",
        summary: "Minimal context - analysis unavailable",
      },
      portfolioContext,
      timestamp: new Date(),
      accountContext: this.getDefaultAccountContext(),
      userProfile: this.getDefaultUserProfile(),
      marketIntelligence: this.getDefaultMarketIntelligence(),
      riskAssessment: {
        currentRiskLevel: "MEDIUM",
        recommendedPositionSize: 200,
        maxRecommendedRisk: 2.0,
        riskFactors: ["Limited context available"],
        riskMitigation: ["Use conservative position sizing"],
      },
    };
  }
}
