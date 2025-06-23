import { Request, Response, Router } from 'express';
import { Webhook } from 'svix';
import { clerkAuthService } from '../../services/clerk-auth.service';
import { loggerService } from '../../services/logger.service';

const router = Router();

/**
 * POST /api/clerk-webhook
 * Handle Clerk webhook events (user creation, updates, etc.)
 */
router.post('/', (req: Request, res: Response) => {
  // Wrap in a self-executing async function to handle promise rejections while preserving Express middleware pattern
  (async () => {
  // Log raw request for debugging
  const fs = require('fs');
  const path = require('path');
  const rawReqDebugFile = path.join(__dirname, '../../../raw-webhook-requests.log');
  
  // Log headers and body
  fs.appendFileSync(
    rawReqDebugFile,
    `\n[${new Date().toISOString()}] WEBHOOK REQUEST:\nHEADERS: ${JSON.stringify(req.headers)}\nBODY: ${JSON.stringify(req.body)}\n`
  );
  
  loggerService.info('Raw webhook request received and logged to raw-webhook-requests.log');
  
  // Get the Clerk webhook secret from environment variables
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    loggerService.error('CLERK_WEBHOOK_SECRET is not defined');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  // Get the Svix headers for verification
  const svixId = req.headers['svix-id'] as string;
  const svixTimestamp = req.headers['svix-timestamp'] as string;
  const svixSignature = req.headers['svix-signature'] as string;

  // If they don't exist, error out
  if (!svixId || !svixTimestamp || !svixSignature) {
    loggerService.warn('Missing Svix headers');
    return res.status(400).json({ error: 'Missing Svix headers' });
  }

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(webhookSecret);
  
  let payload: any;
  
  try {
    // Verify the webhook payload
    payload = wh.verify(
      JSON.stringify(req.body),
      {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }
    );
  } catch (err) {
    loggerService.error('Invalid webhook payload:', err);
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }

  // Log the webhook payload for debugging
  const webhookDebugFile = path.join(__dirname, '../../../webhook-debug.log');
  fs.appendFileSync(
    webhookDebugFile,
    `\n[${new Date().toISOString()}] EVENT: ${payload.type}\nDATA: ${JSON.stringify(payload, null, 2)}\n`
  );
  
  loggerService.info(`Webhook received: ${payload.type} - logged to webhook-debug.log`);
  
  // Process the webhook event
  try {
    // Use our existing clerk auth service for processing
    await clerkAuthService.processWebhookEvent(payload.type, payload);
    return res.status(200).json({ success: true, message: `Processed ${payload.type} webhook` });
  } catch (error) {
    loggerService.error(`Handler failed for webhook ${payload.type}: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({ 
      success: false, 
      error: 'Error processing webhook',
      message: error instanceof Error ? error.message : String(error)
    });
  }
  })();
});

export default router;
