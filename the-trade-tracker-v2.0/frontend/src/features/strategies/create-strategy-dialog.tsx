import React, { useState } from "react";

// Helper function to get auth token - consistent with bot creation page
const getAuthToken = (): string => {
  // Get authentication token
  let authToken = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

  // Make sure token has Bearer prefix
  if (authToken && !authToken.startsWith("Bearer ")) {
    authToken = `Bearer ${authToken}`;
  }

  // Debug token for development - using base64 encoded JSON that backend accepts
  const devTokenData = {
    userId: 1,
    id: 1,
    email: "dev@example.com",
  };
  const devToken = "Bearer " + Buffer.from(JSON.stringify(devTokenData)).toString("base64");

  const finalToken = authToken || devToken;
  console.log("[DEBUG] Using auth header:", finalToken);
  console.log("[DEBUG] Auth token validation:", {
    hasToken: Boolean(finalToken),
    format: finalToken?.startsWith("Bearer ") ? "Valid Bearer format" : "Invalid format",
    token: finalToken?.substring(0, 40) + "...", // Show first part for debugging
  });

  return finalToken;
};
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, SubmitHandler } from "react-hook-form";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircleIcon, XCircleIcon } from "lucide-react";

import { ComponentStrategy } from "@/lib/api/strategy-adapter";

interface CreateStrategyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStrategyCreated: (newStrategy?: ComponentStrategy) => void;
}

// Indicator parameter schema varies based on indicator type
const indicatorParameterSchema = z.record(z.union([z.string(), z.number(), z.boolean()]));

// Form schema
const strategyFormSchema = z.object({
  type: z.string().default("custom"),
  name: z.string().min(3, { message: "Strategy name must be at least 3 characters" }),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
  indicators: z
    .array(
      z.object({
        type: z.string(),
        name: z.string(),
        parameters: z.record(z.union([z.string(), z.number(), z.boolean()])),
      })
    )
    .default([]),
  riskControls: z
    .object({
      minRiskPerTrade: z.number().min(0.1).max(10).default(0.5),
      maxRiskPerTrade: z.number().min(0.5).max(20).default(2.0),
    })
    .default({
      minRiskPerTrade: 0.5,
      maxRiskPerTrade: 2.0,
    }),
  confidenceThreshold: z.number().min(0).max(100).default(70),
});

// Form value type
type StrategyFormValues = z.infer<typeof strategyFormSchema>;

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
const getDefaultParameters = (type: string): Record<string, any> => {
  switch (type) {
    case "MA":
      return { period: 14, maType: "simple" };
    case "RSI":
      return { period: 14, overbought: 70, oversold: 30 };
    case "MACD":
      return { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 };
    case "BB":
      return { period: 20, stdDev: 2 };
    case "STOCH":
      return { kPeriod: 14, dPeriod: 3, slowing: 3 };
    case "ADX":
      return { period: 14 };
    case "CCI":
      return { period: 20 };
    case "ATR":
      return { period: 14 };
    default:
      return {};
  }
};

export function CreateStrategyDialog({ open, onOpenChange, onStrategyCreated }: CreateStrategyDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with default values
  const defaultValues = {
    type: "custom",
    name: "",
    description: "",
    isPublic: false,
    indicators: [],
    riskControls: {
      minRiskPerTrade: 0.5,
      maxRiskPerTrade: 2.0,
    },
    confidenceThreshold: 70,
  };

  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(strategyFormSchema) as any,
    defaultValues,
  });

  // Field array for dynamic indicators
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "indicators",
  });

  // Handle indicator type change
  const handleIndicatorTypeChange = (value: string, index: number): void => {
    // Get the current indicator
    const currentIndicator = form.getValues().indicators[index];

    if (currentIndicator) {
      // Update with default parameters for the new type
      form.setValue(
        `indicators.${index}`,
        {
          ...currentIndicator,
          type: value,
          parameters: getDefaultParameters(value),
        },
        { shouldValidate: true }
      );
    }
  };

  // Submit form handler
  const handleSubmit: SubmitHandler<StrategyFormValues> = async (data) => {
    setIsSubmitting(true);

    try {
      const indicators = data.indicators?.map((indicator: any) => ({
        name: indicator.name,
        type: indicator.type,
        parameters: indicator.parameters,
      }));

      // Get auth token
      const finalToken = getAuthToken();

      // Convert percentage values to basis points (integers where 100 = 1%)
      // This matches the database schema which stores risk values as basis points
      const minRiskBasisPoints = Math.round(data.riskControls.minRiskPerTrade * 100); // 0.5% -> 50 basis points
      const maxRiskBasisPoints = Math.round(data.riskControls.maxRiskPerTrade * 100); // 2.0% -> 200 basis points

      // Log the data being sent
      console.log("[DEBUG] Creating strategy with data:", {
        minRiskPerTrade: minRiskBasisPoints,
        maxRiskPerTrade: maxRiskBasisPoints,
        confidenceThreshold: Math.round(data.confidenceThreshold),
      });

      // Use the API route that will proxy to the backend
      const response = await fetch("/api/strategies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: finalToken,
        },
        credentials: "include", // Include cookies if needed for auth
        body: JSON.stringify({
          name: data.name,
          type: data.type,
          description: data.description || "",
          isPublic: data.isPublic,
          parameters: {
            indicators: data.indicators,
          },
          minRiskPerTrade: minRiskBasisPoints, // Send as basis points (integer)
          maxRiskPerTrade: maxRiskBasisPoints, // Send as basis points (integer)
          confidenceThreshold: Math.round(data.confidenceThreshold), // Already in percentage points (70% -> 70)
          isDefault: data.isPublic,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to create strategy");
      }

      // Create a component strategy object from the response and form data
      const newStrategy: ComponentStrategy = {
        id: responseData.id || Math.floor(Math.random() * 1000), // Fallback for optimistic UI
        name: data.name,
        description: data.description || "",
        isPublic: data.isPublic,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        indicators:
          data.indicators?.map((i) => ({
            name: i.name,
            type: i.type,
            parameters: i.parameters || {},
          })) || [],
        riskControls: {
          stopLoss: data.riskControls.minRiskPerTrade,
          takeProfit: data.riskControls.maxRiskPerTrade,
          maxDrawdown: 25, // Default value for max drawdown
        },
        botCount: 0, // New strategies start with no bots
        winRate: 0, // Default win rate for new strategies
      };

      form.reset(); // Clear form
      onStrategyCreated(newStrategy); // Notify parent with the new strategy
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Error creating strategy:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create a Trading Strategy</DialogTitle>
          <DialogDescription>Define the rules and indicators for your trading strategy.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit as any)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strategy Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Trading Strategy" {...field} />
                  </FormControl>
                  <FormDescription>A descriptive name for your trading strategy</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe how your strategy works..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Indicators Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Technical Indicators</h3>
                <div className="flex space-x-2">
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-primary"
                    id="indicator-preset"
                    onChange={(e) => {
                      const type = e.target.value;
                      if (type) {
                        append({
                          name: `${indicatorTypes.find((i) => i.value === type)?.label || type}`,
                          type,
                          parameters: getDefaultParameters(type),
                        });
                      }
                    }}
                    defaultValue="">
                    <option value="" disabled>
                      Select indicator
                    </option>
                    {indicatorTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const select = document.getElementById("indicator-preset") as HTMLSelectElement;
                      if (select && select.value) {
                        const type = select.value;
                        append({
                          name: `${indicatorTypes.find((i) => i.value === type)?.label || type}`,
                          type,
                          parameters: getDefaultParameters(type),
                        });
                        select.value = "";
                      }
                    }}>
                    <PlusCircleIcon className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              {fields.map((field, index) => (
                <Card key={field.id}>
                  <CardContent className="pt-4">
                    <div className="grid gap-4">
                      <div className="flex justify-between items-start">
                        <FormField
                          control={form.control}
                          name={`indicators.${index}.name`}
                          render={({ field }) => (
                            <FormItem className="flex-1 mr-2">
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`indicators.${index}.type`}
                          render={({ field }) => (
                            <FormItem className="flex-1 mr-2">
                              <FormLabel>Type</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  handleIndicatorTypeChange(value, index);
                                }}
                                defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {indicatorTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {fields.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="mt-8" onClick={() => remove(index)}>
                            <XCircleIcon className="h-5 w-5 text-red-500" />
                          </Button>
                        )}
                      </div>

                      {/* Dynamic Parameters based on indicator type */}
                      <div className="grid grid-cols-2 gap-4">
                        {form.watch(`indicators.${index}.type`) === "MA" && (
                          <FormField
                            control={form.control}
                            name={`indicators.${index}.parameters.period`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Period</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="14"
                                    value={field.value as number}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value);
                                      field.onChange(isNaN(value) ? 0 : value);
                                    }}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {form.watch(`indicators.${index}.type`) === "RSI" && (
                          <>
                            <FormField
                              control={form.control}
                              name={`indicators.${index}.parameters.period`}
                              render={({ field: paramField }) => (
                                <FormItem>
                                  <FormLabel>Period</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="14"
                                      value={paramField.value as number}
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        paramField.onChange(isNaN(value) ? 0 : value);
                                      }}
                                      onBlur={paramField.onBlur}
                                      name={paramField.name}
                                      ref={paramField.ref}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`indicators.${index}.parameters.overbought`}
                              render={({ field: paramField }) => (
                                <FormItem>
                                  <FormLabel>Overbought Level</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="70"
                                      value={paramField.value as number}
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        paramField.onChange(isNaN(value) ? 0 : value);
                                      }}
                                      onBlur={paramField.onBlur}
                                      name={paramField.name}
                                      ref={paramField.ref}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`indicators.${index}.parameters.oversold`}
                              render={({ field: paramField }) => (
                                <FormItem>
                                  <FormLabel>Oversold Level</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="30"
                                      value={paramField.value as number}
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        paramField.onChange(isNaN(value) ? 0 : value);
                                      }}
                                      onBlur={paramField.onBlur}
                                      name={paramField.name}
                                      ref={paramField.ref}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        {/* Add more parameter fields for other indicator types */}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Risk Controls Section */}
            <div>
              <h3 className="text-lg font-medium mb-2">Risk Management</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <FormField
                  control={form.control}
                  name="riskControls.minRiskPerTrade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Risk Per Trade (%)</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="10"
                            placeholder="0.5"
                            value={field.value as number}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              field.onChange(isNaN(value) ? 0 : value);
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                          <div className="text-xs text-muted-foreground">%</div>
                        </div>
                      </FormControl>
                      <FormDescription>Recommended: 0.5-1%</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="riskControls.maxRiskPerTrade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Risk Per Trade (%)</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            step="0.1"
                            min="0.5"
                            max="20"
                            placeholder="2.0"
                            value={field.value as number}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              field.onChange(isNaN(value) ? 0 : value);
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                          <div className="text-xs text-muted-foreground">%</div>
                        </div>
                      </FormControl>
                      <FormDescription>Recommended: 2-5%</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="confidenceThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confidence Threshold (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" min="0" max="100" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormDescription>Min confidence to execute trades</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Make Strategy Public</FormLabel>
                    <FormDescription>Allow other users to view and use this strategy</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Strategy"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
