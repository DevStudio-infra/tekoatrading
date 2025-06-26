import { router, publicProcedure, createContext } from "../trpc";
import { usersRouter } from "./users";
import { botsRouter } from "./bots";
import { strategiesRouter } from "./strategies";
import { aiRouter } from "./ai";
import { tradingPairsRouter } from "./trading-pairs";
import { evaluationsRouter } from "./evaluations";

export { createContext };

export const appRouter = router({
  ping: publicProcedure.query(() => {
    return { pong: true };
  }),

  users: usersRouter,
  bots: botsRouter,
  strategies: strategiesRouter,
  ai: aiRouter,
  tradingPair: tradingPairsRouter,
  evaluation: evaluationsRouter,
});

export type AppRouter = typeof appRouter;
