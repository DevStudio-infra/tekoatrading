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

export function RecentTrades() {
  const t = useTranslations("dashboard");

  // Mock data - replace with real data
  const trades = [
    { id: 1, pair: "EUR/USD", type: "Buy", amount: 0.1, profit: "+$45.67", time: "2 hours ago" },
    { id: 2, pair: "GBP/JPY", type: "Sell", amount: 0.05, profit: "-$12.34", time: "3 hours ago" },
    {
      id: 3,
      pair: "BTC/USDT",
      type: "Buy",
      amount: 0.001,
      profit: "+$123.45",
      time: "5 hours ago",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("currentTrades")}</CardTitle>
        <CardDescription>Latest trading activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trades.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No recent trades</p>
            </div>
          ) : (
            trades.map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="font-medium">{trade.pair}</p>
                    <div className="flex items-center space-x-2">
                      <Badge variant={trade.type === "Buy" ? "default" : "secondary"}>
                        {trade.type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{trade.amount} lots</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-medium ${trade.profit.startsWith("+") ? "text-green-600" : "text-red-600"}`}
                  >
                    {trade.profit}
                  </p>
                  <p className="text-sm text-muted-foreground">{trade.time}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
