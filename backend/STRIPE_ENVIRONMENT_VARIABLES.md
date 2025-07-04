# 🔐 Stripe Environment Variables

## Required Environment Variables

Add these environment variables to your `.env` file:

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key (test mode)
STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Stripe publishable key (test mode)

# Stripe Subscription Price IDs
STRIPE_PRO_MONTHLY_PRICE_ID=price_... # Monthly Pro plan price ID ($19.99/month)
STRIPE_PRO_YEARLY_PRICE_ID=price_... # Yearly Pro plan price ID ($203.89/year)

# Stripe Credit Price IDs (Base Unit Pricing)
STRIPE_CREDIT_FREE_PRICE_ID=price_... # 1 credit for free users ($0.05 each)
STRIPE_CREDIT_PRO_PRICE_ID=price_... # 1 credit for pro users ($0.01 each)

# Stripe Webhook
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook endpoint secret
```

**📝 Credit Pricing System**: Uses base unit pricing - user selects quantity (50-5000) in Stripe checkout.

## Production Environment Variables

For production, use live keys:

```env
# Stripe API Keys (Production)
STRIPE_SECRET_KEY=sk_live_... # Your Stripe secret key (live mode)
STRIPE_PUBLISHABLE_KEY=pk_live_... # Your Stripe publishable key (live mode)

# Stripe Subscription Price IDs (Production)
STRIPE_PRO_MONTHLY_PRICE_ID=price_... # Monthly Pro plan price ID (live)
STRIPE_PRO_YEARLY_PRICE_ID=price_... # Yearly Pro plan price ID (live)

# Stripe Credit Price IDs (Production)
STRIPE_CREDIT_FREE_PRICE_ID=price_... # 1 credit for free users ($0.05 each)
STRIPE_CREDIT_PRO_PRICE_ID=price_... # 1 credit for pro users ($0.01 each)

# Stripe Webhook (Production)
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook endpoint secret (live)
```

## Setup Instructions

### 1. Create Stripe Account

- Go to [Stripe Dashboard](https://dashboard.stripe.com/)
- Create an account or log in
- Switch to test mode for development

### 2. Get API Keys

- Navigate to **Developers > API Keys**
- Copy your **Secret Key** and **Publishable Key**

### 3. Create Products and Prices

#### **A. Subscription Products (Required)**

- Navigate to **Products**
- Create a "Pro Plan" product
- Add two prices:
  - Monthly: $19.99/month → Copy this price ID to `STRIPE_PRO_MONTHLY_PRICE_ID`
  - Yearly: $203.89/year (15% discount) → Copy this price ID to `STRIPE_PRO_YEARLY_PRICE_ID`

#### **B. Credit Products (Required)**

- Create a "Credits" product
- Add two prices using **base unit pricing**:
  - **Free User Credits**: $0.05 per unit → Copy this price ID to `STRIPE_CREDIT_FREE_PRICE_ID`
  - **Pro User Credits**: $0.01 per unit → Copy this price ID to `STRIPE_CREDIT_PRO_PRICE_ID`

**📋 Credit Setup Details:**

```
Product Name: "Credits"
Price 1:
  - Name: "Credits (Free Users)"
  - Amount: $0.05
  - Billing: One-time
  - Copy Price ID → STRIPE_CREDIT_FREE_PRICE_ID

Price 2:
  - Name: "Credits (Pro Users)"
  - Amount: $0.01
  - Billing: One-time
  - Copy Price ID → STRIPE_CREDIT_PRO_PRICE_ID
```

### 4. Set Up Webhook

- Navigate to **Developers > Webhooks**
- Add endpoint: `https://yourdomain.com/api/stripe/webhook`
- Select these events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- Copy the webhook secret

### 5. Test Setup

```bash
# Install Stripe CLI for testing
npm install -g stripe-cli

# Login to Stripe
stripe login

# Test webhook locally
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Credit Purchase System

### 🎚️ Base Unit Pricing System

**How it works:**

- ✅ **2 Price IDs** for credit base units (Free: $0.05, Pro: $0.01)
- ✅ **User selects quantity** in Stripe checkout (50-5000 credits)
- ✅ **Stripe handles multiplication** automatically
- ✅ **Better analytics** and receipt generation

**Pricing Structure:**

- **Range**: 50 to 5,000 credits (quantity in checkout)
- **Free Users**: Use `STRIPE_CREDIT_FREE_PRICE_ID` ($0.05 per credit)
- **Pro Users**: Use `STRIPE_CREDIT_PRO_PRICE_ID` ($0.01 per credit)

### 💡 Pricing Examples

```
100 credits:
- Free Users: 100 × $0.05 = $5.00
- Pro Users: 100 × $0.01 = $1.00

500 credits:
- Free Users: 500 × $0.05 = $25.00
- Pro Users: 500 × $0.01 = $5.00

5000 credits:
- Free Users: 5000 × $0.05 = $250.00
- Pro Users: 5000 × $0.01 = $50.00
```

### 🔧 Technical Implementation

```typescript
// Backend selects correct price ID based on user type
const priceId =
  userType === "PRO"
    ? process.env.STRIPE_CREDIT_PRO_PRICE_ID
    : process.env.STRIPE_CREDIT_FREE_PRICE_ID;

// Create checkout session with quantity
await stripe.checkout.sessions.create({
  line_items: [
    {
      price: priceId,
      quantity: creditAmount, // User's selected amount (50-5000)
    },
  ],
  mode: "payment",
});
```

**Benefits:**

- 🎯 **Flexible**: Any quantity 50-5000 credits
- 💰 **Proper pricing**: Stripe handles multiplication
- 🔧 **Simple setup**: Only 2 credit price IDs needed
- 📊 **Better analytics**: Full Stripe dashboard insights
- 🧾 **Professional receipts**: Automatic invoice generation

## Important Notes

⚠️ **Security:**

- Never commit API keys to version control
- Use different keys for development and production
- Rotate keys regularly

⚠️ **Webhook Security:**

- Always verify webhook signatures
- Use HTTPS in production
- Handle webhook idempotency

⚠️ **Testing:**

- Test with Stripe test cards
- Test subscription flows (monthly/yearly)
- Test credit purchases with different quantities (50-5000)
- Test both free and pro user credit pricing
- Test webhook failures

## Test Cards

Use these test cards for development:

```
# Success
4242 4242 4242 4242

# Declined
4000 0000 0000 0002

# Requires Authentication
4000 0000 0000 3220
```

## Testing Credit Purchases

```bash
# Test credit purchase checkout creation
curl -X POST http://localhost:3000/api/stripe/create-credit-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "creditAmount": 150,
    "email": "test@example.com",
    "successUrl": "http://localhost:3000/success",
    "cancelUrl": "http://localhost:3000/cancel"
  }'

# Test subscription checkout
curl -X POST http://localhost:3000/api/stripe/create-subscription-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "billingCycle": "MONTHLY",
    "successUrl": "http://localhost:3000/success",
    "cancelUrl": "http://localhost:3000/cancel"
  }'
```

## Troubleshooting

### Common Issues:

1. **"Invalid API Key"**
   - Check environment variables are loaded
   - Verify key format (starts with `sk_test_` or `sk_live_`)

2. **"Webhook signature verification failed"**
   - Check webhook secret matches
   - Ensure raw body is used for verification

3. **"Price not found"**
   - Verify all 4 price IDs are correct in environment variables
   - Check if prices exist in Stripe dashboard
   - Ensure you have both subscription AND credit price IDs

4. **"Customer not found"**
   - Ensure customer creation is working
   - Check user ID mapping

5. **"Invalid credit amount/quantity"**
   - Ensure credit amount is between 50-5000
   - Check quantity validation in checkout creation

## 🎯 Summary

**Required Stripe Products:**

- ✅ **1 Pro Subscription Product** with 2 prices (monthly + yearly)
- ✅ **1 Credits Product** with 2 prices (free user rate + pro user rate)
- ✅ **1 Webhook Endpoint** to handle all events
- ✅ **API Keys** from Stripe Dashboard

**Total Price IDs Needed: 4**

1. `STRIPE_PRO_MONTHLY_PRICE_ID` - Pro subscription monthly
2. `STRIPE_PRO_YEARLY_PRICE_ID` - Pro subscription yearly
3. `STRIPE_CREDIT_FREE_PRICE_ID` - Credits for free users ($0.05 each)
4. `STRIPE_CREDIT_PRO_PRICE_ID` - Credits for pro users ($0.01 each)

This provides full Stripe analytics, proper receipts, and flexible credit purchasing!
