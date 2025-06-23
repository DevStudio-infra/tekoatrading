"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getCurrentUserId } from "../../lib/dev-auth";
import { trpc } from "../../lib/trpc";

export default function StrategiesPage() {
  // Get user from Clerk or use dev user in development
  const { user } = useUser();
  const userId = user?.id || getCurrentUserId();

  const [isCreating, setIsCreating] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<any>(null);

  // tRPC queries and mutations
  const { data: strategies, isLoading, error, refetch } = trpc.strategies.list.useQuery({ userId });
  const createStrategy = trpc.strategies.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreating(false);
      setNewStrategy({
        name: "",
        description: "",
        riskLevel: "MEDIUM",
        technicalIndicators: [],
      });
    },
  });
  const updateStrategy = trpc.strategies.update.useMutation({
    onSuccess: () => refetch(),
  });
  const deleteStrategy = trpc.strategies.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const [newStrategy, setNewStrategy] = useState({
    name: "",
    description: "",
    riskLevel: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
    technicalIndicators: [] as string[],
  });

  const availableIndicators = ["SMA", "EMA", "RSI", "MACD", "Bollinger Bands", "Stochastic"];

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
          <p className="text-gray-600">Loading strategies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error loading strategies</div>
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

  const handleCreateStrategy = () => {
    if (!newStrategy.name || !newStrategy.description) {
      alert("Please fill in all required fields");
      return;
    }

    createStrategy.mutate({
      userId,
      name: newStrategy.name,
      description: newStrategy.description,
      riskLevel: newStrategy.riskLevel,
      technicalIndicators: newStrategy.technicalIndicators,
    });
  };

  const handleToggleStrategy = (strategyId: string, isActive: boolean) => {
    updateStrategy.mutate({
      userId,
      strategyId,
      isActive: !isActive,
    });
  };

  const handleDeleteStrategy = (strategyId: string) => {
    if (confirm("Are you sure you want to delete this strategy?")) {
      deleteStrategy.mutate({ userId, strategyId });
    }
  };

  const toggleIndicator = (indicator: string) => {
    setNewStrategy((prev) => ({
      ...prev,
      technicalIndicators: prev.technicalIndicators.includes(indicator)
        ? prev.technicalIndicators.filter((i) => i !== indicator)
        : [...prev.technicalIndicators, indicator],
    }));
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "LOW":
        return "text-green-600 bg-green-100";
      case "MEDIUM":
        return "text-yellow-600 bg-yellow-100";
      case "HIGH":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const activeStrategies = strategies?.filter((s: any) => s.isActive) || [];
  const inactiveStrategies = strategies?.filter((s: any) => !s.isActive) || [];

  return (
    <div className="min-h-screen bg-gray-50 p-8 pb-32">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Trading Strategies</h1>
          {user && (
            <div className="text-sm text-gray-600">
              Managing strategies for{" "}
              {user.firstName || user.emailAddresses[0]?.emailAddress || "Trader"}
            </div>
          )}
        </div>

        {/* Strategy Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Strategies</p>
                <p className="text-2xl font-bold text-gray-900">{strategies?.length || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <div className="w-6 h-6 bg-blue-600 rounded"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Strategies</p>
                <p className="text-2xl font-bold text-green-600">{activeStrategies.length}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <div className="w-6 h-6 bg-green-600 rounded"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive Strategies</p>
                <p className="text-2xl font-bold text-gray-600">{inactiveStrategies.length}</p>
              </div>
              <div className="p-3 rounded-full bg-gray-100">
                <div className="w-6 h-6 bg-gray-600 rounded"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Create Strategy Button */}
        <div className="mb-6">
          <button
            onClick={() => setIsCreating(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Create New Strategy
          </button>
        </div>

        {/* Create Strategy Form */}
        {isCreating && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Trading Strategy</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Strategy Name *
                </label>
                <input
                  type="text"
                  value={newStrategy.name}
                  onChange={(e) => setNewStrategy({ ...newStrategy, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter strategy name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={newStrategy.description}
                  onChange={(e) => setNewStrategy({ ...newStrategy, description: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe your trading strategy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Risk Level</label>
                <select
                  value={newStrategy.riskLevel}
                  onChange={(e) =>
                    setNewStrategy({
                      ...newStrategy,
                      riskLevel: e.target.value as "LOW" | "MEDIUM" | "HIGH",
                    })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="LOW">Low Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="HIGH">High Risk</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Technical Indicators
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availableIndicators.map((indicator) => (
                    <label key={indicator} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newStrategy.technicalIndicators.includes(indicator)}
                        onChange={() => toggleIndicator(indicator)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{indicator}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={handleCreateStrategy}
                disabled={createStrategy.isLoading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createStrategy.isLoading ? "Creating..." : "Create Strategy"}
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

        {/* Strategies List */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Your Trading Strategies</h2>
          </div>

          {strategies && strategies.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {strategies.map((strategy: any) => (
                <div key={strategy.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            strategy.isActive ? "bg-green-500" : "bg-gray-400"
                          }`}
                        ></div>
                        <h3 className="text-lg font-medium text-gray-900">{strategy.name}</h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskLevelColor(strategy.riskLevel)}`}
                        >
                          {strategy.riskLevel} RISK
                        </span>
                      </div>

                      <p className="text-gray-600 mb-3">{strategy.description}</p>

                      {strategy.technicalIndicators && strategy.technicalIndicators.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {strategy.technicalIndicators.map((indicator: string) => (
                            <span
                              key={indicator}
                              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                            >
                              {indicator}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-gray-500">
                        Created: {new Date(strategy.createdAt).toLocaleDateString()} • Updated:{" "}
                        {new Date(strategy.updatedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleToggleStrategy(strategy.id, strategy.isActive)}
                        disabled={updateStrategy.isLoading}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          strategy.isActive
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {strategy.isActive ? "Deactivate" : "Activate"}
                      </button>

                      <button
                        onClick={() => setSelectedStrategy(strategy)}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium"
                      >
                        View Details
                      </button>

                      <button
                        onClick={() => handleDeleteStrategy(strategy.id)}
                        disabled={deleteStrategy.isLoading}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📈</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No strategies yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first trading strategy to start automated trading
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Create Your First Strategy
              </button>
            </div>
          )}
        </div>

        {/* Strategy Details Modal */}
        {selectedStrategy && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Strategy Details: {selectedStrategy.name}</h2>
                <button
                  onClick={() => setSelectedStrategy(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <p
                    className={`text-lg font-bold ${selectedStrategy.isActive ? "text-green-600" : "text-gray-600"}`}
                  >
                    {selectedStrategy.isActive ? "Active" : "Inactive"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">Risk Level</p>
                  <span
                    className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getRiskLevelColor(selectedStrategy.riskLevel)}`}
                  >
                    {selectedStrategy.riskLevel} RISK
                  </span>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">Description</p>
                  <p className="text-gray-900">{selectedStrategy.description}</p>
                </div>

                {selectedStrategy.technicalIndicators &&
                  selectedStrategy.technicalIndicators.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Technical Indicators</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedStrategy.technicalIndicators.map((indicator: string) => (
                          <span
                            key={indicator}
                            className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                          >
                            {indicator}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600">
                    Created: {new Date(selectedStrategy.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Last Updated: {new Date(selectedStrategy.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
