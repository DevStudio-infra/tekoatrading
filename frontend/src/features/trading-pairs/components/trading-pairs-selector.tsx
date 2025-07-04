"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/features/shared/components/ui/input";
import { Button } from "@/features/shared/components/ui/button";
import { Badge } from "@/features/shared/components/ui/badge";
import { Card } from "@/features/shared/components/ui/card";
import { Search, Star } from "lucide-react";

interface TradingPairsSelectorProps {
  selectedPair?: string;
  onSelect: (symbol: string) => void;
}

export function TradingPairsSelector({ selectedPair, onSelect }: TradingPairsSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: popularPairs } = trpc.tradingPair.getPopular.useQuery({ limit: 10 });
  const { data: searchResults } = trpc.tradingPair.search.useQuery(
    { query: searchQuery, limit: 20 },
    { enabled: searchQuery.length > 2 }
  );

  const pairsToShow = searchQuery.length > 2 ? searchResults : popularPairs;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search trading pairs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {searchQuery.length <= 2 && (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Star className="h-4 w-4" />
          <span>Popular Trading Pairs</span>
        </div>
      )}

      <div className="grid gap-2 max-h-60 overflow-y-auto">
        {pairsToShow?.map((pair) => (
          <Card
            key={pair.symbol}
            className={`p-3 cursor-pointer transition-colors hover:bg-accent ${
              selectedPair === pair.symbol ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => onSelect(pair.symbol)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{pair.symbol}</div>
                <div className="text-sm text-muted-foreground">{pair.name}</div>
              </div>
              <div className="text-right">
                <Badge variant="secondary">{pair.category}</Badge>
                {pair.brokerName && (
                  <div className="text-xs text-muted-foreground mt-1">{pair.brokerName}</div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {pairsToShow?.length === 0 && searchQuery.length > 2 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No trading pairs found for "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
}
