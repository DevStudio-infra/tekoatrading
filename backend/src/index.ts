import express from "express";
import dotenv from "dotenv";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./routers/root";

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = express();

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/trpc", trpcExpress.createExpressMiddleware({
  router: appRouter,
}));

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend server running on port ${PORT}`);
});
