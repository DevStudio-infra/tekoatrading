"use client";

import React from "react";
import { IconArrowUpRight, IconArrowDownRight, IconX } from "@tabler/icons-react";

interface Position {
  id: string;
  symbol: string;
  direction: "long" | "short";
  entryPrice: number;
  currentPrice: number;
  size: number;
  leverage: number;
  profit: number;
  profitPercentage: number;
  openTime: string;
}

interface PositionsOverviewProps {
  positions?: Position[];
}

const defaultPositions: Position[] = [
  {
    id: "pos-1",
    symbol: "BTC/USD",
    direction: "long",
    entryPrice: 60234.5,
    currentPrice: 63245.78,
    size: 0.5,
    leverage: 10,
    profit: 1505.64,
    profitPercentage: 5.0,
    openTime: "2025-05-10T09:30:00Z"
  },
  {
    id: "pos-2",
    symbol: "ETH/USD",
    direction: "short",
    entryPrice: 3250.75,
    currentPrice: 3149.25,
    size: 2,
    leverage: 5,
    profit: 1015.0,
    profitPercentage: 3.12,
    openTime: "2025-05-11T14:20:00Z"
  },
  {
    id: "pos-3",
    symbol: "EUR/USD",
    direction: "long",
    entryPrice: 1.0710,
    currentPrice: 1.0743,
    size: 10000,
    leverage: 20,
    profit: 660.0,
    profitPercentage: 0.31,
    openTime: "2025-05-12T08:45:00Z"
  }
];

export function PositionsOverview({ positions = defaultPositions }: PositionsOverviewProps) {
  return (
    <div className="rounded-xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border border-blue-100/30 dark:border-blue-900/30 overflow-hidden">
      <div className="p-4 border-b border-blue-100/30 dark:border-blue-900/30">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">Active Positions</h2>
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-full grid grid-cols-1 divide-y divide-blue-100/30 dark:divide-blue-900/30">
          {positions.map((position) => (
            <div key={position.id} className="p-4 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    position.direction === "long" 
                      ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" 
                      : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                  }`}>
                    {position.direction === "long" ? (
                      <IconArrowUpRight className="h-6 w-6" />
                    ) : (
                      <IconArrowDownRight className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {position.symbol}
                      <span className={`ml-2 text-xs font-normal px-2 py-0.5 rounded-full ${
                        position.direction === "long" 
                          ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400" 
                          : "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400"
                      }`}>
                        {position.direction.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Entry: {position.entryPrice} • Size: {position.size} • {position.leverage}x
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full md:w-auto">
                  <div className="text-sm">
                    <div className="text-gray-500 dark:text-gray-400">Current</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{position.currentPrice}</div>
                  </div>
                  
                  <div className="text-sm">
                    <div className="text-gray-500 dark:text-gray-400">P/L ($)</div>
                    <div className={`font-medium ${
                      position.profit > 0 
                        ? "text-green-600 dark:text-green-400" 
                        : position.profit < 0 
                        ? "text-red-600 dark:text-red-400" 
                        : "text-gray-500 dark:text-gray-400"
                    }`}>
                      {position.profit > 0 ? "+" : ""}{position.profit.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <div className="text-gray-500 dark:text-gray-400">P/L (%)</div>
                    <div className={`font-medium ${
                      position.profitPercentage > 0 
                        ? "text-green-600 dark:text-green-400" 
                        : position.profitPercentage < 0 
                        ? "text-red-600 dark:text-red-400" 
                        : "text-gray-500 dark:text-gray-400"
                    }`}>
                      {position.profitPercentage > 0 ? "+" : ""}{position.profitPercentage.toFixed(2)}%
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="rounded-full p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <IconX className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {positions.length === 0 && (
        <div className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">No active positions</p>
        </div>
      )}
    </div>
  );
}
