import { BaseAgent } from "./base-agent";
import { logger } from "../logger";

// Professional Trading Committee - Multi-Agent System
// Based on TradingGPT, FinHEAR, and FinAgent research
export class ProfessionalTradingCommittee {
  private technicalAnalysisAgent: TechnicalAnalysisAgent;
  private portfolioRiskAgent: PortfolioRiskAgent;
  private marketIntelligenceAgent: MarketIntelligenceAgent;
  private temporalReasoningAgent: TemporalReasoningAgent;
  private tradingDecisionCoordinator: TradingDecisionCoordinator;

  constructor() {
    this.technicalAnalysisAgent = new TechnicalAnalysisAgent();
    this.portfolioRiskAgent = new PortfolioRiskAgent();
    this.marketIntelligenceAgent = new MarketIntelligenceAgent();
    this.temporalReasoningAgent = new TemporalReasoningAgent();
    this.tradingDecisionCoordinator = new TradingDecisionCoordinator();
  }

  /**
   * 🎯 PROFESSIONAL TRADING COMMITTEE ANALYSIS
   * Each agent provides specialized expertise, then coordinator makes final decision
   */
  async analyzeTradingOpportunity(data: {
    symbol: string;
    timeframe: string;
    marketData: any;
    candleData: any[];
    botTradeHistory: any;
    strategyConfig: any;
    botConfig: any;
    portfolioContext: any;
  }): Promise<{
    decision: "BUY" | "SELL" | "HOLD";
    confidence: number;
    reasoning: string[];
    technicalAnalysis: any;
    riskAssessment: any;
    marketIntelligence: any;
    temporalAssessment: any;
    coordinatorDecision: any;
    shouldTrade: boolean;
  }> {
    try {
      logger.info(`🏛️ PROFESSIONAL TRADING COMMITTEE analyzing ${data.symbol}`);
      logger.info(
        `👥 Committee members: Technical Analysis, Portfolio Risk, Market Intelligence, Temporal Reasoning, Decision Coordinator`,
      );

      // 1. TECHNICAL ANALYSIS AGENT - Chart patterns, indicators, price action
      logger.info(`📊 Technical Analysis Agent evaluating ${data.symbol}...`);
      const technicalAnalysis = await this.technicalAnalysisAgent.analyze({
        symbol: data.symbol,
        timeframe: data.timeframe,
        candleData: data.candleData,
        marketData: data.marketData,
        strategy: data.strategyConfig.name,
      });

      // 2. PORTFOLIO RISK AGENT - Position sizing, risk management, exposure
      logger.info(`🛡️ Portfolio Risk Agent evaluating position risk...`);
      const riskAssessment = await this.portfolioRiskAgent.analyze({
        symbol: data.symbol,
        portfolioContext: data.portfolioContext,
        botTradeHistory: data.botTradeHistory,
        proposedDirection: technicalAnalysis.preferredDirection,
        marketData: data.marketData,
        strategyConfig: data.strategyConfig,
      });

      // 3. MARKET INTELLIGENCE AGENT - News, sentiment, market conditions
      logger.info(`🧠 Market Intelligence Agent analyzing market conditions...`);
      const marketIntelligence = await this.marketIntelligenceAgent.analyze({
        symbol: data.symbol,
        marketData: data.marketData,
        timeframe: data.timeframe,
        globalMarketConditions: "analyzing", // Would integrate news APIs here
      });

      // 4. TEMPORAL REASONING AGENT - Timing, cycles, entry optimization
      logger.info(`⏰ Temporal Reasoning Agent evaluating trade timing...`);
      const temporalAssessment = await this.temporalReasoningAgent.analyze({
        symbol: data.symbol,
        timeframe: data.timeframe,
        botTradeHistory: data.botTradeHistory,
        technicalSignal: technicalAnalysis.signal,
        marketData: data.marketData,
        strategyConfig: data.strategyConfig,
      });

      // 5. TRADING DECISION COORDINATOR - Final decision synthesis
      logger.info(`🎯 Trading Decision Coordinator synthesizing committee recommendations...`);
      const coordinatorDecision = await this.tradingDecisionCoordinator.synthesizeDecision({
        technicalAnalysis,
        riskAssessment,
        marketIntelligence,
        temporalAssessment,
        botConfig: data.botConfig,
        strategyConfig: data.strategyConfig,
        symbol: data.symbol,
        marketData: data.marketData,
        portfolioContext: data.portfolioContext,
      });

      logger.info(
        `✅ COMMITTEE DECISION: ${coordinatorDecision.decision} with ${coordinatorDecision.confidence}% confidence`,
      );

      return {
        decision: coordinatorDecision.decision,
        confidence: coordinatorDecision.confidence,
        reasoning: coordinatorDecision.reasoning,
        technicalAnalysis,
        riskAssessment,
        marketIntelligence,
        temporalAssessment,
        coordinatorDecision,
        shouldTrade: coordinatorDecision.shouldTrade,
      };
    } catch (error) {
      logger.error(`❌ Professional Trading Committee analysis failed:`, error);

      return {
        decision: "HOLD",
        confidence: 0,
        reasoning: ["Committee analysis failed - defaulting to HOLD"],
        technicalAnalysis: { signal: "NEUTRAL", confidence: 0 },
        riskAssessment: { riskScore: 10, recommendation: "AVOID" },
        marketIntelligence: { sentiment: "NEUTRAL", confidence: 0 },
        temporalAssessment: { timing: "POOR", confidence: 0 },
        coordinatorDecision: { decision: "HOLD", shouldTrade: false },
        shouldTrade: false,
      };
    }
  }
}

/**
 * 📊 TECHNICAL ANALYSIS AGENT
 * Expert in chart patterns, technical indicators, price action analysis
 */
class TechnicalAnalysisAgent extends BaseAgent {
  constructor() {
    super("TechnicalAnalysisAgent");
  }

  async analyze(data: {
    symbol: string;
    timeframe: string;
    candleData: any[];
    marketData: any;
    strategy: string;
  }): Promise<any> {
    try {
      // Professional technical analysis with specialized LLM prompt
      const technicalPrompt = `You are a SENIOR TECHNICAL ANALYST with 20+ years of experience in institutional trading.

ANALYSIS REQUEST:
Symbol: ${data.symbol}
Timeframe: ${data.timeframe}
Strategy: ${data.strategy}
Current Price: ${data.marketData.price}

TECHNICAL DATA:
${this.formatCandleData(data.candleData)}

Your expertise includes:
- Advanced chart pattern recognition (Head & Shoulders, Cup & Handle, Triangles, Flags)
- Multi-timeframe analysis and confluence
- Support/resistance identification with institutional levels
- Momentum analysis (RSI, MACD, Stochastic divergences)
- Volume analysis and institutional footprints
- Market structure analysis (trends, reversals, continuations)

PROVIDE PROFESSIONAL ANALYSIS:
1. Chart Pattern Analysis: What patterns do you see forming?
2. Key Levels: Critical support/resistance levels with reasoning
3. Momentum Assessment: Current momentum state and divergences
4. Entry Signal Quality: Rate the technical setup quality (1-10)
5. Risk/Reward Assessment: Potential R/R ratio for this setup
6. Timeframe Confluence: Does this align with higher timeframes?
7. Professional Recommendation: BUY/SELL/HOLD with confidence %

Think like an institutional trader. Be precise, analytical, and focus on high-probability setups.`;

      const technicalAnalysis = await this.queryLLM(technicalPrompt, {
        temperature: 0.3, // Lower temperature for analytical precision
        maxTokens: 1000,
      });

      const preferredDirection = this.extractDirection(technicalAnalysis);
      const confidence = this.extractConfidence(technicalAnalysis);

      return {
        signal: preferredDirection,
        confidence: confidence,
        analysis: technicalAnalysis,
        preferredDirection: preferredDirection,
        keyLevels: this.extractKeyLevels(technicalAnalysis),
        patternQuality: this.extractPatternQuality(technicalAnalysis),
      };
    } catch (error) {
      logger.error(`❌ Technical Analysis Agent failed:`, error);
      return {
        signal: "NEUTRAL",
        confidence: 0,
        analysis: "Technical analysis failed",
        preferredDirection: "HOLD",
        keyLevels: {},
        patternQuality: 0,
      };
    }
  }

  private formatCandleData(candleData: any[]): string {
    if (!candleData || candleData.length === 0) {
      return "No candle data available";
    }

    const last20 = candleData.slice(-20);
    return last20
      .map(
        (candle) =>
          `O:${candle.open} H:${candle.high} L:${candle.low} C:${candle.close} V:${candle.volume}`,
      )
      .join("\n");
  }

  private extractDirection(analysis: string): string {
    if (analysis.toLowerCase().includes("buy") || analysis.toLowerCase().includes("long")) {
      return "BUY";
    } else if (
      analysis.toLowerCase().includes("sell") ||
      analysis.toLowerCase().includes("short")
    ) {
      return "SELL";
    }
    return "HOLD";
  }

  private extractConfidence(analysis: string): number {
    const confidenceMatch = analysis.match(/(\d+)%/);
    return confidenceMatch ? parseInt(confidenceMatch[1]) : 50;
  }

  private extractKeyLevels(analysis: string): any {
    // Extract support/resistance levels from analysis
    return {
      support: [],
      resistance: [],
      pivot: null,
    };
  }

  private extractPatternQuality(analysis: string): number {
    // Extract pattern quality score from analysis
    const qualityMatch = analysis.match(/quality.*?(\d+)/i);
    return qualityMatch ? parseInt(qualityMatch[1]) : 5;
  }
}

/**
 * 🛡️ PORTFOLIO RISK AGENT
 * Expert in risk management, position sizing, portfolio optimization
 */
class PortfolioRiskAgent extends BaseAgent {
  constructor() {
    super("PortfolioRiskAgent");
  }

  async analyze(data: {
    symbol: string;
    portfolioContext: any;
    botTradeHistory: any;
    proposedDirection: string;
    marketData: any;
    strategyConfig: any;
  }): Promise<any> {
    try {
      const riskPrompt = `You are a CHIEF RISK OFFICER at a top-tier hedge fund with expertise in systematic trading and risk management.

RISK ASSESSMENT REQUEST:
Symbol: ${data.symbol}
Proposed Direction: ${data.proposedDirection}
Account Balance: $${data.portfolioContext.accountBalance}
Available Capital: $${data.portfolioContext.availableCapital}
Current Positions: ${data.portfolioContext.totalPositions}

BOT TRADING HISTORY:
Recent Trades: ${data.botTradeHistory.tradingFrequency.total24Hours} in 24h
Last Trade: ${data.botTradeHistory.minutesSinceLastTrade} minutes ago
Trading Frequency: ${JSON.stringify(data.botTradeHistory.tradingFrequency)}

STRATEGY CONFIGURATION:
Name: ${data.strategyConfig.name}
Risk Per Trade: ${data.strategyConfig.riskManagement?.maxRiskPerTrade || 2}%
Confidence Threshold: ${data.strategyConfig.confidenceThreshold}%

Your expertise includes:
- Institutional-grade position sizing models
- Risk-adjusted return optimization
- Correlation and concentration risk analysis
- Drawdown management and capital preservation
- Over-trading detection and prevention
- Portfolio heat mapping and exposure limits

PROVIDE PROFESSIONAL RISK ASSESSMENT:
1. Position Sizing Recommendation: Optimal position size for this trade
2. Risk Score (1-10): Overall risk assessment for this opportunity
3. Over-trading Analysis: Is this bot showing concerning trading patterns?
4. Portfolio Impact: How does this trade affect overall portfolio risk?
5. Risk/Reward Justification: Is the risk justified by potential reward?
6. Capital Efficiency: Is this the best use of available capital?
7. Final Recommendation: APPROVE/REDUCE/REJECT with reasoning

Think like you're protecting institutional capital. Prioritize capital preservation over profits.`;

      const riskAnalysis = await this.queryLLM(riskPrompt, {
        temperature: 0.2, // Very low temperature for risk analysis
        maxTokens: 1000,
      });

      const riskScore = this.extractRiskScore(riskAnalysis);
      const recommendation = this.extractRecommendation(riskAnalysis);

      return {
        riskScore: riskScore,
        recommendation: recommendation,
        analysis: riskAnalysis,
        positionSizeRecommendation: this.extractPositionSize(riskAnalysis),
        overTradingConcern: this.assessOverTrading(data.botTradeHistory),
        capitalEfficiency: this.extractCapitalEfficiency(riskAnalysis),
      };
    } catch (error) {
      logger.error(`❌ Portfolio Risk Agent failed:`, error);
      return {
        riskScore: 10,
        recommendation: "REJECT",
        analysis: "Risk analysis failed - defaulting to conservative approach",
        positionSizeRecommendation: 0,
        overTradingConcern: true,
        capitalEfficiency: "POOR",
      };
    }
  }

  private extractRiskScore(analysis: string): number {
    const scoreMatch = analysis.match(/risk score.*?(\d+)/i);
    return scoreMatch ? parseInt(scoreMatch[1]) : 8;
  }

  private extractRecommendation(analysis: string): string {
    if (analysis.toLowerCase().includes("approve")) return "APPROVE";
    if (analysis.toLowerCase().includes("reduce")) return "REDUCE";
    return "REJECT";
  }

  private extractPositionSize(analysis: string): number {
    // 🚨 CRITICAL FIX: Don't rely on LLM to calculate position size
    // The LLM often outputs "1" as a generic placeholder, leading to 1 BTC positions
    // Instead, use a hardcoded safe position size for crypto

    // For BTC: Use 0.001 BTC (~$100-150 at current prices)
    // For ETH: Use 0.01 ETH (~$35-50 at current prices)
    // For other crypto: Use 0.1 units
    const safePositionSize = 0.001;

    logger.info(
      `🔧 Position Size Fix: Using safe position size of ${safePositionSize} units instead of LLM extraction`,
    );

    return safePositionSize;
  }

  private calculateProperPositionSize(
    accountBalance: number,
    currentPrice: number,
    stopLossPrice: number,
    riskPercentage: number = 2,
  ): number {
    try {
      // Calculate risk amount (max 2% of account)
      const riskAmount = accountBalance * (Math.min(riskPercentage, 2) / 100);

      // Calculate stop loss distance
      const stopDistance = Math.abs(currentPrice - stopLossPrice);

      // Calculate position size based on risk
      let positionSize = riskAmount / stopDistance;

      // Apply safety limits for crypto
      if (currentPrice > 50000) {
        // BTC-like: max 0.01 BTC
        positionSize = Math.min(positionSize, 0.01);
      } else if (currentPrice > 1000) {
        // ETH-like: max 0.1 ETH
        positionSize = Math.min(positionSize, 0.1);
      } else {
        // Other crypto: max 10 units
        positionSize = Math.min(positionSize, 10);
      }

      // Ensure minimum viable position
      const minPositionValue = 10; // $10 minimum
      const minPositionSize = minPositionValue / currentPrice;
      positionSize = Math.max(positionSize, minPositionSize);

      logger.info(
        `📊 Position Size Calculation: ${positionSize.toFixed(6)} units (Risk: $${riskAmount.toFixed(2)})`,
      );

      return positionSize;
    } catch (error) {
      logger.error(`❌ Position size calculation failed:`, error);
      return 0.001; // Safe fallback
    }
  }

  private assessOverTrading(botTradeHistory: any): boolean {
    return botTradeHistory.tradingBehavior?.isOverTrading || false;
  }

  private extractCapitalEfficiency(analysis: string): string {
    if (analysis.toLowerCase().includes("excellent")) return "EXCELLENT";
    if (analysis.toLowerCase().includes("good")) return "GOOD";
    if (analysis.toLowerCase().includes("fair")) return "FAIR";
    return "POOR";
  }
}

/**
 * 🧠 MARKET INTELLIGENCE AGENT
 * Expert in market sentiment, news analysis, macro conditions
 */
class MarketIntelligenceAgent extends BaseAgent {
  constructor() {
    super("MarketIntelligenceAgent");
  }

  async analyze(data: {
    symbol: string;
    marketData: any;
    timeframe: string;
    globalMarketConditions: string;
  }): Promise<any> {
    try {
      const intelligencePrompt = `You are a SENIOR MARKET STRATEGIST at a global investment bank with deep expertise in macroeconomic analysis and market sentiment.

MARKET INTELLIGENCE REQUEST:
Symbol: ${data.symbol}
Current Price: $${data.marketData.price}
Timeframe: ${data.timeframe}
Market Session: ${this.getCurrentMarketSession()}

Your expertise includes:
- Global macro analysis and central bank policy impacts
- Market sentiment and positioning analysis
- Cross-asset correlation and risk-on/risk-off dynamics
- Crypto market cycles and institutional adoption trends
- Volatility regime analysis and market structure shifts
- News flow impact assessment and event-driven trading

CURRENT MARKET ENVIRONMENT ANALYSIS:
${this.getMarketEnvironmentContext()}

PROVIDE PROFESSIONAL MARKET INTELLIGENCE:
1. Market Sentiment: Current sentiment for ${data.symbol} and broader market
2. Macro Backdrop: How do current macro conditions affect this trade?
3. Volatility Assessment: Is current volatility favorable for entry?
4. Market Structure: Any structural changes affecting this asset?
5. Institutional Flow: Likely institutional positioning and flow direction
6. Risk Factors: Key risks that could impact this position
7. Market Timing Assessment: Is this a good time to enter this market?

Think like you're briefing the trading desk on market conditions.`;

      const intelligenceAnalysis = await this.queryLLM(intelligencePrompt, {
        temperature: 0.4,
        maxTokens: 1000,
      });

      return {
        sentiment: this.extractSentiment(intelligenceAnalysis),
        confidence: this.extractConfidence(intelligenceAnalysis),
        analysis: intelligenceAnalysis,
        macroBackdrop: this.extractMacroView(intelligenceAnalysis),
        volatilityAssessment: this.extractVolatilityView(intelligenceAnalysis),
        riskFactors: this.extractRiskFactors(intelligenceAnalysis),
      };
    } catch (error) {
      logger.error(`❌ Market Intelligence Agent failed:`, error);
      return {
        sentiment: "NEUTRAL",
        confidence: 50,
        analysis: "Market intelligence analysis failed",
        macroBackdrop: "UNCERTAIN",
        volatilityAssessment: "ELEVATED",
        riskFactors: ["Analysis unavailable"],
      };
    }
  }

  private getCurrentMarketSession(): string {
    const now = new Date();
    const hour = now.getUTCHours();

    if (hour >= 13 && hour < 20) return "US Market Hours";
    if (hour >= 8 && hour < 16) return "European Market Hours";
    if (hour >= 0 && hour < 9) return "Asian Market Hours";
    return "After Hours Trading";
  }

  private getMarketEnvironmentContext(): string {
    return `
GLOBAL MACRO CONTEXT:
- Major central bank policies and interest rate environment
- Risk-on vs risk-off sentiment indicators
- VIX levels and volatility expectations
- USD strength and its impact on risk assets
- Geopolitical tensions and market uncertainty

CRYPTO-SPECIFIC FACTORS (if applicable):
- Institutional adoption trends
- Regulatory developments
- Network fundamentals and adoption
- Cross-crypto correlations
    `;
  }

  private extractSentiment(analysis: string): string {
    if (analysis.toLowerCase().includes("bullish") || analysis.toLowerCase().includes("positive")) {
      return "BULLISH";
    } else if (
      analysis.toLowerCase().includes("bearish") ||
      analysis.toLowerCase().includes("negative")
    ) {
      return "BEARISH";
    }
    return "NEUTRAL";
  }

  private extractConfidence(analysis: string): number {
    const confidenceMatch = analysis.match(/(\d+)%/);
    return confidenceMatch ? parseInt(confidenceMatch[1]) : 50;
  }

  private extractMacroView(analysis: string): string {
    if (analysis.toLowerCase().includes("supportive")) return "SUPPORTIVE";
    if (analysis.toLowerCase().includes("headwind")) return "HEADWINDS";
    return "NEUTRAL";
  }

  private extractVolatilityView(analysis: string): string {
    if (analysis.toLowerCase().includes("low volatility")) return "LOW";
    if (analysis.toLowerCase().includes("high volatility")) return "HIGH";
    return "MODERATE";
  }

  private extractRiskFactors(analysis: string): string[] {
    // Extract key risk factors from analysis
    return ["Market risk factors analysis needed"];
  }
}

/**
 * ⏰ TEMPORAL REASONING AGENT
 * Expert in market timing, cycles, entry/exit optimization
 */
class TemporalReasoningAgent extends BaseAgent {
  constructor() {
    super("TemporalReasoningAgent");
  }

  async analyze(data: {
    symbol: string;
    timeframe: string;
    botTradeHistory: any;
    technicalSignal: string;
    marketData: any;
    strategyConfig: any;
  }): Promise<any> {
    try {
      const temporalPrompt = `You are a QUANTITATIVE TRADING SPECIALIST with expertise in market timing and algorithmic execution optimization.

TEMPORAL ANALYSIS REQUEST:
Symbol: ${data.symbol}
Timeframe: ${data.timeframe}
Technical Signal: ${data.technicalSignal}
Strategy: ${data.strategyConfig.name}

BOT TRADING TIMELINE:
Last Trade: ${data.botTradeHistory.minutesSinceLastTrade} minutes ago
Recent Activity: ${JSON.stringify(data.botTradeHistory.tradingFrequency)}

Your expertise includes:
- Optimal entry timing and execution algorithms
- Market microstructure and liquidity patterns
- Trading session analysis and volume profiles
- Strategy-specific timing optimization
- Overtrading prevention and intelligent spacing
- Execution cost minimization

CURRENT TIMING CONTEXT:
Time: ${new Date().toISOString()}
Market Session: ${this.getCurrentSession()}
Volume Profile: ${this.getVolumeProfile()}

PROVIDE TEMPORAL REASONING ANALYSIS:
1. Entry Timing Quality: Rate current timing for entry (1-10)
2. Market Liquidity Assessment: Is liquidity favorable for execution?
3. Strategy Timing Alignment: Does timing align with strategy requirements?
4. Overtrading Risk: Analysis of recent trading frequency
5. Execution Timing: Best approach for trade execution
6. Exit Planning: Optimal exit timing considerations
7. Final Timing Recommendation: NOW/WAIT/SKIP with reasoning

Think like you're optimizing execution for a systematic trading strategy.`;

      const temporalAnalysis = await this.queryLLM(temporalPrompt, {
        temperature: 0.3,
        maxTokens: 1000,
      });

      return {
        timing: this.extractTiming(temporalAnalysis),
        confidence: this.extractConfidence(temporalAnalysis),
        analysis: temporalAnalysis,
        entryQuality: this.extractEntryQuality(temporalAnalysis),
        liquidityAssessment: this.extractLiquidity(temporalAnalysis),
        overTradingRisk: this.assessOverTradingRisk(data.botTradeHistory),
      };
    } catch (error) {
      logger.error(`❌ Temporal Reasoning Agent failed:`, error);
      return {
        timing: "POOR",
        confidence: 30,
        analysis: "Temporal analysis failed",
        entryQuality: 3,
        liquidityAssessment: "UNCERTAIN",
        overTradingRisk: "HIGH",
      };
    }
  }

  private getCurrentSession(): string {
    const now = new Date();
    const hour = now.getUTCHours();

    if (hour >= 13 && hour < 20) return "US_ACTIVE";
    if (hour >= 8 && hour < 16) return "EU_ACTIVE";
    if (hour >= 0 && hour < 9) return "ASIA_ACTIVE";
    return "LOW_LIQUIDITY";
  }

  private getVolumeProfile(): string {
    // Would analyze actual volume data
    return "ANALYZING";
  }

  private extractTiming(analysis: string): string {
    if (
      analysis.toLowerCase().includes("excellent") ||
      analysis.toLowerCase().includes("optimal")
    ) {
      return "EXCELLENT";
    } else if (analysis.toLowerCase().includes("good")) {
      return "GOOD";
    } else if (analysis.toLowerCase().includes("poor")) {
      return "POOR";
    }
    return "FAIR";
  }

  private extractConfidence(analysis: string): number {
    const confidenceMatch = analysis.match(/(\d+)%/);
    return confidenceMatch ? parseInt(confidenceMatch[1]) : 50;
  }

  private extractEntryQuality(analysis: string): number {
    const qualityMatch = analysis.match(/quality.*?(\d+)/i);
    return qualityMatch ? parseInt(qualityMatch[1]) : 5;
  }

  private extractLiquidity(analysis: string): string {
    if (analysis.toLowerCase().includes("high liquidity")) return "HIGH";
    if (analysis.toLowerCase().includes("low liquidity")) return "LOW";
    return "MODERATE";
  }

  private assessOverTradingRisk(botTradeHistory: any): string {
    if (botTradeHistory.tradingBehavior?.isOverTrading) return "HIGH";
    if (botTradeHistory.tradingFrequency?.last15Minutes >= 2) return "MODERATE";
    return "LOW";
  }
}

/**
 * 🎯 TRADING DECISION COORDINATOR
 * Synthesizes all agent recommendations and makes final trading decision
 */
class TradingDecisionCoordinator extends BaseAgent {
  constructor() {
    super("TradingDecisionCoordinator");
  }

  // Implement the abstract analyze method required by BaseAgent
  async analyze(data: any): Promise<any> {
    return this.synthesizeDecision(data);
  }

  async synthesizeDecision(data: {
    technicalAnalysis: any;
    riskAssessment: any;
    marketIntelligence: any;
    temporalAssessment: any;
    botConfig: any;
    strategyConfig: any;
    symbol: string;
    marketData: any;
    portfolioContext: any;
  }): Promise<any> {
    try {
      // 🚨 CRITICAL: Pre-calculate 5 position size options for LLM to choose from
      const positionOptions = this.calculatePositionSizeOptions(data);

      const coordinatorPrompt = `You are the HEAD OF TRADING at a systematic hedge fund, responsible for final trading decisions based on committee recommendations.

COMMITTEE RECOMMENDATIONS FOR ${data.symbol}:

TECHNICAL ANALYSIS AGENT:
Signal: ${data.technicalAnalysis.signal}
Confidence: ${data.technicalAnalysis.confidence}%
Pattern Quality: ${data.technicalAnalysis.patternQuality}/10
Analysis: ${data.technicalAnalysis.analysis}

PORTFOLIO RISK AGENT:
Risk Score: ${data.riskAssessment.riskScore}/10
Recommendation: ${data.riskAssessment.recommendation}
Position Size: ${data.riskAssessment.positionSizeRecommendation}
Over-trading Concern: ${data.riskAssessment.overTradingConcern}

MARKET INTELLIGENCE AGENT:
Sentiment: ${data.marketIntelligence.sentiment}
Confidence: ${data.marketIntelligence.confidence}%
Macro Backdrop: ${data.marketIntelligence.macroBackdrop}
Volatility: ${data.marketIntelligence.volatilityAssessment}

TEMPORAL REASONING AGENT:
Timing: ${data.temporalAssessment.timing}
Entry Quality: ${data.temporalAssessment.entryQuality}/10
Liquidity: ${data.temporalAssessment.liquidityAssessment}
Over-trading Risk: ${data.temporalAssessment.overTradingRisk}

POSITION SIZE OPTIONS (choose exactly one):
${positionOptions.optionsText}

STRATEGY PARAMETERS:
Name: ${data.strategyConfig.name}
Confidence Threshold: ${data.strategyConfig.confidenceThreshold}%
Risk Management: ${JSON.stringify(data.strategyConfig.riskManagement)}

Your responsibility is to synthesize these expert opinions and make the final trading decision.

PROVIDE FINAL TRADING DECISION:
1. Committee Consensus Analysis: Are the agents aligned or conflicted?
2. Risk-Adjusted Assessment: Weighing potential reward against identified risks
3. Strategy Alignment: Does this opportunity fit the strategy parameters?
4. Final Decision: BUY/SELL/HOLD with detailed reasoning
5. Confidence Level: Overall confidence in this decision (1-100%)
6. Position Size Selection: Choose ONE of the position size options above (Conservative/Low/Medium/High/Aggressive)
7. Execution Plan: How should this trade be executed?

CRITICAL: You MUST select exactly one position size option from the provided list. Do not create your own position size.

Think like you're making a decision that will be reviewed by the investment committee.`;

      const coordinatorAnalysis = await this.queryLLM(coordinatorPrompt, {
        temperature: 0.2, // Low temperature for final decision
        maxTokens: 1200,
      });

      const finalDecision = this.extractFinalDecision(coordinatorAnalysis);
      const confidence = this.extractConfidence(coordinatorAnalysis);
      const shouldTrade = this.determineShouldTrade(data, finalDecision, confidence);
      const selectedPositionSize = this.extractSelectedPositionSize(
        coordinatorAnalysis,
        positionOptions,
      );

      logger.info(
        `🔧 Position Size Selected: ${selectedPositionSize?.toFixed(6) || "0.001000"} units (${this.getSelectedOptionName(coordinatorAnalysis)})`,
      );

      return {
        decision: finalDecision,
        confidence: confidence,
        shouldTrade: shouldTrade,
        reasoning: this.extractReasoning(coordinatorAnalysis),
        analysis: coordinatorAnalysis,
        positionSize: selectedPositionSize,
        executionPlan: this.extractExecutionPlan(coordinatorAnalysis),
        consensusAnalysis: this.extractConsensus(coordinatorAnalysis),
      };
    } catch (error) {
      logger.error(`❌ Trading Decision Coordinator failed:`, error);
      return {
        decision: "HOLD",
        confidence: 0,
        shouldTrade: false,
        reasoning: ["Coordinator analysis failed - defaulting to HOLD"],
        analysis: "Decision synthesis failed",
        positionSize: 0,
        executionPlan: "NO_EXECUTION",
        consensusAnalysis: "FAILED",
      };
    }
  }

  private calculatePositionSizeOptions(data: {
    technicalAnalysis: any;
    riskAssessment: any;
    marketIntelligence: any;
    temporalAssessment: any;
    botConfig: any;
    strategyConfig: any;
    symbol: string;
    marketData: any;
    portfolioContext: any;
  }): any {
    const currentPrice = data.marketData?.price || 109000; // Fallback price
    const accountBalance = data.portfolioContext?.accountBalance || 1000; // Fallback balance

    // 🎯 SMART STOP LOSS & TAKE PROFIT CALCULATION
    const smartLevels = this.calculateSmartStopLossTakeProfit(data);

    // Get bot risk settings
    const minRisk = data.botConfig?.minRiskPercentage || 0.5;
    const maxRisk = data.botConfig?.maxRiskPercentage || 2.0;

    // Calculate 5 position size options
    const riskOptions = [
      {
        name: "Conservative",
        risk: minRisk,
        stopLoss: smartLevels.conservative.stopLoss,
        takeProfit: smartLevels.conservative.takeProfit,
      },
      {
        name: "Low",
        risk: minRisk + (maxRisk - minRisk) * 0.25,
        stopLoss: smartLevels.low.stopLoss,
        takeProfit: smartLevels.low.takeProfit,
      },
      {
        name: "Medium",
        risk: minRisk + (maxRisk - minRisk) * 0.5,
        stopLoss: smartLevels.medium.stopLoss,
        takeProfit: smartLevels.medium.takeProfit,
      },
      {
        name: "High",
        risk: minRisk + (maxRisk - minRisk) * 0.75,
        stopLoss: smartLevels.high.stopLoss,
        takeProfit: smartLevels.high.takeProfit,
      },
      {
        name: "Aggressive",
        risk: maxRisk,
        stopLoss: smartLevels.aggressive.stopLoss,
        takeProfit: smartLevels.aggressive.takeProfit,
      },
    ];

    // Calculate position sizes for each option
    const positionOptions = riskOptions.map((option) => {
      const riskAmount = accountBalance * (option.risk / 100);
      const stopDistance = Math.abs(currentPrice - option.stopLoss);
      const positionSize = stopDistance > 0 ? riskAmount / stopDistance : 0.001;

      // Apply asset-specific limits
      const maxPositionSize = this.getMaxPositionSizeForAsset(data.symbol, accountBalance);
      const finalPositionSize = Math.min(positionSize, maxPositionSize);

      return {
        name: option.name,
        positionSize: finalPositionSize,
        riskPercent: option.risk,
        riskAmount: riskAmount,
        stopLoss: option.stopLoss,
        takeProfit: option.takeProfit,
        valueUSD: finalPositionSize * currentPrice,
        riskReward:
          Math.abs(option.takeProfit - currentPrice) / Math.abs(currentPrice - option.stopLoss),
      };
    });

    return {
      options: positionOptions,
      recommendation:
        "Choose position size based on current market conditions and your risk tolerance",
      currentPrice: currentPrice,
      accountBalance: accountBalance,
      smartLevels: smartLevels,
    };
  }

  private calculateSmartStopLossTakeProfit(data: any): any {
    const currentPrice = data.marketData?.price || 109000;
    const symbol = data.symbol;
    const timeframe = data.botConfig?.timeframe || "M1";

    // Get candlestick data for chart analysis
    const candleData = data.marketData?.candleData || [];

    // Calculate chart-based levels
    const chartLevels = this.calculateChartBasedLevels(candleData, currentPrice, timeframe);

    // Calculate ATR for volatility context
    const atr = this.calculateATR(candleData);

    // Determine direction (assume BUY for now, should come from analysis)
    const direction = data.technicalAnalysis?.direction || "BUY";

    // Calculate 5 different risk levels
    const levels = {
      conservative: this.calculateLevelForRisk(
        currentPrice,
        chartLevels,
        atr,
        direction,
        0.5,
        timeframe,
      ),
      low: this.calculateLevelForRisk(currentPrice, chartLevels, atr, direction, 0.75, timeframe),
      medium: this.calculateLevelForRisk(currentPrice, chartLevels, atr, direction, 1.0, timeframe),
      high: this.calculateLevelForRisk(currentPrice, chartLevels, atr, direction, 1.25, timeframe),
      aggressive: this.calculateLevelForRisk(
        currentPrice,
        chartLevels,
        atr,
        direction,
        1.5,
        timeframe,
      ),
    };

    return levels;
  }

  private calculateChartBasedLevels(
    candleData: any[],
    currentPrice: number,
    timeframe: string,
  ): any {
    if (!candleData || candleData.length < 20) {
      // Fallback to percentage-based levels
      const percentage = this.getTimeframeRiskPercentage(timeframe);
      return {
        nearestSupport: currentPrice * (1 - percentage / 100),
        nearestResistance: currentPrice * (1 + percentage / 100),
        swingLow: currentPrice * (1 - percentage / 100),
        swingHigh: currentPrice * (1 + percentage / 100),
        entryCandle: {
          high: currentPrice * 1.002,
          low: currentPrice * 0.998,
        },
      };
    }

    // Find swing highs and lows
    const swingPoints = this.findSwingPoints(candleData);

    // Find support and resistance levels
    const levels = this.findSupportResistanceLevels(candleData, currentPrice);

    // Get entry candle (most recent)
    const entryCandle = candleData[candleData.length - 1];

    return {
      nearestSupport: levels.support,
      nearestResistance: levels.resistance,
      swingLow: swingPoints.recentLow,
      swingHigh: swingPoints.recentHigh,
      entryCandle: entryCandle,
    };
  }

  private calculateLevelForRisk(
    currentPrice: number,
    chartLevels: any,
    atr: number,
    direction: string,
    riskMultiplier: number,
    timeframe: string,
  ): any {
    const timeframeRisk = this.getTimeframeRiskPercentage(timeframe);

    let stopLoss: number;
    let takeProfit: number;

    if (direction === "BUY") {
      // For BUY orders: Stop below, profit above

      // Stop loss options (choose most conservative)
      const options = [
        chartLevels.entryCandle.low - atr * 0.5, // Below entry candle low
        chartLevels.nearestSupport - atr * 0.3, // Below support
        currentPrice - atr * riskMultiplier, // ATR-based
        currentPrice * (1 - timeframeRisk / 100), // Percentage-based
      ];

      // Use the highest (most conservative) stop loss
      stopLoss = Math.max(...options.filter((x) => x > 0));

      // Take profit options
      const profitOptions = [
        chartLevels.nearestResistance - atr * 0.2, // Near resistance
        currentPrice + Math.abs(currentPrice - stopLoss) * 1.5, // 1.5:1 risk/reward
        currentPrice + atr * riskMultiplier * 1.5, // ATR-based
        currentPrice * (1 + (timeframeRisk * 1.5) / 100), // Percentage-based
      ];

      // Use the lowest (most conservative) take profit
      takeProfit = Math.min(...profitOptions.filter((x) => x > currentPrice));
    } else {
      // For SELL orders: Stop above, profit below

      const options = [
        chartLevels.entryCandle.high + atr * 0.5, // Above entry candle high
        chartLevels.nearestResistance + atr * 0.3, // Above resistance
        currentPrice + atr * riskMultiplier, // ATR-based
        currentPrice * (1 + timeframeRisk / 100), // Percentage-based
      ];

      // Use the lowest (most conservative) stop loss
      stopLoss = Math.min(...options.filter((x) => x > currentPrice));

      // Take profit options
      const profitOptions = [
        chartLevels.nearestSupport + atr * 0.2, // Near support
        currentPrice - Math.abs(stopLoss - currentPrice) * 1.5, // 1.5:1 risk/reward
        currentPrice - atr * riskMultiplier * 1.5, // ATR-based
        currentPrice * (1 - (timeframeRisk * 1.5) / 100), // Percentage-based
      ];

      // Use the highest (most conservative) take profit
      takeProfit = Math.max(...profitOptions.filter((x) => x < currentPrice));
    }

    return {
      stopLoss: stopLoss,
      takeProfit: takeProfit,
    };
  }

  private getTimeframeRiskPercentage(timeframe: string): number {
    const riskPercentages: { [key: string]: number } = {
      M1: 0.15, // 0.15% for 1-minute (very tight)
      M5: 0.25, // 0.25% for 5-minute
      M15: 0.4, // 0.4% for 15-minute
      M30: 0.6, // 0.6% for 30-minute
      H1: 0.8, // 0.8% for 1-hour
      H4: 1.2, // 1.2% for 4-hour
      D1: 2.0, // 2.0% for daily
    };

    return riskPercentages[timeframe] || 0.5; // Default fallback
  }

  private findSwingPoints(candleData: any[]): any {
    if (candleData.length < 10) {
      const lastCandle = candleData[candleData.length - 1];
      return {
        recentHigh: lastCandle.high,
        recentLow: lastCandle.low,
      };
    }

    // Look for swing highs and lows in the last 20 candles
    const recentCandles = candleData.slice(-20);
    const highs = recentCandles.map((c) => c.high);
    const lows = recentCandles.map((c) => c.low);

    return {
      recentHigh: Math.max(...highs),
      recentLow: Math.min(...lows),
    };
  }

  private findSupportResistanceLevels(candleData: any[], currentPrice: number): any {
    if (candleData.length < 50) {
      return {
        support: currentPrice * 0.995,
        resistance: currentPrice * 1.005,
      };
    }

    // Use recent 50 candles for support/resistance
    const recentCandles = candleData.slice(-50);

    // Find levels where price has bounced multiple times
    const levels = recentCandles.reduce((acc, candle) => {
      acc.push(candle.high, candle.low);
      return acc;
    }, []);

    // Group similar levels
    const groupedLevels = this.groupSimilarLevels(levels, 0.002); // 0.2% tolerance

    // Find support (below current price) and resistance (above current price)
    const supportLevels = groupedLevels
      .filter((level) => level < currentPrice)
      .sort((a, b) => b - a);
    const resistanceLevels = groupedLevels
      .filter((level) => level > currentPrice)
      .sort((a, b) => a - b);

    return {
      support: supportLevels[0] || currentPrice * 0.995,
      resistance: resistanceLevels[0] || currentPrice * 1.005,
    };
  }

  private groupSimilarLevels(levels: number[], tolerance: number): number[] {
    const grouped: number[] = [];
    const sorted = levels.sort((a, b) => a - b);

    for (const level of sorted) {
      const existing = grouped.find((g) => Math.abs(g - level) / level < tolerance);
      if (!existing) {
        grouped.push(level);
      }
    }

    return grouped;
  }

  private calculateATR(candleData: any[], period: number = 14): number {
    if (!candleData || candleData.length < period + 1) {
      return 50; // Conservative default ATR for crypto
    }

    const trueRanges = [];
    for (let i = 1; i < candleData.length; i++) {
      const current = candleData[i];
      const previous = candleData[i - 1];

      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close),
      );
      trueRanges.push(tr);
    }

    const recentTR = trueRanges.slice(-period);
    return recentTR.reduce((sum, tr) => sum + tr, 0) / recentTR.length;
  }

  private getMaxPositionSizeForAsset(symbol: string, accountBalance: number): number {
    const symbolUpper = symbol.toUpperCase();

    // Asset-specific position limits
    if (symbolUpper.includes("BTC")) {
      return Math.min(0.01, (accountBalance * 0.05) / 100000); // Max 0.01 BTC or 5% of account
    } else if (symbolUpper.includes("ETH")) {
      return Math.min(0.1, (accountBalance * 0.05) / 3500); // Max 0.1 ETH or 5% of account
    } else if (symbolUpper.includes("USD") || symbolUpper.includes("EUR")) {
      return Math.min(10000, accountBalance * 0.1); // Max 10k units or 10% of account
    } else {
      return Math.min(10, (accountBalance * 0.05) / 100); // Conservative default
    }
  }

  // 🚨 NEW: Position Management Awareness
  private async checkExistingPositions(data: any): Promise<any> {
    try {
      const symbol = data.symbol;
      const portfolioContext = data.portfolioContext;

      // Check if we already have a position in this symbol
      const existingPosition = portfolioContext?.positions?.find(
        (pos: any) => pos.symbol === symbol || pos.instrument === symbol,
      );

      if (existingPosition) {
        return {
          hasPosition: true,
          position: existingPosition,
          action: this.determinePositionAction(existingPosition, data),
          reasoning: `Existing ${existingPosition.direction} position detected with ${existingPosition.unrealizedPnL > 0 ? "profit" : "loss"} of ${existingPosition.unrealizedPnL}`,
        };
      }

      return {
        hasPosition: false,
        action: "NEW_POSITION",
        reasoning: "No existing position found, can consider new entry",
      };
    } catch (error) {
      logger.error(`Error checking existing positions: ${error}`);
      return {
        hasPosition: false,
        action: "NEW_POSITION",
        reasoning: "Unable to check existing positions, assuming new entry",
      };
    }
  }

  private determinePositionAction(position: any, data: any): string {
    const currentPrice = data.marketData?.price || 0;
    const unrealizedPnL = position.unrealizedPnL || 0;

    // If position is profitable and we're at resistance/support, consider taking partial profit
    if (unrealizedPnL > 0 && Math.abs(unrealizedPnL) > position.size * currentPrice * 0.01) {
      return "TAKE_PARTIAL_PROFIT";
    }

    // If position is losing and trend is against us, consider stopping out
    if (unrealizedPnL < 0 && Math.abs(unrealizedPnL) > position.size * currentPrice * 0.005) {
      return "CONSIDER_STOP_LOSS";
    }

    // If position is flat, consider adding to position
    if (Math.abs(unrealizedPnL) < position.size * currentPrice * 0.002) {
      return "CONSIDER_ADD_TO_POSITION";
    }

    return "HOLD_POSITION";
  }

  private extractSelectedPositionSize(analysis: string, positionOptions: any): number {
    const lowerAnalysis = analysis.toLowerCase();

    // Ensure we have options
    if (!positionOptions || !positionOptions.options || !Array.isArray(positionOptions.options)) {
      logger.warn(`⚠️ No position options available, using default size`);
      return 0.001; // Safe default
    }

    // Look for explicit selection by name
    let selectedOption = null;

    if (lowerAnalysis.includes("conservative")) {
      selectedOption = positionOptions.options.find((opt: any) => opt.name === "Conservative");
    } else if (lowerAnalysis.includes("aggressive")) {
      selectedOption = positionOptions.options.find((opt: any) => opt.name === "Aggressive");
    } else if (lowerAnalysis.includes("high")) {
      selectedOption = positionOptions.options.find((opt: any) => opt.name === "High");
    } else if (lowerAnalysis.includes("medium")) {
      selectedOption = positionOptions.options.find((opt: any) => opt.name === "Medium");
    } else if (lowerAnalysis.includes("low")) {
      selectedOption = positionOptions.options.find((opt: any) => opt.name === "Low");
    }

    // If we found a selection, return its position size
    if (selectedOption && selectedOption.positionSize) {
      return selectedOption.positionSize;
    }

    // Default to conservative (first option) if no clear selection
    logger.warn(`⚠️ No clear position size selection found, defaulting to conservative`);
    const conservativeOption =
      positionOptions.options.find((opt: any) => opt.name === "Conservative") ||
      positionOptions.options[0];
    return conservativeOption?.positionSize || 0.001;
  }

  private getSelectedOptionName(analysis: string): string {
    const lowerAnalysis = analysis.toLowerCase();

    if (lowerAnalysis.includes("conservative")) return "Conservative";
    if (lowerAnalysis.includes("aggressive")) return "Aggressive";
    if (lowerAnalysis.includes("high")) return "High";
    if (lowerAnalysis.includes("medium")) return "Medium";
    if (lowerAnalysis.includes("low")) return "Low";

    return "Conservative (default)";
  }

  private extractFinalDecision(analysis: string): string {
    if (analysis.toLowerCase().includes("buy") || analysis.toLowerCase().includes("long")) {
      return "BUY";
    } else if (
      analysis.toLowerCase().includes("sell") ||
      analysis.toLowerCase().includes("short")
    ) {
      return "SELL";
    }
    return "HOLD";
  }

  private extractConfidence(analysis: string): number {
    const confidenceMatch = analysis.match(/confidence.*?(\d+)%/i);
    return confidenceMatch ? parseInt(confidenceMatch[1]) : 0;
  }

  private determineShouldTrade(data: any, decision: string, confidence: number): boolean {
    if (decision === "HOLD") return false;
    if (confidence < data.strategyConfig.confidenceThreshold) return false;
    if (data.riskAssessment.recommendation === "REJECT") return false;
    if (data.temporalAssessment.overTradingRisk === "HIGH") return false;

    return true;
  }

  private extractReasoning(analysis: string): string[] {
    // Extract key reasoning points from the analysis
    const lines = analysis
      .split("\n")
      .filter(
        (line) =>
          line.includes("because") ||
          line.includes("due to") ||
          line.includes("given") ||
          line.includes("reasoning"),
      );
    return lines.length > 0 ? lines : ["Decision based on committee analysis"];
  }

  private extractExecutionPlan(analysis: string): string {
    // Smart order type selection based on market conditions and analysis
    const lowerAnalysis = analysis.toLowerCase();

    // Check for explicit order type mentions
    if (lowerAnalysis.includes("limit order") || lowerAnalysis.includes("limit entry")) {
      return "LIMIT";
    }

    if (lowerAnalysis.includes("stop order") || lowerAnalysis.includes("stop entry")) {
      return "STOP";
    }

    if (lowerAnalysis.includes("market order") || lowerAnalysis.includes("immediate execution")) {
      return "MARKET";
    }

    // Analyze market conditions for intelligent selection
    if (lowerAnalysis.includes("high volatility") || lowerAnalysis.includes("volatile")) {
      if (lowerAnalysis.includes("strong signal") || lowerAnalysis.includes("high confidence")) {
        return "MARKET"; // Execute immediately in volatile markets with strong signals
      } else {
        return "STOP"; // Wait for confirmation in volatile markets
      }
    }

    if (lowerAnalysis.includes("low volatility") || lowerAnalysis.includes("stable")) {
      return "LIMIT"; // Optimize entry in stable markets
    }

    if (lowerAnalysis.includes("breakout") || lowerAnalysis.includes("trend continuation")) {
      return "STOP"; // Wait for trend confirmation
    }

    if (
      lowerAnalysis.includes("range") ||
      lowerAnalysis.includes("support") ||
      lowerAnalysis.includes("resistance")
    ) {
      return "LIMIT"; // Better entry at key levels
    }

    if (lowerAnalysis.includes("urgent") || lowerAnalysis.includes("immediate")) {
      return "MARKET"; // Execute immediately when urgent
    }

    if (
      lowerAnalysis.includes("scalping") ||
      lowerAnalysis.includes("m1") ||
      lowerAnalysis.includes("m5")
    ) {
      return "MARKET"; // Fast execution for scalping
    }

    // Default to MARKET for moderate confidence scenarios
    return "MARKET";
  }

  private extractOrderTypeConfidence(analysis: string): number {
    const lowerAnalysis = analysis.toLowerCase();

    // High confidence indicators
    if (
      lowerAnalysis.includes("strong signal") ||
      lowerAnalysis.includes("clear breakout") ||
      lowerAnalysis.includes("urgent")
    ) {
      return 90;
    }

    // Medium confidence indicators
    if (
      lowerAnalysis.includes("moderate signal") ||
      lowerAnalysis.includes("trend continuation") ||
      lowerAnalysis.includes("support/resistance")
    ) {
      return 70;
    }

    // Low confidence indicators
    if (
      lowerAnalysis.includes("weak signal") ||
      lowerAnalysis.includes("uncertain") ||
      lowerAnalysis.includes("mixed signals")
    ) {
      return 50;
    }

    return 75; // Default confidence
  }

  private extractOrderTypeReasoning(analysis: string, orderType: string): string {
    const lowerAnalysis = analysis.toLowerCase();

    switch (orderType) {
      case "MARKET":
        if (lowerAnalysis.includes("urgent") || lowerAnalysis.includes("immediate")) {
          return "Market order for immediate execution due to urgent signal";
        }
        if (lowerAnalysis.includes("high volatility") && lowerAnalysis.includes("strong signal")) {
          return "Market order to capture strong signal in volatile conditions";
        }
        if (lowerAnalysis.includes("scalping")) {
          return "Market order for fast scalping execution";
        }
        return "Market order for reliable execution";

      case "LIMIT":
        if (lowerAnalysis.includes("low volatility")) {
          return "Limit order to optimize entry in stable market conditions";
        }
        if (lowerAnalysis.includes("support") || lowerAnalysis.includes("resistance")) {
          return "Limit order to enter at key support/resistance levels";
        }
        return "Limit order for better entry price";

      case "STOP":
        if (lowerAnalysis.includes("breakout")) {
          return "Stop order to wait for breakout confirmation";
        }
        if (lowerAnalysis.includes("trend continuation")) {
          return "Stop order to confirm trend continuation";
        }
        if (lowerAnalysis.includes("high volatility")) {
          return "Stop order to wait for volatility confirmation";
        }
        return "Stop order for trend confirmation";

      default:
        return "Standard execution plan";
    }
  }

  private extractConsensus(analysis: string): string {
    if (
      analysis.toLowerCase().includes("aligned") ||
      analysis.toLowerCase().includes("consensus")
    ) {
      return "ALIGNED";
    } else if (
      analysis.toLowerCase().includes("conflicted") ||
      analysis.toLowerCase().includes("disagreement")
    ) {
      return "CONFLICTED";
    }
    return "MIXED";
  }
}
