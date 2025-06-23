'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TradeForm } from '@/features/trading/components/trade-form';
import { PriceChart } from '@/features/trading/components/price-chart';
import { MarketOverview } from '@/features/dashboard/components/market-overview';
import { RefreshCw, ChevronRight } from 'lucide-react';
import { TradingPairSelect } from '@/features/trading-pairs/trading-pair-select';
import type { TradingPair } from '@/features/trading-pairs/symbol-search-dialog';
import { TradingChart } from '@/features/trading-chart/trading-chart';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function TradingPage() {
  const t = useTranslations('trading');
  const [selectedPair, setSelectedPair] = useState<TradingPair | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USD');
  
  // This would be replaced with actual trading logic in a real app
  const handleTrade = (data: any) => {
    console.log('New trade submitted:', data);
    // Show success toast in a real app
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
      
      {/* Trading Pair Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4 items-start sm:items-center"
      >
        <TradingPairSelect
          selectedSymbol={selectedPair}
          onSelectSymbol={(pair) => {
            setSelectedPair(pair);
            setSelectedSymbol(pair.symbol);
          }}
          className="w-full sm:w-[300px]"
        />
        
        {selectedPair && (
          <div className="flex gap-2">
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <span>{t('info')}</span>
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="flex justify-between">
                  <h4 className="text-sm font-semibold">{selectedPair.name}</h4>
                  <Badge variant="outline">{selectedPair.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedPair.description || t('noDescription')}
                </p>
              </HoverCardContent>
            </HoverCard>
          </div>
        )}
      </motion.div>

      {/* Main Content - Responsive Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Trading Chart - Takes more space on larger screens */}
        <div className="lg:col-span-2">
          <TradingChart />
          <div className="mt-2 text-xs text-muted-foreground">
            {selectedPair ? (
              <span>{t('tradingPair', { name: selectedPair.name, symbol: selectedPair.symbol, category: selectedPair.category })}</span>
            ) : (
              <span>{t('selectPair')}</span>
            )}
          </div>
        </div>
        
        {/* Trading Form - Sidebar */}
        <div>
          <TradeForm onSubmit={handleTrade} />
        </div>
      </motion.div>
      
      {/* Market Overview Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="mt-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{t('marketOverview')}</h2>
          <Button variant="link" size="sm" className="gap-1">
            {t('viewAll')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <MarketOverview />
      </motion.div>
    </div>
  );
}
