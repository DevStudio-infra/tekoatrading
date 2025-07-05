import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers/root";
import { createContext } from "./trpc";
import { logger } from "./logger";
import clerkWebhookRouter from "./routes/clerk-webhook.routes";
import { schedulerService } from "./services/scheduler.service";
import subscriptionsRouter from "./routers/subscriptions";
import stripeRouter from "./routers/stripe";

dotenv.config();

const PORT = process.env.PORT || 3001;

const app = express();

app.use(cors());

// Raw body parser for webhook verification
app.use("/api/clerk-webhook", express.raw({ type: "application/json" }));

// Regular JSON parser for other routes
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Add Clerk webhook route
app.use("/api/clerk-webhook", clerkWebhookRouter);

// Add pricing system routes
app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/stripe", stripeRouter);

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

// Start server
app.listen(PORT, async () => {
  logger.info(`🚀 Server running on port ${PORT}`);

  // Start the bot scheduler
  try {
    await schedulerService.start();
    logger.info("✅ Bot scheduler started successfully");
  } catch (error) {
    logger.error("❌ Failed to start bot scheduler:", error);
  }
});

// Graceful shutdown
process.on("SIGINT", async () => {
  logger.info("🛑 Shutting down server...");
  await schedulerService.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("🛑 Shutting down server...");
  await schedulerService.stop();
  process.exit(0);
});
