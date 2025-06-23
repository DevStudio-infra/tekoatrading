"use client";

import { FloatingDock } from "@/components/ui/floating-dock";
import { useTranslations } from "next-intl";
import { IconChartLine, IconRobot, IconChartBar, IconHome, IconKey, IconSettings, IconTrendingUp, IconStack2 } from "@tabler/icons-react";

export function FloatingDockNav() {
  const t = useTranslations("navigation");

  // Main navigation items that are always visible on mobile
  const mainRoutes = [
    {
      title: t("dashboard"),
      icon: <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/dashboard",
    },
    {
      title: t("bots"),
      icon: <IconRobot className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/bots",
    },
    {
      title: t("trades"),
      icon: <IconTrendingUp className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/trades",
    },
    {
      title: t("analytics"),
      icon: <IconChartBar className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/analytics",
    },
    {
      title: t("settings"),
      icon: <IconSettings className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/settings",
    },
  ];

  // All routes for desktop/tablet view
  const allRoutes = [
    {
      title: t("dashboard"),
      icon: <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/dashboard",
    },
    {
      title: t("bots"),
      icon: <IconRobot className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/bots",
    },
    {
      title: t("strategies"),
      icon: <IconStack2 className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/strategies",
    },
    {
      title: t("trades"),
      icon: <IconTrendingUp className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/trades",
    },
    {
      title: t("evaluations"),
      icon: <IconChartLine className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/bot-evaluations",
    },
    {
      title: t("brokerCredentials"),
      icon: <IconKey className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/broker-credentials",
    },
    {
      title: t("analytics"),
      icon: <IconChartBar className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/analytics",
    },
    {
      title: t("settings"),
      icon: <IconSettings className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/settings",
    },
  ];

  return (
    <>
      {/* Mobile Navigation - Centered with essential items */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 md:hidden">
        <FloatingDock items={mainRoutes} mobileClassName="translate-y-0" />
      </div>

      {/* Desktop/Tablet Navigation - Full width with all items */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 hidden md:block">
        <FloatingDock items={allRoutes} desktopClassName="mx-auto" />
      </div>
    </>
  );
}
