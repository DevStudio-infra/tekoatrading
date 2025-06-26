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

  getCurrent: publicProcedure.query(async ({ ctx }) => {
    // For now, return a mock user - this should be replaced with actual Clerk integration
    return {
      id: "user_2x7ZBVN7sYTSc1moT7b4QSDP8J9",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    };
  }),

  updateProfile: publicProcedure
    .input(
      z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Mock implementation - replace with actual user update logic
      return {
        success: true,
        user: {
          id: "user_2x7ZBVN7sYTSc1moT7b4QSDP8J9",
          email: input.email || "test@example.com",
          firstName: input.firstName || "Test",
          lastName: input.lastName || "User",
        },
      };
    }),
});
