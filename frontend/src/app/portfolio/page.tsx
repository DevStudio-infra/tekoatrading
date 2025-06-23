"use client";

import { useState } from "react";

export default function Portfolio() {
  const [portfolioData] = useState({
    balance: 50000,
    totalValue: 52500,
    dayChange: 1250,
    dayChangePercent: 2.44,
    positions: [
      { symbol: "AAPL", quantity: 10, avgPrice: 150.25, currentPrice: 155.3, value: 1553 },
      { symbol: "TSLA", quantity: 5, avgPrice: 245.8, currentPrice: 250.1, value: 1250.5 },
      { symbol: "MSFT", quantity: 8, avgPrice: 320.5, currentPrice: 325.75, value: 2606 },
    ],
  });

  const calculatePnL = (position: any) => {
    const pnl = (position.currentPrice - position.avgPrice) * position.quantity;
    const pnlPercent = ((position.currentPrice - position.avgPrice) / position.avgPrice) * 100;
    return { pnl, pnlPercent };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Portfolio</h1>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Cash Balance</h3>
            <p className="text-2xl font-bold text-gray-900">
              ${portfolioData.balance.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Value</h3>
            <p className="text-2xl font-bold text-gray-900">
              ${portfolioData.totalValue.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Day Change</h3>
            <p
              className={`text-2xl font-bold ${portfolioData.dayChange >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              ${portfolioData.dayChange.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Day Change %</h3>
            <p
              className={`text-2xl font-bold ${portfolioData.dayChangePercent >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {portfolioData.dayChangePercent >= 0 ? "+" : ""}
              {portfolioData.dayChangePercent.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Positions Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Current Positions</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Market Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P&L
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P&L %
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {portfolioData.positions.map((position, index) => {
                  const { pnl, pnlPercent } = calculatePnL(position);
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {position.symbol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {position.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${position.avgPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${position.currentPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${position.value.toFixed(2)}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${pnl >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${pnlPercent >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {pnlPercent >= 0 ? "+" : ""}
                        {pnlPercent.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
