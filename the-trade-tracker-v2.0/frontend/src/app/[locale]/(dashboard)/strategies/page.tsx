"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, RefreshCwIcon, StarIcon, TrendingUpIcon, ZapIcon, BarChartIcon, ArrowRightIcon } from "lucide-react";
import { StrategyList, CreateStrategyDialog, StrategyTemplateDialog } from "@/features/strategies";
import { toast } from "sonner";
import { getStrategies } from "@/lib/api/strategy-api";
import { getTemplatesByCategory, StrategyTemplate } from "@/lib/api/strategy-template-api";
import { createDevAuthToken } from "@/lib/dev-auth";
import { apiToComponentStrategies, ComponentStrategy } from "@/lib/api/strategy-adapter";
import { motion } from "framer-motion";

export default function StrategiesPage() {
  const t = useTranslations("strategies");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [strategies, setStrategies] = useState<ComponentStrategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [featuredTemplates, setFeaturedTemplates] = useState<StrategyTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  // Fetch strategies function with memoization to prevent unnecessary re-renders
  const fetchStrategies = useCallback(
    async (showRefreshingState = true) => {
      if (showRefreshingState) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        console.log("[DEBUG] Fetching strategies");
        const data = await getStrategies();

        // Convert API strategies to the format expected by UI components
        const componentStrategies = apiToComponentStrategies(data.strategies || []);
        setStrategies(componentStrategies);
        return componentStrategies;
      } catch (error) {
        console.error("Error fetching strategies:", error);
        toast.error(t("fetchError"));
        return [];
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [t]
  );

  // Fetch featured templates for showcase
  const fetchFeaturedTemplates = useCallback(async () => {
    try {
      setTemplatesLoading(true);
      const data = await getTemplatesByCategory();

      // Get 3 most popular templates across categories
      const allTemplates = [...data.data.day_trade, ...data.data.scalping, ...data.data.swing_trade];

      // Sort by usage count and complexity, take top 3
      const featured = allTemplates
        .sort((a, b) => {
          // Prioritize beginner-friendly templates with good stats
          const scoreA = (a.usageCount || 0) + (a.winRateExpected || 0) + (a.complexity === "beginner" ? 50 : a.complexity === "intermediate" ? 25 : 0);
          const scoreB = (b.usageCount || 0) + (b.winRateExpected || 0) + (b.complexity === "beginner" ? 50 : b.complexity === "intermediate" ? 25 : 0);
          return scoreB - scoreA;
        })
        .slice(0, 3);

      setFeaturedTemplates(featured);
    } catch (error) {
      console.error("Error fetching featured templates:", error);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    // Set auth token in development mode
    if (process.env.NODE_ENV === "development") {
      createDevAuthToken();
    }

    fetchStrategies(false);
    fetchFeaturedTemplates();
  }, [fetchStrategies, fetchFeaturedTemplates]);

  // Handler when a new strategy is created
  const handleStrategyCreated = useCallback(
    async (newStrategy?: ComponentStrategy) => {
      setIsCreateDialogOpen(false);
      setIsTemplateDialogOpen(false);

      // Optimistic update - add the new strategy to the list immediately
      if (newStrategy) {
        setStrategies((prev) => [...prev, newStrategy]);
        toast.success(t("strategyCreated"));
      }

      // Then refresh to ensure we have the latest data
      await fetchStrategies();
    },
    [fetchStrategies, t]
  );

  // Handlers for strategy actions with optimistic updates
  const handleStrategyDeleted = useCallback(
    async (strategyId: number) => {
      // Optimistic update - remove the strategy from the list immediately
      setStrategies((prev) => prev.filter((s) => s.id !== strategyId));
      // Then refresh to ensure we have the latest data
      await fetchStrategies();
    },
    [fetchStrategies]
  );

  // Handle manual refresh
  const handleManualRefresh = () => {
    fetchStrategies();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "day_trade":
        return BarChartIcon;
      case "scalping":
        return ZapIcon;
      case "swing_trade":
        return TrendingUpIcon;
      default:
        return StarIcon;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "day_trade":
        return "bg-blue-500";
      case "scalping":
        return "bg-green-500";
      case "swing_trade":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "beginner":
        return "text-green-600 bg-green-50";
      case "intermediate":
        return "text-yellow-600 bg-yellow-50";
      case "advanced":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  // Show template showcase when no strategies exist
  const showTemplateShowcase = !isLoading && strategies.length === 0;

  return (
    <div className="container mx-auto px-4 py-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("description")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleManualRefresh} disabled={isRefreshing || isLoading}>
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {t("refresh")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsTemplateDialogOpen(true)}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 hover:from-yellow-600 hover:to-orange-600">
            <StarIcon className="h-4 w-4 mr-2" />
            Browse Templates
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            {t("newStrategy")}
          </Button>
        </div>
      </motion.div>

      {/* Template Showcase for New Users */}
      {showTemplateShowcase && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4">
              <StarIcon className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Get Started with Professional Templates</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose from our curated collection of proven trading strategies. Each template is designed by professionals and ready to use with your trading bots.
            </p>
          </div>

          {/* Featured Templates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {templatesLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                      <div className="h-9 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))
              : featuredTemplates.map((template, index) => {
                  const CategoryIcon = getCategoryIcon(template.category);
                  return (
                    <motion.div key={template.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 * index }}>
                      <Card className="h-full hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className={`p-2 rounded-lg ${getCategoryColor(template.category)} text-white`}>
                              <CategoryIcon className="h-5 w-5" />
                            </div>
                            <Badge variant="secondary" className={getComplexityColor(template.complexity)}>
                              {template.complexity}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg leading-tight">{template.name}</CardTitle>
                          <CardDescription className="text-sm">{template.shortDescription}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Win Rate:</span>
                              <span className="font-medium text-green-600">{template.winRateExpected || "N/A"}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Risk/Trade:</span>
                              <span className="font-medium">
                                {(template.minRiskPerTrade / 100).toFixed(1)}%-{(template.maxRiskPerTrade / 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Timeframes:</span>
                              <span className="font-medium">{template.timeframes.join(", ")}</span>
                            </div>
                            {template.indicators.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {template.indicators.slice(0, 3).map((indicator, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {indicator.type.toUpperCase()}
                                  </Badge>
                                ))}
                                {template.indicators.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{template.indicators.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <Button
                            className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                            onClick={() => setIsTemplateDialogOpen(true)}>
                            Use This Template
                            <ArrowRightIcon className="h-4 w-4 ml-2" />
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <Button
              size="lg"
              onClick={() => setIsTemplateDialogOpen(true)}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-8">
              <StarIcon className="h-5 w-5 mr-2" />
              Browse All Templates ({featuredTemplates.length > 0 ? "8" : "..."} Available)
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              Or{" "}
              <button className="text-primary underline hover:no-underline" onClick={() => setIsCreateDialogOpen(true)}>
                create a custom strategy from scratch
              </button>
            </p>
          </div>
        </motion.div>
      )}

      {/* Existing Strategies */}
      {!showTemplateShowcase && (
        <>
          {/* Quick Template Access for Existing Users */}
          {strategies.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="mb-6">
              <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg">
                        <StarIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Need More Strategies?</h3>
                        <p className="text-sm text-muted-foreground">Browse our professional templates for instant setup</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setIsTemplateDialogOpen(true)}
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white">
                      View Templates
                      <ArrowRightIcon className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <StrategyList strategies={strategies} isLoading={isLoading} isRefreshing={isRefreshing} onUpdate={fetchStrategies} onDelete={handleStrategyDeleted} />
        </>
      )}

      <CreateStrategyDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onStrategyCreated={handleStrategyCreated} />

      <StrategyTemplateDialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen} onStrategyCreated={handleStrategyCreated} />
    </div>
  );
}
