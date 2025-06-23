/**
 * Technical Analysis Agent - LangChain.js Implementation
 * Purpose: Provides intelligent technical analysis using LangChain tools and LLM reasoning
 * Replaces: Basic technical analysis logic
 */

import { z } from "zod";
import { Tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createOpenAIFunctionsAgent, AgentExecutor } from "langchain/agents";
import { AgentResult, TechnicalSignal } from "../types/agent.types";
import { agentsConfig } from "../../config/agents.config";
import { loggerService } from "../core/services/logging/logger.service";
import { RobustJSONParser } from "../../services/ai/json-parser";

// Technical Indicators Tool
class TechnicalIndicatorsTool extends Tool {
  name = "technical_indicators";
  description = "Calculate technical indicators like RSI, MACD, SMA, EMA, Bollinger Bands. Input should be JSON with action and params.";

  async _call(input: string): Promise<string> {
    try {
      const parsedInput = JSON.parse(input);
      const { action, params } = parsedInput;
      const { prices, period = 14 } = params;

      switch (action) {
        case "rsi":
          return JSON.stringify(this.calculateRSI(prices, period));
        case "macd":
          return JSON.stringify(this.calculateMACD(prices, params.fastPeriod || 12, params.slowPeriod || 26, params.signalPeriod || 9));
        case "sma":
          return JSON.stringify(this.calculateSMA(prices, period));
        case "ema":
          return JSON.stringify(this.calculateEMA(prices, period));
        case "bollinger_bands":
          return JSON.stringify(this.calculateBollingerBands(prices, period));
        case "all_indicators":
          return JSON.stringify(this.calculateAllIndicators(prices));
        default:
          throw new Error(`Unknown indicator: ${action}`);
      }
    } catch (error) {
      return JSON.stringify({ error: (error as Error).message });
    }
  }

  private calculateRSI(prices: number[], period: number = 14): any {
    if (prices.length < period + 1) {
      return { rsi: 50, signal: "NEUTRAL", error: "Insufficient data" };
    }

    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
    const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;

    const rs = avgGain / (avgLoss || 0.001);
    const rsi = 100 - 100 / (1 + rs);

    let signal = "NEUTRAL";
    if (rsi > 70) signal = "SELL";
    else if (rsi < 30) signal = "BUY";

    return {
      rsi: Math.round(rsi * 100) / 100,
      signal,
      strength: rsi > 70 || rsi < 30 ? "STRONG" : rsi > 60 || rsi < 40 ? "MODERATE" : "WEAK",
    };
  }

  private calculateMACD(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): any {
    if (prices.length < slowPeriod) {
      return { macd: 0, signal: 0, histogram: 0, trend: "NEUTRAL", error: "Insufficient data" };
    }

    const emaFast = this.calculateEMA(prices, fastPeriod);
    const emaSlow = this.calculateEMA(prices, slowPeriod);

    const macdLine = emaFast.value - emaSlow.value;
    const signalLine = 0; // Simplified - would need EMA of MACD line
    const histogram = macdLine - signalLine;

    let trend = "NEUTRAL";
    if (macdLine > signalLine && histogram > 0) trend = "BULLISH";
    else if (macdLine < signalLine && histogram < 0) trend = "BEARISH";

    return {
      macd: Math.round(macdLine * 10000) / 10000,
      signal: Math.round(signalLine * 10000) / 10000,
      histogram: Math.round(histogram * 10000) / 10000,
      trend,
    };
  }

  private calculateSMA(prices: number[], period: number): any {
    if (prices.length < period) {
      return { value: prices[prices.length - 1], trend: "NEUTRAL", error: "Insufficient data" };
    }

    const recentPrices = prices.slice(-period);
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;
    const currentPrice = prices[prices.length - 1];

    let trend = "NEUTRAL";
    if (currentPrice > sma * 1.01) trend = "BULLISH";
    else if (currentPrice < sma * 0.99) trend = "BEARISH";

    return {
      value: Math.round(sma * 100) / 100,
      currentPrice,
      trend,
      strength: Math.abs(currentPrice - sma) / sma > 0.02 ? "STRONG" : "WEAK",
    };
  }

  private calculateEMA(prices: number[], period: number): any {
    if (prices.length < period) {
      return { value: prices[prices.length - 1], trend: "NEUTRAL", error: "Insufficient data" };
    }

    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;

    for (let i = period; i < prices.length; i++) {
      ema = prices[i] * multiplier + ema * (1 - multiplier);
    }

    const currentPrice = prices[prices.length - 1];
    let trend = "NEUTRAL";
    if (currentPrice > ema * 1.005) trend = "BULLISH";
    else if (currentPrice < ema * 0.995) trend = "BEARISH";

    return {
      value: Math.round(ema * 100) / 100,
      currentPrice,
      trend,
    };
  }

  private calculateBollingerBands(prices: number[], period: number = 20): any {
    if (prices.length < period) {
      return { upper: 0, middle: 0, lower: 0, signal: "NEUTRAL", error: "Insufficient data" };
    }

    const sma = this.calculateSMA(prices, period);
    const recentPrices = prices.slice(-period);

    // Calculate standard deviation
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma.value, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    const upper = sma.value + 2 * stdDev;
    const lower = sma.value - 2 * stdDev;
    const currentPrice = prices[prices.length - 1];

    let signal = "NEUTRAL";
    if (currentPrice > upper) signal = "SELL";
    else if (currentPrice < lower) signal = "BUY";

    return {
      upper: Math.round(upper * 100) / 100,
      middle: sma.value,
      lower: Math.round(lower * 100) / 100,
      currentPrice,
      signal,
      bandwidth: Math.round(((upper - lower) / sma.value) * 10000) / 100, // as percentage
    };
  }

  private calculateAllIndicators(prices: number[]): any {
    return {
      rsi: this.calculateRSI(prices),
      macd: this.calculateMACD(prices),
      sma20: this.calculateSMA(prices, 20),
      sma50: this.calculateSMA(prices, 50),
      ema12: this.calculateEMA(prices, 12),
      ema26: this.calculateEMA(prices, 26),
      bollingerBands: this.calculateBollingerBands(prices),
    };
  }
}

// Chart Pattern Recognition Tool
class ChartPatternTool extends Tool {
  name = "chart_patterns";
  description = "Identify chart patterns like support/resistance, trends, triangles, etc. Input should be JSON with action and params.";

  async _call(input: string): Promise<string> {
    try {
      const parsedInput = JSON.parse(input);
      const { action, params } = parsedInput;

      switch (action) {
        case "support_resistance":
          return JSON.stringify(this.findSupportResistance(params.prices));
        case "trend_analysis":
          return JSON.stringify(this.analyzeTrend(params.prices));
        case "pattern_recognition":
          return JSON.stringify(this.recognizePatterns(params.prices));
        default:
          throw new Error(`Unknown pattern analysis: ${action}`);
      }
    } catch (error) {
      return JSON.stringify({ error: (error as Error).message });
    }
  }

  private findSupportResistance(prices: number[]): any {
    if (prices.length < 10) {
      return { support: 0, resistance: 0, confidence: 0, error: "Insufficient data" };
    }

    const recentPrices = prices.slice(-20); // Last 20 prices
    const currentPrice = prices[prices.length - 1];

    // Simple support/resistance calculation
    const support = Math.min(...recentPrices);
    const resistance = Math.max(...recentPrices);

    // Calculate confidence based on how often price touched these levels
    const supportTouches = recentPrices.filter((p) => Math.abs(p - support) / support < 0.01).length;
    const resistanceTouches = recentPrices.filter((p) => Math.abs(p - resistance) / resistance < 0.01).length;

    const confidence = Math.min(100, (supportTouches + resistanceTouches) * 10);

    return {
      support: Math.round(support * 100) / 100,
      resistance: Math.round(resistance * 100) / 100,
      currentPrice,
      confidence,
      nearSupport: Math.abs(currentPrice - support) / support < 0.02,
      nearResistance: Math.abs(currentPrice - resistance) / resistance < 0.02,
    };
  }

  private analyzeTrend(prices: number[]): any {
    if (prices.length < 5) {
      return { trend: "NEUTRAL", strength: 0, error: "Insufficient data" };
    }

    const recentPrices = prices.slice(-10);
    const firstPrice = recentPrices[0];
    const lastPrice = recentPrices[recentPrices.length - 1];

    const change = (lastPrice - firstPrice) / firstPrice;

    let trend = "NEUTRAL";
    let strength = "WEAK";

    if (change > 0.02) {
      trend = "UPTREND";
      strength = change > 0.05 ? "STRONG" : "MODERATE";
    } else if (change < -0.02) {
      trend = "DOWNTREND";
      strength = change < -0.05 ? "STRONG" : "MODERATE";
    }

    return {
      trend,
      strength,
      change: Math.round(change * 10000) / 100, // as percentage
      duration: recentPrices.length,
    };
  }

  private recognizePatterns(prices: number[]): any {
    // Simplified pattern recognition
    const trend = this.analyzeTrend(prices);
    const supportResistance = this.findSupportResistance(prices);

    let patterns = [];

    if (supportResistance.nearSupport && trend.trend === "UPTREND") {
      patterns.push({ pattern: "BOUNCE_OFF_SUPPORT", confidence: 70, signal: "BUY" });
    }

    if (supportResistance.nearResistance && trend.trend === "DOWNTREND") {
      patterns.push({ pattern: "REJECTION_AT_RESISTANCE", confidence: 70, signal: "SELL" });
    }

    if (trend.strength === "STRONG") {
      patterns.push({
        pattern: trend.trend === "UPTREND" ? "STRONG_UPTREND" : "STRONG_DOWNTREND",
        confidence: 80,
        signal: trend.trend === "UPTREND" ? "BUY" : "SELL",
      });
    }

    return {
      patterns,
      overallSignal: patterns.length > 0 ? patterns[0].signal : "NEUTRAL",
      confidence: patterns.length > 0 ? patterns[0].confidence : 50,
    };
  }
}

export class TechnicalAnalysisAgent {
  private executor: AgentExecutor | null = null;
  private llm: ChatOpenAI;
  private tools: Tool[];
  private initialized: boolean = false;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0.2, // Slightly higher for creative pattern recognition
      maxTokens: 1500,
    });

    this.tools = [new TechnicalIndicatorsTool(), new ChartPatternTool()];
  }

  async initialize(): Promise<void> {
    try {
      loggerService.info("📊 Initializing Technical Analysis Agent...");

      const prompt = ChatPromptTemplate.fromTemplate(`
You are an expert technical analyst with deep knowledge of chart patterns, technical indicators, and market behavior.

Current Market Data:
- Symbol: {symbol}
- Price Data: {priceData}
- Timeframe: {timeframe}
- Volume Data: {volumeData}

Available Tools:
- technical_indicators: Calculate RSI, MACD, SMA, EMA, Bollinger Bands
- chart_patterns: Identify support/resistance, trends, patterns

Your task is to:
1. Calculate key technical indicators
2. Identify chart patterns and trends
3. Analyze support and resistance levels
4. Provide a clear trading signal with confidence level
5. Explain your reasoning based on technical analysis

Provide your response in JSON format:
{{
  "signal": "BUY" | "SELL" | "HOLD",
  "confidence": number (1-100),
  "reasoning": "detailed technical analysis explanation",
  "indicators": {{
    "rsi": object,
    "macd": object,
    "movingAverages": object,
    "bollingerBands": object
  }},
  "patterns": {{
    "trend": string,
    "supportResistance": object,
    "chartPatterns": array
  }},
  "priceTargets": {{
    "entry": number,
    "stopLoss": number,
    "takeProfit": number
  }},
  "timeframe": string,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH"
}}

Be thorough in your analysis and conservative in your recommendations.
      `);

      const agent = await createOpenAIFunctionsAgent({
        llm: this.llm,
        tools: this.tools,
        prompt,
      });

      this.executor = new AgentExecutor({
        agent,
        tools: this.tools,
        verbose: process.env.NODE_ENV === "development",
        maxIterations: 5,
      });

      this.initialized = true;
      loggerService.info("✅ Technical Analysis Agent initialized successfully");
    } catch (error) {
      loggerService.error("❌ Failed to initialize Technical Analysis Agent:", error);
      throw error;
    }
  }

  /**
   * Analyze market using LangChain agent
   */
  async analyzeMarket(marketData: { symbol: string; prices: number[]; volumes?: number[]; timeframe: string }): Promise<AgentResult> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      loggerService.info(`📊 Analyzing ${marketData.symbol} technical patterns`);

      const result = await this.executor!.invoke({
        input: "Perform comprehensive technical analysis and provide trading signals",
        symbol: marketData.symbol,
        priceData: JSON.stringify(marketData.prices),
        timeframe: marketData.timeframe,
        volumeData: JSON.stringify(marketData.volumes || []),
      });

      // Parse the LLM response
      let analysis: TechnicalSignal;
      try {
        analysis = RobustJSONParser.parseWithFallback(result.output);
      } catch (parseError) {
        loggerService.warn("Technical analysis JSON parsing failed, using fallback");
        // Fallback analysis
        analysis = await this.fallbackAnalysis(marketData);
      }

      loggerService.info(`📊 Technical analysis complete: ${analysis.signal} (${analysis.confidence}% confidence)`);

      return {
        success: true,
        data: analysis,
        timestamp: new Date(),
        source: "TechnicalAnalysisAgent",
      };
    } catch (error) {
      loggerService.error("❌ Error in technical analysis:", error);

      return {
        success: false,
        error: `Technical analysis failed: ${(error as Error).message}`,
        data: await this.fallbackAnalysis(marketData),
        timestamp: new Date(),
        source: "TechnicalAnalysisAgent",
      };
    }
  }

  /**
   * Get quick signal without full LLM analysis
   */
  async getQuickSignal(prices: number[]): Promise<{
    signal: "BUY" | "SELL" | "HOLD";
    confidence: number;
    indicators: any;
  }> {
    try {
      const indicatorsTool = new TechnicalIndicatorsTool();
      const patternsTool = new ChartPatternTool();

      // Calculate key indicators
      const rsi = JSON.parse(
        await indicatorsTool._call(
          JSON.stringify({
            action: "rsi",
            params: { prices },
          })
        )
      );

      const trend = JSON.parse(
        await patternsTool._call(
          JSON.stringify({
            action: "trend_analysis",
            params: { prices },
          })
        )
      );

      // Simple signal logic
      let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
      let confidence = 50;

      if (rsi.signal === "BUY" && trend.trend === "UPTREND") {
        signal = "BUY";
        confidence = 75;
      } else if (rsi.signal === "SELL" && trend.trend === "DOWNTREND") {
        signal = "SELL";
        confidence = 75;
      }

      return {
        signal,
        confidence,
        indicators: { rsi, trend },
      };
    } catch (error) {
      loggerService.error("❌ Error in quick signal analysis:", error);
      return {
        signal: "HOLD",
        confidence: 0,
        indicators: { error: (error as Error).message },
      };
    }
  }

  private async fallbackAnalysis(marketData: any): Promise<TechnicalSignal> {
    // Simple fallback technical analysis
    const quickSignal = await this.getQuickSignal(marketData.prices);

    return {
      signal: quickSignal.signal,
      confidence: quickSignal.confidence,
      reasoning: "Fallback technical analysis due to LLM error",
      indicators: quickSignal.indicators,
      patterns: { trend: "UNKNOWN", supportResistance: {}, chartPatterns: [] },
      priceTargets: { entry: 0, stopLoss: 0, takeProfit: 0 },
      timeframe: marketData.timeframe,
      riskLevel: "MEDIUM",
    };
  }

  getTimeframes(): string[] {
    return ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];
  }

  getSupportedIndicators(): string[] {
    return ["rsi", "macd", "sma", "ema", "bollinger_bands"];
  }
}

// Export singleton instance
export const technicalAnalysisAgent = new TechnicalAnalysisAgent();
