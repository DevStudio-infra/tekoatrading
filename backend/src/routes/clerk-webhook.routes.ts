import { Router } from "express";
import { Webhook } from "svix";
import fs from "fs";
import path from "path";

const router = Router();

/**
 * POST /api/clerk-webhook
 * Handle Clerk webhook events (user creation, updates, etc.)
 */
router.post("/", async (req, res) => {
  try {
    // Log raw request for debugging
    const rawReqDebugFile = path.join(__dirname, "../../../webhook-requests.log");
    fs.appendFileSync(
      rawReqDebugFile,
      `\n[${new Date().toISOString()}] WEBHOOK REQUEST:\nHEADERS: ${JSON.stringify(req.headers)}\nBODY: ${JSON.stringify(req.body)}\n`,
    );

    console.log("Raw webhook request received and logged");

    // Get the Clerk webhook secret from environment variables
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("CLERK_WEBHOOK_SECRET is not defined");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    // Get the headers and body
    const headers = req.headers;
    const payload = JSON.stringify(req.body);

    // Get the Svix headers for verification
    const svix_id = headers["svix-id"] as string;
    const svix_timestamp = headers["svix-timestamp"] as string;
    const svix_signature = headers["svix-signature"] as string;

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({ error: "Error occurred -- no svix headers" });
    }

    // Create a new Svix instance with your webhook secret
    const wh = new Webhook(webhookSecret);

    let evt: any;

    // Verify the webhook payload
    try {
      evt = wh.verify(payload, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      console.error("Invalid webhook payload:", err);
      return res.status(400).json({ error: "Invalid webhook payload" });
    }

    // Log the webhook payload for debugging
    const webhookDebugFile = path.join(__dirname, "../../../webhook-debug.log");
    fs.appendFileSync(
      webhookDebugFile,
      `\n[${new Date().toISOString()}] EVENT: ${evt.type}\nDATA: ${JSON.stringify(evt, null, 2)}\n`,
    );

    console.log(`Webhook received: ${evt.type} - logged to webhook-debug.log`);

    // Process the webhook event
    try {
      await processWebhookEvent(evt.type, evt.data);
      return res.status(200).json({ success: true, message: `Processed ${evt.type} webhook` });
    } catch (error) {
      console.error(`Handler failed for webhook ${evt.type}:`, error);
      return res.status(500).json({
        error: "Error processing webhook",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Process Clerk webhook events
 */
async function processWebhookEvent(eventType: string, data: any) {
  console.log(`Processing webhook event: ${eventType}`);

  switch (eventType) {
    case "user.created":
      await handleUserCreated(data);
      break;
    case "user.updated":
      await handleUserUpdated(data);
      break;
    case "user.deleted":
      await handleUserDeleted(data);
      break;
    case "session.created":
      await handleSessionCreated(data);
      break;
    default:
      console.log(`Unhandled webhook event: ${eventType}`);
  }
}

/**
 * Handle user.created webhook event
 */
async function handleUserCreated(data: any) {
  console.log("Handling user.created webhook");

  // Extract user data
  const userId = data.id;
  const email = data.email_addresses?.[0]?.email_address;
  const firstName = data.first_name;
  const lastName = data.last_name;

  console.log(`Creating user: ${userId} (${email})`);

  // Here you would typically save to your database
  // For now, just log the event
  console.log("User creation processed successfully");
}

/**
 * Handle user.updated webhook event
 */
async function handleUserUpdated(data: any) {
  console.log("Handling user.updated webhook");

  const userId = data.id;
  console.log(`Updating user: ${userId}`);

  // Here you would typically update your database
  console.log("User update processed successfully");
}

/**
 * Handle user.deleted webhook event
 */
async function handleUserDeleted(data: any) {
  console.log("Handling user.deleted webhook");

  const userId = data.id;
  console.log(`Deleting user: ${userId}`);

  // Here you would typically remove from your database
  console.log("User deletion processed successfully");
}

/**
 * Handle session.created webhook event
 */
async function handleSessionCreated(data: any) {
  console.log("Handling session.created webhook");

  const userId = data.user_id;
  console.log(`Session created for user: ${userId}`);

  console.log("Session creation processed successfully");
}

export default router;
