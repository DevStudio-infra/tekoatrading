"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FloatingDock } from "./floating-dock";

const dockItems = [
  {
    title: "Dashboard",
    icon: (
      <svg className="h-full w-full text-neutral-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
      </svg>
    ),
    href: "/dashboard",
  },
  {
    title: "Bots",
    icon: (
      <svg className="h-full w-full text-neutral-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V7H5V3H15V7C15 8.1 15.9 9 17 9H21ZM7 10V12H17V10H7ZM5 14V16H19V14H5ZM7 18V20H17V18H7Z" />
      </svg>
    ),
    href: "/bots",
  },
  {
    title: "Strategies",
    icon: (
      <svg className="h-full w-full text-neutral-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z" />
      </svg>
    ),
    href: "/strategies",
  },
  {
    title: "Portfolio",
    icon: (
      <svg className="h-full w-full text-neutral-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" />
      </svg>
    ),
    href: "/portfolio",
  },
  {
    title: "Charts",
    icon: (
      <svg className="h-full w-full text-neutral-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M22,21H2V3H4V19H6V17H10V19H12V16H16V19H18V17H22V21Z" />
      </svg>
    ),
    href: "/charts",
  },
];

export function FloatingDockNav() {
  const pathname = usePathname();

  // Don't show floating dock on home page
  if (pathname === "/") {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <FloatingDock items={dockItems} />
    </div>
  );
}
