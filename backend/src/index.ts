import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers/root";
import { logger } from "./logger";
import clerkWebhookRouter from "./routes/clerk-webhook.routes";
import { schedulerService } from "./services/scheduler.service";

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

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: () => ({}), // Basic context for now
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
