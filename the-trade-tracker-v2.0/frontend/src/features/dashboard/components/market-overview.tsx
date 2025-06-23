"use client";

import React from "react";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  volume: string;
}

interface MarketOverviewProps {
  markets?: MarketItem[];
}

const defaultMarkets: MarketItem[] = [
  {
    symbol: "BTC/USD",
    name: "Bitcoin",
    price: 63245.78,
    change: 2.34,
    volume: "1.2B",
  },
  {
    symbol: "ETH/USD",
    name: "Ethereum",
    price: 3149.25,
    change: -1.05,
    volume: "845M",
  },
  {
    symbol: "EUR/USD",
    name: "Euro",
    price: 1.0743,
    change: 0.21,
    volume: "3.1B",
  },
  {
    symbol: "SPX500",
    name: "S&P 500",
    price: 5122.15,
    change: 0.85,
    volume: "4.5B",
  },
];

export function MarketOverview({ markets = defaultMarkets }: MarketOverviewProps) {
  return (
    <div className="rounded-xl bg-white/60 dark:bg-gray-900/60 overflow-hidden backdrop-blur-md border border-blue-100/30 dark:border-blue-900/30">
      <div className="p-4 border-b border-blue-100/30 dark:border-blue-900/30">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">Market Overview</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-blue-100/30 dark:divide-blue-900/30">
          <thead className="bg-blue-50/50 dark:bg-blue-950/50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Symbol
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Price
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                24h Change
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Volume
              </th>
            </tr>
          </thead>
          <tbody className="bg-white/20 dark:bg-gray-900/20 divide-y divide-blue-100/30 dark:divide-blue-900/30">
            {markets.map((market) => (
              <tr key={market.symbol} className="hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                  {market.symbol}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                  {market.name}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700 dark:text-gray-300">
                  {typeof market.price === 'number' 
                    ? market.price < 10 
                      ? market.price.toFixed(4) 
                      : market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : market.price}
                </td>
                <td className={`px-4 py-3 whitespace-nowrap text-sm text-right flex items-center justify-end ${
                  market.change > 0 
                    ? "text-green-600 dark:text-green-400" 
                    : market.change < 0 
                    ? "text-red-600 dark:text-red-400" 
                    : "text-gray-500 dark:text-gray-400"
                }`}>
                  {market.change > 0 ? (
                    <IconChevronUp className="h-4 w-4 inline mr-1" />
                  ) : market.change < 0 ? (
                    <IconChevronDown className="h-4 w-4 inline mr-1" />
                  ) : null}
                  {Math.abs(market.change).toFixed(2)}%
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                  {market.volume}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
