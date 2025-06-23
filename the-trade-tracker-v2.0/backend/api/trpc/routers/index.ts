import { router } from '../trpc';
import { userRouter } from './userRouter';
import { strategyRouter } from './strategyRouter';
import { botRouter } from './botRouter';
import { brokerCredentialRouter } from './brokerCredentialRouter';
import { clerkAuthRouter } from './clerkAuthRouter';

// Root router that merges all sub-routers
export const appRouter = router({
  users: userRouter,
  strategies: strategyRouter,
  bots: botRouter,
  brokerCredentials: brokerCredentialRouter,
  clerkAuth: clerkAuthRouter,
});

// Export type definitions for client usage
export type AppRouter = typeof appRouter;
