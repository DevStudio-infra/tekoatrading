"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import { Badge } from "@/features/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/features/shared/components/ui/alert";
import {
  Crown,
  Calendar,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface Subscription {
  id: string;
  planType: "FREE" | "PRO";
  billingCycle: "MONTHLY" | "YEARLY";
  status: "ACTIVE" | "CANCELED" | "PAST_DUE" | "INCOMPLETE";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface ProFeature {
  name: string;
  description: string;
  enabled: boolean;
}

const SubscriptionManagement = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [proFeatures, setProFeatures] = useState<ProFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
    fetchProFeatures();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch("/api/subscriptions");
      const data = await response.json();

      if (data.success) {
        setSubscription(data.data);
      } else {
        toast.error("Failed to load subscription information");
      }
    } catch (error) {
      toast.error("Failed to load subscription information");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchProFeatures = async () => {
    try {
      const response = await fetch("/api/subscriptions/pro-features");
      const data = await response.json();

      if (data.success) {
        setProFeatures(data.data.features);
      }
    } catch (error) {
      console.error("Failed to load Pro features:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSubscriptionData();
  };

  const handleCancelSubscription = async (immediately = false) => {
    setCanceling(true);

    try {
      const response = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancelAtPeriodEnd: !immediately,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        await fetchSubscriptionData(); // Refresh subscription data
      } else {
        toast.error("Failed to cancel subscription");
      }
    } catch (error) {
      toast.error("Failed to cancel subscription");
    } finally {
      setCanceling(false);
    }
  };

  const handleUpgradeToAnnual = () => {
    // Redirect to pricing page with annual selected
    window.location.href = "/pricing?cycle=yearly";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "CANCELED":
        return <Badge className="bg-red-100 text-red-800">Canceled</Badge>;
      case "PAST_DUE":
        return <Badge className="bg-yellow-100 text-yellow-800">Past Due</Badge>;
      case "INCOMPLETE":
        return <Badge className="bg-gray-100 text-gray-800">Incomplete</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPlanPrice = (billingCycle: string) => {
    if (billingCycle === "YEARLY") {
      return { price: "$16.99", billing: "/month (billed yearly)", savings: "Save $36/year" };
    }
    return { price: "$19.99", billing: "/month", savings: null };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-48 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  // Free Plan View
  if (!subscription || subscription.planType === "FREE") {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Subscription</h2>
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="w-5 h-5 text-gray-600 mr-2" />
              Free Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-4xl font-bold text-gray-900 mb-2">$0</div>
              <div className="text-gray-600 mb-6">Forever free</div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span>20 credits per month</span>
                </div>
                <div className="flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span>Basic bot evaluations</span>
                </div>
                <div className="flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span>Community support</span>
                </div>
              </div>

              <Button onClick={() => (window.location.href = "/pricing")} size="lg">
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Pro
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pro Plan View
  const planPrice = getPlanPrice(subscription.billingCycle);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Subscription Management</h2>
        <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Subscription Status Alert */}
      {subscription.status === "PAST_DUE" && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Your payment is past due. Please update your payment method to continue using Pro
            features.
          </AlertDescription>
        </Alert>
      )}

      {subscription.cancelAtPeriodEnd && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Your subscription will be canceled on {formatDate(subscription.currentPeriodEnd)}.
            You&apos;ll continue to have Pro access until then.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Subscription */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Crown className="w-5 h-5 text-blue-600 mr-2" />
              Pro Plan
            </div>
            {getStatusBadge(subscription.status)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-4">
                <div>
                  <div className="text-3xl font-bold text-blue-600">
                    {planPrice.price}
                    <span className="text-lg text-gray-600 ml-2">{planPrice.billing}</span>
                  </div>
                  {planPrice.savings && (
                    <div className="text-sm text-green-600 font-medium">{planPrice.savings}</div>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Billing Cycle:</span>
                    <span className="font-medium">
                      {subscription.billingCycle === "YEARLY" ? "Annual" : "Monthly"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Period:</span>
                    <span className="font-medium">
                      {formatDate(subscription.currentPeriodStart)} -{" "}
                      {formatDate(subscription.currentPeriodEnd)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Pro Features</h4>
              <div className="space-y-2">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-sm">2,000 credits per month</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-sm">Advanced analytics</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-sm">Priority support</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-sm">API access</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            {subscription.billingCycle === "MONTHLY" && (
              <Button onClick={handleUpgradeToAnnual} variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Switch to Annual (Save 15%)
              </Button>
            )}

            {!subscription.cancelAtPeriodEnd && (
              <Button
                onClick={() => handleCancelSubscription(false)}
                variant="outline"
                disabled={canceling}
              >
                {canceling ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    Canceling...
                  </div>
                ) : (
                  "Cancel Subscription"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pro Features Details */}
      {proFeatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Crown className="w-5 h-5 text-blue-600 mr-2" />
              Your Pro Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {proFeatures.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">{feature.name}</div>
                    <div className="text-sm text-gray-600">{feature.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="w-5 h-5 text-gray-600 mr-2" />
            Billing Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Manage your billing details, payment methods, and download invoices through
                Stripe&apos;s secure portal.
              </p>
            </div>
            <Button variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              Manage Billing
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionManagement;
