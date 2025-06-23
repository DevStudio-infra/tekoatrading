"use client";

import React, { useState } from 'react';
import { TradingPairSelect } from '@/features/trading-pairs/trading-pair-select';
import { TradingPair } from '@/features/trading-pairs/symbol-search-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';
import { InfoIcon, CalendarIcon, BarChart3Icon, LineChart, CandlestickChart } from 'lucide-react';

export function TradingChart() {
  const [selectedSymbol, setSelectedSymbol] = useState<TradingPair | null>(null);
  const [timeframe, setTimeframe] = useState('1h');
  const [chartType, setChartType] = useState('candles');

  return (
    <div className="grid gap-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <TradingPairSelect
          selectedSymbol={selectedSymbol}
          onSelectSymbol={setSelectedSymbol}
          className="w-full sm:w-[300px]"
        />
        
        {selectedSymbol && (
          <div className="flex flex-wrap gap-2 text-sm">
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <InfoIcon className="h-3.5 w-3.5" />
                  <span>Info</span>
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="flex justify-between">
                  <h4 className="text-sm font-semibold">{selectedSymbol.name}</h4>
                  <Badge variant="outline">{selectedSymbol.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedSymbol.description || 'No description available'}
                </p>
                <div className="flex justify-between text-xs text-muted-foreground mt-3">
                  <span>Market: {selectedSymbol.marketId || selectedSymbol.brokerName}</span>
                  <span>ID: {selectedSymbol.id}</span>
                </div>
              </HoverCardContent>
            </HoverCard>
            
            <Tabs
              value={timeframe}
              onValueChange={setTimeframe}
              className="inline-flex h-9"
            >
              <TabsList className="h-9 p-0">
                <TabsTrigger value="1m" className="h-9 px-2.5">1m</TabsTrigger>
                <TabsTrigger value="5m" className="h-9 px-2.5">5m</TabsTrigger>
                <TabsTrigger value="15m" className="h-9 px-2.5">15m</TabsTrigger>
                <TabsTrigger value="1h" className="h-9 px-2.5">1h</TabsTrigger>
                <TabsTrigger value="4h" className="h-9 px-2.5">4h</TabsTrigger>
                <TabsTrigger value="1d" className="h-9 px-2.5">1d</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Tabs
              value={chartType}
              onValueChange={setChartType}
              className="inline-flex h-9"
            >
              <TabsList className="h-9 p-0">
                <TabsTrigger value="candles" className="h-9 px-2.5">
                  <CandlestickChart className="h-3.5 w-3.5" />
                </TabsTrigger>
                <TabsTrigger value="line" className="h-9 px-2.5">
                  <LineChart className="h-3.5 w-3.5" />
                </TabsTrigger>
                <TabsTrigger value="bar" className="h-9 px-2.5">
                  <BarChart3Icon className="h-3.5 w-3.5" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
      </div>
      
      <Card className="overflow-hidden">
        <CardHeader className="p-4 flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">
              {selectedSymbol ? selectedSymbol.symbol : "Select a trading pair"}
            </CardTitle>
            {selectedSymbol && (
              <CardDescription>
                {selectedSymbol.name}
              </CardDescription>
            )}
          </div>
          
          {selectedSymbol && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium">--</div>
                <div className="text-xs text-muted-foreground">
                  <CalendarIcon className="inline-block h-3 w-3 mr-1" />
                  Last updated: --
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="p-0">
          {selectedSymbol ? (
            <div className="h-[400px] w-full bg-muted/20 flex items-center justify-center">
              <div className="text-muted-foreground text-center">
                <CandlestickChart className="h-8 w-8 mx-auto mb-2" />
                <p>Chart would be displayed here for {selectedSymbol.symbol}</p>
                <p className="text-sm mt-1">Timeframe: {timeframe} - Type: {chartType}</p>
              </div>
            </div>
          ) : (
            <div className="h-[400px] w-full bg-muted/20 flex items-center justify-center">
              <div className="text-muted-foreground text-center">
                <p>Select a trading pair to view chart</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TradingChart;
