import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const strategiesRouter = router({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.user?.id;
    if (!userId) throw new Error("User not authenticated");

    const strategies = await ctx.prisma.strategy.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    // Parse JSON strings for frontend
    return strategies.map((strategy) => ({
      ...strategy,
      indicators:
        typeof strategy.indicators === "string"
          ? JSON.parse(strategy.indicators)
          : strategy.indicators || {},
      parameters:
        typeof strategy.parameters === "string"
          ? JSON.parse(strategy.parameters)
          : strategy.parameters || {},
    }));
  }),

  list: publicProcedure.input(z.object({ userId: z.string() })).query(async ({ ctx, input }) => {
    const strategies = await ctx.prisma.strategy.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: "desc" },
    });

    // Parse JSON strings for frontend
    return strategies.map((strategy) => ({
      ...strategy,
      indicators:
        typeof strategy.indicators === "string"
          ? JSON.parse(strategy.indicators)
          : strategy.indicators || {},
      parameters:
        typeof strategy.parameters === "string"
          ? JSON.parse(strategy.parameters)
          : strategy.parameters || {},
    }));
  }),

  create: publicProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        name: z.string(),
        description: z.string().optional(),
        indicators: z.record(z.any()),
        parameters: z.record(z.any()),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = input.userId || ctx.user?.id;
      if (!userId) throw new Error("User not authenticated");

      return await ctx.prisma.strategy.create({
        data: {
          userId,
          name: input.name,
          description: input.description,
          indicators: JSON.stringify(input.indicators),
          parameters: JSON.stringify(input.parameters),
          isActive: input.isActive ?? true,
        },
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        indicators: z.record(z.any()).optional(),
        parameters: z.record(z.any()).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, indicators, parameters, ...updateData } = input;
      return await ctx.prisma.strategy.update({
        where: { id },
        data: {
          ...updateData,
          ...(indicators && { indicators: JSON.stringify(indicators) }),
          ...(parameters && { parameters: JSON.stringify(parameters) }),
        },
      });
    }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return await ctx.prisma.strategy.delete({
      where: { id: input.id },
    });
  }),

  duplicate: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error("User not authenticated");

      const original = await ctx.prisma.strategy.findUnique({
        where: { id: input.id },
      });

      if (!original) throw new Error("Strategy not found");
      if (original.userId !== userId) throw new Error("Unauthorized");

      return await ctx.prisma.strategy.create({
        data: {
          userId,
          name: `${original.name} (Copy)`,
          description: original.description,
          indicators: original.indicators,
          parameters: original.parameters,
          isActive: false, // Duplicates start as inactive
        },
      });
    }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const strategy = await ctx.prisma.strategy.findUnique({
      where: { id: input.id },
      include: {
        bots: true,
      },
    });

    if (!strategy) return null;

    return {
      ...strategy,
      indicators:
        typeof strategy.indicators === "string"
          ? JSON.parse(strategy.indicators)
          : strategy.indicators || {},
      parameters:
        typeof strategy.parameters === "string"
          ? JSON.parse(strategy.parameters)
          : strategy.parameters || {},
    };
  }),
});
