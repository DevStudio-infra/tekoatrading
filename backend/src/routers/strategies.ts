import { router, publicProcedure } from "../trpc";
import { z } from "zod";

export const strategiesRouter = router({
  list: publicProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
    return ctx.prisma.strategy.findMany({
      where: { ownerId: input.userId },
      include: { bots: true },
    });
  }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        rules: z.record(z.any()),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.strategy.create({
        data: {
          name: input.name,
          description: input.description,
          rules: input.rules,
          ownerId: input.userId,
        },
      });
    }),

  getById: publicProcedure
    .input(z.object({ strategyId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.strategy.findUnique({
        where: { id: input.strategyId },
        include: { bots: true },
      });
    }),
});
