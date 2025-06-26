"use client";

import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../../../lib/utils";
import { Button } from "../../shared/components/ui/button";
import { Navigation } from "../../shared/components/navigation";
import { BarChart3, Bot, DollarSign, Settings, TrendingUp, User } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const t = useTranslations("common");
  const pathname = usePathname();

  const navigationItems = [
    { href: "/dashboard", label: t("dashboard"), icon: BarChart3 },
    { href: "/bots", label: t("bots"), icon: Bot },
    { href: "/portfolio", label: t("portfolio"), icon: TrendingUp },
    { href: "/analytics", label: t("analytics"), icon: BarChart3 },
    { href: "/trades", label: t("trades"), icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r border-border min-h-screen">
          <div className="p-6">
            <nav className="space-y-2">
              {navigationItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = pathname.endsWith(item.href);

                return (
                  <Button
                    key={item.href}
                    asChild
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      isActive && "bg-primary text-primary-foreground",
                    )}
                  >
                    <Link href={item.href}>
                      <IconComponent className="mr-2 h-4 w-4" />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
