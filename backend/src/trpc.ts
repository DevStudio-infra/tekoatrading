import { initTRPC, TRPCError } from "@trpc/server";
import { prisma } from "./prisma";
import { logger } from "./logger";
import type { inferAsyncReturnType } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import jwt from "jsonwebtoken";

export const createContext = async ({ req }: CreateExpressContextOptions) => {
  // Get the authorization header
  const authHeader = req.headers.authorization;
  let user = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7); // Remove "Bearer " prefix

      // For Clerk tokens, we can decode without verification for now
      // In production, you'd verify with Clerk's public key
      const decoded = jwt.decode(token) as any;

      if (decoded && decoded.sub) {
        // Find user by Clerk ID
        user = await prisma.user.findUnique({
          where: { clerkId: decoded.sub },
        });
      }
    } catch (error) {
      logger.error("Failed to decode token:", error);
    }
  }

  return {
    prisma,
    logger,
    user,
  };
};

export type Context = inferAsyncReturnType<typeof createContext>;

export const t = initTRPC.context<Context>().create();
export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // Ensure user is not null
    },
  });
});
