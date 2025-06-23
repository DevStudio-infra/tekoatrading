"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Settings, Download, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  lastUpdated: Date;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function DashboardHeader({ lastUpdated, isRefreshing, onRefresh }: DashboardHeaderProps) {
  const t = useTranslations("dashboard");
  const commonT = useTranslations("common");

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{t("welcome")}</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{new Date().toLocaleDateString()}</span>
          <span>•</span>
          <span>Last updated {formatLastUpdated(lastUpdated)}</span>
          <Badge variant="outline" className="ml-2">
            Live
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing} className="gap-2">
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          {isRefreshing ? "Refreshing..." : commonT("refresh")}
        </Button>

        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>

        <Button variant="outline" size="sm" className="gap-2">
          <Bell className="h-4 w-4" />
          Alerts
        </Button>

        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>
    </div>
  );
}
