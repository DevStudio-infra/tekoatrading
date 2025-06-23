import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../index";
import { prisma } from "../../../utils/prisma";
// Remove old auth imports since we're using Clerk now
// import jwt from 'jsonwebtoken';
// import bcrypt from 'bcrypt';

// Import necessary types from Prisma client
import { Prisma } from "@prisma/client";

export const userRouter = router({
  // User creation or update from Clerk webhook
  createOrUpdateUser: publicProcedure
    .input(
      z.object({
        clerkId: z.string(),
        email: z.string().email(),
        firstName: z.string().optional().nullable(),
        lastName: z.string().optional().nullable(),
        imageUrl: z.string().optional().nullable(),
        username: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
          where: { clerkId: input.clerkId },
        });

        if (existingUser) {
          // Update existing user
          const updatedUser = await prisma.user.update({
            where: { clerkId: input.clerkId },
            data: {
              email: input.email,
              firstName: input.firstName,
              lastName: input.lastName,
              imageUrl: input.imageUrl,
              username: input.username,
            },
          });

          return {
            success: true,
            user: updatedUser,
          };
        }

        // Create new user
        const newUser = await prisma.user.create({
          data: {
            clerkId: input.clerkId,
            email: input.email,
            firstName: input.firstName,
            lastName: input.lastName,
            imageUrl: input.imageUrl,
            username: input.username,
          },
        });

        return {
          success: true,
          user: newUser,
        };
      } catch (error) {
        console.error("Registration error:", error);
        throw error;
      }
    }),

  // Get current user by Clerk ID
  getByClerkId: publicProcedure
    .input(
      z.object({
        clerkId: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const user = await prisma.user.findUnique({
          where: { clerkId: input.clerkId },
        });

        if (!user) {
          return {
            success: false,
            error: "User not found",
            user: null,
          };
        }

        return {
          success: true,
          user,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to get user",
          user: null,
        };
      }
    }),

  // Protected procedure to get the current user
  me: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user?.id) {
        throw new Error("Unauthorized");
      }

      // Ensure id is treated as string
      const user = await prisma.user.findUnique({
        where: { id: String(ctx.user.id) },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return {
        success: true,
        user,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch user",
        user: null,
      };
    }
  }),

  // Get user by ID (for admin)
  getById: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: input.id },
        });

        if (!user) {
          throw new Error("User not found");
        }

        return {
          success: true,
          user,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to get user",
          user: null,
        };
      }
    }),

  // List all users (for admin)
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(10),
        offset: z.number().optional().default(0),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const { limit, offset, search } = input;

        // Create a Prisma-compatible where clause
        const where: Prisma.UserWhereInput = search
          ? {
              OR: [
                { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
                { firstName: { contains: search, mode: Prisma.QueryMode.insensitive } },
                { lastName: { contains: search, mode: Prisma.QueryMode.insensitive } },
              ],
            }
          : {};

        const users = await prisma.user.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { createdAt: "desc" },
        });

        return {
          success: true,
          users,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to list users",
          users: null,
        };
      }
    }),

  // Protected procedures that require authentication
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Get user profile using the user ID from context
      const user = await prisma.user.findUnique({
        where: { id: String(ctx.user.id) },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          imageUrl: true,
          username: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return user;
    } catch (error) {
      console.error("Get profile error:", error);
      throw error;
    }
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // If email is being updated, check if it's already in use
        if (input.email) {
          const existingUser = await prisma.user.findFirst({
            where: {
              email: input.email,
              id: { not: String(ctx.user.id) },
            },
          });

          if (existingUser) {
            throw new Error("Email already in use by another account");
          }
        }

        // Update user profile
        const updatedUser = await prisma.user.update({
          where: { id: String(ctx.user.id) },
          data: {
            ...input,
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            username: true,
            imageUrl: true,
          },
        });

        return updatedUser;
      } catch (error) {
        console.error("Update profile error:", error);
        throw error;
      }
    }),
});
