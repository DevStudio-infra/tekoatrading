"use client";

import React from "react";
import { IconBrain, IconChartLine, IconCurrencyDollar, IconAlertTriangle } from "@tabler/icons-react";

interface SuggestionCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
}

interface SuggestionCardsProps {
  onSelectPrompt: (prompt: string) => void;
  className?: string;
}

const suggestions: SuggestionCard[] = [
  {
    id: "market-analysis",
    title: "Market Analysis",
    description: "Get insights on current market conditions and potential opportunities",
    icon: <IconChartLine className="h-6 w-6" />,
    prompt: "Analyze the current market conditions for BTC/USD and suggest potential entry points.",
  },
  {
    id: "trading-strategy",
    title: "Trading Strategy",
    description: "Optimize your trading strategy based on your goals and risk tolerance",
    icon: <IconBrain className="h-6 w-6" />,
    prompt: "Suggest a trading strategy for volatile market conditions with moderate risk tolerance.",
  },
  {
    id: "risk-management",
    title: "Risk Management",
    description: "Advice on position sizing, stop losses, and portfolio management",
    icon: <IconAlertTriangle className="h-6 w-6" />,
    prompt: "How should I manage risk when trading with leverage? Suggest position sizing rules.",
  },
  {
    id: "profit-taking",
    title: "Profit Taking",
    description: "Strategies for taking profits and maximizing returns",
    icon: <IconCurrencyDollar className="h-6 w-6" />,
    prompt: "What are some effective profit-taking strategies for trend-following trades?",
  },
];

export function SuggestionCards({ onSelectPrompt, className }: SuggestionCardsProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      {suggestions.map((card) => (
        <button
          key={card.id}
          onClick={() => onSelectPrompt(card.prompt)}
          className="text-left rounded-xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border border-blue-100/30 dark:border-blue-900/30 p-4 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              {card.icon}
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                {card.title}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {card.description}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
