"use client";

import React, { useState } from "react";
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

const AVAILABLE_INDICATORS = [
  { value: "sma", label: "Simple Moving Average (SMA)" },
  { value: "ema", label: "Exponential Moving Average (EMA)" },
  { value: "rsi", label: "Relative Strength Index (RSI)" },
  { value: "macd", label: "MACD" },
  { value: "bollinger", label: "Bollinger Bands" },
  { value: "stochastic", label: "Stochastic Oscillator" },
];

export function CreateStrategyDialog({ open, onOpenChange, onSuccess }: CreateStrategyDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  const [parameters, setParameters] = useState({
    stopLoss: "2",
    takeProfit: "4",
    positionSize: "1",
    maxDrawdown: "10",
  });

  const createStrategyMutation = trpc.strategies.create.useMutation();

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
          acc[ind] = { enabled: true };
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
    setSelectedIndicators((prev) =>
      prev.includes(indicator) ? prev.filter((i) => i !== indicator) : [...prev, indicator],
    );
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

            <TabsContent value="indicators" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Select Indicators</Label>
                <div className="grid grid-cols-2 gap-4">
                  {AVAILABLE_INDICATORS.map((indicator) => (
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
