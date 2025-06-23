"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Bot, BarChart3, Zap, TrendingUp, ArrowRight } from "lucide-react";
import { QuickAction } from "../../types";
import Link from "next/link";

export function QuickActions() {
  const botT = useTranslations("bots");
  const strategyT = useTranslations("strategies");

  const quickActions: QuickAction[] = [
    {
      id: "create-bot",
      title: botT("createBot"),
      description: "Set up a new trading bot with your strategy",
      icon: Bot,
      href: "/bots/create",
      color: "blue",
      badge: "Popular",
    },
    {
      id: "create-strategy",
      title: strategyT("createStrategy"),
      description: "Design a new trading strategy",
      icon: BarChart3,
      href: "/strategies/create",
      color: "purple",
    },
    {
      id: "run-evaluation",
      title: "Run Evaluation",
      description: "Test your strategies with market data",
      icon: Zap,
      href: "/evaluations/new",
      color: "orange",
      badge: 3,
    },
    {
      id: "view-analytics",
      title: "View Analytics",
      description: "Analyze your trading performance",
      icon: TrendingUp,
      href: "/analytics",
      color: "green",
    },
  ];

  const getColorClasses = (color: QuickAction["color"]) => {
    const colorMap = {
      blue: {
        bg: "bg-blue-50 dark:bg-blue-950/20",
        text: "text-blue-600 dark:text-blue-400",
        border: "border-blue-200 dark:border-blue-800",
        hover: "hover:bg-blue-100 dark:hover:bg-blue-950/30",
      },
      green: {
        bg: "bg-green-50 dark:bg-green-950/20",
        text: "text-green-600 dark:text-green-400",
        border: "border-green-200 dark:border-green-800",
        hover: "hover:bg-green-100 dark:hover:bg-green-950/30",
      },
      purple: {
        bg: "bg-purple-50 dark:bg-purple-950/20",
        text: "text-purple-600 dark:text-purple-400",
        border: "border-purple-200 dark:border-purple-800",
        hover: "hover:bg-purple-100 dark:hover:bg-purple-950/30",
      },
      orange: {
        bg: "bg-orange-50 dark:bg-orange-950/20",
        text: "text-orange-600 dark:text-orange-400",
        border: "border-orange-200 dark:border-orange-800",
        hover: "hover:bg-orange-100 dark:hover:bg-orange-950/30",
      },
    };
    return colorMap[color];
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const colors = getColorClasses(action.color);

            return (
              <motion.div key={action.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.1 }}>
                <Link href={action.href}>
                  <Card
                    className={`
                    cursor-pointer transition-all duration-300
                    ${colors.hover} ${colors.border} border-2
                    hover:shadow-md hover:scale-105
                  `}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-2 rounded-lg ${colors.bg}`}>
                          <action.icon className={`h-5 w-5 ${colors.text}`} />
                        </div>
                        {action.badge && (
                          <Badge variant="secondary" className="text-xs">
                            {action.badge}
                          </Badge>
                        )}
                      </div>

                      <h3 className="font-semibold text-sm mb-1">{action.title}</h3>

                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{action.description}</p>

                      <div className="flex items-center justify-between">
                        <Button variant="ghost" size="sm" className={`p-0 h-auto ${colors.text} hover:bg-transparent`}>
                          Get started
                        </Button>
                        <ArrowRight className={`h-4 w-4 ${colors.text}`} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
