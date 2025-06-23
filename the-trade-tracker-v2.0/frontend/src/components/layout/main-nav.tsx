"use client";

import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Home } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Skeleton } from "@/components/ui/skeleton";

interface MainNavProps {
  className?: string;
}

export function MainNav({ className }: MainNavProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <nav className={cn("flex items-center justify-between", className)}>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </nav>
    );
  }

  return (
    <nav className={cn("flex items-center justify-between w-full", className)}>
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center space-x-2">
        <Home className="h-6 w-6" />
        <span className="font-bold text-lg hidden sm:inline-block">TradeTracker</span>
      </Link>

      {/* Right side controls */}
      <div className="flex items-center space-x-2">
        <LanguageSwitcher />
        <ThemeToggle />
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "h-9 w-9 transition-transform hover:scale-105",
            },
          }}
        />
      </div>
    </nav>
  );
}
