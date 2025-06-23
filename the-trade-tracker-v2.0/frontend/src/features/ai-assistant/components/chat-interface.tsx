"use client";

import React, { useState } from "react";
import { IconSend, IconRobot, IconUser, IconEraser } from "@tabler/icons-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  className?: string;
}

export function ChatInterface({ className }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your AI trading assistant. How can I help you with your trading strategies today?",
      timestamp: new Date(),
    },
  ]);
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = () => {
    if (!input.trim()) return;
    
    // Create user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    // Simulate AI response after a delay
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateMockResponse(input),
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: "Chat cleared. How can I help you with your trading strategies today?",
        timestamp: new Date(),
      },
    ]);
  };

  // Mock response generator - in a real app, this would call an actual AI API
  const generateMockResponse = (query: string): string => {
    const responses = [
      "Based on recent market trends, I'd suggest monitoring BTC/USD closely as it shows significant momentum.",
      "The current market conditions indicate a potential breakout in Ethereum. Consider watching key resistance levels.",
      "From a technical analysis perspective, the EUR/USD pair is approaching a critical support zone.",
      "Your trading strategy could benefit from incorporating the MACD indicator for better entry timing.",
      "Looking at the historical data, similar market conditions have led to a 60% success rate for long positions.",
      "Risk management is essential. I recommend setting stop losses at 2% of your total capital per trade.",
      "The AI trading model suggests a possible reversal in the S&P 500 index based on recent momentum shifts.",
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  return (
    <div className={`flex flex-col h-[600px] rounded-xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border border-blue-100/30 dark:border-blue-900/30 ${className}`}>
      {/* Chat header */}
      <div className="p-4 border-b border-blue-100/30 dark:border-blue-900/30 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">AI Trading Assistant</h2>
        <button 
          onClick={handleClearChat}
          className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
        >
          <IconEraser className="h-5 w-5" />
        </button>
      </div>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`flex max-w-[80%] md:max-w-[70%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                message.role === "assistant" 
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              }`}>
                {message.role === "assistant" ? (
                  <IconRobot className="h-5 w-5" />
                ) : (
                  <IconUser className="h-5 w-5" />
                )}
              </div>
              
              <div className={`mx-2 py-2 px-4 rounded-xl ${
                message.role === "assistant" 
                  ? "bg-blue-50/70 dark:bg-blue-950/30 text-gray-800 dark:text-gray-200" 
                  : "bg-blue-600/90 dark:bg-blue-700/90 text-white"
              }`}>
                <p className="text-sm">{message.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex">
              <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <IconRobot className="h-5 w-5" />
              </div>
              
              <div className="ml-2 py-2 px-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 text-gray-800 dark:text-gray-200">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 rounded-full bg-blue-400 dark:bg-blue-500 animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="h-2 w-2 rounded-full bg-blue-400 dark:bg-blue-500 animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="h-2 w-2 rounded-full bg-blue-400 dark:bg-blue-500 animate-bounce"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Input area */}
      <div className="p-4 border-t border-blue-100/30 dark:border-blue-900/30 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-b-xl">
        <div className="flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Ask me about trading strategies..."
            className="flex-1 bg-white/70 dark:bg-gray-800/70 border border-gray-300 dark:border-gray-700 rounded-l-md py-2 px-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className={`p-2 rounded-r-md ${
              !input.trim() || isLoading
                ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
            } transition-colors`}
          >
            <IconSend className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          This AI assistant can help with market analysis, trading strategies, and risk management
        </p>
      </div>
    </div>
  );
}
