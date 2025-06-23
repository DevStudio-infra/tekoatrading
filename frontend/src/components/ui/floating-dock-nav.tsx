"use client";

import { FloatingDock } from "./floating-dock";
import {
  IconHome,
  IconRobot,
  IconChartLine,
  IconChartBar,
  IconStack2,
  IconTrendingUp,
} from "@tabler/icons-react";

export function FloatingDockNav() {
  // Main navigation items for mobile
  const mainRoutes = [
    {
      title: "Home",
      icon: <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/",
    },
    {
      title: "Dashboard",
      icon: <IconChartBar className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/dashboard",
    },
    {
      title: "Bots",
      icon: <IconRobot className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/bots",
    },
    {
      title: "Portfolio",
      icon: <IconTrendingUp className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/portfolio",
    },
  ];

  // All routes for desktop/tablet view
  const allRoutes = [
    {
      title: "Home",
      icon: <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/",
    },
    {
      title: "Dashboard",
      icon: <IconChartBar className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/dashboard",
    },
    {
      title: "Bots",
      icon: <IconRobot className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/bots",
    },
    {
      title: "Portfolio",
      icon: <IconTrendingUp className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/portfolio",
    },
    {
      title: "Strategies",
      icon: <IconStack2 className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/strategies",
    },
    {
      title: "Charts",
      icon: <IconChartLine className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/charts",
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
