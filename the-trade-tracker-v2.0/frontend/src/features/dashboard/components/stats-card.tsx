"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon,
  trend,
  trendValue,
  className,
}: StatsCardProps) {
  return (
    <div className={cn(
      "rounded-xl bg-white/70 dark:bg-gray-900/70 p-4 shadow-sm backdrop-blur-md border border-blue-100/30 dark:border-blue-900/30",
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <div className="mt-1 flex items-baseline">
            <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
              {value}
            </p>
            {trendValue && (
              <p
                className={cn(
                  "ml-2 text-xs",
                  trend === "up" ? "text-green-600 dark:text-green-400" : 
                  trend === "down" ? "text-red-600 dark:text-red-400" : 
                  "text-gray-500 dark:text-gray-400"
                )}
              >
                {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
              </p>
            )}
          </div>
          {description && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
