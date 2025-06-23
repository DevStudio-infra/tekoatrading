import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const usersRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    // For demo purposes, return a mock user
    return {
      id: "demo-user",
      email: "demo@example.com",
      name: "Demo User",
    };
  }),

  create: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
        },
      });
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        email: z.string().email().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      return await ctx.prisma.user.update({
        where: { id },
        data: updateData,
      });
    }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    return await ctx.prisma.user.delete({
      where: { id: input.id },
    });
  }),

  getProfile: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.user.findUnique({
        where: { id: input.userId },
        include: {
          bots: {
            include: {
              trades: true,
            },
          },
          strategies: true,
          portfolios: true,
        },
      });
    }),
});
