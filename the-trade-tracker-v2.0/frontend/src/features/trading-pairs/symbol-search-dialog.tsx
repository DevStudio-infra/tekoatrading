"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  X, 
  Plus, 
  Minus, 
  Maximize2, 
  ChevronRight 
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type TradingPair = {
  id: number;
  symbol: string;
  name: string;
  description: string | null;
  marketId: string | null;
  type: string;
  category: string;
  brokerName: string;
  isActive: boolean;
  metadata: any | null;
  lastUpdated: string;
  createdAt: string;
  exchange?: string;
};

export type SymbolSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSymbol: (symbol: TradingPair) => void;
  selectedBroker?: string;
};

// Flag component to show country flags based on exchange or market
const ExchangeFlag = ({ exchange }: { exchange: string }) => {
  // Map of exchanges to country codes
  const exchangeToCountry: Record<string, string> = {
    'BMFBOVESPA': 'br',
    'IDX': 'id',
    'GETTEX': 'de',
    'MUN': 'de',
    'UPCOM': 'vn',
    'LSX': 'gb',
    'LS': 'de',
    'FWB': 'de',
    'HAM': 'de',
    'TRADEGATE': 'de',
    'NYSE': 'us',
    'NASDAQ': 'us',
    'BINANCE': 'global',
    'CAPITALCOM': 'gb',
    'FOREX': 'global',
    'CRYPTO': 'global'
  };

  const countryCode = exchangeToCountry[exchange] || 'global';
  
  return (
    <div className="h-5 w-5 overflow-hidden rounded-full flex-shrink-0">
      <img 
        src={`/images/flags/${countryCode}.svg`} 
        alt={exchange} 
        onError={(e) => { (e.target as HTMLImageElement).src = '/images/flags/global.svg'; }}
        className="h-full w-full object-cover"
      />
    </div>
  );
};

// Parse exchange from trading pair data
const getExchange = (pair: TradingPair) => {
  if (pair.metadata?.exchange) return pair.metadata.exchange;
  if (pair.marketId) return pair.marketId;
  return pair.brokerName;
};

// Helper function to get auth token for API requests
const getAuthToken = (): string => {
  // Get authentication token
  let authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      
  // Make sure token has Bearer prefix
  if (authToken && !authToken.startsWith('Bearer ')) {
    authToken = `Bearer ${authToken}`;
  }
      
  // Debug token for development - using base64 encoded JSON that backend accepts
  const devTokenData = {
    userId: 1,
    id: 1,
    email: "dev@example.com"
  };
  const devToken = "Bearer " + Buffer.from(JSON.stringify(devTokenData)).toString('base64');

  const finalToken = authToken || devToken;
  return finalToken;
};

export function SymbolSearchDialog({
  open,
  onOpenChange,
  onSelectSymbol,
  selectedBroker = 'Capital.com',
}: SymbolSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('All');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TradingPair[]>([]);
  const [popularSymbols, setPopularSymbols] = useState<TradingPair[]>([]);
  // Initialize with the known categories from the trading_pairs.json data
  const [categories, setCategories] = useState<string[]>(['All', 'Crypto', 'Forex', 'Stocks', 'Indices', 'Commodities', 'Other']);
  // Pagination for infinite scroll
  const [displayLimit, setDisplayLimit] = useState(30);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch popular symbols and categories on mount
  useEffect(() => {
    if (open) {
      console.log('[COMPONENT] Dialog opened, fetching trading pairs and categories');
      fetchPopularTradingPairs();
      fetchCategories();
    }
  }, [open, selectedBroker]); // Only fetched when dialog opens or broker changes

  // Search when query changes - using a debounced approach
  useEffect(() => {
    // Don't trigger search/fetch on initial render
    if (!open) return;
    
    // Use debouncing to prevent too many API calls
    const handler = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchTradingPairs();
      } else if (searchQuery.length === 0) {
        // Only fetch if we don't already have popular symbols
        if (popularSymbols.length === 0) {
          fetchPopularTradingPairs();
        }
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(handler);
  }, [searchQuery, selectedTab, open]); // Only depend on search query and selected tab

  const fetchPopularTradingPairs = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      console.log('[DEBUG] Fetching popular trading pairs with token');
      
      const response = await fetch(`/api/trading-pairs/popular?brokerName=${selectedBroker}&limit=300`, { // Further increased limit to get more pairs from all categories
        credentials: 'include', // Add credentials to ensure cookies are sent
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        }
      });
      
      const data = await response.json();
      console.log('[DEBUG] Popular trading pairs received:', data.pairs?.length || 0, 'pairs');
      
      if (data.success && Array.isArray(data.pairs)) {
        // Log some sample data to verify we're using real data
        if (data.pairs.length > 0) {
          console.log('[COMPONENT] Sample trading pair data:', data.pairs[0]);
          console.log('[COMPONENT] Data types check - pairs is Array:', Array.isArray(data.pairs));
          console.log('[COMPONENT] First 3 pairs:', data.pairs.slice(0, 3));
          
          // Log category distribution to help debug
          const categoryDistribution: Record<string, number> = {};
          data.pairs.forEach((pair: any) => {
            const category = pair.category || 'Uncategorized';
            categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
          });
          console.log('[COMPONENT] Category distribution in received data:', categoryDistribution);
        }
        
        console.log('[COMPONENT] Setting trading pairs to state:', data.pairs.length, 'pairs');
        setResults(data.pairs);
        setPopularSymbols(data.pairs);
      } else {
        console.error('[COMPONENT] API returned error or invalid data:', data.message || 'Unknown error');
        // If no pairs are returned, set empty array to trigger empty state UI
        setResults([]);
        setPopularSymbols([]);
      }
    } catch (error) {
      console.error('Error fetching popular trading pairs:', error);
      setResults([]);
      setPopularSymbols([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    // We already know the categories from the data file
    // No need to fetch them from the API, which might be unreliable
    console.log('[DEBUG] Using known categories from data');
  };

  const searchTradingPairs = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      let url = `/api/trading-pairs/search?query=${encodeURIComponent(searchQuery)}&brokerName=${selectedBroker}`;
      
      // Add category filter if not 'All'
      if (selectedTab !== 'All') {
        url += `&category=${encodeURIComponent(selectedTab)}`;
      }
      
      console.log('[DEBUG] Searching trading pairs with URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        }
      });
      
      const data = await response.json();
      console.log('[DEBUG] Search results received:', data.pairs?.length || 0, 'pairs');
      
      if (data.success && Array.isArray(data.pairs)) {
        // Log sample search result to verify real data
        if (data.pairs.length > 0) {
          console.log('[DEBUG] Sample search result:', data.pairs[0]);
        }
        
        setResults(data.pairs);
      } else {
        console.error('Search API returned error or invalid data:', data.message || 'Unknown error');
        setResults([]);
      }
    } catch (error) {
      console.error('Error searching trading pairs:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSymbol = (symbol: TradingPair) => {
    onSelectSymbol(symbol);
    onOpenChange(false);
  };

  // Get asset type label
  const getAssetTypeLabel = (type: string, category: string) => {
    const types: Record<string, string> = {
      'CRYPTO': 'crypto',
      'FOREX': 'forex',
      'STOCK': 'stock',
      'INDEX': 'index',
      'COMMODITY': 'commodity',
      'BOND': 'bond',
      'ETF': 'etf',
      'FUND': 'fund mutual'
    };
    
    return types[type] || types[category] || 'stock';
  };

  // Display loading skeletons
  const renderSkeletons = () => {
    return Array(5).fill(0).map((_, index) => (
      <div key={`skeleton-${index}`} className="flex items-center justify-between px-4 py-3 animate-pulse border-b border-gray-800/10 dark:border-gray-200/10">
        <div className="flex items-center">
          <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full mr-3"></div>
          <div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-1"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </div>
        </div>
        <div className="flex items-center">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 mr-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5"></div>
        </div>
      </div>
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 gap-0 max-h-[80vh] flex flex-col overflow-hidden bg-background">
        <DialogHeader className="px-4 py-3 border-b flex flex-row items-center space-y-0 gap-2">
          <DialogTitle className="flex-1 text-lg font-semibold">Symbol Search</DialogTitle>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-7 w-7">
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zoom In</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-7 w-7">
                    <Minus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zoom Out</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-7 w-7">
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Full Screen</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </DialogHeader>
        
        {/* Search input */}
        <div className="px-4 py-3 border-b flex items-center gap-2 bg-muted/30">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search symbol..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-none shadow-none focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground text-foreground"
            autoFocus
          />
          {searchQuery && (
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6" 
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Category tabs */}
        <ScrollArea className="border-b">
          <Tabs 
            value={selectedTab} 
            onValueChange={setSelectedTab}
            className="w-full"
          >
            <TabsList className="bg-transparent h-10 w-full justify-start px-2 gap-1">
              {categories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className={cn(
                    "data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-sm h-8 px-3",
                    "data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground"
                  )}
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </ScrollArea>
        
        {/* Results list */}
        <ScrollArea className="flex-1">
          {loading && results.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <div className="animate-pulse">Loading...</div>
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {searchQuery ? 'No results found' : 'No popular symbols'}
              <div className="mt-2 text-xs">
                {searchQuery ? 
                  'Try a different search term or category' : 
                  'Check your backend connection or try refreshing the page'}
              </div>
            </div>
          ) : (
            <div 
              ref={scrollContainerRef} 
              className="py-1 h-[300px] overflow-y-auto"
              onScroll={(e) => {
                const target = e.currentTarget;
                // Load more items when user scrolls near the bottom (with 50px threshold)
                if (target.scrollHeight - target.scrollTop - target.clientHeight < 50) {
                  setDisplayLimit(prevLimit => prevLimit + 30);
                }
              }}
            >
              {/* Log debugging info outside of the JSX */}
              <>{(() => {
                console.log('[COMPONENT] Rendering results list with', results.length, 'items');
                console.log('[COMPONENT] Current selected tab:', selectedTab);
                
                // Debug category matching issue
                const uniqueCategories = [...new Set(results.map(p => p.category))];
                console.log('[COMPONENT] Available categories in data:', uniqueCategories);
                
                const filteredItems = results.filter(p => selectedTab === 'All' || 
                  // Case-insensitive matching of categories
                  p.category?.toLowerCase() === selectedTab.toLowerCase() ||
                  // Check if category contains the tab name (for partial matches)
                  p.category?.toLowerCase().includes(selectedTab.toLowerCase()) ||
                  // Check if tab name contains the category (for partial matches)
                  selectedTab.toLowerCase().includes(p.category?.toLowerCase() || '')
                );
                
                console.log('[COMPONENT] Displaying items:', filteredItems.slice(0, 3));
                return null;
              })()}</>
              
              {/* Enhanced category filtering with proper debug logging */}
              {results
                .filter(pair => {
                  // When 'All' tab is selected, show everything
                  if (selectedTab === 'All') return true;
                  
                  // Fix for pairs without a category
                  if (!pair.category) {
                    console.log('[DEBUG] Pair without category:', pair.symbol);
                    // Put uncategorized items in 'Other' category
                    return selectedTab === 'Other';
                  }
                  
                  // Get category names normalized
                  const pairCategory = pair.category?.toLowerCase().trim() || '';
                  const tabCategory = selectedTab.toLowerCase().trim();
                  
                  // Special case for Stocks category - match anything containing 'stocks'
                  if (tabCategory === 'stocks') {
                    return pairCategory.includes('stocks');
                  }
                  
                  // Special case for Other category - include ETFs and Bonds in Other
                  if (tabCategory === 'other') {
                    // For this app, we'll consider ETFs and Bonds as "Other"
                    return pairCategory.includes('etfs') || pairCategory.includes('bonds') || 
                           pairCategory === 'etf' || pairCategory === 'bond' || 
                           // Also include any truly uncategorized items
                           !['crypto', 'forex', 'stocks', 'indices', 'commodities'].some(cat => 
                              pairCategory.includes(cat)
                           );
                  }
                  
                  // Standard exact match for other categories
                  const match = pairCategory === tabCategory;
                  return match;
                })
                // Limit the number of items rendered for performance
                .slice(0, displayLimit)
                .map((pair, index) => {
                  const exchange = getExchange(pair);
                  const assetType = getAssetTypeLabel(pair.type, pair.category);
                  
                  return (
                  <button
                    key={`${pair.id}-${pair.symbol}-${index}`}
                    className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center justify-between group border-b border-gray-800/10 dark:border-gray-200/10"
                    onClick={() => handleSelectSymbol(pair)}
                  >
                    <div className="flex items-center">
                      <div className="mr-3">
                        <ExchangeFlag exchange={exchange} />
                      </div>
                      <div>
                        <div className="font-mono font-medium text-foreground group-hover:text-primary">
                          {pair.symbol}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[250px]">
                          {pair.name}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <span className="text-xs text-muted-foreground mr-2">
                        {assetType}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {exchange}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          Simply start typing while on the chart to pull up this search box
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SymbolSearchDialog;
