"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import { Badge } from "@/features/shared/components/ui/badge";
import { Slider } from "@/features/shared/components/ui/slider";
import { CheckCircle, Zap, Star, CreditCard, Users, BarChart3, Headphones } from "lucide-react";
import { toast } from "sonner";

interface PricingPlan {
  name: string;
  price: number;
  yearlyPrice?: number;
  billingCycle: string;
  features: string[];
  credits: {
    monthly: number;
    cumulative: boolean;
    additionalPrice: number;
  };
  popular?: boolean;
}

interface CreditPricing {
  userType: string;
  pricePerCredit: number;
  minCredits: number;
  maxCredits: number;
  examples: Array<{
    credits: number;
    price: string;
  }>;
}

interface PricingData {
  plans: PricingPlan[];
  creditPricing: CreditPricing;
}

const PricingPage = () => {
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [processingCheckout, setProcessingCheckout] = useState<string | null>(null);
  const [userSubscription, setUserSubscription] = useState<"FREE" | "PRO">("FREE");

  // Slider state
  const [creditAmount, setCreditAmount] = useState([100]);
  const [purchasingCredits, setPurchasingCredits] = useState(false);

  useEffect(() => {
    fetchPricingData();
  }, []);

  const fetchPricingData = async () => {
    try {
      const response = await fetch("/api/stripe/pricing");
      const data = await response.json();

      if (data.success) {
        setPricingData(data.data);
      }
    } catch (error) {
      console.error("Failed to load pricing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionCheckout = async (billingCycle: "monthly" | "yearly") => {
    setProcessingCheckout(billingCycle);

    try {
      const response = await fetch("/api/stripe/create-subscription-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "user@example.com", // Replace with actual user email
          billingCycle: billingCycle.toUpperCase(),
          successUrl: `${window.location.origin}/dashboard?checkout=success`,
          cancelUrl: `${window.location.origin}/pricing?checkout=canceled`,
        }),
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = data.data.checkoutUrl;
      } else {
        toast.error("Failed to create checkout session");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to process checkout");
    } finally {
      setProcessingCheckout(null);
    }
  };

  const handleCreditPurchase = async () => {
    setPurchasingCredits(true);

    try {
      const response = await fetch("/api/stripe/create-credit-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creditAmount: creditAmount[0],
          email: "user@example.com", // Replace with actual user email
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to payment or show success message
        toast.success(`Created payment for ${creditAmount[0]} credits`);
        // In a real app, you'd integrate with Stripe Elements here
      } else {
        toast.error("Failed to create credit payment");
      }
    } catch (error) {
      console.error("Credit purchase error:", error);
      toast.error("Failed to process credit purchase");
    } finally {
      setPurchasingCredits(false);
    }
  };

  const calculateCreditPrice = (credits: number) => {
    if (!pricingData) return "0.00";
    // Use pricing based on subscription type
    const pricePerCredit = userSubscription === "PRO" ? 0.01 : 0.05;
    return (credits * pricePerCredit).toFixed(2);
  };

  const calculateTotalPrice = (basePrice: number, credits: number) => {
    const creditPrice = parseFloat(calculateCreditPrice(credits));
    return (basePrice + creditPrice).toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pricing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Choose Your <span className="text-blue-600">Trading Plan</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Power up your trading strategy with AI-driven bot evaluations. Start free or go Pro for
          advanced features.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center mb-12">
        <div className="bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === "monthly"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === "yearly"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Yearly
            <Badge className="ml-2 bg-green-100 text-green-800">Save 15%</Badge>
          </button>
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="grid md:grid-cols-2 gap-8 mb-16">
        {pricingData?.plans.map((plan, index) => (
          <Card
            key={index}
            className={`relative ${plan.popular ? "border-blue-500 shadow-lg" : ""}`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-600 text-white px-4 py-1">
                  <Star className="w-4 h-4 mr-1" />
                  Most Popular
                </Badge>
              </div>
            )}
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">
                  ${billingCycle === "yearly" && plan.yearlyPrice ? plan.yearlyPrice : plan.price}
                </span>
                <span className="text-gray-600 ml-2">
                  {plan.price === 0 ? "forever" : `/${billingCycle}`}
                </span>
              </div>
              {billingCycle === "yearly" && plan.yearlyPrice && (
                <p className="text-sm text-green-600 mt-2">
                  Save ${(plan.price * 12 - plan.yearlyPrice).toFixed(2)} per year
                </p>
              )}
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Credit Details:</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{plan.credits.monthly} credits/month</span>
                  <Badge variant="outline">
                    {plan.credits.cumulative ? "Cumulative" : "Monthly Reset"}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Additional credits: ${plan.credits.additionalPrice.toFixed(2)} each
                </p>
              </div>
              <Button
                onClick={() => plan.price > 0 && handleSubscriptionCheckout(billingCycle)}
                disabled={processingCheckout === billingCycle}
                className={`w-full ${
                  plan.popular
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-900 hover:bg-gray-800 text-white"
                }`}
              >
                {processingCheckout === billingCycle ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : plan.price === 0 ? (
                  "Get Started Free"
                ) : (
                  `Get ${plan.name} Plan`
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pricing Breakdown Section */}
      <div className="max-w-4xl mx-auto mb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Complete Pricing Breakdown</h2>
          <p className="text-gray-600 mb-6">
            See exactly what you're paying for with our transparent pricing
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Monthly vs Yearly Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Pro Plan Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold">Monthly Plan</p>
                    <p className="text-sm text-gray-600">$19.99/month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">$19.99</p>
                    <p className="text-sm text-gray-600">per month</p>
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <div>
                    <p className="font-semibold text-green-800">Yearly Plan</p>
                    <p className="text-sm text-green-600">$203.89/year</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-800">$16.99</p>
                    <p className="text-sm text-green-600">per month</p>
                  </div>
                </div>

                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-lg font-semibold text-blue-800">
                    Save $36.00 per year with yearly billing!
                  </p>
                  <p className="text-sm text-blue-600 mt-1">That&apos;s 15% off the monthly rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credit Pricing by Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Credit Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold">Free Plan</p>
                    <p className="text-sm text-gray-600">20 credits/month included</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">$0.05</p>
                    <p className="text-sm text-gray-600">per additional credit</p>
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-blue-800">Pro Plan</p>
                    <p className="text-sm text-blue-600">2,000 credits/month included</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-800">$0.01</p>
                    <p className="text-sm text-blue-600">per additional credit</p>
                  </div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-lg font-semibold text-green-800">
                    5x cheaper credits with Pro!
                  </p>
                  <p className="text-sm text-green-600 mt-1">Save 80% on additional credits</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Credit Purchase Section */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Need More Credits?</h2>
        <p className="text-gray-600 mb-6">
          Purchase additional credits at any time with our flexible pricing
        </p>

        {/* Subscription Type Display */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setUserSubscription("FREE")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                userSubscription === "FREE"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Free User ($0.05/credit)
            </button>
            <button
              onClick={() => setUserSubscription("PRO")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                userSubscription === "PRO"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Pro User ($0.01/credit)
            </button>
          </div>
        </div>
      </div>

      {/* Subscription + Credits Calculator */}
      <div className="max-w-4xl mx-auto mb-16">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">Complete Order Summary</CardTitle>
            <p className="text-center text-gray-600">
              See your total monthly and yearly costs with Pro subscription + additional credits
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Monthly Total */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-center">Monthly Total</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Pro Subscription</span>
                    <span className="text-lg font-semibold">$19.99</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Additional Credits ({creditAmount[0]})
                    </span>
                    <span className="text-lg font-semibold">
                      ${calculateCreditPrice(creditAmount[0])}
                    </span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total Monthly</span>
                      <span className="text-2xl font-bold text-primary">
                        ${calculateTotalPrice(19.99, creditAmount[0])}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Yearly Total */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-center">Yearly Total</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Pro Subscription (Yearly)</span>
                    <span className="text-lg font-semibold">$203.89</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Additional Credits ({creditAmount[0] * 12})
                    </span>
                    <span className="text-lg font-semibold">
                      ${calculateCreditPrice(creditAmount[0] * 12)}
                    </span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total Yearly</span>
                      <span className="text-2xl font-bold text-primary">
                        ${calculateTotalPrice(203.89, creditAmount[0] * 12)}
                      </span>
                    </div>
                    <div className="text-center mt-2">
                      <span className="text-sm text-green-600 font-medium">
                        Save $
                        {(
                          calculateTotalPrice(19.99, creditAmount[0]) * 12 -
                          calculateTotalPrice(203.89, creditAmount[0] * 12)
                        ).toFixed(2)}{" "}
                        per year!
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit Slider */}
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Purchase {creditAmount[0]} Credits</CardTitle>
            <p className="text-center text-2xl font-bold text-blue-600">
              ${calculateCreditPrice(creditAmount[0])}
            </p>
            <p className="text-center text-sm text-gray-600">
              {userSubscription === "PRO" ? "$0.01" : "$0.05"} per credit
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="px-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>50 credits</span>
                  <span>5,000 credits</span>
                </div>
                <Slider
                  value={creditAmount}
                  onValueChange={setCreditAmount}
                  max={5000}
                  min={50}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-center mt-4">
                  <div className="flex space-x-2">
                    {[100, 500, 1000, 2500, 5000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setCreditAmount([amount])}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          creditAmount[0] === amount
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        {amount}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${calculateCreditPrice(creditAmount[0])}
                  </span>
                </div>
                <Button
                  onClick={handleCreditPurchase}
                  disabled={purchasingCredits}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="lg"
                >
                  {purchasingCredits ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Purchase {creditAmount[0]} Credits
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQ Section */}
      <div className="mt-16 max-w-4xl mx-auto">
        <h3 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h3>
        <div className="grid md:grid-cols-2 gap-8 text-left">
          <div>
            <h4 className="font-semibold text-lg mb-2">What are credits?</h4>
            <p className="text-gray-600">
              Credits are used to run bot evaluations. Each evaluation costs 1 credit. Free users
              get 20 credits per month, Pro users get 2,000.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-2">Can I change plans anytime?</h4>
            <p className="text-gray-600">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect
              immediately.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-2">Do unused credits expire?</h4>
            <p className="text-gray-600">
              Free plan credits reset monthly. Pro plan credits are cumulative and don&apos;t expire
              while your subscription is active.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-2">Why do Pro users get cheaper credits?</h4>
            <p className="text-gray-600">
              Pro users get a 5x discount on additional credits ($0.01 vs $0.05) as a benefit of
              their subscription, encouraging more usage and better value.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-2">How does the credit slider work?</h4>
            <p className="text-gray-600">
              Select any amount between 50-5,000 credits. The price automatically adjusts based on
              your subscription type. No fixed packages - complete flexibility.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-2">What payment methods do you accept?</h4>
            <p className="text-gray-600">
              We accept all major credit cards, debit cards, and digital wallets through our secure
              Stripe integration.
            </p>
          </div>
        </div>
      </div>

      {/* Support Section */}
      <div className="mt-16 bg-gray-50 rounded-lg p-8 text-center">
        <Headphones className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Need Help?</h3>
        <p className="text-gray-600 mb-4">
          Our support team is here to help you choose the right plan and get started.
        </p>
        <Button variant="outline">Contact Support</Button>
      </div>
    </div>
  );
};

export default PricingPage;
