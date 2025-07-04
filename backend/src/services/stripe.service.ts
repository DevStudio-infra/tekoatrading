import Stripe from "stripe";
import { prisma } from "../prisma";
import { logger } from "../logger";
import { subscriptionService } from "./subscription-management.service";
import { creditService } from "./credit-management.service";
import { PlanType, BillingCycle, SubscriptionStatus, TransactionType } from "@prisma/client";

/**
 * 🔗 STRIPE INTEGRATION SERVICE
 * Handles all Stripe operations for payments and subscriptions
 */
export class StripeService {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required");
    }

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  // ============================================================================
  // CUSTOMER MANAGEMENT
  // ============================================================================

  /**
   * Create or retrieve Stripe customer
   */
  async createOrGetCustomer(userId: string, email: string, name?: string): Promise<string> {
    try {
      logger.info(`👤 Creating/getting Stripe customer for user: ${userId}`);

      // Check if user already has a Stripe customer ID
      const existingSubscription = await subscriptionService.getUserSubscription(userId);
      if (existingSubscription?.stripeCustomerId) {
        return existingSubscription.stripeCustomerId;
      }

      // Create new Stripe customer
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          userId,
        },
      });

      logger.info(`✅ Created Stripe customer: ${customer.id} for user: ${userId}`);
      return customer.id;
    } catch (error) {
      logger.error(
        `❌ Error creating Stripe customer: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================================================

  /**
   * Create Pro subscription checkout session
   */
  async createProSubscriptionCheckout(
    userId: string,
    email: string,
    billingCycle: BillingCycle = BillingCycle.MONTHLY,
    successUrl: string,
    cancelUrl: string,
  ): Promise<string> {
    try {
      logger.info(`🛒 Creating Pro subscription checkout for user: ${userId}`);

      const customerId = await this.createOrGetCustomer(userId, email);

      // Get the appropriate price ID based on billing cycle
      const priceId =
        billingCycle === BillingCycle.MONTHLY
          ? process.env.STRIPE_PRO_MONTHLY_PRICE_ID
          : process.env.STRIPE_PRO_YEARLY_PRICE_ID;

      if (!priceId) {
        throw new Error(`Stripe price ID not configured for ${billingCycle} billing`);
      }

      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          planType: PlanType.PRO,
          billingCycle,
        },
      });

      logger.info(`✅ Created checkout session: ${session.id}`);
      return session.url!;
    } catch (error) {
      logger.error(
        `❌ Error creating subscription checkout: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    stripeSubscriptionId: string,
    immediately: boolean = false,
  ): Promise<void> {
    try {
      logger.info(`🚫 Canceling Stripe subscription: ${stripeSubscriptionId}`);

      if (immediately) {
        await this.stripe.subscriptions.cancel(stripeSubscriptionId);
      } else {
        await this.stripe.subscriptions.update(stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      }

      logger.info(`✅ Canceled subscription: ${stripeSubscriptionId}`);
    } catch (error) {
      logger.error(
        `❌ Error canceling subscription: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  // ============================================================================
  // CREDIT PURCHASE PAYMENTS
  // ============================================================================

  /**
   * Create payment intent for dynamic credit purchase
   */
  async createCreditPayment(
    userId: string,
    creditAmount: number,
    email: string,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      logger.info(`💳 Creating credit payment for user: ${userId}, credits: ${creditAmount}`);

      // Validate credit amount
      if (creditAmount < 50 || creditAmount > 5000) {
        throw new Error(`Invalid credit amount: ${creditAmount}. Must be between 50 and 5000.`);
      }

      // Get user's subscription type to determine pricing
      const subscription = await subscriptionService.getUserSubscription(userId);
      const userType = subscription?.planType || PlanType.FREE;

      // Calculate price based on subscription type
      const pricePerCredit = userType === PlanType.PRO ? 0.01 : 0.05; // Pro users get 5x discount
      const totalPrice = creditAmount * pricePerCredit;
      const priceCents = Math.round(totalPrice * 100); // Convert to cents

      logger.info(
        `💰 Credit pricing: ${creditAmount} credits × $${pricePerCredit} = $${totalPrice.toFixed(2)} (${userType} user)`,
      );

      const customerId = await this.createOrGetCustomer(userId, email);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: priceCents,
        currency: "usd",
        customer: customerId,
        metadata: {
          userId,
          creditAmount: creditAmount.toString(),
          userType,
          pricePerCredit: pricePerCredit.toString(),
          type: "credit_purchase",
        },
      });

      logger.info(
        `✅ Created payment intent: ${paymentIntent.id} for ${creditAmount} credits ($${totalPrice.toFixed(2)})`,
      );

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      logger.error(
        `❌ Error creating credit payment: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  // ============================================================================
  // WEBHOOK HANDLERS
  // ============================================================================

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(eventType: string, data: any): Promise<void> {
    try {
      logger.info(`🔗 Handling Stripe webhook: ${eventType}`);

      switch (eventType) {
        case "checkout.session.completed":
          await this.handleCheckoutCompleted(data);
          break;

        case "customer.subscription.created":
          await this.handleSubscriptionCreated(data);
          break;

        case "customer.subscription.updated":
          await this.handleSubscriptionUpdated(data);
          break;

        case "customer.subscription.deleted":
          await this.handleSubscriptionDeleted(data);
          break;

        case "invoice.payment_succeeded":
          await this.handlePaymentSucceeded(data);
          break;

        case "invoice.payment_failed":
          await this.handlePaymentFailed(data);
          break;

        case "payment_intent.succeeded":
          await this.handlePaymentIntentSucceeded(data);
          break;

        default:
          logger.info(`⚠️ Unhandled webhook event: ${eventType}`);
      }
    } catch (error) {
      logger.error(
        `❌ Error handling webhook: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Handle successful checkout session
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    try {
      const userId = session.metadata?.userId;
      if (!userId) {
        logger.error("❌ No userId in checkout session metadata");
        return;
      }

      logger.info(`✅ Checkout completed for user: ${userId}`);

      // The subscription will be handled by subscription.created webhook
      if (session.mode === "subscription") {
        logger.info("📋 Subscription checkout - waiting for subscription.created webhook");
        return;
      }
    } catch (error) {
      logger.error(
        `❌ Error handling checkout completion: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Handle subscription creation
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    try {
      const userId = subscription.metadata?.userId;
      const planType = subscription.metadata?.planType as PlanType;
      const billingCycle = subscription.metadata?.billingCycle as BillingCycle;

      if (!userId || !planType || !billingCycle) {
        logger.error("❌ Missing metadata in subscription creation");
        return;
      }

      logger.info(`🆕 Creating subscription for user: ${userId}`);

      await subscriptionService.createSubscription(
        userId,
        planType,
        billingCycle,
        subscription.id,
        subscription.customer as string,
      );

      logger.info(`✅ Successfully created subscription for user: ${userId}`);
    } catch (error) {
      logger.error(
        `❌ Error handling subscription creation: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Handle subscription updates
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      logger.info(`🔄 Updating subscription: ${subscription.id}`);

      const status = this.mapStripeStatusToInternal(subscription.status);

      await subscriptionService.updateSubscriptionStatus(subscription.id, status, {
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });

      logger.info(`✅ Updated subscription status: ${subscription.id} -> ${status}`);
    } catch (error) {
      logger.error(
        `❌ Error handling subscription update: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Handle subscription deletion
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    try {
      logger.info(`🗑️ Handling subscription deletion: ${subscription.id}`);

      await subscriptionService.updateSubscriptionStatus(
        subscription.id,
        SubscriptionStatus.CANCELED,
      );

      logger.info(`✅ Marked subscription as canceled: ${subscription.id}`);
    } catch (error) {
      logger.error(
        `❌ Error handling subscription deletion: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    try {
      if (invoice.subscription) {
        logger.info(`💰 Payment succeeded for subscription: ${invoice.subscription}`);

        // Process subscription renewal
        await subscriptionService.processRenewal(invoice.subscription as string);
      }
    } catch (error) {
      logger.error(
        `❌ Error handling payment success: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      if (invoice.subscription) {
        logger.warn(`💸 Payment failed for subscription: ${invoice.subscription}`);

        // Update subscription status to past due
        await subscriptionService.updateSubscriptionStatus(
          invoice.subscription as string,
          SubscriptionStatus.PAST_DUE,
        );
      }
    } catch (error) {
      logger.error(
        `❌ Error handling payment failure: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Handle successful payment intent (for credit purchases)
   */
  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      const { userId, creditAmount, type } = paymentIntent.metadata;

      if (type === "credit_purchase" && userId && creditAmount) {
        logger.info(`💳 Processing credit purchase for user: ${userId}, credits: ${creditAmount}`);

        const credits = parseInt(creditAmount, 10);

        // Add credits to user account
        await creditService.addCredits(
          userId,
          credits,
          TransactionType.PURCHASED,
          `Purchased ${credits} credits`,
          paymentIntent.id,
        );

        logger.info(
          `✅ Successfully processed credit purchase: ${credits} credits for user: ${userId}`,
        );
      }
    } catch (error) {
      logger.error(
        `❌ Error handling payment intent success: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Map Stripe subscription status to internal status
   */
  private mapStripeStatusToInternal(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
      case "active":
        return SubscriptionStatus.ACTIVE;
      case "canceled":
        return SubscriptionStatus.CANCELED;
      case "past_due":
        return SubscriptionStatus.PAST_DUE;
      case "incomplete":
      case "incomplete_expired":
        return SubscriptionStatus.INCOMPLETE;
      default:
        return SubscriptionStatus.INCOMPLETE;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    }

    return this.stripe.webhooks.constructEvent(payload, signature, endpointSecret);
  }

  /**
   * Get credit pricing information for frontend
   */
  getCreditPricing(userType: PlanType = PlanType.FREE): any {
    const pricePerCredit = userType === PlanType.PRO ? 0.01 : 0.05;

    return {
      userType,
      pricePerCredit,
      minCredits: 50,
      maxCredits: 5000,
      examples: [
        { credits: 50, price: (50 * pricePerCredit).toFixed(2) },
        { credits: 100, price: (100 * pricePerCredit).toFixed(2) },
        { credits: 500, price: (500 * pricePerCredit).toFixed(2) },
        { credits: 1000, price: (1000 * pricePerCredit).toFixed(2) },
        { credits: 5000, price: (5000 * pricePerCredit).toFixed(2) },
      ],
    };
  }
}

// Export singleton instance
export const stripeService = new StripeService();
