import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter, createContext } from "./routers/root";
import { logger } from "./logger";
import clerkWebhookRouter from "./routes/clerk-webhook.routes";

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Add Clerk webhook route
app.use("/api/clerk-webhook", clerkWebhookRouter);

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

app.listen(PORT, () => {
  logger.info(`Backend server running on port ${PORT}`);
});
