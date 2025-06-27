"use client";

import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../shared/components/ui/card";
import { Button } from "../../shared/components/ui/button";
import { Badge } from "../../shared/components/ui/badge";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Bot, Activity } from "lucide-react";

export function ActiveBots() {
  const t = useTranslations("dashboard");
  const params = useParams();
  const locale = params.locale as string;

  // Fetch real data from backend using TRPC
  const { data: allBots, isLoading, error } = trpc.bots.getAll.useQuery();

  // Filter to only show active bots
  const activeBots = allBots?.filter((bot) => bot.isActive) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("activeTradingBots")}</CardTitle>
          <CardDescription>Loading bots...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border rounded-lg animate-pulse"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-4 w-4 bg-muted rounded"></div>
                  <div>
                    <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-16"></div>
                  </div>
                </div>
                <div className="h-4 bg-muted rounded w-20"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("activeTradingBots")}</CardTitle>
          <CardDescription>Error loading bots</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">Failed to load bots: {error.message}</div>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("activeTradingBots")}</CardTitle>
        <CardDescription>
          {activeBots.length} active bot{activeBots.length !== 1 ? "s" : ""} running
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeBots.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">{t("noActiveBots")}</p>
              <Button asChild>
                <Link href={`/${locale}/bots`}>{t("createFirstBot")}</Link>
              </Button>
            </div>
          ) : (
            activeBots.map((bot) => (
              <div
                key={bot.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Bot className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium">{bot.name}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="default" className="text-xs">
                        Active
                      </Badge>
                      {bot.isAiTradingActive && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-purple-100 text-purple-700"
                        >
                          AI Trading
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {bot.tradingPairSymbol} • {bot.timeframe}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-medium ${
                      (bot.metrics?.totalPnL || 0) >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {(bot.metrics?.totalPnL || 0) >= 0 ? "+" : ""}$
                    {(bot.metrics?.totalPnL || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(bot.metrics?.winRate || 0).toFixed(1)}% win rate
                  </p>
                </div>
              </div>
            ))
          )}

          {/* Show link to view all bots if there are active bots */}
          {activeBots.length > 0 && (
            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/${locale}/bots`}>
                  <Activity className="h-4 w-4 mr-2" />
                  View All Bots
                </Link>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
