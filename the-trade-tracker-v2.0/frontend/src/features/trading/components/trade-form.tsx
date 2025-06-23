"use client";

import React, { useState } from "react";
import { IconChevronDown, IconArrowUpRight, IconArrowDownRight } from "@tabler/icons-react";

interface TradeFormProps {
  onSubmit?: (data: TradeFormData) => void;
  className?: string;
}

export interface TradeFormData {
  symbol: string;
  direction: "long" | "short";
  amount: number;
  leverage: number;
  stopLoss: number | null;
  takeProfit: number | null;
}

export function TradeForm({ onSubmit, className }: TradeFormProps) {
  const [formData, setFormData] = useState<TradeFormData>({
    symbol: "BTC/USD",
    direction: "long",
    amount: 100,
    leverage: 5,
    stopLoss: null,
    takeProfit: null,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "leverage" || name === "amount" ? Number(value) : value,
    }));
  };

  const handleDirectionChange = (direction: "long" | "short") => {
    setFormData((prev) => ({ ...prev, direction }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  return (
    <div className={`rounded-xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border border-blue-100/30 dark:border-blue-900/30 p-4 ${className}`}>
      <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">Create New Trade</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Symbol Selection */}
        <div>
          <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Symbol
          </label>
          <select
            id="symbol"
            name="symbol"
            value={formData.symbol}
            onChange={handleChange}
            className="w-full rounded-md bg-white/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 py-2 px-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value="BTC/USD">BTC/USD - Bitcoin</option>
            <option value="ETH/USD">ETH/USD - Ethereum</option>
            <option value="EUR/USD">EUR/USD - Euro</option>
            <option value="GBP/USD">GBP/USD - British Pound</option>
            <option value="SPX500">SPX500 - S&P 500</option>
          </select>
        </div>
        
        {/* Direction Selector */}
        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Direction
          </span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className={`flex items-center justify-center gap-2 py-2 px-4 rounded-md border transition-colors ${
                formData.direction === "long"
                  ? "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-800 text-green-700 dark:text-green-400"
                  : "bg-white/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
              onClick={() => handleDirectionChange("long")}
            >
              <IconArrowUpRight className="h-5 w-5" />
              <span>Long</span>
            </button>
            <button
              type="button"
              className={`flex items-center justify-center gap-2 py-2 px-4 rounded-md border transition-colors ${
                formData.direction === "short"
                  ? "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-800 text-red-700 dark:text-red-400"
                  : "bg-white/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
              onClick={() => handleDirectionChange("short")}
            >
              <IconArrowDownRight className="h-5 w-5" />
              <span>Short</span>
            </button>
          </div>
        </div>
        
        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Amount (USD)
          </label>
          <input
            type="number"
            id="amount"
            name="amount"
            min="1"
            value={formData.amount}
            onChange={handleChange}
            className="w-full rounded-md bg-white/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 py-2 px-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </div>
        
        {/* Leverage */}
        <div>
          <label htmlFor="leverage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Leverage ({formData.leverage}x)
          </label>
          <input
            type="range"
            id="leverage"
            name="leverage"
            min="1"
            max="100"
            step="1"
            value={formData.leverage}
            onChange={handleChange}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-400"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>1x</span>
            <span>25x</span>
            <span>50x</span>
            <span>100x</span>
          </div>
        </div>
        
        {/* Advanced Options Toggle */}
        <button
          type="button"
          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <IconChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
        </button>
        
        {/* Advanced Options */}
        {showAdvanced && (
          <div className="space-y-4 pl-2 border-l-2 border-blue-100 dark:border-blue-900">
            {/* Stop Loss */}
            <div>
              <label htmlFor="stopLoss" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stop Loss (optional)
              </label>
              <input
                type="number"
                id="stopLoss"
                name="stopLoss"
                placeholder="Enter price"
                value={formData.stopLoss || ''}
                onChange={handleChange}
                className="w-full rounded-md bg-white/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 py-2 px-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>
            
            {/* Take Profit */}
            <div>
              <label htmlFor="takeProfit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Take Profit (optional)
              </label>
              <input
                type="number"
                id="takeProfit"
                name="takeProfit"
                placeholder="Enter price"
                value={formData.takeProfit || ''}
                onChange={handleChange}
                className="w-full rounded-md bg-white/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 py-2 px-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>
          </div>
        )}
        
        {/* Submit Button */}
        <button
          type="submit"
          className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
            formData.direction === "long"
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-red-600 hover:bg-red-700 text-white"
          }`}
        >
          {formData.direction === "long" ? "Open Long Position" : "Open Short Position"}
        </button>
      </form>
    </div>
  );
}
