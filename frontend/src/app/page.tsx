"use client";

import { trpc } from "../lib/trpc";
import Link from "next/link";

export default function Home() {
  const { data: pingData, isLoading } = trpc.ping.useQuery();

  const navigationCards = [
    {
      title: "Dashboard",
      description: "AI-powered trading analysis and insights",
      href: "/dashboard",
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      title: "Trading Bots",
      description: "Create and manage automated trading bots",
      href: "/bots",
      color: "bg-green-600 hover:bg-green-700",
    },
    {
      title: "Strategies",
      description: "Design and configure trading strategies",
      href: "/strategies",
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      title: "Portfolio",
      description: "View your portfolio and positions",
      href: "/portfolio",
      color: "bg-orange-600 hover:bg-orange-700",
    },
    {
      title: "Charts",
      description: "Technical analysis with live charts",
      href: "/charts",
      color: "bg-red-600 hover:bg-red-700",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="max-w-6xl mx-auto px-8 text-center">
          <h1 className="text-5xl font-bold mb-6">Tekoa Trading</h1>
          <p className="text-xl mb-8">Next-Generation AI-Powered Trading Platform</p>

          {/* Backend Status */}
          <div className="inline-flex items-center bg-white bg-opacity-20 rounded-lg px-4 py-2">
            {isLoading ? (
              <span>Connecting to backend...</span>
            ) : (
              <span className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                System Online - Backend Connected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="max-w-6xl mx-auto px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Explore the Platform</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {navigationCards.map((card, index) => (
            <Link key={index} href={card.href}>
              <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer">
                <div
                  className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center mb-4`}
                >
                  <div className="w-6 h-6 bg-white rounded opacity-90"></div>
                </div>
                <h3 className="text-xl font-semibold mb-2">{card.title}</h3>
                <p className="text-gray-600">{card.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Platform Features</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded"></div>
              </div>
              <h3 className="text-lg font-semibold mb-2">AI-Powered Analysis</h3>
              <p className="text-gray-600">
                Advanced machine learning algorithms analyze market data and provide intelligent
                trading recommendations.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-green-600 rounded"></div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Automated Trading</h3>
              <p className="text-gray-600">
                Create sophisticated trading bots that execute strategies automatically based on
                your criteria.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-purple-600 rounded"></div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Risk Management</h3>
              <p className="text-gray-600">
                Built-in risk assessment tools ensure your portfolio stays protected with
                intelligent position sizing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-6xl mx-auto px-8 text-center">
          <p>&copy; 2024 Tekoa Trading. Built with Next.js, tRPC, and AI.</p>
        </div>
      </footer>
    </main>
  );
}
