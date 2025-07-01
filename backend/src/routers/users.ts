import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { prisma } from "../prisma";
import { logger } from "../logger";

export const usersRouter = router({
  // Get current authenticated user (protected)
  me: protectedProcedure.query(async ({ ctx }) => {
    try {
      // ctx.user is populated by protectedProcedure from Clerk token
      return {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
        clerkId: ctx.user.clerkId,
        createdAt: ctx.user.createdAt,
        updatedAt: ctx.user.updatedAt,
      };
    } catch (error) {
      logger.error("Error fetching current user:", error);
      throw new Error("Failed to fetch user profile");
    }
  }),

  // Create a new user (typically called by Clerk webhooks)
  create: publicProcedure
    .input(
      z.object({
        clerkId: z.string(),
        email: z.string().email(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const user = await prisma.user.create({
          data: {
            clerkId: input.clerkId,
            email: input.email,
            name: input.name || `${input.firstName || ""} ${input.lastName || ""}`.trim(),
          },
        });

        logger.info(`Created new user: ${user.id} (Clerk ID: ${input.clerkId})`);
        return user;
      } catch (error) {
        logger.error("Error creating user:", error);
        throw new Error("Failed to create user");
      }
    }),

  // Update user profile (protected)
  update: protectedProcedure
    .input(
      z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        name: z.string().optional(),
        email: z.string().email().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const updatedUser = await prisma.user.update({
          where: { id: ctx.user.id },
          data: {
            name: input.name || `${input.firstName || ""} ${input.lastName || ""}`.trim(),
            email: input.email,
          },
        });

        logger.info(`Updated user profile: ${ctx.user.id}`);
        return updatedUser;
      } catch (error) {
        logger.error("Error updating user:", error);
        throw new Error("Failed to update user profile");
      }
    }),

  // Delete user (protected)
  delete: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      await prisma.user.delete({
        where: { id: ctx.user.id },
      });

      logger.info(`Deleted user: ${ctx.user.id}`);
      return { success: true };
    } catch (error) {
      logger.error("Error deleting user:", error);
      throw new Error("Failed to delete user");
    }
  }),

  // Get user profile with related data (protected)
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userWithRelations = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        include: {
          bots: {
            include: {
              _count: {
                select: {
                  trades: true,
                },
              },
            },
          },
          strategies: true,
          brokerCredentials: {
            select: {
              id: true,
              name: true,
              broker: true,
              isDemo: true,
              isActive: true,
            },
          },
        },
      });

      if (!userWithRelations) {
        throw new Error("User not found");
      }

      // Calculate user statistics
      const totalBots = userWithRelations.bots.length;
      const activeBots = userWithRelations.bots.filter((bot) => bot.isActive).length;
      const totalTrades = userWithRelations.bots.reduce((sum, bot) => sum + bot._count.trades, 0);

      return {
        ...userWithRelations,
        stats: {
          totalBots,
          activeBots,
          totalTrades,
          totalStrategies: userWithRelations.strategies.length,
          totalCredentials: userWithRelations.brokerCredentials.length,
        },
      };
    } catch (error) {
      logger.error("Error fetching user profile:", error);
      throw new Error("Failed to fetch user profile");
    }
  }),

  // Get current user (alias for me - protected)
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    try {
      return {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
        clerkId: ctx.user.clerkId,
      };
    } catch (error) {
      logger.error("Error fetching current user:", error);
      throw new Error("Failed to fetch current user");
    }
  }),

  // Update user profile (alias for update - protected)
  updateProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const updatedUser = await prisma.user.update({
          where: { id: ctx.user.id },
          data: {
            name: `${input.firstName || ""} ${input.lastName || ""}`.trim(),
            email: input.email,
          },
        });

        logger.info(`Updated user profile: ${ctx.user.id}`);
        return {
          success: true,
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
          },
        };
      } catch (error) {
        logger.error("Error updating user profile:", error);
        throw new Error("Failed to update user profile");
      }
    }),

  // Find or create user by Clerk ID (used by webhooks)
  findOrCreateByClerkId: publicProcedure
    .input(
      z.object({
        clerkId: z.string(),
        email: z.string().email(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const existingUser = await prisma.user.findUnique({
          where: { clerkId: input.clerkId },
        });

        if (existingUser) {
          // Update existing user if needed
          const updatedUser = await prisma.user.update({
            where: { clerkId: input.clerkId },
            data: {
              email: input.email,
              name: `${input.firstName || ""} ${input.lastName || ""}`.trim(),
            },
          });
          return updatedUser;
        }

        // Create new user
        const newUser = await prisma.user.create({
          data: {
            clerkId: input.clerkId,
            email: input.email,
            name: `${input.firstName || ""} ${input.lastName || ""}`.trim(),
          },
        });

        logger.info(`Created new user from Clerk: ${newUser.id} (Clerk ID: ${input.clerkId})`);
        return newUser;
      } catch (error) {
        logger.error("Error finding or creating user:", error);
        throw new Error("Failed to process user");
      }
    }),

  // Create user from webhook (public)
  createFromWebhook: publicProcedure
    .input(
      z.object({
        clerkId: z.string(),
        email: z.string().email(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const user = await prisma.user.upsert({
          where: { clerkId: input.clerkId },
          update: {
            email: input.email,
            name: `${input.firstName || ""} ${input.lastName || ""}`.trim(),
          },
          create: {
            clerkId: input.clerkId,
            email: input.email,
            name: `${input.firstName || ""} ${input.lastName || ""}`.trim(),
          },
        });

        logger.info(`User upserted from webhook: ${user.id} (Clerk ID: ${input.clerkId})`);
        return user;
      } catch (error) {
        logger.error("Error creating/updating user from webhook:", error);
        throw new Error("Failed to process webhook user");
      }
    }),

  // Check if user exists by clerkId (public)
  existsByClerkId: publicProcedure
    .input(z.object({ clerkId: z.string() }))
    .query(async ({ input }) => {
      try {
        const user = await prisma.user.findUnique({
          where: { clerkId: input.clerkId },
          select: { id: true, email: true },
        });

        return { exists: !!user, user: user || null };
      } catch (error) {
        logger.error("Error checking user existence:", error);
        return { exists: false, user: null };
      }
    }),

  // Get user by clerkId (public - for webhook usage)
  getByClerkId: publicProcedure
    .input(z.object({ clerkId: z.string() }))
    .query(async ({ input }) => {
      try {
        const user = await prisma.user.findUnique({
          where: { clerkId: input.clerkId },
        });

        if (!user) {
          throw new Error("User not found");
        }

        return user;
      } catch (error) {
        logger.error("Error fetching user by Clerk ID:", error);
        throw new Error("Failed to fetch user");
      }
    }),
});
