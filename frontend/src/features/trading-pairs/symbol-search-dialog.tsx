"use client";

import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../shared/components/ui/dialog";
import { Input } from "../shared/components/ui/input";
import { Button } from "../shared/components/ui/button";
import { ScrollArea } from "../shared/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "../shared/components/ui/tabs";
import { Badge } from "../shared/components/ui/badge";
import {
  Search,
  X,
  Plus,
  Minus,
  Maximize2,
  ChevronRight,
  TrendingUp,
  Coins,
  BarChart3,
  Globe,
  Zap,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../shared/components/ui/tooltip";
import { cn } from "../../lib/utils";
import { trpc } from "../../lib/trpc";

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
    BMFBOVESPA: "br",
    IDX: "id",
    GETTEX: "de",
    MUN: "de",
    UPCOM: "vn",
    LSX: "gb",
    LS: "de",
    FWB: "de",
    HAM: "de",
    TRADEGATE: "de",
    NYSE: "us",
    NASDAQ: "us",
    BINANCE: "global",
    CAPITALCOM: "gb",
    FOREX: "global",
    CRYPTO: "global",
  };

  const countryCode = exchangeToCountry[exchange] || "global";

  return (
    <div className="h-5 w-5 overflow-hidden rounded-full flex-shrink-0 bg-muted flex items-center justify-center">
      <div className="text-xs font-medium text-muted-foreground">
        {exchange.slice(0, 2).toUpperCase()}
      </div>
    </div>
  );
};

// Parse exchange from trading pair data
const getExchange = (pair: TradingPair) => {
  if (pair.metadata?.exchange) return pair.metadata.exchange;
  if (pair.marketId) return pair.marketId;
  return pair.brokerName;
};

// Get category icon
const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case "shares":
    case "stocks":
      return <TrendingUp className="h-4 w-4" />;
    case "cryptocurrencies":
    case "crypto":
      return <Coins className="h-4 w-4" />;
    case "commodities":
      return <BarChart3 className="h-4 w-4" />;
    case "indices":
      return <Globe className="h-4 w-4" />;
    case "currencies":
    case "forex":
      return <Zap className="h-4 w-4" />;
    default:
      return <Globe className="h-4 w-4" />;
  }
};

export function SymbolSearchDialog({
  open,
  onOpenChange,
  onSelectSymbol,
  selectedBroker = "Capital.com",
}: SymbolSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("All");
  const [results, setResults] = useState<TradingPair[]>([]);
  const [popularSymbols, setPopularSymbols] = useState<TradingPair[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [displayLimit, setDisplayLimit] = useState(30);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // TRPC queries
  const { data: allPairs, isLoading: isLoadingAll } = trpc.tradingPairs.getAll.useQuery(
    {
      brokerName: selectedBroker,
      limit: 1000,
    },
    { enabled: open },
  );

  const { data: popularPairs, isLoading: isLoadingPopular } = trpc.tradingPairs.getPopular.useQuery(
    {
      brokerName: selectedBroker,
      limit: 50,
    },
    { enabled: open },
  );

  const { data: searchResults, isLoading: isSearching } = trpc.tradingPairs.search.useQuery(
    {
      query: searchQuery,
      limit: 100,
    },
    { enabled: searchQuery.length >= 2 },
  );

  const { data: availableCategories } = trpc.tradingPairs.getCategories.useQuery(undefined, {
    enabled: open,
  });

  // Update results based on search or popular pairs
  useEffect(() => {
    if (searchQuery.length >= 2 && searchResults) {
      setResults(searchResults);
    } else if (searchQuery.length === 0) {
      if (popularPairs && popularPairs.length > 0) {
        setResults(popularPairs);
        setPopularSymbols(popularPairs);
      } else if (allPairs) {
        setResults(allPairs.slice(0, 100));
        setPopularSymbols(allPairs.slice(0, 50));
      }
    }
  }, [searchQuery, searchResults, popularPairs, allPairs]);

  // Update categories
  useEffect(() => {
    if (availableCategories) {
      const categoryMap: Record<string, string> = {
        SHARES: "Stocks",
        CRYPTOCURRENCIES: "Crypto",
        CURRENCIES: "Forex",
        INDICES: "Indices",
        COMMODITIES: "Commodities",
      };

      const mappedCategories = availableCategories.map((cat) => categoryMap[cat] || cat);
      setCategories(["All", ...mappedCategories, "Other"]);
    }
  }, [availableCategories]);

  const handleSelectSymbol = (symbol: TradingPair) => {
    console.log("Symbol selected:", symbol);
    onSelectSymbol(symbol);
    onOpenChange(false);
  };

  const getAssetTypeLabel = (type: string, category: string) => {
    if (category) {
      const categoryMap: Record<string, string> = {
        SHARES: "Stock",
        CRYPTOCURRENCIES: "Crypto",
        CURRENCIES: "Forex",
        INDICES: "Index",
        COMMODITIES: "Commodity",
      };
      return categoryMap[category] || category;
    }
    return type || "Asset";
  };

  const isLoading = isLoadingAll || isLoadingPopular || isSearching;

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
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Category tabs */}
        <ScrollArea className="border-b">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="bg-transparent h-10 w-full justify-start px-2 gap-1">
              {categories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className={cn(
                    "data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-sm h-8 px-3",
                    "data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground",
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
          {isLoading && results.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <div className="animate-pulse">Loading...</div>
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {searchQuery ? "No results found" : "No trading pairs available"}
              <div className="mt-2 text-xs">
                {searchQuery
                  ? "Try a different search term or category"
                  : "Check your backend connection or try refreshing the page"}
              </div>
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className="py-1 h-[300px] overflow-y-auto"
              onScroll={(e) => {
                const target = e.currentTarget;
                if (target.scrollHeight - target.scrollTop - target.clientHeight < 50) {
                  setDisplayLimit((prevLimit) => prevLimit + 30);
                }
              }}
            >
              {results
                .filter((pair) => {
                  if (selectedTab === "All") return true;

                  if (!pair.category) {
                    return selectedTab === "Other";
                  }

                  const pairCategory = pair.category.toLowerCase().trim();
                  const tabCategory = selectedTab.toLowerCase().trim();

                  // Category mapping
                  const categoryMap: Record<string, string[]> = {
                    stocks: ["shares"],
                    crypto: ["cryptocurrencies"],
                    forex: ["currencies"],
                    indices: ["indices"],
                    commodities: ["commodities"],
                  };

                  if (categoryMap[tabCategory]) {
                    return categoryMap[tabCategory].some((cat) => pairCategory.includes(cat));
                  }

                  if (tabCategory === "other") {
                    return !Object.values(categoryMap)
                      .flat()
                      .some((cat) => pairCategory.includes(cat));
                  }

                  return pairCategory === tabCategory;
                })
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
                      <div className="flex items-center gap-3">
                        <ExchangeFlag exchange={exchange} />
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(pair.category)}
                          <div>
                            <div className="font-mono font-medium text-foreground group-hover:text-primary">
                              {pair.symbol}
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-[250px]">
                              {pair.name}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{assetType}</span>
                        <Badge variant="outline" className="text-xs">
                          {exchange}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </ScrollArea>

        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          {results.length > 0 &&
            `Showing ${Math.min(displayLimit, results.length)} of ${results.length} results`}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SymbolSearchDialog;
