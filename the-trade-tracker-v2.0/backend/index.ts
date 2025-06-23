import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createContext } from "./api/trpc/trpc";
import { appRouter } from "./api/trpc/routers";
import apiRoutes from "./api/routes";
import { prisma } from "./utils/prisma";
import { schedulerService } from "./services/scheduler.service";

// Load environment variables from backend/.env file
dotenv.config({ path: path.join(__dirname, ".env") });

// Log Supabase configuration status
console.log(
  `Supabase URL configured: ${!!process.env.SUPABASE_URL}, Anon Key configured: ${!!process.env.SUPABASE_ANON_KEY}, Service Key configured: ${!!process.env.SUPABASE_SERVICE_KEY}`
);

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// tRPC API endpoint
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// RESTful API routes
app.use("/api/v1", apiRoutes);

// Import routes for the direct webhook endpoint
import clerkWebhookRouter from "./api/routes/clerk-webhook.routes";

// Direct webhook route (without /v1 prefix)
app.use("/api/clerk-webhook", clerkWebhookRouter);

// Default route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Trade Tracker API" });
});

// Health check route
app.get("/health", async (req, res) => {
  try {
    // Test database connection using Prisma
    await prisma.$queryRaw`SELECT 1 as result`;

    res.json({
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(500).json({
      status: "error",
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

// Port
const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`tRPC API available at http://localhost:${PORT}/api/trpc`);
  console.log(`REST API available at http://localhost:${PORT}/api/v1`);

  // Start the scheduler service with a short delay to ensure all services are initialized
  console.log("Waiting for services to initialize before starting bot scheduler...");
  setTimeout(() => {
    console.log("Initializing bot scheduler service...");
    schedulerService
      .start()
      .then(() => {
        console.log("Bot scheduler service successfully started");

        // Run diagnostics to check active bots
        schedulerService
          .runDiagnostics()
          .then(() => {
            console.log("Bot scheduler diagnostics complete");

            // Log the active bot information
            prisma.bot
              .findMany({
                where: {
                  isActive: true,
                  isAiTradingActive: true,
                },
              })
              .then((activeBots: any[]) => {
                console.log(`Found ${activeBots.length} active bot(s) with AI trading enabled:`);
                activeBots.forEach((bot: any) => {
                  console.log(`- Bot ID: ${bot.id}, Timeframe: ${bot.timeframe}`);
                });
              })
              .catch((err: any) => {
                console.error("Error fetching active bots:", err);
              });
          })
          .catch((error) => {
            console.error("Error running scheduler diagnostics:", error);
          });
      })
      .catch((error) => {
        console.error("Failed to start scheduler service:", error);
      });
  }, 2000); // 2-second delay
});
