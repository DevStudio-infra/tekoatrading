"use client";

import { useState } from "react";
import { trpc } from "../../lib/trpc";

interface StrategyForm {
  name: string;
  description: string;
  type: "scalping" | "swing" | "trend_following" | "mean_reversion" | "breakout";
  timeframe: "M1" | "M5" | "M15" | "M30" | "H1" | "H4" | "D1";
  maxRisk: number;
  stopLoss: number;
  takeProfit: number;
  indicators: string[];
  entryConditions: string;
  exitConditions: string;
  riskRewardRatio: number;
  maxPositions: number;
}

export default function Strategies() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [formData, setFormData] = useState<StrategyForm>({
    name: "",
    description: "",
    type: "scalping",
    timeframe: "M15",
    maxRisk: 2,
    stopLoss: 1,
    takeProfit: 2,
    indicators: ["RSI", "SMA"],
    entryConditions: "",
    exitConditions: "",
    riskRewardRatio: 2,
    maxPositions: 3,
  });

  // Mock user ID - in real app, get from auth
  const userId = "user-1";

  // Fetch strategies
  const {
    data: strategies,
    refetch,
    isLoading,
  } = trpc.strategies?.list?.useQuery({ userId }) || {
    data: null,
    refetch: () => {},
    isLoading: false,
  };

  // Mock strategies data for demonstration
  const mockStrategies = [
    {
      id: "strat-1",
      name: "Scalping Master",
      description: "High-frequency scalping strategy for major forex pairs",
      type: "scalping",
      timeframe: "M1",
      maxRisk: 1,
      stopLoss: 0.5,
      takeProfit: 1,
      indicators: ["RSI", "MACD", "EMA"],
      entryConditions: "RSI oversold + MACD bullish crossover",
      exitConditions: "RSI overbought or stop loss hit",
      riskRewardRatio: 2,
      maxPositions: 5,
      performance: {
        winRate: 68.5,
        totalTrades: 245,
        profitFactor: 1.85,
        avgWin: 15.2,
        avgLoss: -8.7,
        maxDrawdown: 3.2,
      },
      isActive: true,
      createdAt: "2024-01-10T00:00:00Z",
    },
    {
      id: "strat-2",
      name: "Trend Rider",
      description: "Long-term trend following strategy with momentum indicators",
      type: "trend_following",
      timeframe: "H4",
      maxRisk: 3,
      stopLoss: 2,
      takeProfit: 6,
      indicators: ["SMA", "ADX", "Bollinger"],
      entryConditions: "Price above SMA + ADX > 25 + Bollinger breakout",
      exitConditions: "ADX declining or price below SMA",
      riskRewardRatio: 3,
      maxPositions: 2,
      performance: {
        winRate: 55.2,
        totalTrades: 89,
        profitFactor: 2.1,
        avgWin: 45.8,
        avgLoss: -15.2,
        maxDrawdown: 8.5,
      },
      isActive: false,
      createdAt: "2024-01-08T00:00:00Z",
    },
    {
      id: "strat-3",
      name: "Mean Reversion Pro",
      description: "Counter-trend strategy targeting oversold/overbought conditions",
      type: "mean_reversion",
      timeframe: "M15",
      maxRisk: 2.5,
      stopLoss: 1.5,
      takeProfit: 3,
      indicators: ["RSI", "Stochastic", "Support/Resistance"],
      entryConditions: "RSI < 30 + Stochastic oversold + near support",
      exitConditions: "RSI > 70 or resistance hit",
      riskRewardRatio: 2,
      maxPositions: 3,
      performance: {
        winRate: 72.1,
        totalTrades: 156,
        profitFactor: 1.95,
        avgWin: 22.3,
        avgLoss: -11.8,
        maxDrawdown: 4.7,
      },
      isActive: true,
      createdAt: "2024-01-12T00:00:00Z",
    },
  ];

  // Mutations (mock for now)
  const createStrategy = {
    mutate: (data: any) => {
      console.log("Creating strategy:", data);
      setShowCreateForm(false);
      resetForm();
    },
    isLoading: false,
  };

  const updateStrategy = {
    mutate: (data: any) => {
      console.log("Updating strategy:", data);
    },
    isLoading: false,
  };

  const deleteStrategy = {
    mutate: (data: any) => {
      console.log("Deleting strategy:", data);
    },
    isLoading: false,
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "scalping",
      timeframe: "M15",
      maxRisk: 2,
      stopLoss: 1,
      takeProfit: 2,
      indicators: ["RSI", "SMA"],
      entryConditions: "",
      exitConditions: "",
      riskRewardRatio: 2,
      maxPositions: 3,
    });
  };

  const handleCreateStrategy = (e: React.FormEvent) => {
    e.preventDefault();
    createStrategy.mutate({
      ...formData,
      userId,
    });
  };

  const strategyTypes = [
    { value: "scalping", label: "Scalping" },
    { value: "swing", label: "Swing Trading" },
    { value: "trend_following", label: "Trend Following" },
    { value: "mean_reversion", label: "Mean Reversion" },
    { value: "breakout", label: "Breakout" },
  ];

  const timeframeOptions = [
    { value: "M1", label: "1 Minute" },
    { value: "M5", label: "5 Minutes" },
    { value: "M15", label: "15 Minutes" },
    { value: "M30", label: "30 Minutes" },
    { value: "H1", label: "1 Hour" },
    { value: "H4", label: "4 Hours" },
    { value: "D1", label: "1 Day" },
  ];

  const availableIndicators = [
    "RSI",
    "MACD",
    "SMA",
    "EMA",
    "Bollinger",
    "Stochastic",
    "ADX",
    "Support/Resistance",
    "Fibonacci",
    "Volume",
    "ATR",
    "CCI",
  ];

  const toggleIndicator = (indicator: string) => {
    setFormData((prev) => ({
      ...prev,
      indicators: prev.indicators.includes(indicator)
        ? prev.indicators.filter((i) => i !== indicator)
        : [...prev.indicators, indicator],
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trading Strategies</h1>
            <p className="text-gray-600 mt-1">Create and manage your trading strategies</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
          >
            Create New Strategy
          </button>
        </div>

        {/* Create Strategy Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Create Trading Strategy</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateStrategy} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Basic Information</h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Strategy Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter strategy name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Strategy Type *
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {strategyTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timeframe *
                      </label>
                      <select
                        value={formData.timeframe}
                        onChange={(e) =>
                          setFormData({ ...formData, timeframe: e.target.value as any })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {timeframeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Risk Management */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Risk Management</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Risk (%)
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          max="10"
                          step="0.1"
                          value={formData.maxRisk}
                          onChange={(e) =>
                            setFormData({ ...formData, maxRisk: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Stop Loss (%)
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          max="10"
                          step="0.1"
                          value={formData.stopLoss}
                          onChange={(e) =>
                            setFormData({ ...formData, stopLoss: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Take Profit (%)
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          max="20"
                          step="0.1"
                          value={formData.takeProfit}
                          onChange={(e) =>
                            setFormData({ ...formData, takeProfit: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Positions
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={formData.maxPositions}
                          onChange={(e) =>
                            setFormData({ ...formData, maxPositions: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technical Indicators */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Technical Indicators
                  </label>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {availableIndicators.map((indicator) => (
                      <button
                        key={indicator}
                        type="button"
                        onClick={() => toggleIndicator(indicator)}
                        className={`px-3 py-2 rounded-md text-sm font-medium ${
                          formData.indicators.includes(indicator)
                            ? "bg-blue-100 text-blue-800 border-2 border-blue-500"
                            : "bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200"
                        }`}
                      >
                        {indicator}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Entry and Exit Conditions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Entry Conditions
                    </label>
                    <textarea
                      value={formData.entryConditions}
                      onChange={(e) =>
                        setFormData({ ...formData, entryConditions: e.target.value })
                      }
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe when to enter trades..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exit Conditions
                    </label>
                    <textarea
                      value={formData.exitConditions}
                      onChange={(e) => setFormData({ ...formData, exitConditions: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe when to exit trades..."
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe your strategy approach and methodology..."
                  />
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createStrategy.isLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createStrategy.isLoading ? "Creating..." : "Create Strategy"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Strategies Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {mockStrategies.map((strategy) => (
            <div key={strategy.id} className="bg-white rounded-lg shadow-lg p-6">
              {/* Strategy Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{strategy.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {strategy.type.replace("_", " ").toUpperCase()}
                    </span>
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                      {strategy.timeframe}
                    </span>
                  </div>
                </div>
                <div
                  className={`w-3 h-3 rounded-full ${
                    strategy.isActive ? "bg-green-500" : "bg-gray-400"
                  }`}
                  title={strategy.isActive ? "Active" : "Inactive"}
                ></div>
              </div>

              {/* Strategy Description */}
              <p className="text-gray-600 text-sm mb-4">{strategy.description}</p>

              {/* Performance Metrics */}
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Win Rate:</span>
                    <span className="ml-2 font-semibold text-green-600">
                      {strategy.performance.winRate}%
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Trades:</span>
                    <span className="ml-2 font-semibold">{strategy.performance.totalTrades}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Profit Factor:</span>
                    <span className="ml-2 font-semibold">{strategy.performance.profitFactor}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Max DD:</span>
                    <span className="ml-2 font-semibold text-red-600">
                      {strategy.performance.maxDrawdown}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Risk Management */}
              <div className="border-t border-gray-200 pt-4 mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Risk Management</h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-gray-600">Risk:</span>
                    <span className="ml-1 font-semibold">{strategy.maxRisk}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">SL:</span>
                    <span className="ml-1 font-semibold">{strategy.stopLoss}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">TP:</span>
                    <span className="ml-1 font-semibold">{strategy.takeProfit}%</span>
                  </div>
                </div>
              </div>

              {/* Indicators */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Indicators</h4>
                <div className="flex flex-wrap gap-1">
                  {strategy.indicators.map((indicator) => (
                    <span
                      key={indicator}
                      className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full"
                    >
                      {indicator}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <button
                    onClick={() =>
                      updateStrategy.mutate({ id: strategy.id, isActive: !strategy.isActive })
                    }
                    disabled={updateStrategy.isLoading}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${
                      strategy.isActive
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    } disabled:opacity-50`}
                  >
                    {strategy.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => setSelectedStrategy(strategy.id)}
                    className="flex-1 py-2 px-3 bg-blue-100 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-200"
                  >
                    View Details
                  </button>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => console.log("Backtest strategy:", strategy.id)}
                    className="flex-1 py-2 px-3 bg-purple-100 text-purple-700 rounded-md text-sm font-medium hover:bg-purple-200"
                  >
                    Backtest
                  </button>
                  <button
                    onClick={() => deleteStrategy.mutate({ id: strategy.id })}
                    disabled={deleteStrategy.isLoading}
                    className="flex-1 py-2 px-3 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {mockStrategies.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-12 h-12 bg-gray-400 rounded"></div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Trading Strategies</h3>
                <p className="text-gray-600 mb-6">
                  Create your first trading strategy to start systematic trading.
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Create Your First Strategy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
