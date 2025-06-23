"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Bot, BarChart3, Zap, TrendingUp, Clock, ExternalLink, MoreHorizontal, Eye, EyeOff, Settings } from "lucide-react";
import { RecentActivity as RecentActivityType } from "../../types";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface RecentActivityProps {
  activities: RecentActivityType[];
  isLoading: boolean;
}

export function RecentActivity({ activities, isLoading }: RecentActivityProps) {
  const t = useTranslations("dashboard");
  const router = useRouter();

  const handleViewAll = () => {
    router.push("/trades");
  };

  const handleViewDetails = (activity: RecentActivityType) => {
    // Navigate to specific pages based on activity type
    if (activity.type === "trade") {
      router.push("/trades");
    } else if (activity.type === "bot") {
      router.push("/bots");
    } else if (activity.type === "strategy") {
      router.push("/strategies");
    } else if (activity.type === "evaluation") {
      router.push("/bot-evaluations");
    }
    toast.success("Navigating to details page");
  };

  const handleHideActivity = (_activityId: string) => {
    // In a real app, this would hide the activity from the list
    toast.success("Activity hidden from recent list");
  };

  const getActivityIcon = (type: RecentActivityType["type"]) => {
    const iconMap = {
      trade: TrendingUp,
      evaluation: Zap,
      strategy: BarChart3,
      bot: Bot,
    };
    return iconMap[type];
  };

  const getStatusColor = (status: RecentActivityType["status"]) => {
    const colorMap = {
      success: "bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400",
      error: "bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400",
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-400",
      warning: "bg-orange-100 text-orange-800 dark:bg-orange-950/20 dark:text-orange-400",
    };
    return colorMap[status];
  };

  const formatTimeAgo = (timestamp: Date | string) => {
    const now = new Date();
    const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Unknown";
    }

    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const formatValue = (value?: number) => {
    if (!value) return null;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t("tradingHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t("tradingHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-muted">
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-muted-foreground">{t("noRecentActivity")}</p>
              <Button variant="outline" className="mt-2">
                {t("createBot")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {t("tradingHistory")}
        </CardTitle>
        <Button variant="ghost" size="sm" className="gap-2" onClick={handleViewAll}>
          View all
          <ExternalLink className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity, index) => {
          const IconComponent = getActivityIcon(activity.type);

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-muted">
                  <IconComponent className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm truncate">{activity.title}</p>
                    <Badge variant="outline" className={`text-xs ${getStatusColor(activity.status)}`}>
                      {activity.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground truncate">{activity.description}</p>

                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{formatTimeAgo(activity.timestamp)}</span>
                    {activity.symbol && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs font-medium">{activity.symbol}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activity.value && <span className={`text-sm font-medium ${activity.value > 0 ? "text-green-600" : "text-red-600"}`}>{formatValue(activity.value)}</span>}
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
