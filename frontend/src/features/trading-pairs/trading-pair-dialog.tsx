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
import { TradingPair } from "./trading-pair-select";

interface TradingPairDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSymbol: (symbol: TradingPair) => void;
  selectedBroker: string;
  selectedSymbol?: TradingPair | null;
}

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
  try {
    if (pair.metadata && typeof pair.metadata === "string") {
      const parsed = JSON.parse(pair.metadata);
      if (parsed?.exchange) return parsed.exchange;
    } else if (pair.metadata && typeof pair.metadata === "object" && "exchange" in pair.metadata) {
      return (pair.metadata as any).exchange;
    }
  } catch (e) {
    // Ignore JSON parse errors
  }
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

export function TradingPairDialog({
  open,
  onOpenChange,
  onSelectSymbol,
  selectedBroker = "Capital.com",
  selectedSymbol,
}: TradingPairDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("All");
  const [results, setResults] = useState<TradingPair[]>([]);
  const [popularSymbols, setPopularSymbols] = useState<TradingPair[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [displayLimit, setDisplayLimit] = useState(30);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Debug connection status
  useEffect(() => {
    if (open) {
      console.log("Trading pair dialog opened");
      console.log("Backend URL should be: http://localhost:3001/trpc");

      // Test basic connectivity
      fetch("http://localhost:3001/trpc/ping")
        .then((res) => res.json())
        .then((data) => console.log("Backend ping test:", data))
        .catch((err) => console.error("Backend connection failed:", err));
    }
  }, [open]);

  // TRPC queries
  const {
    data: allPairs,
    isLoading: isLoadingAll,
    error: allPairsError,
  } = trpc.tradingPair.getAll.useQuery(
    {
      limit: 5000,
      isActive: true,
    },
    {
      enabled: open,
      retry: 3,
      onError: (error) => {
        console.error("Error fetching all trading pairs:", error);
      },
      onSuccess: (data) => {
        console.log("Successfully fetched all trading pairs:", data?.length || 0);
        console.log("Sample trading pair data:", JSON.stringify(data?.[0], null, 2));
        // Log categories to understand the actual values
        if (data && data.length > 0) {
          const categories = Array.from(new Set(data.map((p) => p.category)));
          console.log("All categories found in data:", categories);
        }
      },
    },
  );

  const {
    data: popularPairs,
    isLoading: isLoadingPopular,
    error: popularPairsError,
  } = trpc.tradingPair.getPopular.useQuery(
    {
      limit: 100,
    },
    {
      enabled: open,
      retry: 3,
      onError: (error) => {
        console.error("Error fetching popular trading pairs:", error);
      },
      onSuccess: (data) => {
        console.log("Successfully fetched popular trading pairs:", data?.length || 0);
        console.log("Sample popular trading pair:", data?.[0]);
      },
    },
  );

  const {
    data: searchResults,
    isLoading: isSearching,
    error: searchError,
  } = trpc.tradingPair.search.useQuery(
    {
      query: searchQuery,
      limit: 500,
    },
    {
      enabled: searchQuery.length >= 2,
      retry: 3,
      onError: (error) => {
        console.error("Error searching trading pairs:", error);
      },
      onSuccess: (data) => {
        console.log("Successfully searched trading pairs:", data?.length || 0);
      },
    },
  );

  const { data: availableCategories, error: categoriesError } =
    trpc.tradingPair.getCategories.useQuery(undefined, {
      enabled: open,
      retry: 3,
      onError: (error) => {
        console.error("Error fetching categories:", error);
      },
      onSuccess: (data) => {
        console.log("Successfully fetched categories:", data?.length || 0);
      },
    });

  // Update results based on search or popular pairs
  useEffect(() => {
    console.log("Results useEffect triggered:", {
      searchQueryLength: searchQuery.length,
      searchResults: searchResults?.length,
      allPairs: allPairs?.length,
      popularPairs: popularPairs?.length,
      currentResults: results.length,
    });

    if (searchQuery.length >= 2 && searchResults) {
      console.log("Setting results from search:", searchResults.length);
      setResults(searchResults);
    } else if (searchQuery.length === 0) {
      if (allPairs && allPairs.length > 0) {
        // Use all pairs as the primary source
        console.log("Setting results from allPairs:", allPairs.length);
        setResults(allPairs);
        setPopularSymbols(allPairs.slice(0, 50));
      } else if (popularPairs && popularPairs.length > 0) {
        console.log("Setting results from popularPairs:", popularPairs.length);
        setResults(popularPairs);
        setPopularSymbols(popularPairs);
      } else {
        console.log("No data available to set as results");
      }
    }
  }, [searchQuery, searchResults, popularPairs, allPairs]);

  // Update categories - filter out empty categories
  useEffect(() => {
    if (availableCategories && results.length > 0) {
      console.log("Available categories from backend:", availableCategories);

      // More comprehensive category mapping
      const categoryMap: Record<string, string> = {
        // Standard mappings
        SHARES: "Stocks",
        CRYPTOCURRENCIES: "Crypto",
        CURRENCIES: "Forex",
        INDICES: "Indices",
        COMMODITIES: "Commodities",
        // Additional possible mappings
        STOCKS: "Stocks",
        CRYPTO: "Crypto",
        FOREX: "Forex",
        FX: "Forex",
        CURRENCY: "Forex",
        INDEX: "Indices",
        COMMODITY: "Commodities",
        METALS: "Commodities",
        ENERGY: "Commodities",
        ETF: "Other",
        FUND: "Other",
        BOND: "Other",
        BONDS: "Other",
      };

      const mappedCategories = Array.from(
        new Set(
          availableCategories.map((cat: string) => {
            const upperCat = cat.toUpperCase();
            return categoryMap[upperCat] || cat; // Use original if no mapping found
          }),
        ),
      );

      // Filter out categories that have no items
      const categoriesWithData = mappedCategories.filter((category) => {
        if (category === "All") return true;

        const tabCategory = category.toLowerCase().trim();
        const categoryMatches: Record<string, string[]> = {
          crypto: ["crypto", "cryptocurrencies", "cryptocurrency", "digital"],
          forex: ["forex", "currencies", "currency", "fx", "foreign", "exchange"],
          stocks: ["stocks", "shares", "stock", "equity", "equities", "share"],
          indices: ["indices", "index", "indexes", "idx"],
          commodities: ["commodities", "commodity", "metals", "energy", "materials"],
          other: ["other", "others", "etf", "fund", "bond", "bonds", "reit"],
        };

        const matchingCategories = categoryMatches[tabCategory] || [tabCategory];

        return results.some((pair) => {
          if (!pair.category) return false;
          const pairCategory = pair.category.toLowerCase().trim();

          return matchingCategories.some((cat) => {
            if (pairCategory === cat) return true;
            if (pairCategory.includes(cat) || cat.includes(pairCategory)) return true;
            if (pairCategory.startsWith(cat) || pairCategory.endsWith(cat)) return true;
            return false;
          });
        });
      });

      console.log("Mapped categories:", mappedCategories);
      console.log("Categories with data:", categoriesWithData);
      setCategories(["All", ...categoriesWithData.sort()]);
    }
  }, [availableCategories, results]);

  // Reset display limit when tab changes
  useEffect(() => {
    setDisplayLimit(30);
  }, [selectedTab]);

  const handleSelectSymbol = (symbol: TradingPair) => {
    // Ensure the symbol has all required properties for bot creation
    const enrichedSymbol = {
      ...symbol,
      id: symbol.id,
      symbol: symbol.symbol,
      name: symbol.name,
      category: symbol.category,
      brokerName: symbol.brokerName || selectedBroker,
      isActive: symbol.isActive,
    };
    onSelectSymbol(enrichedSymbol);
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

  // Pre-compute filtered results outside of scroll handler
  const filteredResults = React.useMemo(() => {
    if (selectedTab === "All") return results;

    return results.filter((pair) => {
      if (!pair.category) return false;

      const pairCategory = pair.category.toLowerCase().trim();
      const tabCategory = selectedTab.toLowerCase().trim();

      // Enhanced category matching with more variations
      const categoryMatches: Record<string, string[]> = {
        crypto: ["crypto", "cryptocurrencies", "cryptocurrency", "digital"],
        forex: ["forex", "currencies", "currency", "fx", "foreign", "exchange"],
        stocks: ["stocks", "shares", "stock", "equity", "equities", "share"],
        indices: ["indices", "index", "indexes", "idx"],
        commodities: ["commodities", "commodity", "metals", "energy", "materials"],
        other: ["other", "others", "etf", "fund", "bond", "bonds", "reit"],
      };

      // Get matching categories for the selected tab
      const matchingCategories = categoryMatches[tabCategory] || [tabCategory];

      // More comprehensive matching logic
      return matchingCategories.some((cat) => {
        // Direct match
        if (pairCategory === cat) return true;
        // Contains match (bidirectional)
        if (pairCategory.includes(cat) || cat.includes(pairCategory)) return true;
        // Start/end match for better precision
        if (pairCategory.startsWith(cat) || pairCategory.endsWith(cat)) return true;
        return false;
      });
    });
  }, [results, selectedTab]);

  // Get the results to display (limited by displayLimit)
  const displayResults = React.useMemo(() => {
    return filteredResults.slice(0, displayLimit);
  }, [filteredResults, displayLimit]);

  // Helper function to get display text for trading pairs
  const getDisplayInfo = (pair: TradingPair) => {
    const category = pair.category?.toLowerCase() || "";

    // For stocks, show company name prominently and symbol as secondary
    if (category.includes("stock") || category.includes("share") || category.includes("equity")) {
      return {
        primary: pair.name || pair.symbol,
        secondary: pair.symbol !== pair.name ? pair.symbol : null,
        showSymbolBadge: true,
      };
    }

    // For other assets, keep symbol as primary but make name more visible
    return {
      primary: pair.symbol,
      secondary: pair.name,
      showSymbolBadge: false,
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-w-[95vw] p-0 gap-0 max-h-[85vh] h-[85vh] flex flex-col overflow-hidden bg-background">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-lg font-semibold">Symbol Search</DialogTitle>
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
          ) : allPairsError || popularPairsError || searchError || categoriesError ? (
            <div className="py-8 text-center text-red-500 text-sm">
              <div className="mb-2">Error loading trading pairs:</div>
              <div className="text-xs">
                {allPairsError?.message ||
                  popularPairsError?.message ||
                  searchError?.message ||
                  categoriesError?.message ||
                  "Unknown error"}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Check console for more details or ensure backend is running on http://localhost:3001
              </div>
            </div>
          ) : filteredResults.length === 0 ? (
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
              className="py-1 flex-1 overflow-y-auto"
              onScroll={(e) => {
                const target = e.currentTarget;

                // Simple scroll detection for infinite loading
                if (
                  target.scrollHeight - target.scrollTop - target.clientHeight < 50 &&
                  displayLimit < filteredResults.length
                ) {
                  setDisplayLimit((prevLimit) => Math.min(prevLimit + 30, filteredResults.length));
                }
              }}
            >
              {displayResults.map((pair, index) => {
                const exchange = getExchange(pair);
                const assetType = getAssetTypeLabel(pair.type, pair.category);
                const displayInfo = getDisplayInfo(pair);

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
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground group-hover:text-primary">
                            {displayInfo.primary}
                          </div>
                          {displayInfo.secondary && (
                            <div className="text-xs text-muted-foreground truncate max-w-[250px]">
                              {displayInfo.secondary}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{assetType}</span>
                      <Badge variant="outline" className="text-xs">
                        {exchange}
                      </Badge>
                      {displayInfo.showSymbolBadge && displayInfo.secondary && (
                        <Badge variant="secondary" className="text-xs font-mono">
                          {displayInfo.secondary}
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          {filteredResults.length > 0 &&
            `Showing ${Math.min(displayLimit, filteredResults.length)} of ${filteredResults.length} results`}
        </div>
      </DialogContent>
    </Dialog>
  );
}
