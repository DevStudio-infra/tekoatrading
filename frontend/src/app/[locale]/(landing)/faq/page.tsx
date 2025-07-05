"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import { Badge } from "@/features/shared/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Search,
  HelpCircle,
  Shield,
  CreditCard,
  Bot,
  TrendingUp,
  Settings,
} from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: "general" | "features" | "pricing" | "security" | "technical" | "account";
}

export default function FAQPage() {
  const t = useTranslations("faq");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const categories = [
    { id: "all", label: t("categories.all") || "All", icon: HelpCircle },
    { id: "general", label: t("categories.general") || "General", icon: HelpCircle },
    { id: "features", label: t("categories.features") || "Features", icon: Bot },
    { id: "pricing", label: t("categories.pricing") || "Pricing", icon: CreditCard },
    { id: "security", label: t("categories.security") || "Security", icon: Shield },
    { id: "technical", label: t("categories.technical") || "Technical", icon: Settings },
    { id: "account", label: t("categories.account") || "Account", icon: TrendingUp },
  ];

  const faqItems: FAQItem[] = [
    // General Questions
    {
      id: "what-is-tekoa",
      question: t("questions.whatIsTekoa.question") || "What is Tekoa Trading?",
      answer:
        t("questions.whatIsTekoa.answer") ||
        "Tekoa Trading is an AI-powered trading platform that helps traders automate their strategies, analyze markets, and manage risk. Our platform combines advanced machine learning algorithms with professional trading tools to provide intelligent trading solutions.",
      category: "general",
    },
    {
      id: "how-does-it-work",
      question: t("questions.howDoesItWork.question") || "How does the AI trading system work?",
      answer:
        t("questions.howDoesItWork.answer") ||
        "Our AI system analyzes market data, technical indicators, and historical patterns to make informed trading decisions. It uses machine learning models trained on vast amounts of market data to identify opportunities and execute trades based on your predefined strategies and risk parameters.",
      category: "general",
    },
    {
      id: "supported-markets",
      question:
        t("questions.supportedMarkets.question") || "What markets and instruments are supported?",
      answer:
        t("questions.supportedMarkets.answer") ||
        "We currently support major forex pairs, cryptocurrencies, and CFDs through our Capital.com integration. This includes popular pairs like EUR/USD, GBP/USD, BTC/USD, ETH/USD, and hundreds of other trading instruments.",
      category: "general",
    },

    // Features
    {
      id: "ai-features",
      question: t("questions.aiFeatures.question") || "What AI features are available?",
      answer:
        t("questions.aiFeatures.answer") ||
        "Our AI features include automated pattern recognition, predictive market analysis, intelligent risk management, strategy backtesting, and real-time market sentiment analysis. The AI continuously learns and adapts to market conditions to improve trading performance.",
      category: "features",
    },
    {
      id: "custom-strategies",
      question:
        t("questions.customStrategies.question") || "Can I create custom trading strategies?",
      answer:
        t("questions.customStrategies.answer") ||
        "Yes! You can create and customize trading strategies using our intuitive strategy builder. Set your own risk parameters, technical indicators, entry/exit conditions, and let our AI execute trades based on your criteria.",
      category: "features",
    },
    {
      id: "backtesting",
      question: t("questions.backtesting.question") || "Is backtesting available?",
      answer:
        t("questions.backtesting.answer") ||
        "Absolutely. Our platform includes comprehensive backtesting capabilities that allow you to test your strategies against historical market data. You can analyze performance metrics, optimize parameters, and refine your strategies before deploying them live.",
      category: "features",
    },

    // Pricing
    {
      id: "pricing-plans",
      question: t("questions.pricingPlans.question") || "What are the pricing plans?",
      answer:
        t("questions.pricingPlans.answer") ||
        "We offer a Free plan with basic features and a Pro plan at $19.99/month (or $203.89/year with 15% discount). The Pro plan includes advanced AI features, unlimited strategies, priority support, and reduced credit costs for AI analysis.",
      category: "pricing",
    },
    {
      id: "credit-system",
      question: t("questions.creditSystem.question") || "How does the credit system work?",
      answer:
        t("questions.creditSystem.answer") ||
        "Credits are used for AI-powered analysis and trading decisions. Free users pay $0.05 per credit, while Pro users pay $0.01 per credit. You can purchase credits in packages from 50 to 5,000 credits. Each AI analysis typically costs 1-5 credits depending on complexity.",
      category: "pricing",
    },
    {
      id: "free-trial",
      question: t("questions.freeTrial.question") || "Is there a free trial?",
      answer:
        t("questions.freeTrial.answer") ||
        "Yes! You can start with our Free plan immediately. No credit card required. The Free plan includes basic trading features and a limited number of AI analyses to help you get started.",
      category: "pricing",
    },

    // Security
    {
      id: "data-security",
      question: t("questions.dataSecurity.question") || "How secure is my data?",
      answer:
        t("questions.dataSecurity.answer") ||
        "We use industry-standard encryption for all data transmission and storage. Your API keys are encrypted using AES-256 encryption, and we never store your broker login credentials. All communications use SSL/TLS encryption.",
      category: "security",
    },
    {
      id: "api-keys",
      question: t("questions.apiKeys.question") || "Are my broker API keys safe?",
      answer:
        t("questions.apiKeys.answer") ||
        "Yes, your API keys are stored using military-grade encryption and are never transmitted in plain text. We use read-only API access where possible, and you maintain full control over your trading account permissions.",
      category: "security",
    },
    {
      id: "fund-safety",
      question: t("questions.fundSafety.question") || "Are my funds safe?",
      answer:
        t("questions.fundSafety.answer") ||
        "Your funds remain with your broker (Capital.com) at all times. We only connect to execute trades based on your strategies - we never hold or have access to your actual funds. You can revoke access at any time.",
      category: "security",
    },

    // Technical
    {
      id: "broker-connection",
      question: t("questions.brokerConnection.question") || "How do I connect my broker account?",
      answer:
        t("questions.brokerConnection.answer") ||
        "Currently, we support Capital.com integration. You'll need to create API credentials in your Capital.com account and securely connect them through our encrypted setup process. Detailed setup instructions are provided in your dashboard.",
      category: "technical",
    },
    {
      id: "system-requirements",
      question: t("questions.systemRequirements.question") || "What are the system requirements?",
      answer:
        t("questions.systemRequirements.answer") ||
        "Tekoa Trading is a web-based platform that works on any modern browser. No downloads or installations required. You can access your account from any device with an internet connection.",
      category: "technical",
    },
    {
      id: "api-limits",
      question: t("questions.apiLimits.question") || "Are there any API or usage limits?",
      answer:
        t("questions.apiLimits.answer") ||
        "Free users have limits on the number of active bots and AI analyses per month. Pro users have significantly higher limits. All limits are designed to ensure fair usage and optimal performance for all users.",
      category: "technical",
    },

    // Account
    {
      id: "getting-started",
      question: t("questions.gettingStarted.question") || "How do I get started?",
      answer:
        t("questions.gettingStarted.answer") ||
        "Simply sign up for a free account, connect your Capital.com broker account, and start with our pre-built strategies or create your own. Our onboarding guide will walk you through each step.",
      category: "account",
    },
    {
      id: "support",
      question: t("questions.support.question") || "What support is available?",
      answer:
        t("questions.support.answer") ||
        "We provide email support for all users, with priority support for Pro subscribers. Our comprehensive documentation, video tutorials, and community forum are available to help you get the most out of the platform.",
      category: "account",
    },
    {
      id: "cancel-subscription",
      question:
        t("questions.cancelSubscription.question") || "Can I cancel my subscription anytime?",
      answer:
        t("questions.cancelSubscription.answer") ||
        "Yes, you can cancel your Pro subscription at any time. Your access will continue until the end of your current billing period, and you can downgrade to the Free plan to keep using basic features.",
      category: "account",
    },
  ];

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const filteredFAQs = faqItems.filter((item) => {
    const matchesSearch =
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.icon : HelpCircle;
  };

  const getCategoryColor = (categoryId: string) => {
    const colors = {
      general: "bg-blue-100 text-blue-800",
      features: "bg-green-100 text-green-800",
      pricing: "bg-purple-100 text-purple-800",
      security: "bg-red-100 text-red-800",
      technical: "bg-yellow-100 text-yellow-800",
      account: "bg-indigo-100 text-indigo-800",
    };
    return colors[categoryId as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t("title") || "Frequently Asked Questions"}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("description") ||
                "Find answers to common questions about Tekoa Trading. Can't find what you're looking for? Contact our support team."}
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 space-y-4">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchPlaceholder") || "Search FAQ..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {category.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* FAQ Items */}
          <div className="space-y-4">
            {filteredFAQs.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <HelpCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    {t("noResults") || "No questions found"}
                  </h3>
                  <p className="text-muted-foreground">
                    {t("noResultsDescription") ||
                      "Try adjusting your search terms or category filter."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredFAQs.map((item) => {
                const isExpanded = expandedItems.has(item.id);
                return (
                  <Card key={item.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Badge className={getCategoryColor(item.category)} variant="secondary">
                            {categories.find((c) => c.id === item.category)?.label || item.category}
                          </Badge>
                          <CardTitle className="text-base font-semibold flex-1">
                            {item.question}
                          </CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(item.id)}
                          className="shrink-0"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="pt-0">
                        <p className="text-muted-foreground leading-relaxed">{item.answer}</p>
                      </CardContent>
                    )}
                  </Card>
                );
              })
            )}
          </div>

          {/* Contact Section */}
          <Card className="mt-16 bg-primary/5 border-primary/20">
            <CardContent className="text-center py-8">
              <h3 className="text-xl font-semibold mb-3">
                {t("stillNeedHelp") || "Still need help?"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {t("contactDescription") ||
                  "Can't find the answer you're looking for? Our support team is here to help."}
              </p>
              <Button asChild>
                <a href="/contact">{t("contactUs") || "Contact Support"}</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
