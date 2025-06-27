"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../shared/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "../shared/components/ui/card";
import { Badge } from "../shared/components/ui/badge";
import { Button } from "../shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../shared/components/ui/tabs";
import { Input } from "../shared/components/ui/input";
import { Label } from "../shared/components/ui/label";
import { Textarea } from "../shared/components/ui/textarea";
import { Separator } from "../shared/components/ui/separator";
import {
  TrendingUpIcon,
  ZapIcon,
  BarChartIcon,
  SearchIcon,
  StarIcon,
  ClockIcon,
  TargetIcon,
  ShieldIcon,
  InfoIcon,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "../../lib/trpc";

interface StrategyTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  shortDescription: string;
  indicators: any[];
  timeframes: string[];
  entryConditions: string[];
  exitConditions: string[];
  riskManagement: any;
  minRiskPerTrade: number;
  maxRiskPerTrade: number;
  confidenceThreshold: number;
  winRateExpected?: number;
  riskRewardRatio?: number;
  complexity: string;
  marketCondition: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface TemplatesByCategory {
  scalping: StrategyTemplate[];
  day_trade: StrategyTemplate[];
  swing_trade: StrategyTemplate[];
}

interface StrategyTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStrategyCreated: () => void;
}

const categoryIcons = {
  scalping: <ZapIcon className="h-4 w-4" />,
  day_trade: <TrendingUpIcon className="h-4 w-4" />,
  swing_trade: <BarChartIcon className="h-4 w-4" />,
};

const complexityColors = {
  beginner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function StrategyTemplateDialog({
  open,
  onOpenChange,
  onStrategyCreated,
}: StrategyTemplateDialogProps) {
  const [templates, setTemplates] = useState<TemplatesByCategory>({
    scalping: [],
    day_trade: [],
    swing_trade: [],
  });
  const [selectedTemplate, setSelectedTemplate] = useState<StrategyTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [customizations, setCustomizations] = useState({
    name: "",
    description: "",
    minRiskPerTrade: "",
    maxRiskPerTrade: "",
    confidenceThreshold: "",
  });
  const [indicatorCustomizations, setIndicatorCustomizations] = useState<
    Record<string, Record<string, any>>
  >({});

  const {
    data: templatesByCategory,
    isLoading,
    refetch,
  } = trpc.strategyTemplates.getByCategory.useQuery(undefined, { enabled: open });

  const createFromTemplateMutation = trpc.strategyTemplates.createFromTemplate.useMutation();

  useEffect(() => {
    if (templatesByCategory) {
      setTemplates(templatesByCategory);
    }
  }, [templatesByCategory]);

  const handleTemplateSelect = (template: StrategyTemplate) => {
    setSelectedTemplate(template);
    setCustomizations({
      name: `${template.name} (Custom)`,
      description: template.description,
      minRiskPerTrade: (template.minRiskPerTrade / 100).toString(),
      maxRiskPerTrade: (template.maxRiskPerTrade / 100).toString(),
      confidenceThreshold: template.confidenceThreshold.toString(),
    });

    // Initialize indicator customizations with template values
    const initialIndicatorParams: Record<string, Record<string, any>> = {};
    template.indicators?.forEach((indicator, index) => {
      const key = `${indicator.type}_${index}`;
      initialIndicatorParams[key] = { ...indicator.params };
    });
    setIndicatorCustomizations(initialIndicatorParams);
  };

  const handleCreateStrategy = async () => {
    if (!selectedTemplate) return;

    try {
      await createFromTemplateMutation.mutateAsync({
        templateId: selectedTemplate.id,
        customizations: {
          name: customizations.name || undefined,
          description: customizations.description || undefined,
          minRiskPerTrade: customizations.minRiskPerTrade
            ? parseFloat(customizations.minRiskPerTrade) * 100
            : undefined,
          maxRiskPerTrade: customizations.maxRiskPerTrade
            ? parseFloat(customizations.maxRiskPerTrade) * 100
            : undefined,
          confidenceThreshold: customizations.confidenceThreshold
            ? parseInt(customizations.confidenceThreshold)
            : undefined,
          indicatorParams: indicatorCustomizations,
        },
      });

      toast.success("Strategy created successfully from template!");
      onStrategyCreated();
      onOpenChange(false);
      // Reset state
      setSelectedTemplate(null);
      setIndicatorCustomizations({});
      setCustomizations({
        name: "",
        description: "",
        minRiskPerTrade: "",
        maxRiskPerTrade: "",
        confidenceThreshold: "",
      });
    } catch (error) {
      console.error("Error creating strategy:", error);
      toast.error("Failed to create strategy from template");
    }
  };

  const filteredTemplates = (category: keyof TemplatesByCategory) => {
    if (!searchQuery) return templates[category];
    return templates[category].filter(
      (template) =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  };

  const formatRiskValue = (value: number) => `${(value / 100).toFixed(1)}%`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-7xl h-[90vh] max-h-[90vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <StarIcon className="h-6 w-6 text-yellow-500" />
            Choose Strategy Template
          </DialogTitle>
          <DialogDescription className="text-base">
            Select from our professional trading strategies or customize them to your needs
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Left side - Template selection */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search */}
            <div className="p-4 border-b flex-shrink-0">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search strategies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Template categories */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Loading templates...</p>
                </div>
              ) : (
                <Tabs defaultValue="day_trade" className="h-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="scalping" className="flex items-center gap-2">
                      {categoryIcons.scalping}
                      Scalping
                    </TabsTrigger>
                    <TabsTrigger value="day_trade" className="flex items-center gap-2">
                      {categoryIcons.day_trade}
                      Day Trading
                    </TabsTrigger>
                    <TabsTrigger value="swing_trade" className="flex items-center gap-2">
                      {categoryIcons.swing_trade}
                      Swing Trading
                    </TabsTrigger>
                  </TabsList>

                  {(["scalping", "day_trade", "swing_trade"] as const).map((category) => (
                    <TabsContent key={category} value={category} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredTemplates(category).map((template) => (
                          <Card
                            key={template.id}
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              selectedTemplate?.id === template.id ? "ring-2 ring-primary" : ""
                            }`}
                            onClick={() => handleTemplateSelect(template)}
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between">
                                <CardTitle className="text-lg">{template.name}</CardTitle>
                                <Badge
                                  className={
                                    complexityColors[
                                      template.complexity as keyof typeof complexityColors
                                    ]
                                  }
                                >
                                  {template.complexity}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {template.shortDescription}
                              </p>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <ClockIcon className="h-4 w-4 text-muted-foreground" />
                                  <span>{template.timeframes.join(", ")}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <TargetIcon className="h-4 w-4 text-muted-foreground" />
                                  <span>
                                    Risk: {formatRiskValue(template.minRiskPerTrade)} -{" "}
                                    {formatRiskValue(template.maxRiskPerTrade)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <ShieldIcon className="h-4 w-4 text-muted-foreground" />
                                  <span>R:R {template.riskRewardRatio || "N/A"}</span>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {template.marketCondition}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {template.usageCount} uses
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </div>
          </div>

          {/* Right side - Template details and customization */}
          {selectedTemplate && (
            <div className="w-1/3 border-l flex flex-col h-full">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-4 border-b flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <InfoIcon className="h-4 w-4 text-primary" />
                    <h3 className="text-lg font-semibold">Customize Template</h3>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Template Info */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold text-lg mb-2">{selectedTemplate.name}</h4>
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                      {selectedTemplate.description}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge
                        className={
                          complexityColors[
                            selectedTemplate.complexity as keyof typeof complexityColors
                          ]
                        }
                      >
                        {selectedTemplate.complexity}
                      </Badge>
                      <Badge variant="outline">{selectedTemplate.category.replace("_", " ")}</Badge>
                      <Badge variant="secondary">{selectedTemplate.usageCount} uses</Badge>
                    </div>
                  </div>

                  {/* Customization Form */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Customization</h4>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name" className="text-sm font-medium">
                          Strategy Name
                        </Label>
                        <Input
                          id="name"
                          value={customizations.name}
                          onChange={(e) =>
                            setCustomizations((prev) => ({ ...prev, name: e.target.value }))
                          }
                          placeholder={selectedTemplate.name}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label htmlFor="description" className="text-sm font-medium">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          value={customizations.description}
                          onChange={(e) =>
                            setCustomizations((prev) => ({ ...prev, description: e.target.value }))
                          }
                          placeholder={selectedTemplate.shortDescription}
                          rows={3}
                          className="mt-2 resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Risk Management */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Risk Management</h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="minRisk" className="text-sm font-medium">
                          Min Risk %
                        </Label>
                        <Input
                          id="minRisk"
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="10"
                          value={customizations.minRiskPerTrade}
                          onChange={(e) =>
                            setCustomizations((prev) => ({
                              ...prev,
                              minRiskPerTrade: e.target.value,
                            }))
                          }
                          placeholder={formatRiskValue(selectedTemplate.minRiskPerTrade)}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxRisk" className="text-sm font-medium">
                          Max Risk %
                        </Label>
                        <Input
                          id="maxRisk"
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="10"
                          value={customizations.maxRiskPerTrade}
                          onChange={(e) =>
                            setCustomizations((prev) => ({
                              ...prev,
                              maxRiskPerTrade: e.target.value,
                            }))
                          }
                          placeholder={formatRiskValue(selectedTemplate.maxRiskPerTrade)}
                          className="mt-2"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="confidence" className="text-sm font-medium">
                        Confidence Threshold %
                      </Label>
                      <Input
                        id="confidence"
                        type="number"
                        min="50"
                        max="95"
                        value={customizations.confidenceThreshold}
                        onChange={(e) =>
                          setCustomizations((prev) => ({
                            ...prev,
                            confidenceThreshold: e.target.value,
                          }))
                        }
                        placeholder={selectedTemplate.confidenceThreshold.toString()}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  {/* Strategy Stats */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Strategy Statistics</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="p-3 bg-muted/30 rounded">
                        <div className="font-medium">Win Rate</div>
                        <div className="text-lg font-bold text-green-600">
                          {selectedTemplate.winRateExpected || "N/A"}%
                        </div>
                      </div>
                      <div className="p-3 bg-muted/30 rounded">
                        <div className="font-medium">Risk/Reward</div>
                        <div className="text-lg font-bold text-blue-600">
                          {selectedTemplate.riskRewardRatio || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Indicators */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Configure Indicators</h4>
                    <div className="space-y-3">
                      {selectedTemplate.indicators?.map((indicator, index) => {
                        const key = `${indicator.type}_${index}`;
                        const currentParams =
                          indicatorCustomizations[key] || indicator.params || {};

                        return (
                          <div key={index} className="p-3 border rounded-lg bg-muted/20">
                            <div className="font-medium mb-2">{indicator.type?.toUpperCase()}</div>
                            <div className="text-xs text-muted-foreground mb-3">
                              {indicator.description}
                            </div>

                            {/* Parameter inputs */}
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(currentParams).map(([param, value]) => (
                                <div key={param} className="space-y-1">
                                  <Label className="text-xs capitalize">
                                    {param.replace(/_/g, " ")}
                                  </Label>
                                  {param === "color" ? (
                                    <Input
                                      type="color"
                                      value={value as string}
                                      onChange={(e) => {
                                        setIndicatorCustomizations((prev) => ({
                                          ...prev,
                                          [key]: { ...prev[key], [param]: e.target.value },
                                        }));
                                      }}
                                      className="h-7 w-full"
                                    />
                                  ) : (
                                    <Input
                                      type="number"
                                      value={value as string | number}
                                      onChange={(e) => {
                                        const newValue =
                                          param.includes("af") || param.includes("std")
                                            ? parseFloat(e.target.value) || e.target.value
                                            : parseInt(e.target.value) || e.target.value;
                                        setIndicatorCustomizations((prev) => ({
                                          ...prev,
                                          [key]: { ...prev[key], [param]: newValue },
                                        }));
                                      }}
                                      step={
                                        param.includes("af") || param.includes("std") ? "0.01" : "1"
                                      }
                                      min={param.includes("period") ? "1" : undefined}
                                      className="h-7"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4 flex-shrink-0">
          <div className="flex justify-end gap-3 w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateStrategy}
              disabled={!selectedTemplate || createFromTemplateMutation.isLoading}
            >
              {createFromTemplateMutation.isLoading ? (
                <>
                  <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Creating Strategy...
                </>
              ) : (
                "Create Strategy"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
