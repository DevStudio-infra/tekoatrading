import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../../../../../backend/api/trpc/routers";
import { NextRequest } from "next/server";
import * as jwt from "jsonwebtoken";
import { prisma } from "../../../../../../backend/utils/prisma";

interface JwtPayload {
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  iat?: number;
  exp?: number;
}

// Create context for Next.js App Router
const createTRPCContext = async (opts: { req: NextRequest }) => {
  let user: { id: string; email: string; firstName: string; lastName: string } | null = null;

  try {
    const authHeader = opts.req.headers.get("authorization");

    if (authHeader) {
      const token = authHeader.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET || "default-secret-key") as JwtPayload;

      if (decoded.clerkId) {
        const userData = await prisma.user.findUnique({
          where: { clerkId: decoded.clerkId },
        });

        if (userData) {
          user = {
            id: userData.clerkId,
            email: userData.email,
            firstName: userData.firstName || "",
            lastName: userData.lastName || "",
          };
        }
      }
    }
  } catch (error) {
    console.error("Auth error:", error);
  }

  return {
    req: opts.req,
    user,
  };
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req }),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`);
          }
        : undefined,
  });

export { handler as GET, handler as POST };
