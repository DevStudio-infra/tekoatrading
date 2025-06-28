import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const tradingPairsRouter = router({
  getAll: publicProcedure
    .input(
      z.object({
        brokerName: z.string().optional(),
        category: z.string().optional(),
        isActive: z.boolean().optional(),
        limit: z.number().optional().default(5000),
      }),
    )
    .query(async ({ ctx, input }) => {
      console.log("Trading pairs getAll called with input:", input);

      const where: any = {};

      if (input.brokerName) {
        where.brokerName = input.brokerName;
      }

      if (input.category) {
        where.category = input.category;
      }

      if (input.isActive !== undefined) {
        where.isActive = input.isActive;
      }

      console.log("Querying trading pairs with where clause:", where);

      const result = await ctx.prisma.tradingPair.findMany({
        where,
        take: input.limit,
        orderBy: { symbol: "asc" },
      });

      console.log("Found trading pairs:", result.length);
      return result;
    }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string(),
        limit: z.number().optional().default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.tradingPair.findMany({
        where: {
          OR: [
            { symbol: { contains: input.query, mode: "insensitive" } },
            { name: { contains: input.query, mode: "insensitive" } },
          ],
          isActive: true,
        },
        take: input.limit,
        orderBy: { symbol: "asc" },
      });
    }),

  getBySymbol: publicProcedure
    .input(z.object({ symbol: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.tradingPair.findUnique({
        where: { symbol: input.symbol },
      });
    }),

  getPopular: publicProcedure
    .input(
      z.object({
        brokerName: z.string().optional(),
        limit: z.number().optional().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      console.log("Trading pairs getPopular called with input:", input);

      const where: any = { isActive: true };

      if (input.brokerName) {
        where.brokerName = input.brokerName;
      }

      // Get popular pairs based on bot usage
      const popularSymbols = await ctx.prisma.bot.groupBy({
        by: ["tradingPairSymbol"],
        _count: {
          tradingPairSymbol: true,
        },
        orderBy: {
          _count: {
            tradingPairSymbol: "desc",
          },
        },
        take: input.limit,
      });

      const symbols = popularSymbols
        .map((item) => item.tradingPairSymbol)
        .filter(Boolean) as string[];

      console.log("Popular symbols from bots:", symbols);

      if (symbols.length === 0) {
        // Fallback to some default popular pairs
        console.log("No popular symbols found, using fallback");
        const fallbackResult = await ctx.prisma.tradingPair.findMany({
          where,
          take: input.limit,
          orderBy: { symbol: "asc" },
        });
        console.log("Fallback trading pairs found:", fallbackResult.length);
        return fallbackResult;
      }

      const result = await ctx.prisma.tradingPair.findMany({
        where: {
          ...where,
          symbol: { in: symbols },
        },
      });

      console.log("Popular trading pairs found:", result.length);
      return result;
    }),

  getCategories: publicProcedure.query(async ({ ctx }) => {
    const categories = await ctx.prisma.tradingPair.findMany({
      select: { category: true },
      distinct: ["category"],
      where: { isActive: true },
    });

    return categories.map((c) => c.category).filter(Boolean);
  }),

  getBrokers: publicProcedure.query(async ({ ctx }) => {
    const brokers = await ctx.prisma.tradingPair.findMany({
      select: { brokerName: true },
      distinct: ["brokerName"],
      where: { isActive: true },
    });

    return brokers.map((b) => b.brokerName).filter(Boolean);
  }),
});
