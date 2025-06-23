"use client";

import React, { useState, useEffect } from "react";
// import { useTranslations } from "next-intl"; // Not used currently
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUpIcon, ZapIcon, BarChartIcon, SearchIcon, StarIcon, ClockIcon, TargetIcon, ShieldIcon, InfoIcon, XCircleIcon } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getTemplatesByCategory, createStrategyFromTemplate, StrategyTemplate, TemplatesByCategory } from "@/lib/api/strategy-template-api";
import { ComponentStrategy } from "@/lib/api/strategy-adapter";

interface StrategyTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStrategyCreated: (newStrategy?: ComponentStrategy) => void;
}

const categoryIcons = {
  scalping: ZapIcon,
  day_trade: TrendingUpIcon,
  swing_trade: BarChartIcon,
};

const categoryLabels = {
  scalping: "Scalping",
  day_trade: "Day Trading",
  swing_trade: "Swing Trading",
};

const complexityColors = {
  beginner: "bg-green-100 text-green-800",
  intermediate: "bg-yellow-100 text-yellow-800",
  advanced: "bg-red-100 text-red-800",
};

// Available indicator types
const indicatorTypes = [
  { value: "MA", label: "Moving Average" },
  { value: "EMA", label: "Exponential Moving Average" },
  { value: "RSI", label: "Relative Strength Index" },
  { value: "MACD", label: "Moving Average Convergence Divergence" },
  { value: "BB", label: "Bollinger Bands" },
  { value: "ATR", label: "Average True Range" },
];

// Default parameters based on indicator type
const getDefaultParameters = (type: string): Record<string, string | number | boolean> => {
  switch (type) {
    case "MA":
      return { period: 14, maType: "simple" };
    case "EMA":
      return { period: 14 };
    case "RSI":
      return { period: 14, overbought: 70, oversold: 30 };
    case "MACD":
      return { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 };
    case "BB":
      return { period: 20, stdDev: 2 };
    case "ATR":
      return { period: 14 };
    default:
      return {};
  }
};

export function StrategyTemplateDialog({ open, onOpenChange, onStrategyCreated }: StrategyTemplateDialogProps) {
  const [templates, setTemplates] = useState<TemplatesByCategory>({
    scalping: [],
    day_trade: [],
    swing_trade: [],
  });
  const [selectedTemplate, setSelectedTemplate] = useState<StrategyTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customizations, setCustomizations] = useState({
    name: "",
    description: "",
    minRiskPerTrade: "",
    maxRiskPerTrade: "",
    confidenceThreshold: "",
    isPublic: false,
    indicators: [] as Array<{
      name: string;
      type: string;
      parameters: Record<string, string | number | boolean>;
    }>,
  });

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await getTemplatesByCategory();
      if (response.success) {
        setTemplates(response.data);
      } else {
        toast.error("Failed to load strategy templates");
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load strategy templates");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (template: StrategyTemplate) => {
    setSelectedTemplate(template);
    setCustomizations({
      name: `${template.name} (Custom)`,
      description: template.description,
      minRiskPerTrade: "1",
      maxRiskPerTrade: "2",
      confidenceThreshold: template.confidenceThreshold.toString(),
      isPublic: false,
      indicators:
        template.indicators?.map((ind) => ({
          name: ind.type.toUpperCase(),
          type: ind.type,
          parameters: ind.params || {},
        })) || [],
    });
  };

  const handleCreateStrategy = async () => {
    if (!selectedTemplate) return;

    setIsCreating(true);
    try {
      const response = await createStrategyFromTemplate(selectedTemplate.id, {
        name: customizations.name || undefined,
        description: customizations.description || undefined,
        minRiskPerTrade: customizations.minRiskPerTrade ? parseFloat(customizations.minRiskPerTrade) : undefined,
        maxRiskPerTrade: customizations.maxRiskPerTrade ? parseFloat(customizations.maxRiskPerTrade) : undefined,
        confidenceThreshold: customizations.confidenceThreshold ? parseInt(customizations.confidenceThreshold) : undefined,
      });

      if (response.success) {
        toast.success("Strategy created successfully from template!");
        onStrategyCreated();
        onOpenChange(false);
        // Reset state
        setSelectedTemplate(null);
        setCustomizations({
          name: "",
          description: "",
          minRiskPerTrade: "",
          maxRiskPerTrade: "",
          confidenceThreshold: "",
          isPublic: false,
          indicators: [],
        });
      } else {
        toast.error("Failed to create strategy from template");
      }
    } catch (error) {
      console.error("Error creating strategy:", error);
      toast.error("Failed to create strategy from template");
    } finally {
      setIsCreating(false);
    }
  };

  const filteredTemplates = (category: keyof TemplatesByCategory) => {
    if (!searchQuery) return templates[category];
    return templates[category].filter(
      (template) => template.name.toLowerCase().includes(searchQuery.toLowerCase()) || template.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const formatRiskValue = (value: number) => `${(value / 100).toFixed(1)}%`;

  // Handle adding new indicator
  const addIndicator = (type: string) => {
    const newIndicator = {
      name: `${indicatorTypes.find((i) => i.value === type)?.label || type}`,
      type,
      parameters: getDefaultParameters(type),
    };
    setCustomizations((prev) => ({
      ...prev,
      indicators: [...prev.indicators, newIndicator],
    }));
  };

  // Handle removing indicator
  const removeIndicator = (index: number) => {
    setCustomizations((prev) => ({
      ...prev,
      indicators: prev.indicators.filter((_, i) => i !== index),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[70vw] max-w-none h-[90vh] max-h-[90vh] overflow-hidden p-0 m-0 rounded-none !max-w-none sm:!max-w-none md:!max-w-none lg:!max-w-none xl:!max-w-none 2xl:!max-w-none flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <StarIcon className="h-6 w-6 text-yellow-500" />
            Choose Strategy Template
          </DialogTitle>
          <DialogDescription className="text-base">Select from our professional trading strategies or customize them to your needs</DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Content - Template Categories & List */}
          <div className={`${selectedTemplate ? "w-3/4" : "w-full"} transition-all duration-300 flex flex-col h-full`}>
            {/* Search Bar */}
            <div className="p-4 md:p-6 border-b">
              <div className="relative w-full">
                <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 md:h-5 w-4 md:w-5 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 md:pl-12 h-10 md:h-12 text-sm md:text-base w-full"
                />
              </div>
            </div>

            {/* Category Tabs */}
            <div className="px-4 md:px-6 py-3 md:py-4 border-b">
              <Tabs defaultValue="day_trade" className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-10 md:h-12">
                  {Object.entries(categoryLabels).map(([key, label]) => {
                    const Icon = categoryIcons[key as keyof typeof categoryIcons];
                    const count = templates[key as keyof TemplatesByCategory]?.length || 0;
                    return (
                      <TabsTrigger key={key} value={key} className="flex items-center gap-1 md:gap-2 text-xs md:text-base font-medium">
                        <Icon className="h-3 md:h-5 w-3 md:w-5" />
                        <span className="hidden sm:inline">{label}</span>
                        <span className="sm:hidden">{key === "day_trade" ? "Day" : key === "swing_trade" ? "Swing" : "Scalping"}</span>
                        <Badge variant="secondary" className="ml-1 md:ml-2 text-xs">
                          {count}
                        </Badge>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {/* Template Cards Container */}
                <div className="mt-4 md:mt-6 flex-1">
                  {Object.keys(categoryLabels).map((category) => (
                    <TabsContent key={category} value={category} className="mt-0 h-full">
                      <div className="h-[50vh] md:h-[60vh] overflow-y-auto px-2 md:px-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                          {isLoading
                            ? Array.from({ length: 4 }).map((_, i) => (
                                <Card key={i} className="animate-pulse h-64">
                                  <CardHeader className="pb-3">
                                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-2">
                                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))
                            : filteredTemplates(category as keyof TemplatesByCategory).map((template) => (
                                <motion.div key={template.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                  <Card
                                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 h-80 flex flex-col bg-white dark:bg-gray-800 ${
                                      selectedTemplate?.id === template.id
                                        ? "border-primary bg-primary/5 shadow-lg"
                                        : "border-gray-200 dark:border-gray-700 hover:border-primary/30"
                                    }`}
                                    onClick={() => handleTemplateSelect(template)}>
                                    {/* Card Header - Fixed height */}
                                    <CardHeader className="pb-3 pt-4 px-4 flex-shrink-0">
                                      <div className="flex justify-between items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                          <CardTitle className="text-base font-bold text-gray-900 dark:text-white mb-2 leading-tight line-clamp-2">{template.name}</CardTitle>
                                          <Badge variant="secondary" className={`text-xs font-medium ${complexityColors[template.complexity]}`}>
                                            {template.complexity}
                                          </Badge>
                                        </div>
                                      </div>
                                    </CardHeader>

                                    {/* Card Content - Flexible height */}
                                    <CardContent className="px-4 pb-4 flex-1 flex flex-col justify-between">
                                      {/* Description */}
                                      <div className="mb-4">
                                        <p className="text-sm text-gray-700 dark:text-gray-400 line-clamp-3 leading-relaxed">{template.shortDescription}</p>
                                      </div>

                                      {/* Stats - Always at bottom */}
                                      <div className="space-y-3 mt-auto">
                                        {/* Win Rate & Risk */}
                                        <div className="flex justify-between items-center text-sm">
                                          <div className="flex items-center gap-1">
                                            <TargetIcon className="h-4 w-4 text-green-600 flex-shrink-0" />
                                            <span className="text-gray-600 dark:text-gray-400">Win:</span>
                                            <span className="font-semibold text-green-600">{template.winRateExpected || "N/A"}%</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <ShieldIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                            <span className="text-gray-600 dark:text-gray-400">Risk:</span>
                                            <span className="font-semibold text-blue-600">
                                              {formatRiskValue(template.minRiskPerTrade)}-{formatRiskValue(template.maxRiskPerTrade)}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Timeframes */}
                                        <div className="flex items-center gap-2 text-sm">
                                          <ClockIcon className="h-4 w-4 text-purple-600 flex-shrink-0" />
                                          <div className="min-w-0 flex-1">
                                            <span className="text-gray-600 dark:text-gray-400 text-xs">Timeframes:</span>
                                            <div className="font-semibold text-purple-600 text-xs truncate" title={template.timeframes.join(", ")}>
                                              {template.timeframes.join(", ")}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </motion.div>
                              ))}
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </div>
              </Tabs>
            </div>
          </div>

          {/* Right Panel - Template Details & Customization */}
          {selectedTemplate && (
            <div className="w-1/4 border-l flex flex-col h-full max-h-[90vh]">
              <motion.div key={selectedTemplate.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full">
                {/* Header */}
                <div className="p-4 border-b flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <InfoIcon className="h-4 w-4 text-primary" />
                    <h3 className="text-base md:text-lg font-semibold">Customize Template</h3>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                  {/* Template Info */}
                  <div className="p-3 md:p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold text-base md:text-lg mb-2">{selectedTemplate.name}</h4>
                    <p className="text-xs md:text-sm text-muted-foreground mb-3 leading-relaxed">{selectedTemplate.description}</p>
                    <div className="flex gap-1 md:gap-2 flex-wrap">
                      <Badge className={`text-xs ${complexityColors[selectedTemplate.complexity]}`}>{selectedTemplate.complexity}</Badge>
                      <Badge variant="outline" className="text-xs">
                        {selectedTemplate.category.replace("_", " ")}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {selectedTemplate.usageCount} uses
                      </Badge>
                    </div>
                  </div>

                  {/* Customization Form */}
                  <div className="space-y-3 md:space-y-4">
                    <h4 className="font-semibold text-sm md:text-base">Customization</h4>

                    <div className="space-y-3 md:space-y-4">
                      <div>
                        <Label htmlFor="name" className="text-xs md:text-sm font-medium">
                          Strategy Name
                        </Label>
                        <Input
                          id="name"
                          value={customizations.name}
                          onChange={(e) => setCustomizations((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder={selectedTemplate.name}
                          className="mt-1 md:mt-2 text-xs md:text-sm h-8 md:h-10"
                        />
                      </div>

                      <div>
                        <Label htmlFor="description" className="text-xs md:text-sm font-medium">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          value={customizations.description}
                          onChange={(e) => setCustomizations((prev) => ({ ...prev, description: e.target.value }))}
                          placeholder={selectedTemplate.shortDescription}
                          rows={2}
                          className="mt-1 md:mt-2 text-xs md:text-sm resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Indicators Section */}
                  <div className="space-y-3 md:space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-sm md:text-base">Indicators</h4>
                      <div className="flex gap-2">
                        <Select onValueChange={(value) => value && addIndicator(value)}>
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue placeholder="Add..." />
                          </SelectTrigger>
                          <SelectContent>
                            {indicatorTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value} className="text-xs">
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {customizations.indicators.map((indicator, index) => (
                      <div key={index} className="p-3 border rounded-lg bg-muted/30">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-xs md:text-sm">{indicator.name}</span>
                          {customizations.indicators.length > 0 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeIndicator(index)} className="h-6 w-6 p-0">
                              <XCircleIcon className="h-3 w-3 text-red-500" />
                            </Button>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Type: {indicator.type} | Parameters: {Object.keys(indicator.parameters).length} configured
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Risk Management */}
                  <div className="space-y-3 md:space-y-4">
                    <h4 className="font-semibold text-sm md:text-base">Risk Management</h4>

                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                      <div>
                        <Label htmlFor="minRisk" className="text-xs md:text-sm font-medium">
                          Min Risk %
                        </Label>
                        <Input
                          id="minRisk"
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="10"
                          value={customizations.minRiskPerTrade}
                          onChange={(e) => setCustomizations((prev) => ({ ...prev, minRiskPerTrade: e.target.value }))}
                          placeholder={formatRiskValue(selectedTemplate.minRiskPerTrade)}
                          className="mt-1 md:mt-2 text-xs md:text-sm h-8 md:h-10"
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxRisk" className="text-xs md:text-sm font-medium">
                          Max Risk %
                        </Label>
                        <Input
                          id="maxRisk"
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="10"
                          value={customizations.maxRiskPerTrade}
                          onChange={(e) => setCustomizations((prev) => ({ ...prev, maxRiskPerTrade: e.target.value }))}
                          placeholder={formatRiskValue(selectedTemplate.maxRiskPerTrade)}
                          className="mt-1 md:mt-2 text-xs md:text-sm h-8 md:h-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="confidence" className="text-xs md:text-sm font-medium">
                        Confidence Threshold %
                      </Label>
                      <Input
                        id="confidence"
                        type="number"
                        min="50"
                        max="95"
                        value={customizations.confidenceThreshold}
                        onChange={(e) => setCustomizations((prev) => ({ ...prev, confidenceThreshold: e.target.value }))}
                        placeholder={selectedTemplate.confidenceThreshold.toString()}
                        className="mt-1 md:mt-2 text-xs md:text-sm h-8 md:h-10"
                      />
                    </div>
                  </div>

                  {/* Strategy Stats */}
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold text-sm mb-3">Strategy Statistics</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block">Expected Win Rate</span>
                        <div className="font-semibold text-green-600 text-base">{selectedTemplate.winRateExpected || "N/A"}%</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Risk/Reward</span>
                        <div className="font-semibold text-base">{selectedTemplate.riskRewardRatio}:1</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Market Condition</span>
                        <div className="font-semibold text-base capitalize">{selectedTemplate.marketCondition}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Usage Count</span>
                        <div className="font-semibold text-base">{selectedTemplate.usageCount}</div>
                      </div>
                    </div>
                  </div>

                  {/* Indicators */}
                  {selectedTemplate.indicators.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-3">Required Indicators</h4>
                      <div className="space-y-2">
                        {selectedTemplate.indicators.map((indicator, i) => (
                          <div key={i} className="p-3 bg-muted/30 rounded-lg">
                            <div className="font-medium text-sm">{indicator.type.toUpperCase()}</div>
                            <div className="text-xs text-muted-foreground mt-1">{indicator.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Make Strategy Public */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-semibold text-xs md:text-sm">Make Strategy Public</h4>
                      <p className="text-xs text-muted-foreground">Allow other users to view and use this strategy</p>
                    </div>
                    <Switch checked={customizations.isPublic} onCheckedChange={(checked) => setCustomizations((prev) => ({ ...prev, isPublic: checked }))} />
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t px-4 md:px-6 py-3 md:py-4 flex-shrink-0 bg-white dark:bg-gray-800">
          <div className="flex justify-end gap-3 w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="px-6 py-2 text-sm">
              Cancel
            </Button>
            <Button onClick={handleCreateStrategy} disabled={!selectedTemplate || isCreating} className="px-6 py-2 text-sm bg-primary hover:bg-primary/90">
              {isCreating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Strategy...
                </>
              ) : (
                "Save & Create Strategy"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
