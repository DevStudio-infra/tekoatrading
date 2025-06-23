"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PriceChartProps {
  symbol: string;
  className?: string;
}

export function PriceChart({ symbol, className }: PriceChartProps) {
  // In a real app, this would connect to a chart library like TradingView
  
  return (
    <div className={cn(
      "rounded-xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border border-blue-100/30 dark:border-blue-900/30 p-4 flex flex-col",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">{symbol} Chart</h2>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">1H</button>
          <button className="px-2 py-1 text-xs font-medium rounded hover:bg-blue-100/70 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300">4H</button>
          <button className="px-2 py-1 text-xs font-medium rounded hover:bg-blue-100/70 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300">1D</button>
          <button className="px-2 py-1 text-xs font-medium rounded hover:bg-blue-100/70 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300">1W</button>
        </div>
      </div>
      
      <div className="flex-1 bg-gray-100/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg min-h-[400px] flex items-center justify-center text-center p-4">
        <div>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            Price chart would be integrated here
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            In production, this would use a chart library like TradingView or Chart.js
          </p>
          
          {/* Visual placeholder for the chart */}
          <div className="mt-6 h-40 w-full max-w-lg mx-auto relative overflow-hidden">
            <div className="absolute inset-0 flex items-end">
              {Array.from({ length: 30 }).map((_, i) => (
                <div 
                  key={i}
                  style={{ 
                    height: `${20 + Math.sin(i * 0.5) * 60 + Math.random() * 20}px`,
                    width: '10px',
                    marginRight: '3px' 
                  }}
                  className={`${i % 2 === 0 ? 'bg-green-400/70' : 'bg-red-400/70'} rounded-t-sm`}
                />
              ))}
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-t from-white/20 dark:from-gray-900/20 to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
