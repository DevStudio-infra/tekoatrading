"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Settings2Icon, MoreVerticalIcon, BarChart4Icon, TrashIcon, PieChartIcon } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { toast } from "sonner";
import { BotEvaluations } from "./bot-evaluations";

// Bot interface - Updated to match backend response
interface Bot {
  id: string | number; // Updated to support UUID strings
  name: string;
  strategyName: string;
  brokerName: string;
  isActive: boolean;
  isAiTradingActive: boolean;
  createdAt: string;
  timeframe: string;
  totalPnL: number; // Backend returns totalPnL, not profitLoss
  winRate: number;
  lastEvaluation?: string;
}

type ViewMode = "list" | "evaluations";

interface BotsListProps {
  bots: Bot[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function BotsList({ bots: initialBots, isLoading, onRefresh }: BotsListProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Extract locale from the pathname
  const locale = pathname?.split("/")[1] || "en";

  console.log("[BotsList] Current locale:", locale);

  const [localBots, setLocalBots] = useState<Bot[]>(initialBots || []);
  const [togglingBots, setTogglingBots] = useState<Record<string, { active?: boolean; aiTrading?: boolean }>>({});
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);

  // Update local bots when props change
  React.useEffect(() => {
    if (initialBots && !isLoading) {
      setLocalBots(initialBots);
    }
  }, [initialBots, isLoading]);

  // We no longer need this code as we'll navigate to a dedicated page instead
  // Keeping the viewMode state for backward compatibility
  React.useEffect(() => {
    // If somehow the view mode is set to evaluations, reset it
    if (viewMode === "evaluations") {
      setViewMode("list");
    }
  }, [viewMode]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (localBots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="text-lg font-medium mb-2">No Trading Bots Yet</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4 text-center max-w-md">Create your first trading bot to start automating your trading strategies</p>
        <Button onClick={() => router.push("/bots/new")}>Create Your First Bot</Button>
      </div>
    );
  }

  async function handleToggleBotActive(botId: string | number, currentState: boolean) {
    try {
      // Set optimistic UI update immediately
      setTogglingBots((prev) => ({ ...prev, [botId]: { ...prev[botId], active: true } }));

      // Update local bot state immediately for smooth UI
      setLocalBots((prevBots) => prevBots.map((bot) => (bot.id === botId ? { ...bot, isActive: !currentState } : bot)));

      // Show pending toast
      const toastId = toast.loading(`${currentState ? "Deactivating" : "Activating"} bot...`);

      console.log(`[Bot List] Toggling bot ${botId} active state to ${!currentState}`);
      const response = await fetchWithAuth(`/api/bots/${botId}/toggle-active`, {
        method: "POST",
      });

      if (!response.ok) {
        // If request failed, revert the optimistic update
        setLocalBots((prevBots) => prevBots.map((bot) => (bot.id === botId ? { ...bot, isActive: currentState } : bot)));
        throw new Error("Failed to toggle bot active state");
      }

      // Update toast to success
      toast.success(`Bot ${currentState ? "deactivated" : "activated"} successfully`, { id: toastId });
    } catch (error) {
      console.error("[Bot List] Error toggling bot activity:", error);
      toast.error("Failed to update bot status");
    } finally {
      // Clear toggling state
      setTogglingBots((prev) => {
        const newState = { ...prev };
        if (newState[botId]) {
          delete newState[botId].active;
          if (Object.keys(newState[botId]).length === 0) delete newState[botId];
        }
        return newState;
      });
    }
  }

  async function handleToggleAiTrading(botId: string | number, currentState: boolean) {
    try {
      // Set optimistic UI update immediately
      setTogglingBots((prev) => ({ ...prev, [botId]: { ...prev[botId], aiTrading: true } }));

      // Update local bot state immediately for smooth UI
      setLocalBots((prevBots) => prevBots.map((bot) => (bot.id === botId ? { ...bot, isAiTradingActive: !currentState } : bot)));

      // Show pending toast
      const toastId = toast.loading(`${currentState ? "Disabling" : "Enabling"} AI trading...`);

      console.log(`[Bot List] Toggling bot ${botId} AI trading to ${!currentState}`);
      const response = await fetchWithAuth(`/api/bots/${botId}/toggle-ai-trading`, {
        method: "POST",
      });

      if (!response.ok) {
        // If request failed, revert the optimistic update
        setLocalBots((prevBots) => prevBots.map((bot) => (bot.id === botId ? { ...bot, isAiTradingActive: currentState } : bot)));
        throw new Error("Failed to toggle AI trading");
      }

      // Update toast to success
      toast.success(`AI trading ${currentState ? "disabled" : "enabled"} successfully`, { id: toastId });
    } catch (error) {
      console.error("[Bot List] Error toggling AI trading:", error);
      toast.error("Failed to update AI trading status");
    } finally {
      // Clear toggling state
      setTogglingBots((prev) => {
        const newState = { ...prev };
        if (newState[botId]) {
          delete newState[botId].aiTrading;
          if (Object.keys(newState[botId]).length === 0) delete newState[botId];
        }
        return newState;
      });
    }
  }

  // Format currency
  const formatCurrency = (value: number | null | undefined) => {
    // Convert string numbers to actual numbers
    const numValue = typeof value === "string" ? parseFloat(value) : value;

    if (numValue === null || numValue === undefined || isNaN(numValue)) {
      return "$0.00";
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      signDisplay: "always",
    }).format(numValue);
  };

  // Format win rate
  const formatWinRate = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) {
      return "0.0%";
    }
    return `${Number(value).toFixed(1)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {localBots.map((bot) => (
        <Card key={bot.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{bot.name}</CardTitle>
                <CardDescription>
                  {bot.brokerName} • {bot.timeframe}
                </CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVerticalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/bots/${bot.id}`)}>
                    <Settings2Icon className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      // Navigate to the dedicated evaluations page with the bot ID in the URL
                      // Include locale in the URL path
                      router.push(`/${locale}/bots/${bot.id}/evaluations`);
                    }}>
                    <BarChart4Icon className="h-4 w-4 mr-2" />
                    Evaluations
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/bots/${bot.id}/statistics`)}>
                    <PieChartIcon className="h-4 w-4 mr-2" />
                    Statistics
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline">{bot.strategyName}</Badge>
              <Badge variant={bot.isActive ? "default" : "outline"} className={bot.isActive ? "bg-green-500 hover:bg-green-600" : ""}>
                {bot.isActive ? "Active" : "Inactive"}
              </Badge>
              {bot.isAiTradingActive && <Badge className="bg-purple-500 hover:bg-purple-600">AI Trading</Badge>}
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Profit/Loss</p>
                <p className={`text-lg font-semibold ${(bot.totalPnL || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(bot.totalPnL)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Win Rate</p>
                <p className="text-lg font-semibold">{formatWinRate(bot.winRate)}</p>
              </div>
            </div>

            {bot.lastEvaluation && <p className="text-xs text-gray-400 mt-3">Last evaluation: {new Date(bot.lastEvaluation).toLocaleString()}</p>}
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-4">
            <div className="flex items-center space-x-2">
              <Switch
                id={`active-${bot.id}`}
                checked={bot.isActive}
                onCheckedChange={() => handleToggleBotActive(bot.id, bot.isActive)}
                disabled={togglingBots[bot.id]?.active !== undefined}
              />
              <label htmlFor={`active-${bot.id}`} className="text-sm cursor-pointer">
                Active
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id={`ai-${bot.id}`}
                checked={bot.isAiTradingActive}
                onCheckedChange={() => handleToggleAiTrading(bot.id, bot.isAiTradingActive)}
                disabled={togglingBots[bot.id]?.aiTrading !== undefined}
              />
              <label htmlFor={`ai-${bot.id}`} className="text-sm cursor-pointer">
                AI Trading
              </label>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
