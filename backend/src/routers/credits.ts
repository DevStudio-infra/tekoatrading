import { Router } from "express";
import { creditService } from "../services/credit-management.service";
import { addCreditInfo } from "../middleware/credit-check.middleware";
import { logger } from "../logger";

const router = Router();

/**
 * 💰 CREDITS API ROUTES
 * Handles credit balance, history, and management operations
 */

// ============================================================================
// GET CREDIT INFORMATION
// ============================================================================

/**
 * GET /api/credits - Get user's current credit balance
 */
router.get("/", addCreditInfo, async (req: any, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to view credits",
      });
    }

    logger.info(`📊 Getting credits for user: ${userId}`);

    const credits = await creditService.getUserCredits(userId);

    if (!credits) {
      return res.status(404).json({
        error: "Credits not found",
        message: "No credit information found for this user",
      });
    }

    res.json({
      success: true,
      data: {
        totalCredits: credits.totalCredits,
        monthlyCredits: credits.monthlyCredits,
        purchasedCredits: credits.purchasedCredits,
        creditsUsed: credits.creditsUsed,
        lastMonthlyReset: credits.lastMonthlyReset,
      },
    });
  } catch (error) {
    logger.error(
      `❌ Error getting credits: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    res.status(500).json({
      error: "Failed to get credits",
      message: "Unable to retrieve credit information at this time",
    });
  }
});

/**
 * GET /api/credits/history - Get user's credit transaction history
 */
router.get("/history", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to view credit history",
      });
    }

    logger.info(`📋 Getting credit history for user: ${userId}`);

    const history = await creditService.getCreditHistory(userId, limit);

    res.json({
      success: true,
      data: {
        transactions: history,
        count: history.length,
      },
    });
  } catch (error) {
    logger.error(
      `❌ Error getting credit history: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    res.status(500).json({
      error: "Failed to get credit history",
      message: "Unable to retrieve credit history at this time",
    });
  }
});

/**
 * GET /api/credits/statistics - Get detailed credit statistics
 */
router.get("/statistics", async (req: any, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to view credit statistics",
      });
    }

    logger.info(`📈 Getting credit statistics for user: ${userId}`);

    const stats = await creditService.getCreditStatistics(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error(
      `❌ Error getting credit statistics: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    res.status(500).json({
      error: "Failed to get credit statistics",
      message: "Unable to retrieve credit statistics at this time",
    });
  }
});

// ============================================================================
// CREDIT OPERATIONS
// ============================================================================

/**
 * POST /api/credits/purchase - Purchase additional credits
 */
router.post("/purchase", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { packageId, paymentIntentId } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to purchase credits",
      });
    }

    if (!packageId || !paymentIntentId) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Package ID and payment intent ID are required",
      });
    }

    logger.info(`💳 Processing credit purchase for user: ${userId}, package: ${packageId}`);

    await creditService.purchaseCredits(userId, packageId, paymentIntentId);

    // Get updated credit balance
    const updatedCredits = await creditService.getUserCredits(userId);

    res.json({
      success: true,
      message: "Credits purchased successfully",
      data: {
        totalCredits: updatedCredits?.totalCredits || 0,
        purchasedCredits: updatedCredits?.purchasedCredits || 0,
      },
    });
  } catch (error) {
    logger.error(
      `❌ Error purchasing credits: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    res.status(500).json({
      error: "Failed to purchase credits",
      message:
        error instanceof Error ? error.message : "Unable to process credit purchase at this time",
    });
  }
});

/**
 * POST /api/credits/check - Check if user can afford specific amount
 */
router.post("/check", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { requiredCredits = 1 } = req.body;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to check credits",
      });
    }

    if (typeof requiredCredits !== "number" || requiredCredits < 1) {
      return res.status(400).json({
        error: "Invalid required credits",
        message: "Required credits must be a positive number",
      });
    }

    logger.info(`🔍 Checking if user ${userId} can afford ${requiredCredits} credits`);

    const canAfford = await creditService.canAffordEvaluation(userId, requiredCredits);
    const currentCredits = await creditService.getUserCredits(userId);

    res.json({
      success: true,
      data: {
        canAfford,
        currentCredits: currentCredits?.totalCredits || 0,
        requiredCredits,
        shortfall: canAfford ? 0 : requiredCredits - (currentCredits?.totalCredits || 0),
      },
    });
  } catch (error) {
    logger.error(
      `❌ Error checking credits: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    res.status(500).json({
      error: "Failed to check credits",
      message: "Unable to check credit availability at this time",
    });
  }
});

// ============================================================================
// ADMIN OPERATIONS (if needed)
// ============================================================================

/**
 * POST /api/credits/reset - Reset monthly credits (admin only)
 */
router.post("/reset", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { targetUserId } = req.body;

    // TODO: Add admin check middleware
    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to reset credits",
      });
    }

    const userIdToReset = targetUserId || userId;
    logger.info(`🔄 Resetting credits for user: ${userIdToReset}`);

    const updatedCredits = await creditService.resetMonthlyCredits(userIdToReset);

    res.json({
      success: true,
      message: "Credits reset successfully",
      data: {
        totalCredits: updatedCredits.totalCredits,
        monthlyCredits: updatedCredits.monthlyCredits,
        lastMonthlyReset: updatedCredits.lastMonthlyReset,
      },
    });
  } catch (error) {
    logger.error(
      `❌ Error resetting credits: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    res.status(500).json({
      error: "Failed to reset credits",
      message: "Unable to reset credits at this time",
    });
  }
});

export default router;
