"use client";

import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../shared/components/ui/select";
import { trpc } from "../../lib/trpc";
import { Badge } from "../shared/components/ui/badge";

interface TradingPairSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TradingPairSelect({
  value,
  onValueChange,
  placeholder = "Select a trading pair",
  disabled,
}: TradingPairSelectProps) {
  const { data: tradingPairs, isLoading } = trpc.tradingPair.getAll.useQuery();

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading trading pairs..." />
        </SelectTrigger>
      </Select>
    );
  }

  const activePairs = tradingPairs?.filter((pair) => pair.isActive) || [];

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {activePairs.length === 0 ? (
          <div className="p-2 text-sm text-muted-foreground text-center">
            No trading pairs available
          </div>
        ) : (
          activePairs.map((pair) => (
            <SelectItem key={pair.symbol} value={pair.symbol}>
              <div className="flex items-center justify-between w-full">
                <span>{pair.symbol}</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {pair.type}
                </Badge>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
