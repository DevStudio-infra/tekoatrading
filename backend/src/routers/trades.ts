import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { prisma } from "../prisma";
import { logger } from "../logger";

export const tradesRouter = router({
  // Get recent trades for a user (from all their bots)
  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(async ({ ctx, input }) => {
      try {
        const limit = input?.limit || 10;

        const recentTrades = await prisma.trade.findMany({
          where: {
            bot: {
              userId: ctx.user.id,
            },
          },
          include: {
            bot: {
              select: {
                id: true,
                name: true,
                tradingPairSymbol: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        });

        // Format trades for the frontend
        const formattedTrades = recentTrades.map((trade) => ({
          id: trade.id,
          botName: trade.bot?.name || "Unknown Bot",
          pair: trade.symbol || trade.bot?.tradingPairSymbol || "Unknown Pair",
          type: trade.type === "BUY" ? "Buy" : "Sell",
          direction: trade.type,
          amount: trade.size,
          profit: trade.profitLoss || 0,
          profitFormatted: trade.profitLoss
            ? `${trade.profitLoss >= 0 ? "+" : ""}$${trade.profitLoss.toFixed(2)}`
            : "$0.00",
          time: trade.createdAt,
          timeFormatted: formatTimeAgo(trade.createdAt),
          status: trade.status,
          entryPrice: trade.entryPrice,
          exitPrice: trade.exitPrice,
        }));

        return formattedTrades;
      } catch (error) {
        logger.error("Error fetching recent trades:", error);
        throw new Error("Failed to fetch recent trades");
      }
    }),

  // Get all trades for a user with filtering
  getAll: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["ALL", "OPEN", "CLOSED"]).default("ALL"),
          botId: z.string().optional(),
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      try {
        const { status = "ALL", botId, limit = 50, offset = 0 } = input || {};

        const whereClause: any = {
          bot: {
            userId: ctx.user.id,
          },
        };

        if (status !== "ALL") {
          whereClause.status = status;
        }

        if (botId) {
          whereClause.botId = botId;
        }

        const trades = await prisma.trade.findMany({
          where: whereClause,
          include: {
            bot: {
              select: {
                id: true,
                name: true,
                tradingPairSymbol: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        });

        const totalCount = await prisma.trade.count({ where: whereClause });

        return {
          trades: trades.map((trade) => ({
            id: trade.id,
            botId: trade.botId,
            botName: trade.bot?.name || "Unknown Bot",
            symbol: trade.symbol || trade.bot?.tradingPairSymbol || "Unknown Pair",
            type: trade.type,
            direction: trade.type,
            size: trade.size,
            entryPrice: trade.entryPrice,
            exitPrice: trade.exitPrice,
            profitLoss: trade.profitLoss,
            status: trade.status,
            createdAt: trade.createdAt,
            updatedAt: trade.updatedAt,
            stopLoss: trade.stopLoss,
            takeProfit: trade.takeProfit,
          })),
          pagination: {
            total: totalCount,
            limit,
            offset,
            hasMore: offset + trades.length < totalCount,
          },
        };
      } catch (error) {
        logger.error("Error fetching trades:", error);
        throw new Error("Failed to fetch trades");
      }
    }),

  // Get trade by ID
  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    try {
      const trade = await prisma.trade.findFirst({
        where: {
          id: input.id,
          bot: {
            userId: ctx.user.id,
          },
        },
        include: {
          bot: {
            select: {
              id: true,
              name: true,
              tradingPairSymbol: true,
            },
          },
        },
      });

      if (!trade) {
        throw new Error("Trade not found");
      }

      return {
        id: trade.id,
        botId: trade.botId,
        botName: trade.bot?.name || "Unknown Bot",
        symbol: trade.symbol || trade.bot?.tradingPairSymbol || "Unknown Pair",
        type: trade.type,
        direction: trade.type,
        size: trade.size,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        profitLoss: trade.profitLoss,
        status: trade.status,
        createdAt: trade.createdAt,
        updatedAt: trade.updatedAt,
        stopLoss: trade.stopLoss,
        takeProfit: trade.takeProfit,
      };
    } catch (error) {
      logger.error("Error fetching trade:", error);
      throw new Error("Failed to fetch trade");
    }
  }),
});

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Just now";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }
}
