import express from "express";
import http from "http";
import cors from "cors";
import { config } from "dotenv";
import path from "path";
import { createContext } from "./api/trpc/context";
import { appRouter } from "./api/trpc/routers";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { expressHandler } from "trpc-playground/handlers/express";
import helmet from "helmet";
import bodyParser from "body-parser";
import routes from "./api/routes";
import { WebSocketService } from "./services/websocket.service";
import { schedulerService } from "./services/scheduler.service";
import { getDefaultCapitalService } from "./modules/capital";
import { OrderManagementService } from "./services/order-management.service";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { loggerService } from "./services/logger.service";
import morgan from "morgan";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.middleware";
import { spawn } from "child_process";
import { setupSwagger } from "./api/swagger";

// Load environment variables
config();

// Initialize Express
const app = express();
const server = http.createServer(app);

// Apply middleware
app.use(cors());
app.use(helmet());
app.use(morgan("combined", { stream: loggerService.stream }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API routes
app.use("/api", routes);

// Setup Swagger documentation
setupSwagger(app);

// tRPC middleware
app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// tRPC playground in non-production environments
if (process.env.NODE_ENV !== "production") {
  // Use an immediately-invoked async function to handle the await
  (async () => {
    try {
      const handler = await expressHandler({
        trpcApiEndpoint: "/trpc",
        playgroundEndpoint: "/trpc-playground",
        router: appRouter,
      });
      app.use("/trpc-playground", handler);
      loggerService.info("tRPC playground initialized");
    } catch (error) {
      loggerService.errorWithStack("Failed to initialize tRPC playground", error as Error);
    }
  })();
}

// Serve static files from the React app in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  // Handle React routing, return all requests to the app
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });
}

// Apply error handling middleware - must be after routes
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize websocket service
const wsService = new WebSocketService(server);

// Make websocket service globally accessible
(global as any).wsService = wsService;

// Database migration function using drizzle-kit
async function runMigrations() {
  try {
    loggerService.info("Running database migrations...");

    // Use drizzle-kit push as per user preference
    const drizzlePush = spawn("npx", ["drizzle-kit", "push"], {
      stdio: "pipe",
      shell: true,
    });

    drizzlePush.stdout.on("data", (data) => {
      loggerService.info(`drizzle-kit push: ${data.toString().trim()}`);
    });

    drizzlePush.stderr.on("data", (data) => {
      loggerService.error(`drizzle-kit push error: ${data.toString().trim()}`);
    });

    await new Promise<void>((resolve, reject) => {
      drizzlePush.on("close", (code) => {
        if (code === 0) {
          loggerService.info("Migrations completed successfully");
          resolve();
        } else {
          loggerService.error(`Migration process exited with code ${code}`);

          // Fall back to SQL migration if drizzle-kit fails
          fallbackMigration().then(resolve).catch(reject);
        }
      });
    });
  } catch (error) {
    loggerService.errorWithStack("Failed to run migrations", error as Error);

    // Try fallback migration method
    await fallbackMigration();
  }
}

// Fallback migration method using SQL client
async function fallbackMigration() {
  try {
    loggerService.info("Using fallback migration method...");
    const migrationClient = postgres(process.env.DATABASE_URL || "", { max: 1 });
    const db = drizzle(migrationClient);

    await migrate(db, { migrationsFolder: "./db/migrations" });
    loggerService.info("Fallback migrations completed successfully");

    await migrationClient.end();
  } catch (error) {
    loggerService.errorWithStack("Fallback migration failed", error as Error);
    throw error;
  }
}

// Initialize and start services
async function initializeServices() {
  try {
    // Initialize Capital.com API only if credentials are available
    const capitalService = getDefaultCapitalService();
    if (capitalService) {
      await capitalService.initialize();
      loggerService.info("Capital.com API initialized with environment credentials");
    } else {
      loggerService.info("Capital.com API not initialized - no environment credentials provided. Services will use user-specific credentials from database.");
    }

    // Start the scheduler
    await schedulerService.start();
    loggerService.info("Scheduler service started");
  } catch (error) {
    loggerService.errorWithStack("Failed to initialize services", error as Error);
  }
}

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  loggerService.info(`Server is running on port ${PORT}`);

  // Run migrations
  await runMigrations();

  // Initialize services
  await initializeServices();
});

// Handle shutdown
process.on("SIGINT", async () => {
  loggerService.info("Shutting down...");

  // Stop the scheduler
  schedulerService.stop();

  // Capital.com services will be cleaned up when the process exits
  // Individual instances are managed by the broker factory service

  process.exit(0);
});

// Export the Express app for testing
export { app };
