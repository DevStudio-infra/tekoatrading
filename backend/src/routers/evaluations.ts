import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { botEvaluationService } from "../services/bot-evaluation.service";
import { logger } from "../logger";

export const evaluationsRouter = router({
  getByBot: publicProcedure
    .input(
      z.object({
        botId: z.string(),
        limit: z.number().optional().default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const evaluations = await ctx.prisma.evaluation.findMany({
          where: { botId: input.botId },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          include: {
            bot: {
              select: {
                name: true,
                tradingPairSymbol: true,
                timeframe: true,
              },
            },
          },
        });

        return evaluations;
      } catch (error) {
        logger.error("Error fetching evaluations:", error);
        throw new Error("Failed to fetch evaluations");
      }
    }),

  run: publicProcedure.input(z.object({ botId: z.string() })).mutation(async ({ ctx, input }) => {
    try {
      const userId = ctx.user?.id;
      if (!userId) throw new Error("User not authenticated");

      // Check if bot belongs to user
      const bot = await ctx.prisma.bot.findUnique({
        where: { id: input.botId },
      });

      if (!bot || bot.userId !== userId) {
        throw new Error("Bot not found or unauthorized");
      }

      const result = await botEvaluationService.evaluateBot(input.botId);

      logger.info(
        `Bot evaluation completed for ${input.botId}: ${result.success ? "Success" : "Failed"}`,
      );

      return result;
    } catch (error) {
      logger.error("Error running bot evaluation:", error);
      throw new Error("Failed to run bot evaluation");
    }
  }),

  getLatest: publicProcedure
    .input(z.object({ botId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const evaluation = await ctx.prisma.evaluation.findFirst({
          where: { botId: input.botId },
          orderBy: { createdAt: "desc" },
          include: {
            bot: {
              select: {
                name: true,
                tradingPairSymbol: true,
                timeframe: true,
              },
            },
          },
        });

        return evaluation;
      } catch (error) {
        logger.error("Error fetching latest evaluation:", error);
        throw new Error("Failed to fetch latest evaluation");
      }
    }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    try {
      const userId = ctx.user?.id;
      if (!userId) throw new Error("User not authenticated");

      // Check if evaluation belongs to user
      const evaluation = await ctx.prisma.evaluation.findUnique({
        where: { id: input.id },
        include: { bot: true },
      });

      if (!evaluation || evaluation.bot.userId !== userId) {
        throw new Error("Evaluation not found or unauthorized");
      }

      await ctx.prisma.evaluation.delete({
        where: { id: input.id },
      });

      return { success: true };
    } catch (error) {
      logger.error("Error deleting evaluation:", error);
      throw new Error("Failed to delete evaluation");
    }
  }),

  getStats: publicProcedure.input(z.object({ botId: z.string() })).query(async ({ ctx, input }) => {
    try {
      const evaluations = await ctx.prisma.evaluation.findMany({
        where: { botId: input.botId },
        select: {
          decision: true,
          confidence: true,
          success: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      const stats = {
        total: evaluations.length,
        successful: evaluations.filter((e) => e.success).length,
        failed: evaluations.filter((e) => !e.success).length,
        avgConfidence:
          evaluations.length > 0
            ? evaluations.reduce((sum, e) => sum + (e.confidence || 0), 0) / evaluations.length
            : 0,
        decisions: {
          buy: evaluations.filter((e) => e.decision === "buy").length,
          sell: evaluations.filter((e) => e.decision === "sell").length,
          hold: evaluations.filter((e) => e.decision === "hold").length,
        },
      };

      return stats;
    } catch (error) {
      logger.error("Error fetching evaluation stats:", error);
      throw new Error("Failed to fetch evaluation stats");
    }
  }),
});
