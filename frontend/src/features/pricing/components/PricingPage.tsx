"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Button } from "@/features/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/shared/components/ui/card";
import { Badge } from "@/features/shared/components/ui/badge";
import { Slider } from "@/features/shared/components/ui/slider";
import { Star, CreditCard, Zap } from "lucide-react";
import { toast } from "sonner";

interface PricingPlan {
  name: string;
  price: number;
  yearlyPrice?: number;
  billingCycle: string;
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
  const t = useTranslations("pricing");
  const params = useParams();
  const locale = params.locale || "en";

  const [loading, setLoading] = useState(true);
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [processingCheckout, setProcessingCheckout] = useState<string | null>(null);

  // Credit purchase state
  const [creditAmount, setCreditAmount] = useState([100]);
  const [purchasingCredits, setPurchasingCredits] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro">("pro");

  useEffect(() => {
    fetchPricingData();
  }, []);

  const fetchPricingData = async () => {
    try {
      setLoading(true);
      // Mock pricing data since API might not be available
      const mockData: PricingData = {
        plans: [
          {
            name: t("plans.free.name"),
            price: 0,
            billingCycle: "monthly",
            credits: {
              monthly: 20,
              cumulative: false,
              additionalPrice: 0.05,
            },
          },
          {
            name: t("plans.pro.name"),
            price: 19.99,
            yearlyPrice: 203.89,
            billingCycle: "monthly",
            credits: {
              monthly: 2000,
              cumulative: true,
              additionalPrice: 0.01,
            },
            popular: true,
          },
        ],
        creditPricing: {
          userType: "mixed",
          pricePerCredit: 0.05,
          minCredits: 50,
          maxCredits: 5000,
          examples: [
            { credits: 100, price: "5.00" },
            { credits: 500, price: "25.00" },
            { credits: 1000, price: "50.00" },
          ],
        },
      };

      setPricingData(mockData);
    } catch (error) {
      console.error("Error fetching pricing data:", error);
      toast.error(t("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionCheckout = async (billingCycle: "monthly" | "yearly") => {
    try {
      setProcessingCheckout(billingCycle);
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: billingCycle === "yearly" ? "price_yearly_id" : "price_monthly_id",
          billingCycle,
        }),
      });

      if (!response.ok) throw new Error("Failed to create checkout session");

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error(t("errors.checkoutFailed"));
    } finally {
      setProcessingCheckout(null);
    }
  };

  const handleCreditPurchase = async () => {
    try {
      setPurchasingCredits(true);
      const response = await fetch("/api/stripe/purchase-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credits: creditAmount[0],
          planType: selectedPlan,
        }),
      });

      if (!response.ok) throw new Error("Failed to purchase credits");

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error purchasing credits:", error);
      toast.error(t("errors.purchaseFailed"));
    } finally {
      setPurchasingCredits(false);
    }
  };

  // Calculate credit price based on selected plan
  const calculateCreditPrice = (credits: number, planType: "free" | "pro" = selectedPlan) => {
    const pricePerCredit = planType === "pro" ? 0.01 : 0.05;
    return (credits * pricePerCredit).toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t("title")}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{t("subtitle")}</p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-muted p-1 rounded-lg">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === "monthly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("billingCycle.monthly")}
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === "yearly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("billingCycle.yearly")}
              <Badge className="ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                {t("billingCycle.save")}
              </Badge>
            </button>
          </div>
        </div>

        {/* Pricing Plans */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-20">
          {pricingData?.plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative ${plan.popular ? "border-primary shadow-lg scale-105" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1">
                    <Star className="w-4 h-4 mr-1" />
                    {t("plans.pro.popular")}
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <div className="mt-4">
                  {plan.price === 0 ? (
                    <div>
                      <span className="text-4xl font-bold">{t("plans.free.price")}</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("plans.free.description")}
                      </p>
                    </div>
                  ) : (
                    <div>
                      {billingCycle === "yearly" && plan.yearlyPrice ? (
                        <div>
                          <span className="text-4xl font-bold">{t("plans.pro.yearlyPrice")}</span>
                          <span className="text-muted-foreground ml-2">
                            {t("plans.pro.perMonth")}
                          </span>
                          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                            {t("plans.pro.billedAnnually", { price: plan.yearlyPrice })}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            {t("plans.pro.saveAmount", {
                              amount: (plan.price * 12 - plan.yearlyPrice).toFixed(2),
                            })}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <span className="text-4xl font-bold">{t("plans.pro.monthlyPrice")}</span>
                          <span className="text-muted-foreground ml-2">
                            {t("plans.pro.perMonth")}
                          </span>
                          {plan.yearlyPrice && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {t("plans.pro.orYearlyHint", {
                                price: (plan.yearlyPrice / 12).toFixed(2),
                              })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Credit Information */}
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">
                      {plan.credits.monthly.toLocaleString()}
                    </div>
                    <p className="text-muted-foreground">{t("credits.perMonth")}</p>
                    {plan.credits.cumulative && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        {t("credits.rollover")}
                      </p>
                    )}
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold mb-1">
                        ${plan.credits.additionalPrice.toFixed(2)}
                      </div>
                      <p className="text-sm text-muted-foreground">{t("credits.additional")}</p>
                    </div>
                  </div>

                  <Button
                    onClick={() => plan.price > 0 && handleSubscriptionCheckout(billingCycle)}
                    disabled={processingCheckout === billingCycle}
                    className={`w-full ${
                      plan.popular
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                        : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                    }`}
                    size="lg"
                  >
                    {processingCheckout === billingCycle ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        {t("creditPurchase.processing")}
                      </div>
                    ) : plan.price === 0 ? (
                      t("plans.free.button")
                    ) : (
                      t("plans.pro.button")
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Credit Purchase Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">
              <CreditCard className="w-8 h-8 inline-block mr-2" />
              {t("creditPurchase.title")}
            </h2>
            <p className="text-muted-foreground">{t("creditPurchase.subtitle")}</p>
          </div>

          <Card>
            <CardHeader>
              <div className="text-center">
                <CardTitle className="text-xl mb-4">{t("creditPurchase.purchaseTitle")}</CardTitle>

                {/* Plan Selection */}
                <div className="flex justify-center mb-6">
                  <div className="bg-muted p-1 rounded-lg">
                    <button
                      onClick={() => setSelectedPlan("free")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedPlan === "free"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t("creditPurchase.planSelection.free")}
                    </button>
                    <button
                      onClick={() => setSelectedPlan("pro")}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedPlan === "pro"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t("creditPurchase.planSelection.pro")}
                    </button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Credit Amount Display */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {creditAmount[0].toLocaleString()} {t("creditPurchase.creditAmount")}
                  </div>
                  <div className="text-2xl font-bold">${calculateCreditPrice(creditAmount[0])}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    ${selectedPlan === "pro" ? "0.01" : "0.05"} per credit
                  </p>
                </div>

                {/* Credit Slider */}
                <div className="px-4">
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>50</span>
                    <span>5,000</span>
                  </div>
                  <Slider
                    value={creditAmount}
                    onValueChange={setCreditAmount}
                    max={5000}
                    min={50}
                    step={10}
                    className="w-full"
                  />

                  {/* Quick Select Buttons */}
                  <div className="flex justify-center mt-4 flex-wrap gap-2">
                    {[100, 500, 1000, 2500, 5000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setCreditAmount([amount])}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          creditAmount[0] === amount
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {amount.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Purchase Button */}
                <Button
                  onClick={handleCreditPurchase}
                  disabled={purchasingCredits}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                >
                  {purchasingCredits ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      {t("creditPurchase.processing")}
                    </div>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 mr-2" />
                      {t("creditPurchase.purchaseButton", {
                        amount: creditAmount[0].toLocaleString(),
                        price: calculateCreditPrice(creditAmount[0]),
                      })}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8">{t("faq.title")}</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-lg mb-2">{t("faq.credits.question")}</h4>
              <p className="text-muted-foreground mb-4">{t("faq.credits.answer")}</p>
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-2">{t("faq.planChange.question")}</h4>
              <p className="text-muted-foreground mb-4">{t("faq.planChange.answer")}</p>
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-2">{t("faq.expiry.question")}</h4>
              <p className="text-muted-foreground mb-4">{t("faq.expiry.answer")}</p>
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-2">{t("faq.cheaper.question")}</h4>
              <p className="text-muted-foreground mb-4">{t("faq.cheaper.answer")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
