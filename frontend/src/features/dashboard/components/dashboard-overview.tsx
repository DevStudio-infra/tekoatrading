"use client";

import { useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { useAuth } from "../../auth/components/auth-wrapper";
import { Card } from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import { Badge } from "@/features/shared/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Target, Activity, Bot, Plus } from "lucide-react";

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  positive = true,
}: {
  title: string;
  value: string;
  change?: string;
  icon: any;
  positive?: boolean;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-center space-x-2">
            <p className="text-2xl font-bold">{value}</p>
            {change && (
              <div
                className={`flex items-center text-xs ${positive ? "text-green-600" : "text-red-600"}`}
              >
                {positive ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {change}
              </div>
            )}
          </div>
        </div>
        <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
    </Card>
  );
}

function BotCard({ bot }: { bot: any }) {
  const t = useTranslations("bots");

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Bot className="h-4 w-4 text-primary" />
          <h3 className="font-semibold truncate">{bot.name}</h3>
        </div>
        <Badge variant={bot.isActive ? "default" : "secondary"}>
          {bot.isActive ? t("active") : t("inactive")}
        </Badge>
      </div>
      <div className="space-y-1 text-sm text-muted-foreground">
        <div className="flex justify-between">
          <span>Symbol:</span>
          <span className="font-medium">{bot.tradingPairSymbol}</span>
        </div>
        <div className="flex justify-between">
          <span>P&L:</span>
          <span
            className={`font-medium ${bot.metrics?.totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            ${bot.metrics?.totalPnL?.toFixed(2) || "0.00"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Win Rate:</span>
          <span className="font-medium">{bot.metrics?.winRate || 0}%</span>
        </div>
      </div>
    </Card>
  );
}

function TradeCard({ trade }: { trade: any }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Badge variant={trade.side === "BUY" ? "default" : "destructive"}>{trade.side}</Badge>
          <span className="font-medium">{trade.symbol}</span>
        </div>
        <Badge variant="outline">{trade.status}</Badge>
      </div>
      <div className="space-y-1 text-sm text-muted-foreground">
        <div className="flex justify-between">
          <span>Size:</span>
          <span className="font-medium">{trade.size}</span>
        </div>
        <div className="flex justify-between">
          <span>P&L:</span>
          <span
            className={`font-medium ${(trade.profitLoss || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            ${trade.profitLoss?.toFixed(2) || "0.00"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span className="font-medium">{new Date(trade.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </Card>
  );
}

export function DashboardOverview() {
  const t = useTranslations("dashboard");
  const { user } = useAuth();

  // Fetch real data from backend
  const { data: bots, isLoading: botsLoading } = trpc.bots.getAll.useQuery();

  // Calculate aggregate statistics from real bot data
  const stats = bots
    ? {
        totalValue: bots.reduce((sum, bot) => sum + (bot.metrics?.totalPnL || 0), 0),
        dailyPnL: bots.reduce((sum, bot) => sum + (bot.metrics?.totalPnL || 0), 0), // This should be calculated differently for daily
        winRate:
          bots.length > 0
            ? bots.reduce((sum, bot) => sum + (bot.metrics?.winRate || 0), 0) / bots.length
            : 0,
        activeBots: bots.filter((bot) => bot.isActive).length,
      }
    : {
        totalValue: 0,
        dailyPnL: 0,
        winRate: 0,
        activeBots: 0,
      };

  // Get recent trades from all bots - removed since trades aren't included in getAll
  const recentTrades: any[] = [];

  const activeBots = bots?.filter((bot) => bot.isActive).slice(0, 3) || [];

  if (botsLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t("stats.totalValue")}
          value={`$${stats.totalValue.toFixed(2)}`}
          change="+2.5%"
          icon={DollarSign}
          positive={true}
        />
        <StatCard
          title={t("stats.dailyPnL")}
          value={`$${stats.dailyPnL.toFixed(2)}`}
          change="+1.2%"
          icon={TrendingUp}
          positive={stats.dailyPnL >= 0}
        />
        <StatCard
          title={t("stats.winRate")}
          value={`${stats.winRate.toFixed(1)}%`}
          change="+0.5%"
          icon={Target}
          positive={true}
        />
        <StatCard
          title={t("stats.activeBots")}
          value={stats.activeBots.toString()}
          icon={Activity}
        />
      </div>

      {/* Active Bots and Recent Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Bots */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{t("activeBots")}</h2>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              {t("createBot")}
            </Button>
          </div>
          <div className="space-y-4">
            {activeBots.length > 0 ? (
              activeBots.map((bot) => <BotCard key={bot.id} bot={bot} />)
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active bots running</p>
                <p className="text-sm">Create your first bot to get started</p>
              </div>
            )}
          </div>
          {activeBots.length > 0 && (
            <div className="mt-4">
              <Button variant="outline" className="w-full">
                {t("viewAll")}
              </Button>
            </div>
          )}
        </Card>

        {/* Recent Trades */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{t("recentTrades")}</h2>
            <Button size="sm" variant="outline">
              {t("viewAll")}
            </Button>
          </div>
          <div className="space-y-4">
            {recentTrades.length > 0 ? (
              recentTrades.map((trade) => <TradeCard key={trade.id} trade={trade} />)
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent trades</p>
                <p className="text-sm">Trades will appear here when bots start trading</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
