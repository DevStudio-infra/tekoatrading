import { prisma } from "../prisma";
import { logger } from "../logger";
import { PlanType, SubscriptionStatus, BillingCycle, UserSubscription } from "@prisma/client";
import { creditService } from "./credit-management.service";

/**
 * 🎯 SUBSCRIPTION MANAGEMENT SERVICE
 * Handles Pro plan subscriptions, billing cycles, and Stripe integration
 */
export class SubscriptionManagementService {
  // ============================================================================
  // CORE SUBSCRIPTION OPERATIONS
  // ============================================================================

  /**
   * Get user's subscription details
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      logger.info(`📋 Getting subscription for user: ${userId}`);

      const subscription = await prisma.userSubscription.findUnique({
        where: { userId },
        include: { user: true },
      });

      return subscription;
    } catch (error) {
      logger.error(
        `❌ Error getting subscription: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Create a new Pro subscription
   */
  async createSubscription(
    userId: string,
    planType: PlanType,
    billingCycle: BillingCycle,
    stripeSubscriptionId: string,
    stripeCustomerId: string,
  ): Promise<UserSubscription> {
    try {
      logger.info(`🆕 Creating ${planType} subscription for user: ${userId}`);

      const subscription = await prisma.userSubscription.create({
        data: {
          userId,
          planType,
          billingCycle,
          status: SubscriptionStatus.ACTIVE,
          stripeSubscriptionId,
          stripeCustomerId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: this.calculateNextBillingDate(billingCycle),
        },
        include: { user: true },
      });

      // Allocate Pro credits if it's a Pro plan
      if (planType === PlanType.PRO) {
        await creditService.allocateProCredits(userId);
      }

      logger.info(`✅ Created ${planType} subscription for user: ${userId}`);
      return subscription;
    } catch (error) {
      logger.error(
        `❌ Error creating subscription: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Update subscription status (from Stripe webhooks)
   */
  async updateSubscriptionStatus(
    stripeSubscriptionId: string,
    status: SubscriptionStatus,
    metadata?: any,
  ): Promise<UserSubscription | null> {
    try {
      logger.info(`🔄 Updating subscription status: ${stripeSubscriptionId} -> ${status}`);

      const subscription = await prisma.userSubscription.findUnique({
        where: { stripeSubscriptionId },
        include: { user: true },
      });

      if (!subscription) {
        logger.error(`❌ Subscription not found: ${stripeSubscriptionId}`);
        return null;
      }

      const updatedSubscription = await prisma.userSubscription.update({
        where: { stripeSubscriptionId },
        data: {
          status,
          ...metadata,
        },
        include: { user: true },
      });

      // Handle status changes
      await this.handleStatusChange(subscription.userId, status);

      logger.info(`✅ Updated subscription status for user: ${subscription.userId}`);
      return updatedSubscription;
    } catch (error) {
      logger.error(
        `❌ Error updating subscription: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string, cancelAtPeriodEnd: boolean = true): Promise<void> {
    try {
      logger.info(`🚫 Canceling subscription for user: ${userId}`);

      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        throw new Error(`No subscription found for user: ${userId}`);
      }

      const updateData: any = {
        status: cancelAtPeriodEnd ? SubscriptionStatus.CANCELED : SubscriptionStatus.INCOMPLETE,
      };

      if (cancelAtPeriodEnd) {
        updateData.cancelAtPeriodEnd = true;
      }

      await prisma.userSubscription.update({
        where: { userId },
        data: updateData,
      });

      logger.info(`✅ Canceled subscription for user: ${userId}`);
    } catch (error) {
      logger.error(
        `❌ Error canceling subscription: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Check if user has active Pro subscription
   */
  async hasActiveProSubscription(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      return (
        subscription?.planType === PlanType.PRO &&
        subscription?.status === SubscriptionStatus.ACTIVE
      );
    } catch (error) {
      logger.error(
        `❌ Error checking Pro subscription: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return false;
    }
  }

  // ============================================================================
  // BILLING MANAGEMENT
  // ============================================================================

  /**
   * Process subscription renewal
   */
  async processRenewal(stripeSubscriptionId: string): Promise<void> {
    try {
      logger.info(`🔄 Processing renewal for subscription: ${stripeSubscriptionId}`);

      const subscription = await prisma.userSubscription.findUnique({
        where: { stripeSubscriptionId },
        include: { user: true },
      });

      if (!subscription) {
        throw new Error(`Subscription not found: ${stripeSubscriptionId}`);
      }

      // Update billing period
      await prisma.userSubscription.update({
        where: { stripeSubscriptionId },
        data: {
          currentPeriodStart: new Date(),
          currentPeriodEnd: this.calculateNextBillingDate(subscription.billingCycle),
        },
      });

      // Allocate Pro credits for new billing cycle
      if (subscription.planType === PlanType.PRO) {
        await creditService.allocateProCredits(subscription.userId);
      }

      logger.info(`✅ Processed renewal for user: ${subscription.userId}`);
    } catch (error) {
      logger.error(
        `❌ Error processing renewal: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Get subscriptions needing renewal
   */
  async getSubscriptionsNeedingRenewal(): Promise<UserSubscription[]> {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const subscriptions = await prisma.userSubscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: { lte: tomorrow },
        },
        include: { user: true },
      });

      return subscriptions;
    } catch (error) {
      logger.error(
        `❌ Error getting subscriptions needing renewal: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Calculate subscription metrics
   */
  async getSubscriptionMetrics(): Promise<any> {
    try {
      const [activeSubscriptions, canceledSubscriptions, proSubscriptions] = await Promise.all([
        prisma.userSubscription.count({
          where: { status: SubscriptionStatus.ACTIVE },
        }),
        prisma.userSubscription.count({
          where: { status: SubscriptionStatus.CANCELED },
        }),
        prisma.userSubscription.count({
          where: {
            status: SubscriptionStatus.ACTIVE,
            planType: PlanType.PRO,
          },
        }),
      ]);

      // Calculate revenue manually since we don't store pricePerMonth
      const monthlyRevenue = proSubscriptions * 19.99; // Base Pro price

      return {
        active: activeSubscriptions,
        canceled: canceledSubscriptions,
        monthlyRevenue,
        conversionRate:
          activeSubscriptions > 0
            ? Math.round(
                (activeSubscriptions / (activeSubscriptions + canceledSubscriptions)) * 100,
              )
            : 0,
      };
    } catch (error) {
      logger.error(
        `❌ Error getting subscription metrics: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Calculate next billing date based on billing cycle
   */
  private calculateNextBillingDate(billingCycle: BillingCycle): Date {
    const now = new Date();

    if (billingCycle === BillingCycle.MONTHLY) {
      now.setMonth(now.getMonth() + 1);
    } else if (billingCycle === BillingCycle.YEARLY) {
      now.setFullYear(now.getFullYear() + 1);
    }

    return now;
  }

  /**
   * Get price per month based on plan and billing cycle
   */
  private getPricePerMonth(planType: PlanType, billingCycle: BillingCycle): number {
    if (planType === PlanType.FREE) return 0;

    if (planType === PlanType.PRO) {
      if (billingCycle === BillingCycle.MONTHLY) {
        return 19.99;
      } else if (billingCycle === BillingCycle.YEARLY) {
        return 16.99; // $203.89 / 12 months = $16.99/month (15% discount)
      }
    }

    return 0;
  }

  /**
   * Handle subscription status changes
   */
  private async handleStatusChange(userId: string, status: SubscriptionStatus): Promise<void> {
    try {
      logger.info(`🔄 Handling status change for user ${userId}: ${status}`);

      switch (status) {
        case SubscriptionStatus.ACTIVE:
          // User upgraded to Pro - allocate credits
          await creditService.allocateProCredits(userId);
          break;

        case SubscriptionStatus.CANCELED:
        case SubscriptionStatus.INCOMPLETE:
          // User canceled Pro - they'll revert to free plan limitations
          logger.info(`📉 User ${userId} subscription ended, reverting to free plan`);
          break;

        case SubscriptionStatus.PAST_DUE:
          // Handle payment failure
          logger.warn(`⚠️ Payment failed for user ${userId}`);
          break;
      }
    } catch (error) {
      logger.error(
        `❌ Error handling status change: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get subscription history for a user
   */
  async getSubscriptionHistory(userId: string): Promise<any[]> {
    try {
      // This would typically integrate with Stripe to get full billing history
      // For now, return basic subscription info
      const subscription = await this.getUserSubscription(userId);

      if (!subscription) {
        return [];
      }

      return [
        {
          id: subscription.id,
          planType: subscription.planType,
          billingCycle: subscription.billingCycle,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          createdAt: subscription.createdAt,
        },
      ];
    } catch (error) {
      logger.error(
        `❌ Error getting subscription history: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Check if user is eligible for Pro features
   */
  async isEligibleForProFeatures(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      return (
        subscription?.planType === PlanType.PRO &&
        subscription?.status === SubscriptionStatus.ACTIVE
      );
    } catch (error) {
      logger.error(
        `❌ Error checking Pro eligibility: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return false;
    }
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionManagementService();
