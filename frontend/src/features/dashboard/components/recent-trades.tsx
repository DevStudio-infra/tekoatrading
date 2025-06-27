"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../shared/components/ui/card";
import { Badge } from "../../shared/components/ui/badge";
import { Button } from "../../shared/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export function RecentTrades() {
  const t = useTranslations("dashboard");
  const params = useParams();
  const locale = params.locale as string;

  // Fetch real trade data from backend using TRPC
  const { data: trades, isLoading, error } = trpc.trades.getRecent.useQuery({ limit: 5 });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("currentTrades")}</CardTitle>
          <CardDescription>Loading recent trades...</CardDescription>
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
                    <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-16"></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-4 bg-muted rounded w-20 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-16"></div>
                </div>
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
          <CardTitle>{t("currentTrades")}</CardTitle>
          <CardDescription>Error loading trades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">Failed to load trades: {error.message}</div>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("currentTrades")}</CardTitle>
        <CardDescription>Latest trading activity from your bots</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!trades || trades.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No recent trades</p>
              <p className="text-sm text-muted-foreground mb-4">
                Trades will appear here when your bots start trading
              </p>
              <Button asChild>
                <Link href={`/${locale}/bots`}>View Bots</Link>
              </Button>
            </div>
          ) : (
            trades.map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {trade.profit >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium">{trade.pair}</p>
                    <div className="flex items-center space-x-2">
                      <Badge variant={trade.type === "Buy" ? "default" : "secondary"}>
                        {trade.type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{trade.amount} lots</span>
                      <Badge variant="outline" className="text-xs">
                        {trade.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Bot: {trade.botName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-medium ${
                      trade.profit >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {trade.profitFormatted}
                  </p>
                  <p className="text-sm text-muted-foreground">{trade.timeFormatted}</p>
                  {trade.entryPrice && (
                    <p className="text-xs text-muted-foreground">
                      Entry: ${trade.entryPrice.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Show link to view all trades if there are trades */}
          {trades && trades.length > 0 && (
            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/${locale}/trades`}>
                  <Activity className="h-4 w-4 mr-2" />
                  View All Trades
                </Link>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
