"use client";

import React, { useState, useMemo } from "react";
import { Button } from "../shared/components/ui/button";
import { Search, TrendingUp, Coins, BarChart3, Globe, Zap } from "lucide-react";
import { TradingPairDialog } from "./trading-pair-dialog";
import { trpc } from "../../lib/trpc";

export interface TradingPair {
  id: number;
  symbol: string;
  name: string;
  type: string;
  metadata: string | null;
  description: string | null;
  createdAt: string;
  marketId: string | null;
  category: string;
  brokerName: string;
  isActive: boolean;
  lastUpdated: string;
}

export interface TradingPairSelectProps {
  onSelectSymbol: (symbol: TradingPair) => void;
  selectedSymbol?: TradingPair | null;
  label?: string;
  selectedBroker?: string;
  className?: string;
  placeholder?: string;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "SHARES":
      return <TrendingUp className="h-4 w-4" />;
    case "CRYPTOCURRENCIES":
      return <Coins className="h-4 w-4" />;
    case "COMMODITIES":
      return <BarChart3 className="h-4 w-4" />;
    case "INDICES":
      return <Globe className="h-4 w-4" />;
    case "CURRENCIES":
    case "FOREX":
      return <Zap className="h-4 w-4" />;
    default:
      return <Globe className="h-4 w-4" />;
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case "SHARES":
      return "Stocks";
    case "CRYPTOCURRENCIES":
      return "Crypto";
    case "COMMODITIES":
      return "Commodities";
    case "INDICES":
      return "Indices";
    case "CURRENCIES":
    case "FOREX":
      return "Forex";
    default:
      return category;
  }
};

export function TradingPairSelect({
  onSelectSymbol,
  selectedSymbol,
  label = "Trading Pair",
  selectedBroker = "Capital.com",
  className,
  placeholder = "Select a trading pair...",
}: TradingPairSelectProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSelectSymbol = (symbol: TradingPair) => {
    console.log("Symbol selected:", symbol);
    onSelectSymbol(symbol);
    setDialogOpen(false);
  };

  const formatSymbolDisplay = (symbol: string) => {
    if (symbol.includes("/")) {
      const [base, quote] = symbol.split("/");
      return (
        <span className="font-mono">
          <span className="font-semibold">{base}</span>
          <span className="text-muted-foreground mx-0.5">/</span>
          <span className="text-muted-foreground">{quote}</span>
        </span>
      );
    }
    return <span className="font-mono font-semibold">{symbol}</span>;
  };

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>}

      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between h-auto py-2.5 px-3 font-normal hover:bg-accent/50 transition-colors"
          onClick={() => setDialogOpen(true)}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="text-left truncate flex-1">
              {selectedSymbol ? (
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(selectedSymbol.category)}
                    {formatSymbolDisplay(selectedSymbol.symbol)}
                  </div>
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {selectedSymbol.name}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {selectedSymbol && (
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                {getCategoryLabel(selectedSymbol.category)}
              </span>
            )}
            <span className="text-xs px-2 py-1 rounded-full bg-muted/50 text-muted-foreground">
              {selectedBroker}
            </span>
          </div>
        </Button>
      </div>

      <TradingPairDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSelectSymbol={handleSelectSymbol}
        selectedBroker={selectedBroker}
        selectedSymbol={selectedSymbol}
      />
    </div>
  );
}

export default TradingPairSelect;
