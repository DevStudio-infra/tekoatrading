import { initTRPC, TRPCError } from '@trpc/server';
import { type Context } from './context';

// Create the initial tRPC instance with context
const t = initTRPC.context<Context>().create();

// Middleware to check if the user is authenticated
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

// Export procedures
export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthenticated);
