"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Bot, BarChart3, TrendingUp, Settings, Zap, CreditCard, ChevronRight, LucideIcon, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  description?: string;
}

export function DashboardNav() {
  const t = useTranslations("navigation");
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      id: "dashboard",
      title: t("dashboard"),
      href: "/dashboard",
      icon: LayoutDashboard,
      description: "Overview and analytics",
    },
    {
      id: "bots",
      title: t("bots"),
      href: "/bots",
      icon: Bot,
      badge: 3,
      description: "Manage trading bots",
    },
    {
      id: "strategies",
      title: t("strategies"),
      href: "/strategies",
      icon: BarChart3,
      badge: "New",
      description: "Create and manage strategies",
    },
    {
      id: "trading",
      title: t("trading"),
      href: "/trading",
      icon: TrendingUp,
      description: "Live trading interface",
    },
    {
      id: "analytics",
      title: "Analytics",
      href: "/analytics",
      icon: PieChart,
      description: "Performance analytics",
    },
    {
      id: "evaluations",
      title: "Evaluations",
      href: "/bot-evaluations",
      icon: Zap,
      badge: 5,
      description: "Bot performance analysis",
    },
    {
      id: "broker-credentials",
      title: "Broker Setup",
      href: "/broker-credentials",
      icon: CreditCard,
      description: "Configure broker connections",
    },
    {
      id: "settings",
      title: t("settings"),
      href: "/settings",
      icon: Settings,
      description: "Account and preferences",
    },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname.endsWith("/dashboard");
    }
    return pathname.startsWith(href);
  };

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {navItems.map((item, index) => {
            const active = isActive(item.href);

            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <Link href={item.href}>
                  <div
                    className={cn(
                      "group relative p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer",
                      "hover:shadow-md hover:scale-105",
                      active ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                    )}>
                    <div className="flex flex-col items-center text-center space-y-2">
                      <div
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          active
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                        )}>
                        <item.icon className="h-5 w-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-center gap-1">
                          <span className={cn("text-sm font-medium", active ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300")}>{item.title}</span>
                          {item.badge && (
                            <Badge variant={active ? "default" : "secondary"} className="text-xs scale-75">
                              {item.badge}
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{item.description}</p>
                      </div>
                    </div>

                    {active && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none"
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}

                    <ChevronRight
                      className={cn("absolute top-2 right-2 h-4 w-4 transition-opacity", "opacity-0 group-hover:opacity-100", active ? "text-blue-500" : "text-gray-400")}
                    />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
