import { BaseAgent } from "./base-agent";

interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  high24h: number;
  low24h: number;
  change24h: number;
}

interface TechnicalAnalysis {
  trend: "bullish" | "bearish" | "neutral";
  strength: number; // 1-10
  signals: string[];
  recommendation: "buy" | "sell" | "hold";
  confidence: number; // 0-1
}

export class TechnicalAnalysisAgent extends BaseAgent {
  constructor() {
    super("TechnicalAnalysisAgent");
  }

  async analyze(marketData: MarketData): Promise<TechnicalAnalysis> {
    const prompt = `
      Analyze the following market data for ${marketData.symbol}:
      Current Price: $${marketData.price}
      24h High: $${marketData.high24h}
      24h Low: $${marketData.low24h}
      24h Change: ${marketData.change24h}%
      Volume: ${marketData.volume}

      Provide a technical analysis with:
      1. Overall trend (bullish/bearish/neutral)
      2. Trend strength (1-10)
      3. Key technical signals
      4. Trading recommendation (buy/sell/hold)
      5. Confidence level (0-1)

      Respond in JSON format with keys: trend, strength, signals, recommendation, confidence
    `;

    try {
      const response = await this.callLLM(prompt);
      const analysis = JSON.parse(response);

      return {
        trend: analysis.trend || "neutral",
        strength: analysis.strength || 5,
        signals: analysis.signals || [],
        recommendation: analysis.recommendation || "hold",
        confidence: analysis.confidence || 0.5,
      };
    } catch (error) {
      // Fallback analysis
      return {
        trend: "neutral",
        strength: 5,
        signals: ["Unable to analyze - using default"],
        recommendation: "hold",
        confidence: 0.1,
      };
    }
  }
}
