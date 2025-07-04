import { prisma } from "../prisma";
import { logger } from "../logger";
import { PlanType, TransactionType, UserCredits, CreditTransaction } from "@prisma/client";

/**
 * 💰 CREDIT MANAGEMENT SERVICE
 * Handles all credit operations, monthly resets, and credit validation
 */
export class CreditManagementService {
  // ============================================================================
  // CORE CREDIT OPERATIONS
  // ============================================================================

  /**
   * Get user's current credit balance and details
   */
  async getUserCredits(userId: string): Promise<UserCredits | null> {
    try {
      logger.info(`📊 Getting credits for user: ${userId}`);

      let credits = await prisma.userCredits.findUnique({
        where: { userId },
        include: { user: true },
      });

      // Initialize credits for new users
      if (!credits) {
        logger.info(`🆕 Initializing credits for new user: ${userId}`);
        const newCredits = await this.initializeUserCredits(userId);
        return newCredits;
      }

      // Check if monthly reset is needed for free users
      if (await this.isMonthlyResetNeeded(credits)) {
        const resetCredits = await this.resetMonthlyCredits(userId);
        return resetCredits;
      }

      return credits;
    } catch (error) {
      logger.error(
        `❌ Error getting user credits: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Deduct credits from user account with validation
   */
  async deductCredits(
    userId: string,
    amount: number,
    description: string,
    evaluationId?: string,
  ): Promise<boolean> {
    try {
      logger.info(`💳 Deducting ${amount} credit(s) for user: ${userId}`);

      const credits = await this.getUserCredits(userId);
      if (!credits) {
        logger.error(`❌ No credits found for user: ${userId}`);
        return false;
      }

      if (credits.totalCredits < amount) {
        logger.warn(
          `⚠️ Insufficient credits for user ${userId}: has ${credits.totalCredits}, needs ${amount}`,
        );
        return false;
      }

      // Deduct credits and log transaction
      const updatedCredits = await prisma.userCredits.update({
        where: { userId },
        data: {
          totalCredits: credits.totalCredits - amount,
          creditsUsed: credits.creditsUsed + amount,
        },
      });

      // Log the transaction
      await this.logTransaction(
        userId,
        TransactionType.USED,
        -amount,
        updatedCredits.totalCredits,
        description,
        evaluationId,
      );

      logger.info(
        `✅ Successfully deducted ${amount} credit(s). Remaining: ${updatedCredits.totalCredits}`,
      );
      return true;
    } catch (error) {
      logger.error(
        `❌ Error deducting credits: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Add credits to user account
   */
  async addCredits(
    userId: string,
    amount: number,
    type: TransactionType,
    description?: string,
    paymentIntentId?: string,
  ): Promise<void> {
    try {
      logger.info(`💰 Adding ${amount} credit(s) to user: ${userId} (type: ${type})`);

      const credits = await this.getUserCredits(userId);
      if (!credits) {
        throw new Error(`No credits record found for user: ${userId}`);
      }

      const updateData: any = {
        totalCredits: credits.totalCredits + amount,
      };

      // Track different types of credits
      if (type === TransactionType.EARNED) {
        updateData.monthlyCredits = credits.monthlyCredits + amount;
      } else if (type === TransactionType.PURCHASED) {
        updateData.purchasedCredits = credits.purchasedCredits + amount;
      }

      const updatedCredits = await prisma.userCredits.update({
        where: { userId },
        data: updateData,
      });

      // Log the transaction
      await this.logTransaction(
        userId,
        type,
        amount,
        updatedCredits.totalCredits,
        description || `Added ${amount} credits (${type})`,
        undefined,
        paymentIntentId,
      );

      logger.info(
        `✅ Successfully added ${amount} credit(s). New total: ${updatedCredits.totalCredits}`,
      );
    } catch (error) {
      logger.error(
        `❌ Error adding credits: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Check if user can afford a specific number of credits
   */
  async canAffordEvaluation(userId: string, requiredCredits: number = 1): Promise<boolean> {
    try {
      const credits = await this.getUserCredits(userId);
      return credits ? credits.totalCredits >= requiredCredits : false;
    } catch (error) {
      logger.error(
        `❌ Error checking credit affordability: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return false;
    }
  }

  // ============================================================================
  // MONTHLY CREDIT MANAGEMENT
  // ============================================================================

  /**
   * Reset monthly credits for free users
   */
  async resetMonthlyCredits(userId: string): Promise<UserCredits> {
    try {
      logger.info(`🔄 Resetting monthly credits for user: ${userId}`);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Only reset for free users
      if (user.subscription?.planType === PlanType.PRO) {
        logger.info(`⏭️ Skipping reset for Pro user: ${userId}`);
        return (await this.getUserCredits(userId)) as UserCredits;
      }

      const credits = await this.getUserCredits(userId);
      if (!credits) {
        throw new Error(`Credits not found for user: ${userId}`);
      }

      // Reset monthly credits to 20, keep purchased credits
      const updatedCredits = await prisma.userCredits.update({
        where: { userId },
        data: {
          monthlyCredits: 20,
          totalCredits: 20 + credits.purchasedCredits,
          lastMonthlyReset: new Date(),
        },
      });

      // Log the reset
      await this.logTransaction(
        userId,
        TransactionType.EARNED,
        20,
        updatedCredits.totalCredits,
        "Monthly credit reset (Free plan)",
      );

      logger.info(
        `✅ Reset monthly credits for free user. New total: ${updatedCredits.totalCredits}`,
      );
      return updatedCredits;
    } catch (error) {
      logger.error(
        `❌ Error resetting monthly credits: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Process monthly reset for all eligible users
   */
  async processMonthlyReset(): Promise<void> {
    try {
      logger.info(`🔄 Starting monthly credit reset process`);

      // Find all free users who need a reset
      const usersNeedingReset = await prisma.user.findMany({
        where: {
          OR: [{ subscription: { planType: PlanType.FREE } }, { subscription: null }],
          credits: {
            OR: [
              { lastMonthlyReset: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
              { lastMonthlyReset: null },
            ],
          },
        },
        include: { credits: true, subscription: true },
      });

      logger.info(`📊 Found ${usersNeedingReset.length} users needing monthly reset`);

      for (const user of usersNeedingReset) {
        try {
          await this.resetMonthlyCredits(user.id);
        } catch (error) {
          logger.error(
            `❌ Failed to reset credits for user ${user.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      logger.info(`✅ Monthly credit reset completed`);
    } catch (error) {
      logger.error(
        `❌ Error in monthly reset process: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Allocate Pro plan credits (2000 monthly)
   */
  async allocateProCredits(userId: string): Promise<void> {
    try {
      logger.info(`💎 Allocating Pro credits for user: ${userId}`);

      const credits = await this.getUserCredits(userId);
      if (!credits) {
        throw new Error(`Credits not found for user: ${userId}`);
      }

      // Add 2000 credits for Pro users
      await this.addCredits(userId, 2000, TransactionType.EARNED, "Pro plan monthly allocation");

      logger.info(`✅ Allocated 2000 Pro credits for user: ${userId}`);
    } catch (error) {
      logger.error(
        `❌ Error allocating Pro credits: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  // ============================================================================
  // CREDIT PURCHASE
  // ============================================================================

  /**
   * Purchase credits for a user
   */
  async purchaseCredits(userId: string, packageId: string, paymentIntentId: string): Promise<void> {
    try {
      logger.info(`💳 Processing credit purchase for user: ${userId}, package: ${packageId}`);

      const creditPackage = await prisma.creditPackage.findUnique({
        where: { id: packageId },
      });

      if (!creditPackage || !creditPackage.isActive) {
        throw new Error(`Invalid or inactive credit package: ${packageId}`);
      }

      // Add purchased credits
      await this.addCredits(
        userId,
        creditPackage.credits,
        TransactionType.PURCHASED,
        `Purchased ${creditPackage.name}`,
        paymentIntentId,
      );

      logger.info(`✅ Successfully processed credit purchase: ${creditPackage.credits} credits`);
    } catch (error) {
      logger.error(
        `❌ Error purchasing credits: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Initialize credits for a new user
   */
  private async initializeUserCredits(userId: string): Promise<UserCredits> {
    try {
      const credits = await prisma.userCredits.create({
        data: {
          userId,
          totalCredits: 20,
          monthlyCredits: 20,
          purchasedCredits: 0,
          creditsUsed: 0,
          lastMonthlyReset: new Date(),
        },
        include: { user: true },
      });

      // Log the initialization
      await this.logTransaction(
        userId,
        TransactionType.EARNED,
        20,
        20,
        "Initial credit allocation (Free plan)",
      );

      logger.info(`✅ Initialized credits for user: ${userId}`);
      return credits;
    } catch (error) {
      logger.error(
        `❌ Error initializing user credits: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Check if monthly reset is needed
   */
  private async isMonthlyResetNeeded(credits: UserCredits): Promise<boolean> {
    if (!credits.lastMonthlyReset) return true;

    const lastReset = new Date(credits.lastMonthlyReset);
    const now = new Date();
    const daysSinceReset = Math.floor(
      (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24),
    );

    return daysSinceReset >= 30;
  }

  /**
   * Log a credit transaction
   */
  private async logTransaction(
    userId: string,
    type: TransactionType,
    amount: number,
    remainingBalance: number,
    description: string,
    evaluationId?: string,
    paymentIntentId?: string,
  ): Promise<CreditTransaction> {
    return await prisma.creditTransaction.create({
      data: {
        userId,
        transactionType: type,
        amount,
        remainingBalance,
        description,
        evaluationId,
        stripePaymentIntentId: paymentIntentId,
      },
    });
  }

  /**
   * Get credit transaction history for a user
   */
  async getCreditHistory(userId: string, limit: number = 50): Promise<CreditTransaction[]> {
    try {
      return await prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    } catch (error) {
      logger.error(
        `❌ Error getting credit history: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Get credit statistics for analytics
   */
  async getCreditStatistics(userId: string): Promise<any> {
    try {
      const credits = await this.getUserCredits(userId);
      const history = await this.getCreditHistory(userId, 100);

      const stats = {
        current: credits,
        usage: {
          totalUsed: credits?.creditsUsed || 0,
          thisMonth: history
            .filter(
              (t) =>
                t.transactionType === TransactionType.USED &&
                t.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            )
            .reduce((sum, t) => sum + Math.abs(t.amount), 0),
          averagePerDay: 0,
        },
        transactions: history.slice(0, 10), // Last 10 transactions
      };

      // Calculate average usage per day
      const usageHistory = history.filter((t) => t.transactionType === TransactionType.USED);
      if (usageHistory.length > 0) {
        const oldestUsage = usageHistory[usageHistory.length - 1];
        const daysSinceFirst = Math.max(
          1,
          Math.floor((Date.now() - oldestUsage.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        );
        stats.usage.averagePerDay =
          Math.round((stats.usage.totalUsed / daysSinceFirst) * 100) / 100;
      }

      return stats;
    } catch (error) {
      logger.error(
        `❌ Error getting credit statistics: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }
}

// Export singleton instance
export const creditService = new CreditManagementService();
