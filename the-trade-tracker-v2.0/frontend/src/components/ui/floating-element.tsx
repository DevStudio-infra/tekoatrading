"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FloatingElementProps {
  children: React.ReactNode;
  className?: string;
  amplitude?: number;
  duration?: number;
  delay?: number;
}

export const FloatingElement: React.FC<FloatingElementProps> = ({
  children,
  className,
  amplitude = 10,
  duration = 4,
  delay = 0
}) => {
  return (
    <motion.div
      className={cn("relative", className)}
      initial={{ y: 0 }}
      animate={{ 
        y: [0, -amplitude, 0, amplitude, 0] 
      }}
      transition={{
        duration: duration,
        ease: "easeInOut",
        repeat: Infinity,
        delay: delay,
      }}
    >
      {children}
    </motion.div>
  );
};
