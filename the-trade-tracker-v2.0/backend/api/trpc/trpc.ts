import { initTRPC } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';

// Context type definition
export const createContext = ({ req, res }: CreateExpressContextOptions) => ({
  req,
  res,
  // You can add other context values here, such as:
  // user: req.user (after adding authentication middleware)
  // db: db (from your database connection)
});

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create();

// Export reusable router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;
