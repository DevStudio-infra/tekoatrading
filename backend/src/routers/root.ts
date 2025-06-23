import { router, publicProcedure, createContext } from "../trpc";
import { usersRouter } from "./users";
import { botsRouter } from "./bots";
import { strategiesRouter } from "./strategies";

export { createContext };

export const appRouter = router({
  ping: publicProcedure.query(() => {
    return { pong: true };
  }),

  users: usersRouter,
  bots: botsRouter,
  strategies: strategiesRouter,
});

export type AppRouter = typeof appRouter;
