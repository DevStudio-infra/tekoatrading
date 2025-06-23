import { router, publicProcedure } from "../trpc";

export const appRouter = router({
  ping: publicProcedure.query(() => {
    return { pong: true };
  }),
});

export type AppRouter = typeof appRouter;
