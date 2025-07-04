import { Router } from "express";
import { subscriptionService } from "../services/subscription-management.service";
import { PlanType, BillingCycle, SubscriptionStatus } from "@prisma/client";
import { requireProFeatures } from "../middleware/credit-check.middleware";
import { logger } from "../logger";

const router = Router();

/**
 * 🎯 SUBSCRIPTION API ROUTES
 * Handles Pro plan subscriptions and billing operations
 */

// ============================================================================
// GET SUBSCRIPTION INFORMATION
// ============================================================================

/**
 * GET /api/subscriptions - Get user's subscription details
 */
router.get("/", async (req: any, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to view subscription",
      });
    }

    logger.info(`📋 Getting subscription for user: ${userId}`);

    const subscription = await subscriptionService.getUserSubscription(userId);

    if (!subscription) {
      return res.json({
        success: true,
        data: {
          planType: PlanType.FREE,
          status: null,
          message: "No active subscription found",
        },
      });
    }

    res.json({
      success: true,
      data: {
        id: subscription.id,
        planType: subscription.planType,
        billingCycle: subscription.billingCycle,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
    });
  } catch (error) {
    logger.error(
      `❌ Error getting subscription: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    res.status(500).json({
      error: "Failed to get subscription",
      message: "Unable to retrieve subscription information at this time",
    });
  }
});

/**
 * GET /api/subscriptions/history - Get user's subscription history
 */
router.get("/history", async (req: any, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to view subscription history",
      });
    }

    logger.info(`📋 Getting subscription history for user: ${userId}`);

    const history = await subscriptionService.getSubscriptionHistory(userId);

    res.json({
      success: true,
      data: {
        subscriptions: history,
        count: history.length,
      },
    });
  } catch (error) {
    logger.error(
      `❌ Error getting subscription history: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    res.status(500).json({
      error: "Failed to get subscription history",
      message: "Unable to retrieve subscription history at this time",
    });
  }
});

/**
 * GET /api/subscriptions/pro-status - Check if user has active Pro subscription
 */
router.get("/pro-status", async (req: any, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to check Pro status",
      });
    }

    logger.info(`🔍 Checking Pro status for user: ${userId}`);

    const hasProSubscription = await subscriptionService.hasActiveProSubscription(userId);
    const isEligibleForProFeatures = await subscriptionService.isEligibleForProFeatures(userId);

    res.json({
      success: true,
      data: {
        hasProSubscription,
        isEligibleForProFeatures,
        planType: hasProSubscription ? PlanType.PRO : PlanType.FREE,
      },
    });
  } catch (error) {
    logger.error(
      `❌ Error checking Pro status: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    res.status(500).json({
      error: "Failed to check Pro status",
      message: "Unable to check Pro status at this time",
    });
  }
});

// ============================================================================
// SUBSCRIPTION OPERATIONS
// ============================================================================

/**
 * POST /api/subscriptions/create - Create a new subscription
 */
router.post("/create", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { planType, billingCycle, stripeSubscriptionId, stripeCustomerId } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to create a subscription",
      });
    }

    if (!planType || !billingCycle || !stripeSubscriptionId || !stripeCustomerId) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Plan type, billing cycle, and Stripe IDs are required",
      });
    }

    logger.info(`🆕 Creating ${planType} subscription for user: ${userId}`);

    const subscription = await subscriptionService.createSubscription(
      userId,
      planType as PlanType,
      billingCycle as BillingCycle,
      stripeSubscriptionId,
      stripeCustomerId,
    );

    res.json({
      success: true,
      message: "Subscription created successfully",
      data: {
        id: subscription.id,
        planType: subscription.planType,
        billingCycle: subscription.billingCycle,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    logger.error(
      `❌ Error creating subscription: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    res.status(500).json({
      error: "Failed to create subscription",
      message:
        error instanceof Error ? error.message : "Unable to create subscription at this time",
    });
  }
});

/**
 * POST /api/subscriptions/cancel - Cancel subscription
 */
router.post("/cancel", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { cancelAtPeriodEnd = true } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to cancel subscription",
      });
    }

    logger.info(`🚫 Canceling subscription for user: ${userId}`);

    await subscriptionService.cancelSubscription(userId, cancelAtPeriodEnd);

    res.json({
      success: true,
      message: cancelAtPeriodEnd
        ? "Subscription will be canceled at the end of the current billing period"
        : "Subscription canceled immediately",
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

/**
 * POST /api/subscriptions/update-status - Update subscription status (webhook)
 */
router.post("/update-status", async (req: any, res) => {
  try {
    const { stripeSubscriptionId, status, metadata } = req.body;

    if (!stripeSubscriptionId || !status) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Stripe subscription ID and status are required",
      });
    }

    logger.info(`🔄 Updating subscription status: ${stripeSubscriptionId} -> ${status}`);

    const updatedSubscription = await subscriptionService.updateSubscriptionStatus(
      stripeSubscriptionId,
      status as SubscriptionStatus,
      metadata,
    );

    if (!updatedSubscription) {
      return res.status(404).json({
        error: "Subscription not found",
        message: "No subscription found with the provided ID",
      });
    }

    res.json({
      success: true,
      message: "Subscription status updated successfully",
      data: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        userId: updatedSubscription.userId,
      },
    });
  } catch (error) {
    logger.error(
      `❌ Error updating subscription status: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    res.status(500).json({
      error: "Failed to update subscription status",
      message: "Unable to update subscription status at this time",
    });
  }
});

// ============================================================================
// PRO FEATURE ENDPOINTS
// ============================================================================

/**
 * GET /api/subscriptions/pro-features - Get Pro features list (requires Pro)
 */
router.get("/pro-features", requireProFeatures, async (req: any, res) => {
  try {
    const userId = req.user?.id;

    logger.info(`💎 Getting Pro features for user: ${userId}`);

    const proFeatures = [
      {
        name: "Advanced Analytics",
        description: "Detailed performance metrics and insights",
        enabled: true,
      },
      {
        name: "Priority Support",
        description: "24/7 priority customer support",
        enabled: true,
      },
      {
        name: "Custom Strategies",
        description: "Create and customize your own trading strategies",
        enabled: true,
      },
      {
        name: "API Access",
        description: "Full API access for integrations",
        enabled: true,
      },
      {
        name: "Real-time Data",
        description: "Live market data and instant notifications",
        enabled: true,
      },
    ];

    res.json({
      success: true,
      data: {
        features: proFeatures,
        planType: PlanType.PRO,
      },
    });
  } catch (error) {
    logger.error(
      `❌ Error getting Pro features: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    res.status(500).json({
      error: "Failed to get Pro features",
      message: "Unable to retrieve Pro features at this time",
    });
  }
});

// ============================================================================
// ADMIN/WEBHOOK ENDPOINTS
// ============================================================================

/**
 * POST /api/subscriptions/process-renewal - Process subscription renewal
 */
router.post("/process-renewal", async (req: any, res) => {
  try {
    const { stripeSubscriptionId } = req.body;

    if (!stripeSubscriptionId) {
      return res.status(400).json({
        error: "Missing required field",
        message: "Stripe subscription ID is required",
      });
    }

    logger.info(`🔄 Processing renewal for subscription: ${stripeSubscriptionId}`);

    await subscriptionService.processRenewal(stripeSubscriptionId);

    res.json({
      success: true,
      message: "Subscription renewal processed successfully",
    });
  } catch (error) {
    logger.error(
      `❌ Error processing renewal: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    res.status(500).json({
      error: "Failed to process renewal",
      message: "Unable to process subscription renewal at this time",
    });
  }
});

/**
 * GET /api/subscriptions/metrics - Get subscription metrics (admin)
 */
router.get("/metrics", async (req: any, res) => {
  try {
    // TODO: Add admin authentication middleware
    logger.info(`📊 Getting subscription metrics`);

    const metrics = await subscriptionService.getSubscriptionMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error(
      `❌ Error getting subscription metrics: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    res.status(500).json({
      error: "Failed to get subscription metrics",
      message: "Unable to retrieve subscription metrics at this time",
    });
  }
});

export default router;
