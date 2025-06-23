import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { X, Search, ChevronDown } from 'lucide-react';
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
};

export type SymbolSearchProps = {
  onSelectSymbol: (symbol: TradingPair) => void;
  selectedBroker?: string;
  className?: string;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
};

export const SymbolSearch = ({
  onSelectSymbol,
  selectedBroker = 'Capital.com',
  className,
  isOpen = false,
  onOpenChange,
}: SymbolSearchProps) => {
  const [open, setOpen] = useState(isOpen);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<string>('All');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TradingPair[]>([]);
  const [popularSymbols, setPopularSymbols] = useState<TradingPair[]>([]);
  const [categories, setCategories] = useState<string[]>(['All', 'Crypto', 'Forex', 'Stocks', 'Indices', 'Commodities']);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        if (onOpenChange) onOpenChange(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onOpenChange]);

  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  useEffect(() => {
    // If open, fetch popular trading pairs and categories
    if (open) {
      fetchPopularTradingPairs();
      fetchCategories();
    }
  }, [open, selectedBroker]);

  useEffect(() => {
    // Search when query changes
    if (searchQuery.length >= 2) {
      searchTradingPairs();
    } else if (searchQuery.length === 0) {
      fetchPopularTradingPairs();
    }
  }, [searchQuery, selectedTab, selectedBroker]);

  const fetchPopularTradingPairs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/trading-pairs/popular?brokerName=${selectedBroker}&limit=20`);
      const data = await response.json();
      
      if (data.success) {
        setResults(data.pairs);
        setPopularSymbols(data.pairs);
      }
    } catch (error) {
      console.error('Error fetching popular trading pairs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/trading-pairs/categories?brokerName=${selectedBroker}`);
      const data = await response.json();
      
      if (data.success && data.categories.length > 0) {
        setCategories(['All', ...data.categories]);
      }
    } catch (error) {
      console.error('Error fetching trading pair categories:', error);
    }
  };

  const searchTradingPairs = async () => {
    setLoading(true);
    try {
      let url = `/api/trading-pairs/search?query=${encodeURIComponent(searchQuery)}&brokerName=${selectedBroker}`;
      
      if (selectedTab !== 'All') {
        url += `&category=${selectedTab}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setResults(data.pairs);
      }
    } catch (error) {
      console.error('Error searching trading pairs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSymbol = (symbol: TradingPair) => {
    onSelectSymbol(symbol);
    setOpen(false);
    if (onOpenChange) onOpenChange(false);
  };

  // Display loading skeletons
  const renderSkeletons = () => {
    return Array(5).fill(0).map((_, index) => (
      <div key={`skeleton-${index}`} className="flex items-center justify-between px-4 py-2 animate-pulse">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-200 rounded-full mr-3"></div>
          <div>
            <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
        <div className="flex items-center">
          <div className="h-5 bg-gray-200 rounded w-12 mr-2"></div>
          <div className="h-5 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    ));
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Search input button */}
      <button
        onClick={() => {
          setOpen(!open);
          if (onOpenChange) onOpenChange(!open);
        }}
        className="w-full flex items-center justify-between bg-background border border-input rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span>{searchQuery || "Search for symbol..."}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Symbol search modal */}
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-[450px] bg-background shadow-lg border border-input rounded-md overflow-hidden">
          <div className="p-2 border-b flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search symbol..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-none shadow-none focus-visible:ring-0 text-sm h-8"
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

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <div className="border-b">
              <TabsList className="w-full justify-start p-0 h-auto bg-transparent">
                {categories.map((category) => (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className="rounded-none border-0 py-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary text-sm"
                  >
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="max-h-[300px] overflow-y-auto">
              {loading ? (
                renderSkeletons()
              ) : results.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {searchQuery ? "No symbols found" : "No popular symbols"}
                </div>
              ) : (
                <div>
                  {results.map((pair) => (
                    <div
                      key={pair.id}
                      onClick={() => handleSelectSymbol(pair)}
                      className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-accent"
                    >
                      <div className="flex items-center">
                        <div className="w-8 h-8 flex items-center justify-center mr-3">
                          {pair.type === 'cryptocurrency' && (
                            <span className="text-yellow-500 text-lg">₿</span>
                          )}
                          {pair.type === 'forex' && (
                            <span className="text-blue-500 text-lg">₽</span>
                          )}
                          {pair.type === 'stock' && (
                            <span className="text-green-500 text-lg">$</span>
                          )}
                          {!['cryptocurrency', 'forex', 'stock'].includes(pair.type) && (
                            <span className="text-gray-500 text-lg">📊</span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{pair.symbol}</div>
                          <div className="text-xs text-muted-foreground">{pair.name}</div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2 text-xs">
                          {pair.category}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {pair.brokerName}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default SymbolSearch;
