"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../shared/components/ui/dialog";
import { Button } from "../../shared/components/ui/button";
import { Input } from "../../shared/components/ui/input";
import { Label } from "../../shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../shared/components/ui/select";
import { Checkbox } from "../../shared/components/ui/checkbox";
import { toast } from "sonner";
import { trpc } from "../../../lib/trpc";
import { TradingPairSelect, TradingPair } from "../../trading-pairs/trading-pair-select";
import { Shield, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "../../shared/components/ui/alert";

const createBotSchema = z
  .object({
    name: z.string().min(1, "Bot name is required"),
    description: z.string().optional(),
    tradingPairSymbol: z.string().min(1, "Trading pair is required"),
    timeframe: z.enum(["M1", "M5", "M15", "M30", "H1", "H4", "D1"]),
    maxOpenTrades: z.number().min(1).max(10),
    minRiskPercentage: z.number().min(0.1).max(10),
    maxRiskPercentage: z.number().min(0.1).max(10),
    brokerCredentialId: z.string().min(1, "Broker credential is required"),
    isAiTradingActive: z.boolean(),
  })
  .refine((data) => data.maxRiskPercentage > data.minRiskPercentage, {
    message: "Max risk percentage must be greater than min risk percentage",
    path: ["maxRiskPercentage"],
  });

type CreateBotFormData = z.infer<typeof createBotSchema>;

interface CreateBotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateBotDialog({ open, onOpenChange, onSuccess }: CreateBotDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTradingPair, setSelectedTradingPair] = useState<TradingPair | null>(null);

  // TRPC mutations and queries
  const createBotMutation = trpc.bots.create.useMutation();
  const { data: brokerCredentials = [], isLoading: isLoadingCredentials } =
    trpc.bots.getBrokerCredentials.useQuery();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateBotFormData>({
    resolver: zodResolver(createBotSchema),
    defaultValues: {
      name: "",
      description: "",
      tradingPairSymbol: "",
      timeframe: "M1",
      maxOpenTrades: 4,
      minRiskPercentage: 0.5,
      maxRiskPercentage: 2,
      brokerCredentialId: "",
      isAiTradingActive: false,
    },
  });

  const onSubmit = async (data: CreateBotFormData) => {
    setIsSubmitting(true);
    try {
      // Call the actual API to create bot
      const result = await createBotMutation.mutateAsync({
        name: data.name,
        description: data.description,
        tradingPairSymbol: data.tradingPairSymbol,
        timeframe: data.timeframe,
        maxOpenTrades: data.maxOpenTrades,
        minRiskPercentage: data.minRiskPercentage,
        maxRiskPercentage: data.maxRiskPercentage,
        brokerCredentialId: data.brokerCredentialId,
        isAiTradingActive: data.isAiTradingActive,
      });

      toast.success(`Bot "${data.name}" created successfully!`);
      reset();
      setSelectedTradingPair(null);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating bot:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create bot";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setSelectedTradingPair(null);
    onOpenChange(false);
  };

  const handleTimeframeChange = (value: string) => {
    setValue("timeframe", value as any);
  };

  // Check if form can be submitted
  const canSubmit = brokerCredentials.length > 0 && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Trading Bot</DialogTitle>
          <DialogDescription>
            Create a new automated trading bot. Configure its basic parameters and trading settings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="botName">Bot Name *</Label>
            <Input
              id="botName"
              placeholder="Enter bot name (e.g., EUR/USD Scalper)"
              {...register("name")}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="botDescription">Description (Optional)</Label>
            <Input
              id="botDescription"
              placeholder="Brief description of the bot's strategy"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <TradingPairSelect
              selectedSymbol={selectedTradingPair}
              onSelectSymbol={(pair: TradingPair) => {
                setSelectedTradingPair(pair);
                setValue("tradingPairSymbol", pair.symbol);
              }}
              placeholder="Select trading pair..."
              label="Trading Pair *"
            />
            {errors.tradingPairSymbol && (
              <p className="text-sm text-red-500">{errors.tradingPairSymbol.message}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select defaultValue="M1" onValueChange={handleTimeframeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M1">1 Minute</SelectItem>
                  <SelectItem value="M5">5 Minutes</SelectItem>
                  <SelectItem value="M15">15 Minutes</SelectItem>
                  <SelectItem value="M30">30 Minutes</SelectItem>
                  <SelectItem value="H1">1 Hour</SelectItem>
                  <SelectItem value="H4">4 Hours</SelectItem>
                  <SelectItem value="D1">1 Day</SelectItem>
                </SelectContent>
              </Select>
              {errors.timeframe && (
                <p className="text-sm text-red-500">{errors.timeframe.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="minRiskPercentage">Min Risk % (0.1-10)</Label>
              <Input
                id="minRiskPercentage"
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                placeholder="0.5"
                {...register("minRiskPercentage", { valueAsNumber: true })}
              />
              {errors.minRiskPercentage && (
                <p className="text-sm text-red-500">{errors.minRiskPercentage.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxRiskPercentage">Max Risk % (0.1-10)</Label>
              <Input
                id="maxRiskPercentage"
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                placeholder="2"
                {...register("maxRiskPercentage", { valueAsNumber: true })}
              />
              {errors.maxRiskPercentage && (
                <p className="text-sm text-red-500">{errors.maxRiskPercentage.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxOpenTrades">Max Open Trades (1-10)</Label>
            <Input
              id="maxOpenTrades"
              type="number"
              min="1"
              max="10"
              placeholder="4"
              {...register("maxOpenTrades", { valueAsNumber: true })}
            />
            {errors.maxOpenTrades && (
              <p className="text-sm text-red-500">{errors.maxOpenTrades.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="brokerCredentialId">Broker Credential *</Label>
            {isLoadingCredentials ? (
              <div className="h-10 bg-muted animate-pulse rounded-md"></div>
            ) : brokerCredentials.length > 0 ? (
              <Select onValueChange={(value) => setValue("brokerCredentialId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select broker credential..." />
                </SelectTrigger>
                <SelectContent>
                  {brokerCredentials.map((credential) => (
                    <SelectItem key={credential.id} value={credential.id}>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span>{credential.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({credential.broker} - {credential.isDemo ? "Demo" : "Live"})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No broker credentials found. You need to add broker credentials before creating
                    a bot.
                    <Button asChild variant="link" className="p-0 h-auto ml-1">
                      <a href="/settings/broker-credentials" target="_blank">
                        Add credentials here
                      </a>
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            )}
            {errors.brokerCredentialId && (
              <p className="text-sm text-red-500">{errors.brokerCredentialId.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isAiTradingActive"
              className="h-4 w-4"
              {...register("isAiTradingActive")}
            />
            <Label htmlFor="isAiTradingActive" className="text-sm font-medium">
              Enable AI Trading
            </Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Creating..." : "Create Bot"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
