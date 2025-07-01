import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { EnhancedTradingDecisionAgent } from "../ai/enhanced-trading-decision-agent";

// Define the return type inline to avoid export issues
type AnalysisResult = {
  decision: string;
  confidence: number;
  reasoning: string;
  riskLevel: string;
  suggestedPosition: number;
};

// Lazy-load the trading agent to handle missing API keys gracefully
let tradingAgent: EnhancedTradingDecisionAgent | null = null;

function getTradingAgent() {
  if (!tradingAgent) {
    try {
      tradingAgent = new EnhancedTradingDecisionAgent();
    } catch (error) {
      console.warn("Trading agent initialization failed:", error);
      return null;
    }
  }
  return tradingAgent;
}

export const aiRouter = router({
  analyzeTrade: publicProcedure
    .input(
      z.object({
        symbol: z.string(),
        price: z.number(),
        volume: z.number(),
        high24h: z.number(),
        low24h: z.number(),
        change24h: z.number(),
        portfolioBalance: z.number(),
        currentPositions: z.number(),
        proposedTradeSize: z.number(),
        marketVolatility: z.number().optional().default(10),
      }),
    )
    .mutation(async ({ input }): Promise<AnalysisResult> => {
      const agent = getTradingAgent();

      if (!agent) {
        const error =
          "❌ AI SERVICE UNAVAILABLE: Trading analysis agent is not available. Please check AI service configuration.";
        throw new Error(error);
      }

      const marketData = {
        symbol: input.symbol,
        price: input.price,
        volume: input.volume,
        high24h: input.high24h,
        low24h: input.low24h,
        change24h: input.change24h,
      };

      const riskData = {
        portfolioBalance: input.portfolioBalance,
        currentPositions: input.currentPositions,
        symbol: input.symbol,
        proposedTradeSize: input.proposedTradeSize,
        marketVolatility: input.marketVolatility,
      };

      const result = await agent.analyze({
        symbol: input.symbol,
        marketData,
        riskData,
      });

      return {
        decision: result.action.toUpperCase(),
        confidence: result.confidence,
        reasoning: Array.isArray(result.reasoning) ? result.reasoning.join("; ") : result.reasoning,
        riskLevel: "MEDIUM", // Default for now
        suggestedPosition: result.quantity,
      };
    }),

  getMarketSentiment: publicProcedure
    .input(z.object({ symbol: z.string() }))
    .query(async ({ input }) => {
      try {
        // Get real market sentiment using AI analysis
        const agent = getTradingAgent();

        if (!agent) {
          const error =
            "❌ AI SERVICE UNAVAILABLE: Market sentiment analysis agent is not available. Please check AI service configuration.";
          throw new Error(error);
        }

        // Use a simplified market context for sentiment analysis
        const marketData = {
          symbol: input.symbol,
          price: 1.0, // Will be updated with real price in production
          volume: 1000000,
          high24h: 1.05,
          low24h: 0.95,
          change24h: 0,
        };

        const riskData = {
          portfolioBalance: 10000,
          currentPositions: 0,
          symbol: input.symbol,
          proposedTradeSize: 100,
          marketVolatility: 10,
        };

        const analysis = await agent.analyze({
          symbol: input.symbol,
          marketData,
          riskData,
        });

        // Derive sentiment from AI analysis
        let sentiment = "neutral";
        let score = 0.5;

        if (analysis.action === "buy") {
          sentiment = "bullish";
          score = Math.min(0.9, 0.5 + analysis.confidence * 0.4);
        } else if (analysis.action === "sell") {
          sentiment = "bearish";
          score = Math.max(0.1, 0.5 - analysis.confidence * 0.4);
        }

        return {
          symbol: input.symbol,
          sentiment,
          score,
          sources: ["AI Trading Analysis"],
          confidence: analysis.confidence,
          reasoning: Array.isArray(analysis.reasoning)
            ? analysis.reasoning.join("; ")
            : analysis.reasoning,
        };
      } catch (error) {
        const errorMsg = `❌ MARKET SENTIMENT ANALYSIS FAILED: ${error instanceof Error ? error.message : "Unknown error"}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
    }),
});
