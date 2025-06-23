// A simplified handler for Clerk webhooks that avoids column mismatches
import dotenv from "dotenv";
import { Pool, PoolClient } from "pg";
import fs from "fs";
import path from "path";

dotenv.config();

// Debug log path
const debugLogPath = path.join(__dirname, "../../webhook-handler-debug.log");
fs.writeFileSync(debugLogPath, `Webhook Handler Debug Log - ${new Date().toISOString()}\n\n`);

// Simple logging function
function log(message: string, data: any = null): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}${data ? "\n" + JSON.stringify(data, null, 2) : ""}`;
  console.log(logMessage);
  fs.appendFileSync(debugLogPath, logMessage + "\n");
}

// Create a database connection with SSL disabled for self-signed certificates
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test the connection
pool
  .query("SELECT NOW()")
  .then(() => log("Database connection established successfully"))
  .catch((err) => log("Database connection error:", err));

interface WebhookResult {
  success: boolean;
  action?: string;
  user?: any;
  error?: string;
}

interface UserData {
  id: string;
  email_addresses?: Array<{
    email_address: string;
  }>;
}

interface SessionData {
  user_id: string;
}

// Helper function to verify the app_users table structure
async function verifySchema(): Promise<boolean> {
  try {
    const client: PoolClient = await pool.connect();
    log("Checking app_users table structure...");

    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'app_users'
      );
    `);

    if (!tableExists.rows[0].exists) {
      log("app_users table does not exist, creating it...");
      await client.query(`
        CREATE TABLE app_users (
          id SERIAL PRIMARY KEY,
          clerk_id VARCHAR(255) NOT NULL UNIQUE,
          email VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      log("app_users table created successfully");
    } else {
      log("app_users table exists, checking structure...");

      const columns = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'app_users'
        ORDER BY ordinal_position
      `);

      log("Current app_users columns:", columns.rows);
    }

    client.release();
    return true;
  } catch (err) {
    log("Error verifying schema:", err);
    return false;
  }
}

// Handler for user.created events
async function handleUserCreated(data: UserData): Promise<WebhookResult> {
  try {
    log("Processing user.created event:", data);

    // Extract email
    const primaryEmail = data.email_addresses && data.email_addresses[0] && data.email_addresses[0].email_address;

    if (!primaryEmail) {
      log("No email found in user data, skipping");
      return { success: false, error: "No email found" };
    }

    const client: PoolClient = await pool.connect();

    try {
      // Check if user already exists
      const existingUser = await client.query("SELECT * FROM app_users WHERE email = $1", [primaryEmail]);

      if (existingUser.rows.length > 0) {
        log(`User with email ${primaryEmail} already exists, updating clerk_id`);
        await client.query("UPDATE app_users SET clerk_id = $1 WHERE email = $2", [data.id, primaryEmail]);
        return { success: true, action: "updated", user: existingUser.rows[0] };
      }

      // Create new user
      log(`Creating new user with email ${primaryEmail}`);
      const result = await client.query("INSERT INTO app_users (clerk_id, email) VALUES ($1, $2) RETURNING *", [data.id, primaryEmail]);

      log("User created successfully:", result.rows[0]);
      return { success: true, action: "created", user: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (err: any) {
    log("Error handling user.created:", err);
    return { success: false, error: err.message };
  }
}

// Handler for session.created events
async function handleSessionCreated(data: SessionData): Promise<WebhookResult> {
  try {
    log("Processing session.created event:", data);

    if (!data.user_id) {
      log("No user_id in session data, skipping");
      return { success: false, error: "No user_id found" };
    }

    const client: PoolClient = await pool.connect();

    try {
      // Check if user already exists
      const existingUser = await client.query("SELECT * FROM app_users WHERE clerk_id = $1", [data.user_id]);

      if (existingUser.rows.length > 0) {
        log(`User with clerk_id ${data.user_id} already exists, no action needed`);
        return { success: true, action: "none", user: existingUser.rows[0] };
      }

      // Create new user with placeholder email
      log(`Creating placeholder user with clerk_id ${data.user_id}`);
      const result = await client.query("INSERT INTO app_users (clerk_id, email) VALUES ($1, $2) RETURNING *", [data.user_id, `${data.user_id}@placeholder.com`]);

      log("Placeholder user created successfully:", result.rows[0]);
      return { success: true, action: "created", user: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (err: any) {
    log("Error handling session.created:", err);
    return { success: false, error: err.message };
  }
}

// Main webhook handler
async function handleWebhook(eventType: string, data: UserData | SessionData): Promise<WebhookResult> {
  log(`Received webhook event: ${eventType}`);

  try {
    // Verify schema first
    await verifySchema();

    // Handle different event types
    switch (eventType) {
      case "user.created":
        return await handleUserCreated(data as UserData);

      case "session.created":
        return await handleSessionCreated(data as SessionData);

      case "user.updated":
        // For now, handle like user.created
        return await handleUserCreated(data as UserData);

      default:
        log(`Unhandled event type: ${eventType}`);
        return { success: false, error: "Unhandled event type" };
    }
  } catch (err: any) {
    log(`Error processing webhook event ${eventType}:`, err);
    return { success: false, error: err.message };
  }
}

// Export the main handler and utilities
export { handleWebhook, handleUserCreated, handleSessionCreated, verifySchema, log, pool };

export default handleWebhook;
