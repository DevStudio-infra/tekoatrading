import React from "react";
import { FloatingDock } from "./ui/floating-dock";
import {
  IconHome,
  IconRobot,
  IconChartLine,
  IconSettings,
  IconChartBar,
  IconBrain,
  IconBulb,
} from "@tabler/icons-react";

export default function FloatingDockDemo() {
  const links = [
    {
      title: "Dashboard",
      icon: <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/dashboard",
    },
    {
      title: "Bots",
      icon: <IconRobot className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/bots",
    },
    {
      title: "Strategies",
      icon: <IconBulb className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/strategies",
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
      title: "AI Assistant",
      icon: <IconBrain className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/ai-assistant",
    },
    {
      title: "Settings",
      icon: <IconSettings className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
      href: "/settings",
    },
  ];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <FloatingDock mobileClassName="translate-y-0" items={links} />
    </div>
  );
}
