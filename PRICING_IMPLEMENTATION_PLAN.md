# 🎯 Pricing Implementation Plan

## 📋 Executive Summary

Complete implementation plan for the credit-based pricing system with Free and Pro tiers, Stripe integration, and comprehensive credit management.

### 🎨 Pricing Structure

- **Free Plan**: 20 credits/month (non-cumulative), $0.05 per additional credit
- **Pro Plan**: $19.99/month or $203.89/year (15% discount), 2000 credits/month (cumulative), $0.01 per additional credit
- **Credit Cost**: 1 credit per bot evaluation

---

## 🏗️ Phase 1: Database Schema & Core Infrastructure

### 1.1 Database Schema Updates

#### **User Credits Table**

```sql
CREATE TABLE user_credits (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  total_credits INTEGER NOT NULL DEFAULT 0,
  monthly_credits INTEGER NOT NULL DEFAULT 0,
  purchased_credits INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  last_monthly_reset TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### **Subscription Management Table**

```sql
CREATE TABLE user_subscriptions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  plan_type ENUM('free', 'pro') NOT NULL DEFAULT 'free',
  status ENUM('active', 'canceled', 'past_due', 'incomplete') NOT NULL,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  billing_cycle ENUM('monthly', 'yearly') NOT NULL DEFAULT 'monthly',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### **Credit Transactions Table**

```sql
CREATE TABLE credit_transactions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  transaction_type ENUM('earned', 'purchased', 'used', 'expired') NOT NULL,
  amount INTEGER NOT NULL,
  remaining_balance INTEGER NOT NULL,
  description TEXT,
  evaluation_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### **Credit Packages Table**

```sql
CREATE TABLE credit_packages (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  credits INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  user_type ENUM('free', 'pro') NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default packages
INSERT INTO credit_packages (id, name, credits, price_cents, user_type) VALUES
('free_10', '10 Credits', 10, 500, 'free'),
('free_25', '25 Credits', 25, 1250, 'free'),
('free_50', '50 Credits', 50, 2500, 'free'),
('free_100', '100 Credits', 100, 5000, 'free'),
('pro_100', '100 Credits', 100, 100, 'pro'),
('pro_500', '500 Credits', 500, 500, 'pro'),
('pro_1000', '1000 Credits', 1000, 1000, 'pro'),
('pro_5000', '5000 Credits', 5000, 5000, 'pro');
```

### 1.2 Prisma Schema Updates

```prisma
model UserCredits {
  id                String    @id @default(cuid())
  userId            String    @unique
  totalCredits      Int       @default(0)
  monthlyCredits    Int       @default(0)
  purchasedCredits  Int       @default(0)
  creditsUsed       Int       @default(0)
  lastMonthlyReset  DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_credits")
}

model UserSubscription {
  id                    String    @id @default(cuid())
  userId                String    @unique
  stripeSubscriptionId  String?   @unique
  stripeCustomerId      String?
  planType              PlanType  @default(FREE)
  status                SubscriptionStatus
  currentPeriodStart    DateTime?
  currentPeriodEnd      DateTime?
  cancelAtPeriodEnd     Boolean   @default(false)
  billingCycle          BillingCycle @default(MONTHLY)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_subscriptions")
}

model CreditTransaction {
  id                     String           @id @default(cuid())
  userId                 String
  transactionType        TransactionType
  amount                 Int
  remainingBalance       Int
  description            String?
  evaluationId           String?
  stripePaymentIntentId  String?
  createdAt              DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("credit_transactions")
}

model CreditPackage {
  id        String    @id @default(cuid())
  name      String
  credits   Int
  priceCents Int
  userType  PlanType
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())

  @@map("credit_packages")
}

enum PlanType {
  FREE
  PRO
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  PAST_DUE
  INCOMPLETE
}

enum BillingCycle {
  MONTHLY
  YEARLY
}

enum TransactionType {
  EARNED
  PURCHASED
  USED
  EXPIRED
}
```

---

## 🏗️ Phase 2: Backend Services & API Endpoints

### 2.1 Credit Management Service

#### **File**: `backend/src/services/credit-management.service.ts`

```typescript
export class CreditManagementService {
  // Core credit operations
  async getUserCredits(userId: string): Promise<UserCredits>;
  async deductCredits(userId: string, amount: number, description: string): Promise<boolean>;
  async addCredits(userId: string, amount: number, type: TransactionType): Promise<void>;
  async canAffordEvaluation(userId: string): Promise<boolean>;

  // Monthly reset for free users
  async resetMonthlyCredits(userId: string): Promise<void>;
  async processMonthlyReset(): Promise<void>;

  // Pro user credit allocation
  async allocateProCredits(userId: string): Promise<void>;

  // Credit expiration (free users only)
  async expireUnusedCredits(userId: string): Promise<void>;

  // Credit purchase
  async purchaseCredits(userId: string, packageId: string, paymentIntentId: string): Promise<void>;
}
```

### 2.2 Subscription Management Service

#### **File**: `backend/src/services/subscription-management.service.ts`

```typescript
export class SubscriptionManagementService {
  // Subscription lifecycle
  async createSubscription(userId: string, priceId: string): Promise<Stripe.Subscription>;
  async cancelSubscription(userId: string): Promise<void>;
  async reactivateSubscription(userId: string): Promise<void>;
  async updateSubscription(userId: string, newPriceId: string): Promise<void>;

  // Plan management
  async upgradeToPro(userId: string, billingCycle: BillingCycle): Promise<void>;
  async downgradeToFree(userId: string): Promise<void>;

  // Stripe webhook handling
  async handleStripeWebhook(event: Stripe.Event): Promise<void>;

  // Credit allocation based on subscription
  async allocateSubscriptionCredits(userId: string): Promise<void>;
}
```

### 2.3 API Endpoints

#### **Authentication & Authorization Middleware**

```typescript
// File: backend/src/middleware/credit-check.middleware.ts
export const requireCredits = (requiredCredits: number = 1) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const canAfford = await creditService.canAffordEvaluation(userId);
    if (!canAfford) {
      return res.status(402).json({
        error: "Insufficient credits",
        requiredCredits,
        redirectTo: "/pricing",
      });
    }

    next();
  };
};
```

#### **Credit Routes**

```typescript
// File: backend/src/routes/credits.routes.ts
router.get("/credits", getUserCredits);
router.post("/credits/purchase", purchaseCredits);
router.get("/credits/packages", getCreditPackages);
router.get("/credits/history", getCreditHistory);
```

#### **Subscription Routes**

```typescript
// File: backend/src/routes/subscriptions.routes.ts
router.post("/subscriptions/create", createSubscription);
router.post("/subscriptions/cancel", cancelSubscription);
router.post("/subscriptions/reactivate", reactivateSubscription);
router.get("/subscriptions/status", getSubscriptionStatus);
router.post("/subscriptions/upgrade", upgradeSubscription);
router.post("/subscriptions/downgrade", downgradeSubscription);
```

#### **Modified Bot Evaluation Route**

```typescript
// File: backend/src/routes/evaluations.routes.ts
router.post("/evaluations", requireCredits(1), async (req, res) => {
  try {
    // Deduct credit before evaluation
    await creditService.deductCredits(req.user.id, 1, "Bot evaluation");

    // Run evaluation
    const result = await evaluationService.runEvaluation(req.body);

    res.json(result);
  } catch (error) {
    // If evaluation fails, refund credit
    await creditService.addCredits(req.user.id, 1, TransactionType.EARNED);
    throw error;
  }
});
```

---

## 🏗️ Phase 3: Stripe Integration

### 3.1 Stripe Configuration

#### **File**: `backend/src/config/stripe.config.ts`

```typescript
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export const STRIPE_PRICES = {
  PRO_MONTHLY: "price_pro_monthly_1999", // $19.99/month
  PRO_YEARLY: "price_pro_yearly_20389", // $203.89/year (15% discount)
};

export const STRIPE_PRODUCTS = {
  PRO_SUBSCRIPTION: "prod_pro_subscription",
  CREDITS: "prod_credits",
};
```

### 3.2 Stripe Webhook Handler

#### **File**: `backend/src/routes/stripe-webhook.routes.ts`

```typescript
router.post("/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionCancellation(event.data.object);
        break;
      case "invoice.payment_succeeded":
        await handlePaymentSuccess(event.data.object);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailure(event.data.object);
        break;
      case "payment_intent.succeeded":
        await handleCreditPurchase(event.data.object);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});
```

---

## 🏗️ Phase 4: Frontend Implementation

### 4.1 Pricing Page Component

#### **File**: `frontend/src/app/[locale]/(landing)/pricing/page.tsx`

```typescript
export default function PricingPage() {
  return (
    <div className="pricing-page">
      <PricingHeader />
      <PricingPlans />
      <PricingFAQ />
      <PricingCTA />
    </div>
  );
}
```

#### **File**: `frontend/src/features/pricing/components/pricing-plans.tsx`

```typescript
export function PricingPlans() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      credits: '20 credits/month',
      features: [
        '20 monthly credits (non-cumulative)',
        'All core trading features',
        'Professional AI analysis',
        'Real-time market data',
        'Additional credits: $0.05 each'
      ],
      cta: 'Get Started Free',
      popular: false
    },
    {
      name: 'Pro',
      price: '$19.99',
      credits: '2,000 credits/month',
      features: [
        '2,000 monthly credits (cumulative)',
        'All Free features',
        'Priority support',
        'Advanced analytics',
        'Additional credits: $0.01 each',
        'Credits never expire'
      ],
      cta: 'Start Pro Trial',
      popular: true
    }
  ];

  return (
    <div className="pricing-plans">
      {plans.map((plan) => (
        <PricingCard key={plan.name} plan={plan} />
      ))}
    </div>
  );
}
```

### 4.2 Credit Management Components

#### **File**: `frontend/src/features/credits/components/credit-balance.tsx`

```typescript
export function CreditBalance() {
  const { data: credits, isLoading } = useQuery({
    queryKey: ['user-credits'],
    queryFn: () => api.get('/credits').then(res => res.data)
  });

  if (isLoading) return <CreditBalanceSkeleton />;

  return (
    <div className="credit-balance">
      <div className="balance-display">
        <span className="credits-count">{credits.totalCredits}</span>
        <span className="credits-label">Credits</span>
      </div>
      <div className="balance-details">
        <div className="detail-item">
          <span>Monthly: {credits.monthlyCredits}</span>
        </div>
        <div className="detail-item">
          <span>Purchased: {credits.purchasedCredits}</span>
        </div>
      </div>
      <div className="balance-actions">
        <Button onClick={() => navigate('/buy-credits')}>
          Buy Credits
        </Button>
      </div>
    </div>
  );
}
```

#### **File**: `frontend/src/features/credits/components/credit-purchase-modal.tsx`

```typescript
export function CreditPurchaseModal({ isOpen, onClose }) {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: packages } = useQuery({
    queryKey: ['credit-packages'],
    queryFn: () => api.get('/credits/packages').then(res => res.data)
  });

  const handlePurchase = async () => {
    setIsProcessing(true);
    try {
      const { data } = await api.post('/credits/purchase', {
        packageId: selectedPackage.id
      });

      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl;
    } catch (error) {
      toast.error('Failed to initiate purchase');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="credit-purchase-modal">
        <h2>Buy Credits</h2>
        <div className="package-grid">
          {packages?.map((pkg) => (
            <CreditPackageCard
              key={pkg.id}
              package={pkg}
              isSelected={selectedPackage?.id === pkg.id}
              onSelect={() => setSelectedPackage(pkg)}
            />
          ))}
        </div>
        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={!selectedPackage || isProcessing}
            loading={isProcessing}
          >
            Purchase Credits
          </Button>
        </div>
      </div>
    </Modal>
  );
}
```

### 4.3 Subscription Management Components

#### **File**: `frontend/src/features/subscription/components/subscription-card.tsx`

```typescript
export function SubscriptionCard() {
  const { data: subscription } = useQuery({
    queryKey: ['user-subscription'],
    queryFn: () => api.get('/subscriptions/status').then(res => res.data)
  });

  const upgradeToPro = useMutation({
    mutationFn: (billingCycle: 'monthly' | 'yearly') =>
      api.post('/subscriptions/upgrade', { billingCycle }),
    onSuccess: () => {
      toast.success('Subscription upgraded successfully!');
      queryClient.invalidateQueries(['user-subscription']);
    }
  });

  return (
    <Card className="subscription-card">
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="subscription-info">
          <div className="current-plan">
            <span className="plan-name">{subscription.planType}</span>
            <span className="plan-status">{subscription.status}</span>
          </div>

          {subscription.planType === 'FREE' && (
            <div className="upgrade-section">
              <h3>Upgrade to Pro</h3>
              <div className="upgrade-options">
                <Button
                  onClick={() => upgradeToPro.mutate('monthly')}
                  loading={upgradeToPro.isLoading}
                >
                  Monthly - $19.99
                </Button>
                <Button
                  onClick={() => upgradeToPro.mutate('yearly')}
                  loading={upgradeToPro.isLoading}
                  variant="outline"
                >
                  Yearly - $203.89 (Save 15%)
                </Button>
              </div>
            </div>
          )}

          {subscription.planType === 'PRO' && (
            <div className="pro-section">
              <div className="billing-info">
                <span>Billing: {subscription.billingCycle}</span>
                <span>Next billing: {subscription.currentPeriodEnd}</span>
              </div>
              <div className="pro-actions">
                <Button variant="secondary" onClick={handleCancelSubscription}>
                  Cancel Subscription
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 🏗️ Phase 5: Background Jobs & Automation

### 5.1 Credit Reset Job

#### **File**: `backend/src/jobs/credit-reset.job.ts`

```typescript
import cron from "node-cron";

// Run daily at 00:00 UTC
cron.schedule("0 0 * * *", async () => {
  console.log("Starting monthly credit reset job...");

  try {
    await creditService.processMonthlyReset();
    console.log("Monthly credit reset completed successfully");
  } catch (error) {
    console.error("Monthly credit reset failed:", error);
  }
});
```

### 5.2 Subscription Monitoring Job

#### **File**: `backend/src/jobs/subscription-monitor.job.ts`

```typescript
import cron from "node-cron";

// Run every hour
cron.schedule("0 * * * *", async () => {
  console.log("Starting subscription monitoring job...");

  try {
    await subscriptionService.syncSubscriptionStatuses();
    await subscriptionService.processExpiredSubscriptions();
    console.log("Subscription monitoring completed successfully");
  } catch (error) {
    console.error("Subscription monitoring failed:", error);
  }
});
```

---

## 🏗️ Phase 6: Validation & Security

### 6.1 Input Validation

#### **File**: `backend/src/validators/credit.validators.ts`

```typescript
import { z } from "zod";

export const purchaseCreditsSchema = z.object({
  packageId: z.string().min(1, "Package ID is required"),
  paymentMethodId: z.string().optional(),
});

export const deductCreditsSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  amount: z.number().min(1, "Amount must be at least 1"),
  description: z.string().min(1, "Description is required"),
});
```

### 6.2 Rate Limiting

#### **File**: `backend/src/middleware/rate-limit.middleware.ts`

```typescript
import rateLimit from "express-rate-limit";

export const creditPurchaseLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 credit purchases per 15 minutes
  message: "Too many credit purchases, please try again later",
});

export const evaluationLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 evaluations per minute
  message: "Too many evaluations, please slow down",
});
```

### 6.3 Security Checks

#### **File**: `backend/src/middleware/security.middleware.ts`

```typescript
export const validateStripeWebhook = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers["stripe-signature"];

  if (!signature) {
    return res.status(400).json({ error: "Missing Stripe signature" });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );

    req.stripeEvent = event;
    next();
  } catch (error) {
    return res.status(400).json({ error: "Invalid Stripe signature" });
  }
};
```

---

## 🏗️ Phase 7: Testing Strategy

### 7.1 Unit Tests

#### **File**: `backend/src/tests/credit-management.test.ts`

```typescript
describe("CreditManagementService", () => {
  describe("deductCredits", () => {
    it("should deduct credits successfully", async () => {
      // Test implementation
    });

    it("should fail when insufficient credits", async () => {
      // Test implementation
    });
  });

  describe("resetMonthlyCredits", () => {
    it("should reset credits for free users", async () => {
      // Test implementation
    });

    it("should not reset credits for pro users", async () => {
      // Test implementation
    });
  });
});
```

### 7.2 Integration Tests

#### **File**: `backend/src/tests/stripe-integration.test.ts`

```typescript
describe("Stripe Integration", () => {
  describe("Subscription Creation", () => {
    it("should create pro subscription successfully", async () => {
      // Test implementation
    });
  });

  describe("Webhook Handling", () => {
    it("should handle subscription.created webhook", async () => {
      // Test implementation
    });
  });
});
```

### 7.3 E2E Tests

#### **File**: `frontend/src/tests/pricing-flow.e2e.test.ts`

```typescript
describe("Pricing Flow", () => {
  it("should upgrade to pro subscription", async () => {
    // Test implementation
  });

  it("should purchase credits", async () => {
    // Test implementation
  });

  it("should prevent evaluation without credits", async () => {
    // Test implementation
  });
});
```

---

## 🎯 Implementation Timeline

### **Week 1-2: Foundation**

- [ ] Database schema implementation
- [ ] Prisma migrations
- [ ] Basic credit management service
- [ ] Core API endpoints

### **Week 3-4: Stripe Integration**

- [ ] Stripe configuration
- [ ] Webhook handlers
- [ ] Subscription management
- [ ] Payment processing

### **Week 5-6: Frontend Implementation**

- [ ] Pricing page
- [ ] Credit management UI
- [ ] Subscription components
- [ ] Purchase flows

### **Week 7-8: Advanced Features**

- [ ] Background jobs
- [ ] Validation & security
- [ ] Rate limiting
- [ ] Error handling

### **Week 9-10: Testing & Polish**

- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Performance optimization

### **Week 11-12: Deployment & Monitoring**

- [ ] Production deployment
- [ ] Monitoring setup
- [ ] Analytics implementation
- [ ] Performance monitoring

---

## 🔒 Security Considerations

### **Data Protection**

- [ ] Encrypt sensitive payment data
- [ ] Implement proper access controls
- [ ] Validate all user inputs
- [ ] Use HTTPS for all communications

### **Fraud Prevention**

- [ ] Rate limiting on credit purchases
- [ ] Suspicious activity detection
- [ ] Payment verification
- [ ] Account verification

### **Compliance**

- [ ] PCI DSS compliance (via Stripe)
- [ ] GDPR compliance for user data
- [ ] SOC 2 compliance planning
- [ ] Regular security audits

---

## 📊 Success Metrics

### **Business Metrics**

- [ ] Conversion rate (Free → Pro)
- [ ] Monthly recurring revenue (MRR)
- [ ] Customer lifetime value (CLV)
- [ ] Churn rate

### **Technical Metrics**

- [ ] API response times
- [ ] Payment success rate
- [ ] Credit deduction accuracy
- [ ] System uptime

### **User Experience Metrics**

- [ ] Time to first evaluation
- [ ] Credit purchase completion rate
- [ ] Subscription upgrade rate
- [ ] User satisfaction scores

---

## 🚀 Launch Strategy

### **Soft Launch (Week 11)**

- [ ] Limited beta users
- [ ] Free plan only
- [ ] Monitoring and feedback collection
- [ ] Bug fixes and improvements

### **Full Launch (Week 12)**

- [ ] Public availability
- [ ] Pro plan activation
- [ ] Marketing campaign
- [ ] Customer support ready

### **Post-Launch (Week 13+)**

- [ ] Performance optimization
- [ ] Feature enhancements
- [ ] User feedback integration
- [ ] Scaling preparations

---

_Implementation Plan Created: January 2025_
_Target Completion: March 2025_
_Estimated Development Time: 12 weeks_
