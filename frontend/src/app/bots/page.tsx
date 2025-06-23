"use client";

import { useState } from "react";
import { trpc } from "../../lib/trpc";

interface CreateBotForm {
  name: string;
  description: string;
  tradingPairSymbol: string;
  timeframe: "M1" | "M5" | "M15" | "M30" | "H1" | "H4" | "D1";
  maxPositionSize: number;
  riskPercentage: number;
  isAiTradingActive: boolean;
}

export default function Bots() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateBotForm>({
    name: "",
    description: "",
    tradingPairSymbol: "EURUSD",
    timeframe: "M15",
    maxPositionSize: 1000,
    riskPercentage: 2,
    isAiTradingActive: true,
  });

  // Mock user ID - in real app, get from auth
  const userId = "user-1";

  // Fetch bots
  const { data: bots, refetch, isLoading } = trpc.bots.getAll.useQuery({ userId });

  // Mutations
  const createBot = trpc.bots.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreateForm(false);
      setFormData({
        name: "",
        description: "",
        tradingPairSymbol: "EURUSD",
        timeframe: "M15",
        maxPositionSize: 1000,
        riskPercentage: 2,
        isAiTradingActive: true,
      });
    },
  });

  const updateBot = trpc.bots.update.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const deleteBot = trpc.bots.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const evaluateBot = trpc.bots.evaluate.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleCreateBot = (e: React.FormEvent) => {
    e.preventDefault();
    createBot.mutate({
      ...formData,
      userId,
    });
  };

  const handleToggleActive = (botId: string, currentStatus: boolean) => {
    updateBot.mutate({
      id: botId,
      isActive: !currentStatus,
    });
  };

  const handleToggleAI = (botId: string, currentStatus: boolean) => {
    updateBot.mutate({
      id: botId,
      isAiTradingActive: !currentStatus,
    });
  };

  const handleEvaluateBot = (botId: string) => {
    evaluateBot.mutate({
      botId,
      chartData: {
        analysis: { symbol: "EURUSD", timeframe: "M15" },
      },
    });
  };

  const timeframeOptions = [
    { value: "M1", label: "1 Minute" },
    { value: "M5", label: "5 Minutes" },
    { value: "M15", label: "15 Minutes" },
    { value: "M30", label: "30 Minutes" },
    { value: "H1", label: "1 Hour" },
    { value: "H4", label: "4 Hours" },
    { value: "D1", label: "1 Day" },
  ];

  const tradingPairs = [
    "EURUSD",
    "GBPUSD",
    "USDJPY",
    "USDCHF",
    "AUDUSD",
    "USDCAD",
    "NZDUSD",
    "EURGBP",
    "EURJPY",
    "GBPJPY",
    "XAUUSD",
    "XAGUSD",
    "BTCUSD",
    "ETHUSD",
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trading Bots</h1>
            <p className="text-gray-600 mt-1">Create and manage AI-powered trading bots</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
          >
            Create New Bot
          </button>
        </div>

        {/* Create Bot Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Create Trading Bot</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateBot} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bot Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter bot name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trading Pair *
                    </label>
                    <select
                      value={formData.tradingPairSymbol}
                      onChange={(e) =>
                        setFormData({ ...formData, tradingPairSymbol: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {tradingPairs.map((pair) => (
                        <option key={pair} value={pair}>
                          {pair}
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Position Size ($)
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="10000"
                      value={formData.maxPositionSize}
                      onChange={(e) =>
                        setFormData({ ...formData, maxPositionSize: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Risk Percentage (%)
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={formData.riskPercentage}
                      onChange={(e) =>
                        setFormData({ ...formData, riskPercentage: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="aiTrading"
                      checked={formData.isAiTradingActive}
                      onChange={(e) =>
                        setFormData({ ...formData, isAiTradingActive: e.target.checked })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="aiTrading" className="ml-2 block text-sm text-gray-700">
                      Enable AI Trading
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional description of your trading strategy"
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
                    disabled={createBot.isLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createBot.isLoading ? "Creating..." : "Create Bot"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">Loading bots...</p>
            </div>
          ) : bots && bots.length > 0 ? (
            bots.map((bot) => (
              <div key={bot.id} className="bg-white rounded-lg shadow-lg p-6">
                {/* Bot Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{bot.name}</h3>
                    <p className="text-sm text-gray-600">{bot.tradingPairSymbol}</p>
                  </div>
                  <div className="flex space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        bot.isActive ? "bg-green-500" : "bg-gray-400"
                      }`}
                      title={bot.isActive ? "Active" : "Inactive"}
                    ></div>
                    <div
                      className={`w-3 h-3 rounded-full ${
                        bot.isAiTradingActive ? "bg-blue-500" : "bg-gray-400"
                      }`}
                      title={bot.isAiTradingActive ? "AI Trading On" : "AI Trading Off"}
                    ></div>
                  </div>
                </div>

                {/* Bot Metrics */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">P&L:</span>
                    <span
                      className={`font-semibold ${
                        bot.metrics.totalPnL >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      ${bot.metrics.totalPnL.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Win Rate:</span>
                    <span className="font-semibold">{bot.metrics.winRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trades:</span>
                    <span className="font-semibold">{bot.metrics.totalTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Risk:</span>
                    <span className="font-semibold">{bot.riskPercentage}%</span>
                  </div>
                </div>

                {/* Bot Actions */}
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleToggleActive(bot.id, bot.isActive)}
                      disabled={updateBot.isLoading}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${
                        bot.isActive
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      } disabled:opacity-50`}
                    >
                      {bot.isActive ? "Stop" : "Start"}
                    </button>
                    <button
                      onClick={() => handleToggleAI(bot.id, bot.isAiTradingActive)}
                      disabled={updateBot.isLoading}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${
                        bot.isAiTradingActive
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      } disabled:opacity-50`}
                    >
                      {bot.isAiTradingActive ? "AI On" : "AI Off"}
                    </button>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEvaluateBot(bot.id)}
                      disabled={evaluateBot.isLoading}
                      className="flex-1 py-2 px-3 bg-purple-100 text-purple-700 rounded-md text-sm font-medium hover:bg-purple-200 disabled:opacity-50"
                    >
                      Evaluate
                    </button>
                    <button
                      onClick={() => deleteBot.mutate({ id: bot.id })}
                      disabled={deleteBot.isLoading}
                      className="flex-1 py-2 px-3 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Bot Description */}
                {bot.description && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">{bot.description}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-12 h-12 bg-gray-400 rounded"></div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Trading Bots</h3>
                <p className="text-gray-600 mb-6">
                  Create your first AI-powered trading bot to start automated trading.
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Create Your First Bot
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
