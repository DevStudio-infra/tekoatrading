import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { TradingDecisionAgent } from "../ai/trading-decision-agent";

// Lazy-load the trading agent to handle missing API keys gracefully
let tradingAgent: TradingDecisionAgent | null = null;

function getTradingAgent() {
  if (!tradingAgent) {
    try {
      tradingAgent = new TradingDecisionAgent();
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
    .mutation(async ({ input }) => {
      const agent = getTradingAgent();

      if (!agent) {
        // Return mock analysis when agent is not available
        return {
          decision: "HOLD",
          confidence: 0.5,
          reasoning: "AI analysis unavailable - using conservative approach",
          riskLevel: "MEDIUM",
          suggestedPosition: 0,
        };
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

      return agent.analyze({ marketData, riskData });
    }),

  getMarketSentiment: publicProcedure
    .input(z.object({ symbol: z.string() }))
    .query(async ({ input }) => {
      // Mock sentiment analysis for now
      return {
        symbol: input.symbol,
        sentiment: "neutral",
        score: 0.5,
        sources: ["mock-data"],
      };
    }),
});
