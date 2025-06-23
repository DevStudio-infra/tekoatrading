import { initTRPC } from "@trpc/server";
import { prisma } from "./prisma";
import { logger } from "./logger";
import type { inferAsyncReturnType } from "@trpc/server";

export const createContext = () => ({ prisma, logger });
export type Context = inferAsyncReturnType<typeof createContext>;

export const t = initTRPC.context<Context>().create();
export const router = t.router;
export const publicProcedure = t.procedure;
