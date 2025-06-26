"use client";

import { useTranslations } from "next-intl";
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

export function ActiveBots() {
  const t = useTranslations("dashboard");

  // Mock data - replace with real data
  const bots = [
    { id: 1, name: "EUR/USD Scalper", status: "active", profit: "+$234.56" },
    { id: 2, name: "BTC/USDT Swing", status: "active", profit: "+$567.89" },
    { id: 3, name: "Gold Trend", status: "inactive", profit: "-$23.45" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("activeTradingBots")}</CardTitle>
        <CardDescription>
          {bots.filter((bot) => bot.status === "active").length} active bots running
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {bots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">{t("noActiveBots")}</p>
              <Button asChild>
                <Link href="/bots">{t("createFirstBot")}</Link>
              </Button>
            </div>
          ) : (
            bots.map((bot) => (
              <div key={bot.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="font-medium">{bot.name}</p>
                    <Badge variant={bot.status === "active" ? "default" : "secondary"}>
                      {bot.status}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-medium ${bot.profit.startsWith("+") ? "text-green-600" : "text-red-600"}`}
                  >
                    {bot.profit}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
