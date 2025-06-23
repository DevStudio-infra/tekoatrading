"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  delay?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className, hoverEffect = true, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        ease: "easeOut",
        delay: delay,
      }}
      whileHover={
        hoverEffect
          ? {
              y: -5,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }
          : {}
      }
      className={cn(
        "relative backdrop-blur-sm rounded-xl border border-blue-100 dark:border-blue-800/40",
        "bg-white/60 dark:bg-gray-900/50",
        "overflow-hidden transition-all duration-300",
        "shadow-sm hover:shadow-xl",
        className
      )}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-blue-100/30 dark:from-blue-900/10 dark:to-purple-900/20 pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};
