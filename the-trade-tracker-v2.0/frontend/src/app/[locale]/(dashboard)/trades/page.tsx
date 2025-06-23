"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, BarChart3, CheckCircle, AlertCircle, X, DollarSign, Clock, Calendar } from "lucide-react";
import { PositionChartContainer } from "@/features/position-visualization/components/position-chart-container";
import { ActivePosition } from "@/features/position-visualization/types/position-chart.types";

interface Trade {
  id: number;
  botName: string;
  symbol: string;
  direction: "BUY" | "SELL";
  entryPrice: number;
  size: number;
  profitLoss?: number;
  profitLossPercent?: number;
  stopLoss?: number;
  takeProfit?: number;
  entryTime: string;
  exitTime?: string;
  status: "OPEN" | "CLOSED";
}

// Convert Trade interface to ActivePosition for the chart component
function convertTradeToPosition(trade: Trade): ActivePosition {
  console.log("[TRADES] Converting trade to position:", trade);

  // Validate trade data
  if (!trade) {
    console.error("[TRADES] Trade data is null or undefined");
    throw new Error("Invalid trade data");
  }

  // Use deterministic current price calculation to avoid hydration mismatch
  const currentPrice =
    trade.status === "OPEN"
      ? trade.entryPrice * 1.0054 // Fixed 0.54% increase for demo consistency
      : trade.entryPrice; // For closed trades, use entry price

  // Validate and clean stop loss and take profit values
  const stopLoss = trade.stopLoss && typeof trade.stopLoss === "number" && trade.stopLoss > 0 ? trade.stopLoss : undefined;
  const takeProfit = trade.takeProfit && typeof trade.takeProfit === "number" && trade.takeProfit > 0 ? trade.takeProfit : undefined;

  console.log("[TRADES] Raw SL/TP:", {
    rawStopLoss: trade.stopLoss,
    rawTakeProfit: trade.takeProfit,
    cleanedStopLoss: stopLoss,
    cleanedTakeProfit: takeProfit,
  });

  const position: ActivePosition = {
    id: trade.id.toString(),
    symbol: trade.symbol,
    direction: trade.direction,
    entryPrice: trade.entryPrice,
    entryTime: trade.entryTime,
    stopLoss: stopLoss,
    takeProfit: takeProfit,
    quantity: trade.size,
    currentPrice: currentPrice,
    unrealizedPnL: trade.profitLoss || (currentPrice - trade.entryPrice) * trade.size,
    unrealizedPnLPercent: trade.profitLossPercent || ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100,
    status: trade.status,
  };

  console.log("[TRADES] Final converted position:", position);
  console.log("[TRADES] SL/TP validation - Stop Loss:", position.stopLoss, "Take Profit:", position.takeProfit);
  return position;
}

export default function TradesPage() {
  console.log("[TRADES] Component rendering...");

  const t = useTranslations();

  // State management
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTradeForChart, setSelectedTradeForChart] = useState<Trade | null>(null);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mounting
  useEffect(() => {
    console.log("[TRADES] Component mounted");
    setMounted(true);
  }, []);

  // Fetch data function - try real API first, fallback to mock
  const fetchData = async () => {
    console.log("[TRADES] fetchData called");

    try {
      setLoading(true);
      setError(null);

      // Try to fetch real trades from API
      console.log("[TRADES] Attempting to fetch real trades from API...");

      try {
        const response = await fetch("/api/trades", {
          headers: {
            "Content-Type": "application/json",
          },
        });

        console.log("[TRADES] API response status:", response.status);

        if (response.ok) {
          const data = await response.json();
          console.log("[TRADES] Real API data received:", data);

          // API returns { status: 'success', data: { openTrades: [], closedTrades: [] } }
          setOpenTrades(data.data?.openTrades || []);
          setClosedTrades(data.data?.closedTrades || []);
          return;
        } else {
          console.log("[TRADES] API response not ok, falling back to mock data");
        }
      } catch (apiError) {
        console.log("[TRADES] API fetch failed, falling back to mock data:", apiError);
      }

      // Fallback to mock data
      console.log("[TRADES] Using mock trades data");
      const mockOpenTrades: Trade[] = [
        {
          id: 1,
          botName: "lol3",
          symbol: "US500",
          direction: "BUY",
          entryPrice: 6002.2,
          size: 1,
          profitLoss: 150.45,
          profitLossPercent: 2.51,
          stopLoss: 5950.0,
          takeProfit: 6100.0,
          entryTime: "2024-01-15T10:30:00Z",
          status: "OPEN",
        },
        {
          id: 2,
          botName: "BTC Strategy Bot",
          symbol: "BTC/USD",
          direction: "BUY",
          entryPrice: 43250.5,
          size: 0.1,
          profitLoss: 235.25,
          profitLossPercent: 0.54,
          stopLoss: 42000.0,
          takeProfit: 45000.0,
          entryTime: "2024-01-15T09:15:00Z",
          status: "OPEN",
        },
        {
          id: 3,
          botName: "EUR/USD Scalper",
          symbol: "EUR/USD",
          direction: "SELL",
          entryPrice: 1.0875,
          size: 10000,
          profitLoss: 170.0,
          profitLossPercent: 0.16,
          stopLoss: 1.0925,
          takeProfit: 1.0825,
          entryTime: "2024-01-15T14:15:00Z",
          status: "OPEN",
        },
      ];

      const mockClosedTrades: Trade[] = [
        {
          id: 3,
          botName: "Gold Momentum Bot",
          symbol: "XAU/USD",
          direction: "BUY",
          entryPrice: 2025.5,
          size: 1,
          profitLoss: 150.75,
          profitLossPercent: 7.44,
          stopLoss: 2000.0,
          takeProfit: 2075.0,
          entryTime: "2024-01-14T09:00:00Z",
          exitTime: "2024-01-14T16:30:00Z",
          status: "CLOSED",
        },
      ];

      setOpenTrades(mockOpenTrades);
      setClosedTrades(mockClosedTrades);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load trading data. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts
  useEffect(() => {
    console.log("[TRADES] Mount effect triggered:", { mounted });

    if (mounted) {
      console.log("[TRADES] Component mounted, fetching data");
      fetchData();
    }
  }, [mounted]);

  // Auto-clear success messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Chart generation function
  const showTradeChart = (trade: Trade) => {
    setSelectedTradeForChart(trade);
  };

  // Close chart function
  const closeChart = () => {
    setSelectedTradeForChart(null);
  };

  // Close trade function
  const closeTrade = async (tradeId: number) => {
    try {
      // Call the API to actually close the trade
      const response = await fetch(`/api/trades/${tradeId}/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "Manual close from dashboard" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to close trade");
      }

      setSuccessMessage(`Trade #${tradeId} closed successfully`);
      await fetchData(); // Refresh data to show updated status
    } catch (err) {
      console.error("Error closing trade:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to close trade. Please try again.";
      setError(errorMessage);
    }
  };

  // Helper functions
  const getDirectionIcon = (direction: string) => {
    return direction === "BUY" ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateDuration = (start: string, end?: string) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();

    // Check if dates are valid
    if (isNaN(startDate.getTime())) {
      return "0h";
    }

    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m`;
    } else {
      return "< 1m";
    }
  };

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return <div className="min-h-screen" />;
  }

  // Auth is handled by middleware - no need for page-level auth checks

  // Show loading state while data is loading
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Trades</h1>
        </div>
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading trades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" suppressHydrationWarning>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("navigation.trading") || "Trades"}</h1>
        <Button onClick={fetchData} variant="outline" disabled={loading}>
          {t("common.refresh") || "Refresh"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => setError(null)}>
            <X className="h-3 w-3" />
          </Button>
        </Alert>
      )}

      {successMessage && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              {successMessage}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Open Trades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Open Trades ({openTrades.length})
          </CardTitle>
          <CardDescription>Current active trading positions across all bots</CardDescription>
        </CardHeader>
        <CardContent>
          {openTrades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No open trades found</p>
              <p className="text-sm">Your active positions will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bot</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Entry Price</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>P&L</TableHead>
                  <TableHead>Stop Loss</TableHead>
                  <TableHead>Take Profit</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openTrades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="font-medium">{trade.botName}</TableCell>
                    <TableCell>{trade.symbol}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getDirectionIcon(trade.direction)}
                        {trade.direction}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(trade.entryPrice)}</TableCell>
                    <TableCell>{trade.size}</TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 ${(trade.profitLoss || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {(trade.profitLoss || 0) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {formatCurrency(trade.profitLoss || 0)}
                        {trade.profitLossPercent && (
                          <span className="text-xs">
                            ({trade.profitLossPercent > 0 ? "+" : ""}
                            {trade.profitLossPercent.toFixed(2)}%)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{trade.stopLoss ? formatCurrency(trade.stopLoss) : "Not set"}</TableCell>
                    <TableCell>{trade.takeProfit ? formatCurrency(trade.takeProfit) : "Not set"}</TableCell>
                    <TableCell>{calculateDuration(trade.entryTime)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => showTradeChart(trade)}>
                          <BarChart3 className="h-3 w-3 mr-1" />
                          View Chart
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => closeTrade(trade.id)}>
                          Close
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Closed Trades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Closed Trades ({closedTrades.length})
          </CardTitle>
          <CardDescription>Trading history and performance results</CardDescription>
        </CardHeader>
        <CardContent>
          {closedTrades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No closed trades found</p>
              <p className="text-sm">Completed trades will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bot</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Entry Price</TableHead>
                  <TableHead>Exit Price</TableHead>
                  <TableHead>P&L</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Closed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closedTrades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="font-medium">{trade.botName}</TableCell>
                    <TableCell>{trade.symbol}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getDirectionIcon(trade.direction)}
                        {trade.direction}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(trade.entryPrice)}</TableCell>
                    <TableCell>
                      {/* Calculate exit price from entry price and P&L */}
                      {trade.profitLoss && trade.entryPrice && trade.size
                        ? formatCurrency(trade.direction === "BUY" ? trade.entryPrice + trade.profitLoss / trade.size : trade.entryPrice - trade.profitLoss / trade.size)
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 ${(trade.profitLoss || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {(trade.profitLoss || 0) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {formatCurrency(trade.profitLoss || 0)}
                        {trade.profitLossPercent && (
                          <span className="text-xs">
                            ({trade.profitLossPercent > 0 ? "+" : ""}
                            {trade.profitLossPercent.toFixed(2)}%)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{calculateDuration(trade.entryTime, trade.exitTime)}</TableCell>
                    <TableCell>{trade.exitTime ? formatDate(trade.exitTime) : "Not closed"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => showTradeChart(trade)}>
                        <BarChart3 className="h-3 w-3 mr-1" />
                        View Chart
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* TradingView Chart Modal */}
      <Dialog open={!!selectedTradeForChart} onOpenChange={(open) => !open && closeChart()}>
        <DialogContent className="w-[80vw] max-w-[80vw] max-h-[95vh] h-[90vh] p-3 sm:p-4 md:p-6">
          <DialogHeader className="pb-3 px-1">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
              <BarChart3 className="h-6 w-6" />
              {selectedTradeForChart?.symbol} {selectedTradeForChart?.direction} Position
            </DialogTitle>
            <DialogDescription className="text-base">Interactive TradingView chart with Entry, Stop Loss, and Take Profit levels marked</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col h-full space-y-3 overflow-hidden px-1">
            {selectedTradeForChart && (
              <>
                {/* Trade Summary Header - Responsive and Well-Spaced */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted rounded-lg flex-shrink-0">
                  <div className="text-center lg:text-left">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Bot</p>
                    <p className="font-bold text-base">{selectedTradeForChart.botName}</p>
                  </div>
                  <div className="text-center lg:text-left">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Entry Price</p>
                    <p className="font-bold text-base text-blue-600">{formatCurrency(selectedTradeForChart.entryPrice)}</p>
                  </div>
                  <div className="text-center lg:text-left">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Stop Loss</p>
                    <p className="font-bold text-base text-red-600">{selectedTradeForChart.stopLoss ? formatCurrency(selectedTradeForChart.stopLoss) : "Not set"}</p>
                  </div>
                  <div className="text-center lg:text-left">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Take Profit</p>
                    <p className="font-bold text-base text-green-600">{selectedTradeForChart.takeProfit ? formatCurrency(selectedTradeForChart.takeProfit) : "Not set"}</p>
                  </div>
                </div>

                {/* Interactive TradingView Chart - Maximum space */}
                <div className="flex-1 border-2 rounded-lg overflow-hidden min-h-0">
                  <PositionChartContainer position={convertTradeToPosition(selectedTradeForChart)} />
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
