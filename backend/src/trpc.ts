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

      if (decoded) {
        // Check if user exists in our database
        const existingUser = await prisma.user.findUnique({
          where: { clerkId: decoded.sub },
        });

        if (existingUser) {
          user = {
            id: existingUser.id,
            clerkId: existingUser.clerkId,
            email: existingUser.email,
            name: existingUser.name,
            createdAt: existingUser.createdAt,
            updatedAt: existingUser.updatedAt,
          };
        } else {
          // Create user from token if they don't exist
          try {
            const newUser = await prisma.user.create({
              data: {
                clerkId: decoded.sub,
                email: decoded.email || `${decoded.sub}@clerk.dev`,
                name:
                  decoded.name ||
                  `${decoded.given_name || decoded.first_name || ""} ${
                    decoded.family_name || decoded.last_name || ""
                  }`.trim() ||
                  "Unknown User",
              },
            });

            user = {
              id: newUser.id,
              clerkId: newUser.clerkId,
              email: newUser.email,
              name: newUser.name,
              createdAt: newUser.createdAt,
              updatedAt: newUser.updatedAt,
            };

            logger.info(`Auto-created user from token: ${newUser.id} (${newUser.clerkId})`);
          } catch (createError) {
            logger.error("Failed to create user from token:", createError);
          }
        }
      }
    } catch (error) {
      logger.warn("Failed to decode token:", error);
    }
  }

  // Development mode: inject dummy user if no authentication and in development
  if (!user && process.env.NODE_ENV === "development") {
    console.log("Development mode: No user found, creating development user");

    // Try to find or create a development user
    let devUser = await prisma.user.findFirst({
      where: { email: "dev@example.com" },
    });

    if (!devUser) {
      try {
        devUser = await prisma.user.create({
          data: {
            clerkId: "dev-user-id",
            email: "dev@example.com",
            name: "Development User",
          },
        });
        console.log("Created development user:", devUser.id);
      } catch (createError) {
        // User might already exist, try to find again
        devUser = await prisma.user.findFirst({
          where: { clerkId: "dev-user-id" },
        });
      }
    }

    if (devUser) {
      user = {
        id: devUser.id,
        clerkId: devUser.clerkId,
        email: devUser.email,
        name: devUser.name,
        createdAt: devUser.createdAt,
        updatedAt: devUser.updatedAt,
      };
      console.log("Using development user:", user.id);
    }
  }

  return {
    req,
    user,
    prisma,
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
