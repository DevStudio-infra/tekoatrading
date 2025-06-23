"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "shimmer" | "pulse" | "wave";
  speed?: "slow" | "normal" | "fast";
}

export function EnhancedSkeleton({ className, variant = "shimmer", speed = "normal", ...props }: SkeletonProps) {
  const speedConfig = {
    slow: { duration: 2 },
    normal: { duration: 1.5 },
    fast: { duration: 1 },
  };

  const baseClasses = "rounded-md bg-muted";

  if (variant === "shimmer") {
    return (
      <div className={cn(baseClasses, "relative overflow-hidden", className)} {...props}>
        <motion.div
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{
            translateX: ["100%", "100%"],
          }}
          transition={{
            duration: speedConfig[speed].duration,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <motion.div
        className={cn(baseClasses, className)}
        animate={{
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: speedConfig[speed].duration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        {...props}
      />
    );
  }

  if (variant === "wave") {
    return (
      <motion.div
        className={cn(baseClasses, className)}
        animate={{
          scale: [1, 1.02, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: speedConfig[speed].duration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        {...props}
      />
    );
  }

  return <div className={cn(baseClasses, "animate-pulse", className)} {...props} />;
}

// Pre-built skeleton components for common use cases
export function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-3 p-4", className)} {...props}>
      <EnhancedSkeleton className="h-4 w-3/4" />
      <EnhancedSkeleton className="h-4 w-1/2" />
      <EnhancedSkeleton className="h-20 w-full" />
      <div className="flex space-x-2">
        <EnhancedSkeleton className="h-8 w-16" />
        <EnhancedSkeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
  ...props
}: {
  rows?: number;
  columns?: number;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      {/* Header */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <EnhancedSkeleton key={i} className="h-4" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <EnhancedSkeleton key={colIndex} className="h-4" variant="pulse" speed="normal" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", className)} {...props}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <EnhancedSkeleton className="h-4 w-24" />
            <EnhancedSkeleton className="h-8 w-8 rounded-full" />
          </div>
          <EnhancedSkeleton className="h-8 w-20" />
          <EnhancedSkeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-4 p-4", className)} {...props}>
      <div className="flex items-center justify-between">
        <EnhancedSkeleton className="h-6 w-32" />
        <div className="flex space-x-2">
          <EnhancedSkeleton className="h-8 w-20" />
          <EnhancedSkeleton className="h-8 w-20" />
        </div>
      </div>
      <EnhancedSkeleton className="h-48 w-full" variant="wave" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="text-center space-y-2">
            <EnhancedSkeleton className="h-6 w-full" />
            <EnhancedSkeleton className="h-4 w-3/4 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonNavigation({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 p-6", className)} {...props}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-3 p-4 border-2 rounded-lg">
          <EnhancedSkeleton className="h-10 w-10 rounded-lg mx-auto" />
          <EnhancedSkeleton className="h-4 w-full" />
          <EnhancedSkeleton className="h-3 w-3/4 mx-auto" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonActivity({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-3">
          <EnhancedSkeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <EnhancedSkeleton className="h-4 w-3/4" />
            <EnhancedSkeleton className="h-3 w-1/2" />
            <EnhancedSkeleton className="h-3 w-1/4" />
          </div>
          <EnhancedSkeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}
