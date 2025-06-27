import { router, publicProcedure, createContext } from "../trpc";
import { usersRouter } from "./users";
import { botsRouter } from "./bots";
import { strategiesRouter } from "./strategies";
import { strategyTemplatesRouter } from "./strategy-templates";
import { aiRouter } from "./ai";
import { tradingPairsRouter } from "./trading-pairs";
import { evaluationsRouter } from "./evaluations";
import { tradesRouter } from "./trades";

export { createContext };

export const appRouter = router({
  ping: publicProcedure.query(() => {
    return { pong: true };
  }),

  users: usersRouter,
  bots: botsRouter,
  strategies: strategiesRouter,
  strategyTemplates: strategyTemplatesRouter,
  ai: aiRouter,
  tradingPair: tradingPairsRouter,
  evaluation: evaluationsRouter,
  trades: tradesRouter,
});

export type AppRouter = typeof appRouter;
