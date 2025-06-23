"use client";

import React, { ReactNode } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import FloatingDockDemo from "@/components/floating-dock-demo";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { AuthNav } from "@/components/ui/auth-nav";
import { SignedIn } from "@clerk/nextjs";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-blue-950 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-blue-100/30 dark:border-blue-900/30 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 lg:hidden">
              {sidebarOpen ? <IconX className="h-6 w-6" /> : <IconMenu2 className="h-6 w-6" />}
              <span className="sr-only">Toggle Menu</span>
            </button>
            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-blue-600 dark:text-blue-400">
              <span className="hidden md:inline">TradeTracker</span>
              <span className="inline md:hidden">TT</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <SignedIn>
              <div className="hidden md:flex border border-blue-200/50 dark:border-blue-800/50 p-2 rounded-full bg-white/50 dark:bg-gray-900/50 backdrop-blur-md">
                <span className="text-sm text-gray-600 dark:text-gray-300">Welcome back</span>
              </div>
            </SignedIn>
            <AuthNav />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1">
        {/* Sidebar - Responsive */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 w-64 transform border-r border-blue-100/30 dark:border-blue-900/30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md pt-16 transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto lg:z-auto",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}>
          <div className="space-y-4 py-6 px-4">
            <div className="rounded-lg bg-blue-50/70 dark:bg-blue-950/20 p-4 backdrop-blur-md border border-blue-100/50 dark:border-blue-900/50">
              <h2 className="mb-2 text-lg font-medium text-blue-700 dark:text-blue-300">Trading Stats</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-white/50 dark:bg-gray-800/50 p-2 backdrop-blur-sm">
                  <p className="text-gray-500 dark:text-gray-400">Win Rate</p>
                  <p className="font-medium text-green-600 dark:text-green-400">65%</p>
                </div>
                <div className="rounded-md bg-white/50 dark:bg-gray-800/50 p-2 backdrop-blur-sm">
                  <p className="text-gray-500 dark:text-gray-400">Profit</p>
                  <p className="font-medium text-green-600 dark:text-green-400">+$1,245</p>
                </div>
                <div className="col-span-2 rounded-md bg-white/50 dark:bg-gray-800/50 p-2 backdrop-blur-sm">
                  <p className="text-gray-500 dark:text-gray-400">Active Trades</p>
                  <p className="font-medium text-blue-600 dark:text-blue-400">3</p>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="space-y-1">
              {[
                { name: "Dashboard", href: "/dashboard" },
                { name: "Trading", href: "/trading" },
                { name: "Analytics", href: "/analytics" },
                { name: "Settings", href: "/settings" },
              ].map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-100/50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Floating Dock Menu */}
      <FloatingDockDemo />
    </div>
  );
}
