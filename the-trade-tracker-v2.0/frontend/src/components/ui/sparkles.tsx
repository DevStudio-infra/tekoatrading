"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SparkleProps {
  id: string;
  createdAt: number;
  color: string;
  size: number;
  style: React.CSSProperties;
}

interface SparklesProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
  minSize?: number;
  maxSize?: number;
  count?: number;
}

const random = (min: number, max: number) => Math.floor(Math.random() * (max - min)) + min;
const generateSparkle = (color: string, minSize: number, maxSize: number): SparkleProps => {
  return {
    id: String(random(10000, 99999)),
    createdAt: Date.now(),
    color,
    size: random(minSize, maxSize),
    style: {
      top: random(0, 100) + '%',
      left: random(0, 100) + '%',
      zIndex: 2
    }
  };
};

const Sparkle: React.FC<SparkleProps> = ({ color, size, style }) => {
  const path =
    'M26.5 25.5C19.0043 33.3697 0 34 0 34C0 34 19.1013 35.3684 26.5 43.5C33.234 50.901 34 68 34 68C34 68 36.9884 50.7065 44.5 43.5C51.6431 36.647 68 34 68 34C68 34 51.6947 32.0939 44.5 25.5C36.5605 18.2235 34 0 34 0C34 0 33.6591 17.9837 26.5 25.5Z';

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 68 68"
      fill="none"
      style={style}
      className="absolute"
      initial={{ scale: 0 }}
      animate={{ 
        scale: [0, 1, 0],
        rotate: ['0deg', '360deg']
      }}
      transition={{
        duration: 0.8,
        ease: "easeOut",
        times: [0, 0.4, 1],
      }}
    >
      <path d={path} fill={color} />
    </motion.svg>
  );
};

export const Sparkles: React.FC<SparklesProps> = ({
  children,
  className,
  color = '#FFC700',
  minSize = 10,
  maxSize = 20,
  count = 20,
}) => {
  const [sparkles, setSparkles] = useState<SparkleProps[]>([]);
  const prefersReducedMotion = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion.current = mediaQuery.matches;

    if (!prefersReducedMotion.current) {
      const generateSparkles = () => {
        const now = Date.now();
        const newSparkles = [...sparkles];
        const nextSparkles = newSparkles.filter(sparkle => {
          const delta = now - sparkle.createdAt;
          return delta < 1000;
        });

        while (nextSparkles.length < count) {
          nextSparkles.push(generateSparkle(color, minSize, maxSize));
        }

        setSparkles(nextSparkles);
      };

      const interval = setInterval(generateSparkles, 200);
      return () => clearInterval(interval);
    }
  }, [sparkles, color, minSize, maxSize, count]);

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      {children}
      {isMounted && containerRef.current && !prefersReducedMotion.current && createPortal(
        sparkles.map(sparkle => (
          <Sparkle key={sparkle.id} {...sparkle} />
        )),
        containerRef.current
      )}
    </div>
  );
};
