import React from "react";
import { FloatingDock } from "@/components/ui/floating-dock";
import {
  IconBrandGithub,
  // Removed unused imports
  IconHome,
  IconTerminal2,
  IconChartLine,
  IconSettings,
  IconChartBar,
} from "@tabler/icons-react";

export default function FloatingDockDemo() {
  const links = [
    {
      title: "Dashboard",
      icon: <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/dashboard",
    },
    {
      title: "Trading",
      icon: <IconChartLine className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/trading",
    },
    {
      title: "Analytics",
      icon: <IconChartBar className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/analytics",
    },
    {
      title: "Settings",
      icon: <IconSettings className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/settings",
    },
    {
      title: "API",
      icon: <IconTerminal2 className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/api",
    },
    {
      title: "About",
      icon: <IconBrandGithub className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/about",
    },
  ];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <FloatingDock mobileClassName="translate-y-0" items={links} />
    </div>
  );
}
