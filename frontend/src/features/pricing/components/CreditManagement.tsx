"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import { Badge } from "@/features/shared/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/features/shared/components/ui/slider";
import {
  Zap,
  CreditCard,
  History,
  TrendingUp,
  Calendar,
  DollarSign,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

interface CreditInfo {
  balance: number;
  monthlyAllotment: number;
  usedThisMonth: number;
  transactionHistory: CreditTransaction[];
  userType: "FREE" | "PRO";
}

interface CreditTransaction {
  id: string;
  type: "ALLOCATED" | "USED" | "PURCHASED";
  amount: number;
  description: string;
  date: string;
}

const CreditManagement = () => {
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Credit purchase state
  const [creditAmount, setCreditAmount] = useState([100]);
  const [purchasingCredits, setPurchasingCredits] = useState(false);

  useEffect(() => {
    fetchCreditInfo();
  }, []);

  const fetchCreditInfo = async () => {
    try {
      const response = await fetch("/api/credits/info");
      const data = await response.json();

      if (data.success) {
        setCreditInfo(data.data);
      }
    } catch (error) {
      console.error("Failed to load credit info:", error);
      toast.error("Failed to load credit information");
    } finally {
      setLoading(false);
    }
  };

  const refreshCreditInfo = async () => {
    setRefreshing(true);
    await fetchCreditInfo();
    setRefreshing(false);
    toast.success("Credit information refreshed");
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
        toast.success(`Payment created for ${creditAmount[0]} credits`);
        // In a real app, you'd integrate with Stripe Elements here
        // Refresh credit info after successful purchase
        await fetchCreditInfo();
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
    if (!creditInfo) return "0.00";
    const pricePerCredit = creditInfo.userType === "PRO" ? 0.01 : 0.05;
    return (credits * pricePerCredit).toFixed(2);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "ALLOCATED":
        return <Calendar className="w-4 h-4 text-green-500" />;
      case "PURCHASED":
        return <CreditCard className="w-4 h-4 text-blue-500" />;
      case "USED":
        return <Zap className="w-4 h-4 text-orange-500" />;
      default:
        return <History className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "ALLOCATED":
      case "PURCHASED":
        return "text-green-600";
      case "USED":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading credit information...</p>
        </div>
      </div>
    );
  }

  if (!creditInfo) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">Failed to load credit information</p>
        <Button onClick={fetchCreditInfo}>Retry</Button>
      </div>
    );
  }

  const usagePercentage = (creditInfo.usedThisMonth / creditInfo.monthlyAllotment) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Credit Overview */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{creditInfo.balance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {creditInfo.userType === "PRO" ? "Pro Plan" : "Free Plan"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Allotment</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{creditInfo.monthlyAllotment.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {creditInfo.userType === "PRO" ? "Cumulative" : "Monthly Reset"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{creditInfo.usedThisMonth.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(usagePercentage)}% of allotment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Monthly Usage</CardTitle>
            <Button variant="outline" size="sm" onClick={refreshCreditInfo} disabled={refreshing}>
              {refreshing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Credits Used</span>
              <span>
                {creditInfo.usedThisMonth} / {creditInfo.monthlyAllotment}
              </span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
            <div className="flex justify-between text-xs text-gray-600">
              <span>Monthly reset: {creditInfo.userType === "FREE" ? "Yes" : "No"}</span>
              <span>
                {creditInfo.monthlyAllotment - creditInfo.usedThisMonth} credits remaining
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Purchase */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Additional Credits</CardTitle>
          <p className="text-sm text-gray-600">
            {creditInfo.userType === "PRO"
              ? "Pro users get 5x cheaper credits at $0.01 each"
              : "Free users pay $0.05 per credit"}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{creditAmount[0]} Credits</div>
              <div className="text-2xl font-bold text-gray-900">
                ${calculateCreditPrice(creditAmount[0])}
              </div>
              <p className="text-sm text-gray-600">
                {creditInfo.userType === "PRO" ? "$0.01" : "$0.05"} per credit
              </p>
            </div>

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

            {creditInfo.userType === "FREE" && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center text-blue-800">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="font-semibold">Pro Tip:</span>
                </div>
                <p className="text-blue-700 text-sm mt-1">
                  Upgrade to Pro to get 5x cheaper credits ($0.01 each) and 2,000 monthly credits
                  that don&apos;t expire!
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {creditInfo.transactionHistory.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No transactions yet</p>
            ) : (
              creditInfo.transactionHistory.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getTransactionIcon(transaction.type)}
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(transaction.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${getTransactionColor(transaction.type)}`}>
                      {transaction.type === "USED" ? "-" : "+"}
                      {transaction.amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">credits</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreditManagement;
