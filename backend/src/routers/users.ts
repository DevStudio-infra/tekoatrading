import { router, publicProcedure } from "../trpc";
import { z } from "zod";

export const usersRouter = router({
  getProfile: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.user.findUnique({
        where: { id: input.userId },
        include: { bots: true, strategies: true, portfolios: true },
      });
    }),

  createUser: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        clerkId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.create({
        data: {
          email: input.email,
          clerkId: input.clerkId,
          portfolios: {
            create: {
              name: "Main Portfolio",
              balance: 10000, // Starting balance
            },
          },
        },
        include: { portfolios: true },
      });
    }),
});
