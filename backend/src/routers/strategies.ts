import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const strategiesRouter = router({
  list: publicProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.prisma.strategy.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: "desc" },
    });
  }),

  create: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        name: z.string(),
        description: z.string().optional(),
        indicators: z.array(z.string()),
        parameters: z.record(z.any()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.strategy.create({
        data: {
          userId: input.userId,
          name: input.name,
          description: input.description,
          indicators: input.indicators,
          parameters: input.parameters,
        },
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        indicators: z.array(z.string()).optional(),
        parameters: z.record(z.any()).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      return await ctx.prisma.strategy.update({
        where: { id },
        data: updateData,
      });
    }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return await ctx.prisma.strategy.delete({
      where: { id: input.id },
    });
  }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return await ctx.prisma.strategy.findUnique({
      where: { id: input.id },
      include: {
        bots: true,
      },
    });
  }),
});
