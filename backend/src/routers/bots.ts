import { router, publicProcedure } from "../trpc";
import { z } from "zod";

export const botsRouter = router({
  list: publicProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
    return ctx.prisma.bot.findMany({
      where: { ownerId: input.userId },
      include: { strategy: true, trades: true },
    });
  }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        userId: z.string(),
        strategyId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.bot.create({
        data: {
          name: input.name,
          ownerId: input.userId,
          strategyId: input.strategyId,
        },
        include: { strategy: true },
      });
    }),

  toggleActive: publicProcedure
    .input(z.object({ botId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const bot = await ctx.prisma.bot.findUnique({
        where: { id: input.botId },
      });

      if (!bot) throw new Error("Bot not found");

      return ctx.prisma.bot.update({
        where: { id: input.botId },
        data: { isActive: !bot.isActive },
      });
    }),
});
