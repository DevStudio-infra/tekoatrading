import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { TradingDecisionAgent } from "../ai/trading-decision-agent";

const tradingAgent = new TradingDecisionAgent();

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

      return tradingAgent.analyze({ marketData, riskData });
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
