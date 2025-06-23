"use client";

import Link from "next/link";

export default function HomePage() {
  // Mock data for now until tRPC is properly configured
  const pingData = { message: "Welcome to Tekoa Trading" };
  const isLoading = false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center text-white space-y-8">
          <h1 className="text-6xl font-bold mb-4">Tekoa Trading</h1>
          <p className="text-2xl mb-8">Next-Generation AI Trading Platform</p>

          {isLoading ? (
            <div className="text-lg">Loading...</div>
          ) : (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 max-w-md mx-auto">
              <p className="text-lg">{pingData?.message}</p>
            </div>
          )}

          {/* Quick Navigation */}
          <div className="mt-12 mb-8">
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/dashboard"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/bots"
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Manage Bots
              </Link>
              <Link
                href="/portfolio"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                View Portfolio
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-2">AI-Powered Trading</h3>
              <p>Advanced algorithms analyze market data in real-time</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-2">Risk Management</h3>
              <p>Sophisticated risk assessment and portfolio protection</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-2">Real-time Analytics</h3>
              <p>Live market data and performance tracking</p>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Link
              href="/dashboard"
              className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-colors"
            >
              <div className="text-4xl mb-3">📊</div>
              <h4 className="text-lg font-semibold mb-2">Dashboard</h4>
              <p className="text-sm">Monitor your trading performance</p>
            </Link>
            <Link
              href="/bots"
              className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-colors"
            >
              <div className="text-4xl mb-3">🤖</div>
              <h4 className="text-lg font-semibold mb-2">Trading Bots</h4>
              <p className="text-sm">Create and manage automated trading bots</p>
            </Link>
            <Link
              href="/strategies"
              className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-colors"
            >
              <div className="text-4xl mb-3">📈</div>
              <h4 className="text-lg font-semibold mb-2">Strategies</h4>
              <p className="text-sm">Design custom trading strategies</p>
            </Link>
            <Link
              href="/charts"
              className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-colors"
            >
              <div className="text-4xl mb-3">📉</div>
              <h4 className="text-lg font-semibold mb-2">Charts</h4>
              <p className="text-sm">Advanced charting and technical analysis</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
