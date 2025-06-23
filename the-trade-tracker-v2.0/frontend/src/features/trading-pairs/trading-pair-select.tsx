"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { TradingPair, SymbolSearchDialog } from './symbol-search-dialog';
import { GlassCard } from '@/components/ui/glass-card';

export interface TradingPairSelectProps {
  onSelectSymbol: (symbol: TradingPair) => void;
  selectedSymbol?: TradingPair | null;
  label?: string;
  selectedBroker?: string;
  className?: string;
}

export function TradingPairSelect({
  onSelectSymbol,
  selectedSymbol,
  label = "Trading Pair",
  selectedBroker = "Capital.com",
  className,
}: TradingPairSelectProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  // Log for debugging
  useEffect(() => {
    console.log('TradingPairSelect initialized with broker:', selectedBroker);
  }, [selectedBroker]);

  const handleSelectSymbol = (symbol: TradingPair) => {
    console.log('Symbol selected:', symbol);
    onSelectSymbol(symbol);
    setDialogOpen(false);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {label}
        </label>
      )}
      
      <GlassCard className="p-0 overflow-hidden hover:shadow-md transition-shadow">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-between h-auto py-2.5 px-3 font-normal"
          onClick={() => setDialogOpen(true)}
        >
          <div className="flex items-center gap-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-left truncate">
              {selectedSymbol ? (
                <span className="flex flex-col">
                  <span className="font-medium">{selectedSymbol.symbol}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-44">
                    {selectedSymbol.name}
                  </span>
                </span>
              ) : (
                "Select a trading pair..."
              )}
            </span>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-muted/50">
            {selectedBroker}
          </span>
        </Button>
      </GlassCard>

      <SymbolSearchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSelectSymbol={handleSelectSymbol}
        selectedBroker={selectedBroker}
      />
    </div>
  );
}

export default TradingPairSelect;
