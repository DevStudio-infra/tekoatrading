"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "../../auth/components/auth-wrapper";
import { CreateBotDialog } from "./create-bot-dialog";
import { Card } from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import { Badge } from "@/features/shared/components/ui/badge";
import { Bot, Play, Pause, Settings, Trash2, Plus, TrendingUp, TrendingDown } from "lucide-react";

function BotCard({ bot }: { bot: any }) {
  const t = useTranslations("bots");
  const utils = trpc.useContext();

  const updateBot = trpc.bots.update.useMutation({
    onSuccess: () => {
      utils.bots.getAll.invalidate();
    },
  });

  const deleteBot = trpc.bots.delete.useMutation({
    onSuccess: () => {
      utils.bots.getAll.invalidate();
    },
  });

  const handleToggleActive = () => {
    updateBot.mutate({
      id: bot.id,
      isActive: !bot.isActive,
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this bot?")) {
      deleteBot.mutate({ id: bot.id });
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{bot.name}</h3>
            <p className="text-sm text-muted-foreground">{bot.description || "No description"}</p>
          </div>
        </div>
        <Badge variant={bot.isActive ? "default" : "secondary"}>
          {bot.isActive ? t("active") : t("inactive")}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Symbol:</span>
            <span className="font-medium">{bot.tradingPairSymbol}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Timeframe:</span>
            <span className="font-medium">{bot.timeframe}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Risk %:</span>
            <span className="font-medium">{bot.riskPercentage}%</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total P&L:</span>
            <span
              className={`font-medium ${bot.metrics?.totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              ${bot.metrics?.totalPnL?.toFixed(2) || "0.00"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Win Rate:</span>
            <span className="font-medium">{bot.metrics?.winRate || 0}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Trades:</span>
            <span className="font-medium">{bot.metrics?.totalTrades || 0}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant={bot.isActive ? "destructive" : "default"}
            onClick={handleToggleActive}
            disabled={updateBot.isLoading}
          >
            {bot.isActive ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                {t("stop")}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {t("start")}
              </>
            )}
          </Button>
          <Button size="sm" variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            {t("edit")}
          </Button>
        </div>

        <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleteBot.isLoading}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

export function BotManagement() {
  const t = useTranslations("bots");
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Fetch real data from backend
  const { data: bots, isLoading, error } = trpc.bots.getAll.useQuery();
  const utils = trpc.useContext();

  const handleBotCreated = () => {
    utils.bots.getAll.invalidate();
  };

  // Filter bots based on selected filter
  const filteredBots =
    bots?.filter((bot) => {
      if (filter === "active") return bot.isActive;
      if (filter === "inactive") return !bot.isActive;
      return true;
    }) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error loading bots: {error.message}</div>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">
            Manage your trading bots and monitor their performance
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("create")}
        </Button>
      </div>

      {/* Create Bot Dialog */}
      <CreateBotDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleBotCreated}
      />

      {/* Filter Tabs */}
      <div className="flex space-x-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All ({bots?.length || 0})
        </Button>
        <Button
          variant={filter === "active" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("active")}
        >
          {t("active")} ({bots?.filter((b) => b.isActive).length || 0})
        </Button>
        <Button
          variant={filter === "inactive" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("inactive")}
        >
          {t("inactive")} ({bots?.filter((b) => !b.isActive).length || 0})
        </Button>
      </div>

      {/* Bots Grid */}
      {filteredBots.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBots.map((bot) => (
            <BotCard key={bot.id} bot={bot} />
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No bots found</h3>
            <p className="text-muted-foreground mb-6">
              {filter === "all"
                ? "You haven't created any trading bots yet."
                : `No ${filter} bots found.`}
            </p>
            {filter === "all" && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Bot
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
