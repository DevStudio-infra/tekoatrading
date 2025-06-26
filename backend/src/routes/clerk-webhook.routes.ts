import { Router } from "express";
import { Webhook } from "svix";
import fs from "fs";
import path from "path";
import { prisma } from "../prisma";

// Type definitions for webhook data
interface ClerkUser {
  id: string;
  email_addresses?: Array<{ email_address: string }>;
  first_name?: string;
  last_name?: string;
}

interface WebhookEventData {
  id: string;
  user_id?: string;
  email_addresses?: Array<{ email_address: string }>;
  first_name?: string;
  last_name?: string;
}

const router = Router();

/**
 * POST /api/clerk-webhook
 * Handle Clerk webhook events (user creation, updates, etc.)
 */
router.post("/", async (req, res) => {
  try {
    // Get the raw body for Svix verification
    const payload = req.body.toString();

    // Log raw request for debugging
    const rawReqDebugFile = path.join(__dirname, "../../../webhook-requests.log");
    fs.appendFileSync(
      rawReqDebugFile,
      `\n[${new Date().toISOString()}] WEBHOOK REQUEST:\nHEADERS: ${JSON.stringify(req.headers)}\nBODY: ${payload}\n`,
    );

    console.log("Raw webhook request received and logged");

    // Get the Clerk webhook secret from environment variables
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("CLERK_WEBHOOK_SECRET is not defined");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    // Get the headers
    const headers = req.headers;

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

    let evt: { type: string; data: WebhookEventData };

    // Verify the webhook payload
    try {
      evt = wh.verify(payload, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as { type: string; data: WebhookEventData };
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
async function processWebhookEvent(eventType: string, data: WebhookEventData) {
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
async function handleUserCreated(data: WebhookEventData) {
  console.log("Handling user.created webhook");

  try {
    // Extract user data
    const clerkId = data.id;
    const email = data.email_addresses?.[0]?.email_address;
    const firstName = data.first_name;
    const lastName = data.last_name;
    const name = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null;

    console.log(`Creating user: ${clerkId} (${email})`);

    if (!email) {
      console.error("No email found in user data");
      return;
    }

    // Check if user already exists with this clerkId
    const existingUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (existingUser) {
      console.log(`User with clerkId ${clerkId} already exists`);
      return;
    }

    // Create user in database
    const user = await prisma.user.create({
      data: {
        clerkId,
        email,
        name,
      },
    });

    console.log(`User created successfully: ${user.id}`);
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

/**
 * Handle user.updated webhook event
 */
async function handleUserUpdated(data: WebhookEventData) {
  console.log("Handling user.updated webhook");

  try {
    const clerkId = data.id;
    const email = data.email_addresses?.[0]?.email_address;
    const firstName = data.first_name;
    const lastName = data.last_name;
    const name = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null;

    console.log(`Updating user: ${clerkId}`);

    if (!email) {
      console.error("No email found in user data");
      return;
    }

    // Find and update user
    const user = await prisma.user.upsert({
      where: { clerkId },
      update: {
        email,
        name,
        updatedAt: new Date(),
      },
      create: {
        clerkId,
        email,
        name,
      },
    });

    console.log(`User updated successfully: ${user.id}`);
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

/**
 * Handle user.deleted webhook event
 */
async function handleUserDeleted(data: WebhookEventData) {
  console.log("Handling user.deleted webhook");

  try {
    const clerkId = data.id;
    console.log(`Deleting user: ${clerkId}`);

    // Delete user from database
    await prisma.user.delete({
      where: { clerkId },
    });

    console.log("User deleted successfully");
  } catch (error) {
    console.error("Error deleting user:", error);
    // Don't throw error if user doesn't exist
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      console.log("User already deleted or doesn't exist");
    } else {
      throw error;
    }
  }
}

/**
 * Handle session.created webhook event
 */
async function handleSessionCreated(data: WebhookEventData) {
  console.log("Handling session.created webhook");

  try {
    const userId = data.user_id;
    console.log(`Session created for user: ${userId}`);

    // Ensure user exists in our database
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      console.log(
        `User ${userId} not found in database, attempting to fetch and create user from Clerk`,
      );

      try {
        // Check if CLERK_SECRET_KEY is available
        const clerkSecretKey = process.env.CLERK_SECRET_KEY;
        if (!clerkSecretKey) {
          console.warn("CLERK_SECRET_KEY not found in environment variables");
          return;
        }

        // Try to fetch user data from Clerk API to create the missing user
        console.log(`Fetching user ${userId} from Clerk API...`);
        const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
            "Content-Type": "application/json",
          },
        });

        console.log(`Clerk API response status: ${clerkResponse.status}`);

        if (clerkResponse.ok) {
          const clerkUser = (await clerkResponse.json()) as ClerkUser;
          const email = clerkUser.email_addresses?.[0]?.email_address;
          const firstName = clerkUser.first_name;
          const lastName = clerkUser.last_name;
          const name =
            firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null;

          if (email) {
            // Create user in our database
            user = await prisma.user.create({
              data: {
                clerkId: userId,
                email,
                name,
              },
            });
            console.log(
              `User created successfully from session webhook: ${user.id} (${user.email})`,
            );
          } else {
            console.warn(`No email found for user ${userId} from Clerk API`);
          }
        } else {
          console.warn(`Failed to fetch user ${userId} from Clerk API: ${clerkResponse.status}`);
        }
      } catch (fetchError) {
        console.error(`Error fetching user from Clerk API:`, fetchError);
        // Don't throw here - session creation should still succeed even if user creation fails
      }
    } else {
      console.log(`Session created for existing user: ${user.email}`);
    }

    console.log("Session creation processed successfully");
  } catch (error) {
    console.error("Error processing session creation:", error);
    throw error;
  }
}

export default router;
