import { Router } from "express";
import { stripeService } from "../services/stripe.service";
import { BillingCycle, PlanType } from "@prisma/client";
import { logger } from "../logger";
import { subscriptionService } from "../services/subscription-management.service";

const router = Router();

/**
 * 💳 STRIPE API ROUTES
 * Handles Stripe payments, subscriptions, and webhooks
 */

// ============================================================================
// PAYMENT ENDPOINTS
// ============================================================================

/**
 * POST /api/stripe/create-subscription-checkout - Create Pro subscription checkout
 */
router.post("/create-subscription-checkout", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { email, billingCycle = "MONTHLY", successUrl, cancelUrl } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to create a subscription",
      });
    }

    if (!email || !successUrl || !cancelUrl) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Email, success URL, and cancel URL are required",
      });
    }

    logger.info(`🛒 Creating subscription checkout for user: ${userId}`);

    const checkoutUrl = await stripeService.createProSubscriptionCheckout(
      userId,
      email,
      billingCycle as BillingCycle,
      successUrl,
      cancelUrl,
    );

    res.json({
      success: true,
      data: {
        checkoutUrl,
      },
    });
  } catch (error) {
    logger.error(
      `❌ Error creating subscription checkout: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    res.status(500).json({
      error: "Failed to create checkout session",
      message: error instanceof Error ? error.message : "Unable to create checkout at this time",
    });
  }
});

/**
 * 💳 CREATE CREDIT PAYMENT
 * Creates payment intent for dynamic credit purchase
 */
router.post("/create-credit-payment", async (req, res) => {
  try {
    const { creditAmount, email } = req.body;

    if (!creditAmount || !email) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: creditAmount and email",
      });
    }

    // Validate credit amount
    if (creditAmount < 50 || creditAmount > 5000) {
      return res.status(400).json({
        success: false,
        error: "Credit amount must be between 50 and 5000",
      });
    }

    logger.info(`💳 Creating credit payment: ${creditAmount} credits for ${email}`);

    // Get user ID (you'll need to implement proper auth middleware)
    const userId = (req as any).user?.id || "demo-user-id";

    const { clientSecret, paymentIntentId } = await stripeService.createCreditPayment(
      userId,
      creditAmount,
      email,
    );

    res.json({
      success: true,
      data: {
        clientSecret,
        paymentIntentId,
        creditAmount,
      },
    });
  } catch (error) {
    logger.error("❌ Error creating credit payment:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create credit payment",
    });
  }
});

// Credit packages route removed - now using slider system

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * POST /api/stripe/cancel-subscription - Cancel user's subscription
 */
router.post("/cancel-subscription", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { immediately = false } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to cancel subscription",
      });
    }

    logger.info(`🚫 Canceling subscription for user: ${userId}`);

    // Get user's subscription to find Stripe subscription ID
    const { subscriptionService } = await import("../services/subscription-management.service");
    const subscription = await subscriptionService.getUserSubscription(userId);

    if (!subscription?.stripeSubscriptionId) {
      return res.status(404).json({
        error: "No subscription found",
        message: "No active subscription to cancel",
      });
    }

    await stripeService.cancelSubscription(subscription.stripeSubscriptionId, immediately);

    res.json({
      success: true,
      message: immediately
        ? "Subscription canceled immediately"
        : "Subscription will be canceled at the end of the current period",
    });
  } catch (error) {
    logger.error(
      `❌ Error canceling subscription: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    res.status(500).json({
      error: "Failed to cancel subscription",
      message:
        error instanceof Error ? error.message : "Unable to cancel subscription at this time",
    });
  }
});

// ============================================================================
// WEBHOOK ENDPOINT
// ============================================================================

/**
 * POST /api/stripe/webhook - Handle Stripe webhooks
 */
router.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["stripe-signature"] as string;
    const payload = req.body;

    if (!signature) {
      logger.error("❌ Missing Stripe signature header");
      return res.status(400).json({
        error: "Missing signature header",
      });
    }

    // Verify webhook signature and construct event
    const event = stripeService.verifyWebhookSignature(payload, signature);

    logger.info(`🔗 Received Stripe webhook: ${event.type}`);

    // Handle the webhook event
    await stripeService.handleWebhook(event.type, event.data.object);

    res.json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    logger.error(
      `❌ Webhook signature verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    res.status(400).json({
      error: "Webhook signature verification failed",
      message: error instanceof Error ? error.message : "Invalid webhook signature",
    });
  }
});

// ============================================================================
// PRICING INFORMATION
// ============================================================================

/**
 * 💰 GET PRICING INFORMATION
 * Returns pricing plans and credit pricing information
 */
router.get("/pricing", async (req, res) => {
  try {
    logger.info(`💰 Getting pricing information`);

    // Get user ID from auth middleware or query params
    const userId = (req as any).user?.id || (req.query.userId as string);

    let userType: PlanType = PlanType.FREE; // Default to FREE

    if (userId) {
      // Check user's subscription type
      const subscription = await subscriptionService.getUserSubscription(userId);
      userType = subscription?.planType || PlanType.FREE;
    }

    // Get credit pricing for user's subscription type
    const creditPricing = stripeService.getCreditPricing(userType);

    res.json({
      success: true,
      data: {
        plans: [
          {
            name: "Free",
            price: 0,
            billingCycle: "forever",
            features: [
              "20 credits per month",
              "Basic bot evaluations",
              "Community support",
              "Basic analytics",
            ],
            credits: {
              monthly: 20,
              cumulative: false,
              additionalPrice: 0.05,
            },
          },
          {
            name: "Pro",
            price: 19.99,
            yearlyPrice: 203.89, // 19.99 * 12 * 0.85 = 203.89
            billingCycle: "monthly",
            features: [
              "2,000 credits per month",
              "Advanced bot evaluations",
              "Priority support",
              "Advanced analytics",
              "API access",
              "Custom strategies",
            ],
            credits: {
              monthly: 2000,
              cumulative: true,
              additionalPrice: 0.01,
            },
            popular: true,
          },
        ],
        creditPricing,
      },
    });
  } catch (error) {
    logger.error(
      `❌ Error getting pricing information: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    res.status(500).json({
      success: false,
      error: "Failed to get pricing information",
    });
  }
});

/**
 * 🎚️ GET CREDIT PRICING
 * Returns credit pricing based on user subscription type
 */
router.get("/credit-pricing", async (req, res) => {
  try {
    // Get user ID from auth middleware or query params
    const userId = (req as any).user?.id || (req.query.userId as string);

    let userType: PlanType = PlanType.FREE; // Default to FREE

    if (userId) {
      // Check user's subscription type
      const subscription = await subscriptionService.getUserSubscription(userId);
      userType = subscription?.planType || PlanType.FREE;
    }

    const creditPricing = stripeService.getCreditPricing(userType);

    res.json({
      success: true,
      data: creditPricing,
    });
  } catch (error) {
    logger.error("❌ Error getting credit pricing:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get credit pricing",
    });
  }
});

export default router;
