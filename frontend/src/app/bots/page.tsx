"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getCurrentUserId } from "../../lib/dev-auth";
import { trpc } from "../../lib/trpc";

export default function BotsPage() {
  // Get user from Clerk or use dev user in development
  const { user } = useUser();
  const userId = user?.id || getCurrentUserId();

  const [selectedBot, setSelectedBot] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // tRPC queries and mutations
  const { data: bots, isLoading, error, refetch } = trpc.bots.getAll.useQuery({ userId });
  const createBot = trpc.bots.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreating(false);
      setNewBot({ name: "", tradingPairSymbol: "", riskLevel: "MEDIUM", maxPositionSize: 1000 });
    },
  });
  const toggleBot = trpc.bots.toggleActive.useMutation({
    onSuccess: () => refetch(),
  });
  const deleteBot = trpc.bots.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const [newBot, setNewBot] = useState({
    name: "",
    tradingPairSymbol: "",
    riskLevel: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
    maxPositionSize: 1000,
  });

  // Show loading state if user is not available yet
  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bots...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error loading bots</div>
          <p className="text-gray-600">Please check if the backend server is running</p>
          <p className="text-sm text-gray-500 mt-2">Error: {error.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const handleCreateBot = () => {
    if (!newBot.name || !newBot.tradingPairSymbol) {
      alert("Please fill in all required fields");
      return;
    }

    createBot.mutate({
      userId,
      name: newBot.name,
      tradingPairSymbol: newBot.tradingPairSymbol,
      riskLevel: newBot.riskLevel,
      maxPositionSize: newBot.maxPositionSize,
    });
  };

  const handleToggleBot = (botId: string, isActive: boolean) => {
    toggleBot.mutate({ userId, botId, isActive: !isActive });
  };

  const handleDeleteBot = (botId: string) => {
    if (confirm("Are you sure you want to delete this bot?")) {
      deleteBot.mutate({ userId, botId });
    }
  };

  const activeBots = bots?.filter((bot: any) => bot.isActive) || [];
  const inactiveBots = bots?.filter((bot: any) => !bot.isActive) || [];

  return (
    <div className="min-h-screen bg-gray-50 p-8 pb-32">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Trading Bots</h1>
          {user && (
            <div className="text-sm text-gray-600">
              Managing bots for {user.firstName || user.emailAddresses[0]?.emailAddress || 'Trader'}
            </div>
          )}
        </div>

        {/* Bot Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bots</p>
                <p className="text-2xl font-bold text-gray-900">{bots?.length || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <div className="w-6 h-6 bg-blue-600 rounded"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Bots</p>
                <p className="text-2xl font-bold text-green-600">{activeBots.length}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <div className="w-6 h-6 bg-green-600 rounded"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive Bots</p>
                <p className="text-2xl font-bold text-gray-600">{inactiveBots.length}</p>
              </div>
              <div className="p-3 rounded-full bg-gray-100">
                <div className="w-6 h-6 bg-gray-600 rounded"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Create Bot Button */}
        <div className="mb-6">
          <button
            onClick={() => setIsCreating(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Create New Bot
          </button>
        </div>

        {/* Create Bot Form */}
        {isCreating && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Trading Bot</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bot Name *
                </label>
                <input
                  type="text"
                  value={newBot.name}
                  onChange={(e) => setNewBot({ ...newBot, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter bot name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trading Pair *
                </label>
                <select
                  value={newBot.tradingPairSymbol}
                  onChange={(e) => setNewBot({ ...newBot, tradingPairSymbol: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select trading pair</option>
                  <option value="EURUSD">EUR/USD</option>
                  <option value="GBPUSD">GBP/USD</option>
                  <option value="USDJPY">USD/JPY</option>
                  <option value="USDCHF">USD/CHF</option>
                  <option value="AUDUSD">AUD/USD</option>
                  <option value="USDCAD">USD/CAD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Risk Level
                </label>
                <select
                  value={newBot.riskLevel}
                  onChange={(e) => setNewBot({ ...newBot, riskLevel: e.target.value as "LOW" | "MEDIUM" | "HIGH" })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="LOW">Low Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="HIGH">High Risk</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Position Size ($)
                </label>
                <input
                  type="number"
                  value={newBot.maxPositionSize}
                  onChange={(e) => setNewBot({ ...newBot, maxPositionSize: Number(e.target.value) })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1000"
                />
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={handleCreateBot}
                disabled={createBot.isLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createBot.isLoading ? "Creating..." : "Create Bot"}
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Bots List */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Your Trading Bots</h2>
          </div>

          {bots && bots.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {bots.map((bot: any) => (
            bots.map((bot: any) => (
              <div
                key={bot.id}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold">{bot.name}</h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      bot.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {bot.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-600">
                    Pair: <span className="font-medium">{bot.tradingPairSymbol}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Timeframe: <span className="font-medium">{bot.timeframe}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Risk: <span className="font-medium">{bot.riskPercentage}%</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Created:{" "}
                    <span className="font-medium">
                      {new Date(bot.createdAt).toLocaleDateString()}
                    </span>
                  </p>
                  {bot.metrics && (
                    <p
                      className={`text-sm font-medium ${
                        bot.metrics.totalPnL >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      P&L: ${bot.metrics.totalPnL.toFixed(2)}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleBotStatus(bot.id)}
                    disabled={toggleActiveMutation.isLoading}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                      bot.isActive
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {toggleActiveMutation.isLoading ? "..." : bot.isActive ? "Pause" : "Start"}
                  </button>
                  <button
                    onClick={() => handleDeleteBot(bot.id)}
                    disabled={deleteBotMutation.isLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deleteBotMutation.isLoading ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🤖</div>
              <p className="text-gray-500 mb-4">No trading bots created yet.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Your First Bot
              </button>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {bots && bots.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Bot Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{bots.length}</p>
                <p className="text-sm text-gray-600">Total Bots</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {bots.filter((bot: any) => bot.isActive).length}
                </p>
                <p className="text-sm text-gray-600">Active Bots</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">
                  {new Set(bots.map((bot: any) => bot.tradingPairSymbol)).size}
                </p>
                <p className="text-sm text-gray-600">Trading Pairs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  $
                  {bots
                    .reduce((sum: number, bot: any) => sum + (bot.metrics?.totalPnL || 0), 0)
                    .toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">Total P&L</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
