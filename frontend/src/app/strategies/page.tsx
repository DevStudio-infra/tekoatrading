"use client";

import { useState } from "react";
import { trpc } from "../../lib/trpc";

interface Strategy {
  id: string;
  name: string;
  type: string;
  description: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  expectedReturn?: number;
  isActive: boolean;
  createdAt: string;
}

export default function StrategiesPage() {
  // tRPC queries and mutations
  const { data: strategies, isLoading, error, refetch } = trpc.strategies.getAll.useQuery();
  const createStrategyMutation = trpc.strategies.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreateForm(false);
      setNewStrategy({
        name: "",
        type: "scalping",
        description: "",
        riskLevel: "MEDIUM",
        indicators: [],
        timeframes: [],
        symbols: [],
      });
    },
  });
  const updateStrategyMutation = trpc.strategies.update.useMutation({
    onSuccess: () => refetch(),
  });
  const deleteStrategyMutation = trpc.strategies.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStrategy, setNewStrategy] = useState<{
    name: string;
    type: string;
    description: string;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    indicators: string[];
    timeframes: string[];
    symbols: string[];
  }>({
    name: "",
    type: "scalping",
    description: "",
    riskLevel: "MEDIUM",
    indicators: [],
    timeframes: [],
    symbols: [],
  });

  const strategyTypes = [
    { value: "scalping", label: "Scalping" },
    { value: "swing", label: "Swing Trading" },
    { value: "trend_following", label: "Trend Following" },
    { value: "mean_reversion", label: "Mean Reversion" },
    { value: "breakout", label: "Breakout" },
  ];

  const indicators = [
    "RSI",
    "MACD",
    "Moving Average",
    "Bollinger Bands",
    "Stochastic",
    "Williams %R",
    "ADX",
    "CCI",
    "Fibonacci",
    "Support/Resistance",
  ];

  const handleCreateStrategy = () => {
    if (!newStrategy.name.trim()) return;
    createStrategyMutation.mutate({
      name: newStrategy.name,
      type: newStrategy.type,
      description: newStrategy.description,
      riskLevel: newStrategy.riskLevel,
    });
  };

  const toggleStrategyStatus = (strategyId: string) => {
    const strategy = strategies?.find((s) => s.id === strategyId);
    if (strategy) {
      updateStrategyMutation.mutate({
        id: strategyId,
        isActive: !strategy.isActive,
      });
    }
  };

  const handleDeleteStrategy = (strategyId: string) => {
    if (confirm("Are you sure you want to delete this strategy?")) {
      deleteStrategyMutation.mutate({ id: strategyId });
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "LOW":
        return "bg-green-100 text-green-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "HIGH":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading strategies...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error loading strategies</div>
          <p className="text-gray-600">Please check if the backend server is running</p>
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Trading Strategies</h1>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Create New Strategy
          </button>
        </div>

        {/* Create Strategy Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Strategy</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Strategy Name</label>
                <input
                  type="text"
                  value={newStrategy.name}
                  onChange={(e) => setNewStrategy((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter strategy name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Strategy Type</label>
                <select
                  value={newStrategy.type}
                  onChange={(e) => setNewStrategy((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {strategyTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Risk Level</label>
                <select
                  value={newStrategy.riskLevel}
                  onChange={(e) =>
                    setNewStrategy((prev) => ({
                      ...prev,
                      riskLevel: e.target.value as "LOW" | "MEDIUM" | "HIGH",
                    }))
                  }
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="LOW">Low Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="HIGH">High Risk</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Technical Indicators</label>
                <div className="max-h-32 overflow-y-auto border rounded-lg p-2">
                  {indicators.map((indicator) => (
                    <label key={indicator} className="flex items-center space-x-2 mb-1">
                      <input
                        type="checkbox"
                        checked={newStrategy.indicators.includes(indicator)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewStrategy((prev) => ({
                              ...prev,
                              indicators: [...prev.indicators, indicator],
                            }));
                          } else {
                            setNewStrategy((prev) => ({
                              ...prev,
                              indicators: prev.indicators.filter((i) => i !== indicator),
                            }));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{indicator}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={newStrategy.description}
                  onChange={(e) =>
                    setNewStrategy((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Describe your trading strategy..."
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleCreateStrategy}
                disabled={createStrategyMutation.isLoading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createStrategyMutation.isLoading ? "Creating..." : "Create Strategy"}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Strategies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strategies && strategies.length > 0 ? (
            strategies.map((strategy) => (
              <div
                key={strategy.id}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold">{strategy.name}</h3>
                  <div className="flex flex-col gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(strategy.riskLevel)}`}
                    >
                      {strategy.riskLevel} RISK
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        strategy.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {strategy.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <p className="text-sm text-gray-600">
                    Type: <span className="font-medium">{strategy.type}</span>
                  </p>
                  <p className="text-sm text-gray-600">
                    Created:{" "}
                    <span className="font-medium">
                      {new Date(strategy.createdAt).toLocaleDateString()}
                    </span>
                  </p>
                  {strategy.description && (
                    <p className="text-sm text-gray-700 line-clamp-3">{strategy.description}</p>
                  )}
                  {strategy.expectedReturn && (
                    <p className="text-sm font-medium text-blue-600">
                      Expected Return: {strategy.expectedReturn.toFixed(1)}%
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleStrategyStatus(strategy.id)}
                    disabled={updateStrategyMutation.isLoading}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                      strategy.isActive
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {updateStrategyMutation.isLoading
                      ? "..."
                      : strategy.isActive
                        ? "Deactivate"
                        : "Activate"}
                  </button>
                  <button
                    onClick={() => handleDeleteStrategy(strategy.id)}
                    disabled={deleteStrategyMutation.isLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deleteStrategyMutation.isLoading ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📈</div>
              <p className="text-gray-500 mb-4">No trading strategies created yet.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Your First Strategy
              </button>
            </div>
          )}
        </div>

        {/* Strategy Statistics */}
        {strategies && strategies.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Strategy Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{strategies.length}</p>
                <p className="text-sm text-gray-600">Total Strategies</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {strategies.filter((strategy) => strategy.isActive).length}
                </p>
                <p className="text-sm text-gray-600">Active Strategies</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-600">
                  {new Set(strategies.map((strategy) => strategy.type)).size}
                </p>
                <p className="text-sm text-gray-600">Strategy Types</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {strategies.filter((s) => s.riskLevel === "LOW").length}L /{" "}
                  {strategies.filter((s) => s.riskLevel === "MEDIUM").length}M /{" "}
                  {strategies.filter((s) => s.riskLevel === "HIGH").length}H
                </p>
                <p className="text-sm text-gray-600">Risk Distribution</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
