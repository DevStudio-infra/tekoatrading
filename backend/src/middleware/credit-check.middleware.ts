import { Request, Response, NextFunction } from "express";
import { creditService } from "../services/credit-management.service";
import { logger } from "../logger";

/**
 * 🛡️ CREDIT CHECK MIDDLEWARE
 * Validates if user has sufficient credits before allowing evaluations
 */

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    [key: string]: any;
  };
}

/**
 * Check if user has sufficient credits for evaluation
 */
export const checkCredits = (requiredCredits: number = 1) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user?.id) {
        logger.warn("❌ Credit check failed: User not authenticated");
        return res.status(401).json({
          error: "Authentication required",
          message: "You must be logged in to perform evaluations",
        });
      }

      const userId = req.user.id;
      logger.info(`🔍 Checking credits for user: ${userId} (required: ${requiredCredits})`);

      // Check if user can afford the evaluation
      const canAfford = await creditService.canAffordEvaluation(userId, requiredCredits);

      if (!canAfford) {
        const userCredits = await creditService.getUserCredits(userId);
        const currentCredits = userCredits?.totalCredits || 0;

        logger.warn(
          `⚠️ Insufficient credits: User ${userId} has ${currentCredits}, needs ${requiredCredits}`,
        );

        return res.status(402).json({
          error: "Insufficient credits",
          message: `You need ${requiredCredits} credit${requiredCredits > 1 ? "s" : ""} to perform this evaluation. You currently have ${currentCredits} credit${currentCredits !== 1 ? "s" : ""}.`,
          currentCredits,
          requiredCredits,
          shortfall: requiredCredits - currentCredits,
        });
      }

      // Store required credits in request for later deduction
      req.requiredCredits = requiredCredits;
      logger.info(`✅ Credit check passed for user: ${userId}`);

      next();
    } catch (error) {
      logger.error(
        `❌ Credit check error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return res.status(500).json({
        error: "Credit check failed",
        message: "Unable to verify credits at this time",
      });
    }
  };
};

/**
 * Deduct credits after successful evaluation
 */
export const deductCredits = (description: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const requiredCredits = req.requiredCredits || 1;

      if (!userId) {
        logger.error("❌ Cannot deduct credits: User not authenticated");
        return res.status(401).json({
          error: "Authentication required",
        });
      }

      // Get evaluation ID from response (if available)
      const evaluationId = res.locals.evaluationId;

      // Deduct credits
      const success = await creditService.deductCredits(
        userId,
        requiredCredits,
        description,
        evaluationId,
      );

      if (!success) {
        logger.error(`❌ Failed to deduct credits for user: ${userId}`);
        return res.status(402).json({
          error: "Credit deduction failed",
          message: "Unable to deduct credits after evaluation",
        });
      }

      logger.info(`✅ Successfully deducted ${requiredCredits} credit(s) for user: ${userId}`);
      next();
    } catch (error) {
      logger.error(
        `❌ Credit deduction error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return res.status(500).json({
        error: "Credit deduction failed",
        message: "Unable to deduct credits at this time",
      });
    }
  };
};

/**
 * Middleware to add credit info to user context
 */
export const addCreditInfo = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.user?.id) {
      const credits = await creditService.getUserCredits(req.user.id);
      req.user.credits = credits;
    }
    next();
  } catch (error) {
    logger.error(
      `❌ Error adding credit info: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    next(); // Continue without credit info
  }
};

/**
 * Check if user is eligible for Pro features
 */
export const requireProFeatures = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to access Pro features",
      });
    }

    const { subscriptionService } = await import("../services/subscription-management.service");
    const isEligible = await subscriptionService.isEligibleForProFeatures(req.user.id);

    if (!isEligible) {
      return res.status(403).json({
        error: "Pro subscription required",
        message: "This feature requires a Pro subscription. Please upgrade your account.",
        upgradeUrl: "/pricing",
      });
    }

    next();
  } catch (error) {
    logger.error(
      `❌ Pro feature check error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return res.status(500).json({
      error: "Feature access check failed",
      message: "Unable to verify Pro features at this time",
    });
  }
};

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      requiredCredits?: number;
    }
  }
}
