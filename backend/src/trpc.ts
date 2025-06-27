import { initTRPC, TRPCError } from "@trpc/server";
import { prisma } from "./prisma";
import { logger } from "./logger";
import type { inferAsyncReturnType } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import jwt from "jsonwebtoken";
import base64url from "base64url";

export const createContext = async ({ req }: CreateExpressContextOptions) => {
  // Get the authorization header
  const authHeader = req.headers.authorization;
  let user = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.substring(7); // Remove "Bearer " prefix

      // For Clerk tokens, we can decode without verification for now
      // In production, you'd verify with Clerk's public key
      let decoded: any = null;

      // Always try manual decode first since it's more reliable
      try {
        const tokenParts = token.split(".");
        if (tokenParts.length === 3) {
          const payload = tokenParts[1];
          const decodedPayload = base64url.decode(payload);
          decoded = JSON.parse(decodedPayload);
        }
      } catch (manualDecodeError) {
        // Fallback to jwt.decode
        try {
          decoded = jwt.decode(token) as any;
        } catch (jwtDecodeError) {
          // Silent fail, user will remain null
        }
      }

      if (decoded && decoded.sub) {
        // Find user by Clerk ID
        user = await prisma.user.findUnique({
          where: { clerkId: decoded.sub },
        });

        // If user doesn't exist but we have a valid Clerk token, create the user
        if (!user && decoded.sub) {
          try {
            user = await prisma.user.create({
              data: {
                clerkId: decoded.sub,
                email: decoded.email || `${decoded.sub}@temp.com`, // Use temp email if not available
                name: decoded.name || decoded.first_name || decoded.last_name || "Unknown User",
              },
            });
          } catch (createError) {
            logger.error("Failed to auto-create user:", createError);
          }
        }
      }
    } catch (error) {
      logger.error("Failed to process token:", error);
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

// Debug procedure to help troubleshoot authentication
export const debugProcedure = t.procedure.use(async ({ ctx, next }) => {
  return next({
    ctx: {
      ...ctx,
      debug: true,
    },
  });
});
