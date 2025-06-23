// @ts-nocheck - Disabling TypeScript checking for this file as it's a transitional compatibility layer
import { Request, Response, Router } from "express";
import { Webhook } from "svix";
import { loggerService } from "../../services/logger.service";
import { clerkAuthService } from "../../services/clerk-auth.service";
import * as fs from "fs";
import * as path from "path";

const router = Router();

// This will handle Clerk webhook events (user creation, updates, etc.)
router.post("/clerk-webhook", async (req, res) => {
  try {
    // First log the raw request for debugging
    const rawRequestLogPath = path.join(__dirname, "../../../raw-webhook-requests.log");
    fs.appendFileSync(rawRequestLogPath, `\n[${new Date().toISOString()}] RAW REQUEST: ${JSON.stringify(req.body, null, 2)}\n`);
    loggerService.info("Raw webhook request received and logged to raw-webhook-requests.log");

    // Get the Clerk webhook secret from environment variables
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
      loggerService.error("CLERK_WEBHOOK_SECRET is not defined");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    // Get the Svix headers for verification
    const svixId = req.headers["svix-id"] as string;
    const svixTimestamp = req.headers["svix-timestamp"] as string;
    const svixSignature = req.headers["svix-signature"] as string;

    // If they don't exist, error out
    if (!svixId || !svixTimestamp || !svixSignature) {
      loggerService.warn("Missing Svix headers");
      return res.status(400).json({ error: "Missing Svix headers" });
    }

    // Create a new Svix instance with your webhook secret
    const wh = new Webhook(webhookSecret);

    let payload: any;

    try {
      // Verify the webhook payload
      payload = wh.verify(JSON.stringify(req.body), {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch (err) {
      loggerService.error("Invalid webhook payload:", err);
      return res.status(400).json({ error: "Invalid webhook payload" });
    }

    // Log the webhook event for debugging
    const webhookLogPath = path.join(__dirname, "../../../webhook-debug.log");
    fs.appendFileSync(webhookLogPath, `\n[${new Date().toISOString()}] EVENT: ${payload.type}\nDATA: ${JSON.stringify(payload, null, 2)}\n`);
    loggerService.info(`Webhook received: ${payload.type} - logged to webhook-debug.log`);

    // Process the webhook event using our clerk auth service
    const result = await clerkAuthService.processWebhookEvent(payload.type, payload);

    return res.status(200).json({ success: true, message: `Processed ${payload.type} webhook` });
  } catch (error) {
    loggerService.error(`Handler failed for webhook: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: `Error processing webhook: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
});

export default router;
