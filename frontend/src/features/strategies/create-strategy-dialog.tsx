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
import { Button } from "../shared/components/ui/button";
import { Input } from "../shared/components/ui/input";
import { Label } from "../shared/components/ui/label";
import { Textarea } from "../shared/components/ui/textarea";
import { Switch } from "../shared/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../shared/components/ui/select";
import { trpc } from "../../lib/trpc";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../shared/components/ui/tabs";

interface CreateStrategyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Indicator {
  name: string;
  displayName: string;
  params: string[];
  defaults: Record<string, any>;
  panel: string;
}

const FALLBACK_INDICATORS = [
  { value: "sma", label: "Simple Moving Average (SMA)" },
  { value: "ema", label: "Exponential Moving Average (EMA)" },
  { value: "wma", label: "Weighted Moving Average (WMA)" },
  { value: "rsi", label: "Relative Strength Index (RSI)" },
  { value: "macd", label: "MACD" },
  { value: "bollinger", label: "Bollinger Bands" },
  { value: "stochastic", label: "Stochastic Oscillator" },
  { value: "atr", label: "Average True Range (ATR)" },
  { value: "vwap", label: "Volume Weighted Average Price (VWAP)" },
  { value: "volume", label: "Volume" },
  { value: "cci", label: "Commodity Channel Index (CCI)" },
  { value: "williams_r", label: "Williams %R" },
  { value: "adx", label: "Average Directional Index (ADX)" },
  { value: "psar", label: "Parabolic SAR" },
];

export function CreateStrategyDialog({ open, onOpenChange, onSuccess }: CreateStrategyDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  const [availableIndicators, setAvailableIndicators] = useState(FALLBACK_INDICATORS);
  const [indicatorParams, setIndicatorParams] = useState<Record<string, Record<string, any>>>({});
  const [parameters, setParameters] = useState({
    stopLoss: "2",
    takeProfit: "4",
    positionSize: "1",
    maxDrawdown: "10",
  });

  const createStrategyMutation = trpc.strategies.create.useMutation();

  // Fetch supported indicators from the backend
  const { data: supportedIndicators, isLoading: indicatorsLoading } =
    trpc.strategyTemplates.getSupportedIndicators.useQuery(undefined, {
      enabled: open, // Only fetch when dialog is open
    });

  useEffect(() => {
    if (supportedIndicators && supportedIndicators.length > 0) {
      // Map backend indicator format to frontend format
      const mappedIndicators = supportedIndicators.map((indicator: any) => ({
        value: indicator.name,
        label: `${indicator.displayName} (${indicator.name.toUpperCase()})`,
      }));
      setAvailableIndicators(mappedIndicators);
    }
  }, [supportedIndicators]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a strategy name");
      return;
    }

    if (selectedIndicators.length === 0) {
      toast.error("Please select at least one indicator");
      return;
    }

    try {
      const indicators = selectedIndicators.reduce(
        (acc, ind) => {
          acc[ind] = {
            enabled: true,
            params: indicatorParams[ind] || {},
          };
          return acc;
        },
        {} as Record<string, any>,
      );

      await createStrategyMutation.mutateAsync({
        name,
        description,
        indicators,
        parameters,
        isActive,
      });

      toast.success("Strategy created successfully");

      // Reset form
      setName("");
      setDescription("");
      setSelectedIndicators([]);
      setIndicatorParams({});
      setParameters({
        stopLoss: "2",
        takeProfit: "4",
        positionSize: "1",
        maxDrawdown: "10",
      });

      onSuccess();
    } catch (error) {
      toast.error("Failed to create strategy");
    }
  };

  const toggleIndicator = (indicator: string) => {
    setSelectedIndicators((prev) => {
      const isSelected = prev.includes(indicator);
      if (isSelected) {
        // Remove indicator and its parameters
        setIndicatorParams((prevParams) => {
          const newParams = { ...prevParams };
          delete newParams[indicator];
          return newParams;
        });
        return prev.filter((i) => i !== indicator);
      } else {
        // Add indicator and initialize with default parameters
        const indicatorInfo = supportedIndicators?.find((ind: any) => ind.name === indicator);
        if (indicatorInfo) {
          setIndicatorParams((prevParams) => ({
            ...prevParams,
            [indicator]: { ...indicatorInfo.defaults },
          }));
        }
        return [...prev, indicator];
      }
    });
  };

  const updateIndicatorParam = (indicator: string, param: string, value: any) => {
    setIndicatorParams((prev) => ({
      ...prev,
      [indicator]: {
        ...prev[indicator],
        [param]: value,
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Strategy</DialogTitle>
            <DialogDescription>
              Define your trading strategy with indicators and parameters
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="indicators">Indicators</TabsTrigger>
              <TabsTrigger value="parameters">Parameters</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Strategy Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Trend Following Strategy"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your strategy..."
                  rows={4}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
                <Label htmlFor="active">Active</Label>
              </div>
            </TabsContent>

            <TabsContent value="indicators" className="space-y-4 mt-4 max-h-96 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <Label>Select Indicators</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    {availableIndicators.map((indicator) => (
                      <div
                        key={indicator.value}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedIndicators.includes(indicator.value)
                            ? "border-primary bg-primary/5"
                            : "border-input hover:border-primary/50"
                        }`}
                        onClick={() => toggleIndicator(indicator.value)}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedIndicators.includes(indicator.value)}
                            onChange={() => {}}
                            className="h-4 w-4"
                          />
                          <span className="text-sm font-medium">{indicator.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Indicator Parameters Configuration */}
                {selectedIndicators.length > 0 && (
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">
                      Configure Indicator Parameters
                    </Label>
                    {selectedIndicators.map((indicatorName) => {
                      const indicatorInfo = supportedIndicators?.find(
                        (ind: any) => ind.name === indicatorName,
                      );
                      if (!indicatorInfo) return null;

                      return (
                        <div key={indicatorName} className="p-4 border rounded-lg bg-muted/30">
                          <h4 className="font-medium mb-3">{indicatorInfo.displayName}</h4>
                          <div className="grid grid-cols-2 gap-3">
                            {indicatorInfo.params.map((param: string) => {
                              const currentValue =
                                indicatorParams[indicatorName]?.[param] ??
                                indicatorInfo.defaults[param];

                              return (
                                <div key={param} className="space-y-1">
                                  <Label
                                    htmlFor={`${indicatorName}-${param}`}
                                    className="text-xs capitalize"
                                  >
                                    {param.replace(/_/g, " ")}
                                  </Label>
                                  {param === "color" ? (
                                    <Input
                                      id={`${indicatorName}-${param}`}
                                      type="color"
                                      value={currentValue}
                                      onChange={(e) =>
                                        updateIndicatorParam(indicatorName, param, e.target.value)
                                      }
                                      className="h-8"
                                    />
                                  ) : (
                                    <Input
                                      id={`${indicatorName}-${param}`}
                                      type="number"
                                      value={currentValue}
                                      onChange={(e) =>
                                        updateIndicatorParam(
                                          indicatorName,
                                          param,
                                          parseFloat(e.target.value) || e.target.value,
                                        )
                                      }
                                      step={param.includes("af") ? "0.01" : "1"}
                                      min={param.includes("period") ? "1" : undefined}
                                      className="h-8"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="parameters" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stopLoss">Stop Loss (%)</Label>
                  <Input
                    id="stopLoss"
                    type="number"
                    value={parameters.stopLoss}
                    onChange={(e) => setParameters({ ...parameters, stopLoss: e.target.value })}
                    placeholder="2"
                    min="0.1"
                    max="100"
                    step="0.1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="takeProfit">Take Profit (%)</Label>
                  <Input
                    id="takeProfit"
                    type="number"
                    value={parameters.takeProfit}
                    onChange={(e) => setParameters({ ...parameters, takeProfit: e.target.value })}
                    placeholder="4"
                    min="0.1"
                    max="100"
                    step="0.1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="positionSize">Position Size (%)</Label>
                  <Input
                    id="positionSize"
                    type="number"
                    value={parameters.positionSize}
                    onChange={(e) => setParameters({ ...parameters, positionSize: e.target.value })}
                    placeholder="1"
                    min="0.1"
                    max="100"
                    step="0.1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxDrawdown">Max Drawdown (%)</Label>
                  <Input
                    id="maxDrawdown"
                    type="number"
                    value={parameters.maxDrawdown}
                    onChange={(e) => setParameters({ ...parameters, maxDrawdown: e.target.value })}
                    placeholder="10"
                    min="1"
                    max="100"
                    step="1"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createStrategyMutation.isPending}>
              {createStrategyMutation.isPending ? "Creating..." : "Create Strategy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
