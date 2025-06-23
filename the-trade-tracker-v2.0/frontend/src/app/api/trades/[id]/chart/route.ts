import { NextRequest, NextResponse } from "next/server";

// For now, we'll simulate enhanced trade chart generation
// In a real implementation, this would connect to the backend trade visualization service

interface ChartData {
  engine: string;
  generatedAt: string;
  candleCount?: number;
  tradeLevels?: number;
  timeframe?: string;
  symbol?: string;
  tradeVisualization?: boolean;
  method?: string;
}

interface TradeLevel {
  type: "entry" | "stopLoss" | "takeProfit";
  price: number;
  label: string;
  color: string;
}

interface TradeInfo {
  id: number;
  symbol: string;
  direction: string;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  entryTime: string;
  status: string;
}

interface TradeData {
  entry: number;
  stopLoss: number;
  takeProfit: number;
  direction: string;
  status: string;
}

interface Performance {
  profitLoss: number;
  profitLossPercent: number;
  duration: string;
  status: string;
}

interface Metadata {
  generatedAt: string;
  tradeId: number;
  options: {
    width: number;
    height: number;
    showIndicators: boolean;
    theme: string;
    useRealCharts?: boolean;
  };
  engine?: string;
}

interface TradeChartResponse {
  success: boolean;
  chartUrl?: string;
  chartData?: ChartData;
  tradeData?: TradeData;
  tradeInfo?: TradeInfo;
  tradeLevels?: TradeLevel[];
  performance?: Performance;
  metadata?: Metadata;
  error?: string;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  try {
    const { id } = await params; // Await params for Next.js 15 compatibility
    const tradeId = parseInt(id);

    if (isNaN(tradeId)) {
      return NextResponse.json({ success: false, error: "Invalid trade ID" }, { status: 400 });
    }

    // Parse request body for chart options
    const body = await request.json().catch(() => ({}));
    const options = {
      width: body.width || 1200,
      height: body.height || 600,
      showIndicators: body.showIndicators ?? true,
      theme: body.theme || "dark",
      useRealCharts: body.useRealCharts ?? true,
    };

    console.log(`[TRADE CHART API] Generating enhanced chart for trade ${tradeId}`);

    // Simulate enhanced trade data with realistic values
    const mockTradeInfo: TradeInfo = {
      id: tradeId,
      symbol: getRandomSymbol(),
      direction: Math.random() > 0.5 ? "BUY" : "SELL",
      entryPrice: getRandomPrice(getRandomSymbol()),
      stopLoss: undefined,
      takeProfit: undefined,
      entryTime: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      status: Math.random() > 0.3 ? "OPEN" : "CLOSED",
    };

    // Calculate stop loss and take profit based on direction
    const priceRange = mockTradeInfo.entryPrice * 0.02; // 2% range
    if (mockTradeInfo.direction === "BUY") {
      mockTradeInfo.stopLoss = mockTradeInfo.entryPrice - priceRange;
      mockTradeInfo.takeProfit = mockTradeInfo.entryPrice + priceRange * 1.5;
    } else {
      mockTradeInfo.stopLoss = mockTradeInfo.entryPrice + priceRange;
      mockTradeInfo.takeProfit = mockTradeInfo.entryPrice - priceRange * 1.5;
    }

    // Create trade levels
    const tradeLevels: TradeLevel[] = [
      {
        type: "entry",
        price: mockTradeInfo.entryPrice,
        label: "Entry",
        color: mockTradeInfo.direction === "BUY" ? "#00ff00" : "#ff6600",
      },
      {
        type: "stopLoss",
        price: mockTradeInfo.stopLoss!,
        label: "Stop Loss",
        color: "#ff0000",
      },
      {
        type: "takeProfit",
        price: mockTradeInfo.takeProfit!,
        label: "Take Profit",
        color: "#00ff00",
      },
    ];

    // Generate enhanced chart URL
    const chartParams = new URLSearchParams({
      text: `${options.useRealCharts ? "Real Candlestick" : "Enhanced"} Chart\n${mockTradeInfo.symbol} ${mockTradeInfo.direction}\nEntry: ${mockTradeInfo.entryPrice.toFixed(
        5
      )}\nSL: ${mockTradeInfo.stopLoss?.toFixed(5)}\nTP: ${mockTradeInfo.takeProfit?.toFixed(5)}\n${tradeLevels.length} Trade Levels`,
      width: options.width.toString(),
      height: options.height.toString(),
      bg: options.theme === "dark" ? "1a1a1a" : "ffffff",
      color: options.theme === "dark" ? "ffffff" : "000000",
    });

    const chartUrl = `https://via.placeholder.com/${options.width}x${options.height}/${options.theme === "dark" ? "1a1a1a" : "ffffff"}/${
      options.theme === "dark" ? "ffffff" : "000000"
    }?${chartParams.toString()}`;

    // Calculate performance metrics
    const currentPrice = mockTradeInfo.entryPrice + (Math.random() - 0.5) * mockTradeInfo.entryPrice * 0.01;
    const profitLoss = mockTradeInfo.direction === "BUY" ? (currentPrice - mockTradeInfo.entryPrice) * 100 : (mockTradeInfo.entryPrice - currentPrice) * 100;
    const profitLossPercent = (profitLoss / (mockTradeInfo.entryPrice * 100)) * 100;

    const response: TradeChartResponse = {
      success: true,
      chartUrl,
      chartData: {
        engine: options.useRealCharts ? "RealCandlestickEngine" : "EnhancedPlaceholderEngine",
        generatedAt: new Date().toISOString(),
        candleCount: 100,
        tradeLevels: tradeLevels.length,
        timeframe: "M1",
        symbol: mockTradeInfo.symbol,
        tradeVisualization: true,
        method: "POST",
      },
      tradeInfo: mockTradeInfo,
      tradeLevels,
      tradeData: {
        entry: mockTradeInfo.entryPrice,
        stopLoss: mockTradeInfo.stopLoss!,
        takeProfit: mockTradeInfo.takeProfit!,
        direction: mockTradeInfo.direction,
        status: mockTradeInfo.status,
      },
      performance: {
        profitLoss,
        profitLossPercent,
        duration: calculateDuration(mockTradeInfo.entryTime),
        status: mockTradeInfo.status,
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        tradeId,
        options,
        engine: options.useRealCharts ? "RealCandlestickEngine" : "EnhancedPlaceholderEngine",
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[TRADE CHART API] Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  try {
    const { id } = await params; // Await params for Next.js 15 compatibility
    const tradeId = parseInt(id);

    if (isNaN(tradeId)) {
      return NextResponse.json({ success: false, error: "Invalid trade ID" }, { status: 400 });
    }

    // Default options for GET request
    const options = {
      width: 1200,
      height: 600,
      showIndicators: true,
      theme: "dark" as const,
      useRealCharts: true,
    };

    // Simulate the same enhanced response as POST
    const mockTradeInfo: TradeInfo = {
      id: tradeId,
      symbol: getRandomSymbol(),
      direction: Math.random() > 0.5 ? "BUY" : "SELL",
      entryPrice: getRandomPrice(getRandomSymbol()),
      stopLoss: undefined,
      takeProfit: undefined,
      entryTime: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      status: Math.random() > 0.3 ? "OPEN" : "CLOSED",
    };

    // Calculate levels
    const priceRange = mockTradeInfo.entryPrice * 0.02;
    if (mockTradeInfo.direction === "BUY") {
      mockTradeInfo.stopLoss = mockTradeInfo.entryPrice - priceRange;
      mockTradeInfo.takeProfit = mockTradeInfo.entryPrice + priceRange * 1.5;
    } else {
      mockTradeInfo.stopLoss = mockTradeInfo.entryPrice + priceRange;
      mockTradeInfo.takeProfit = mockTradeInfo.entryPrice - priceRange * 1.5;
    }

    const response: TradeChartResponse = {
      success: true,
      chartUrl: `https://via.placeholder.com/1200x600/1a1a1a/ffffff?text=Enhanced+${mockTradeInfo.symbol}+Chart%0A${
        mockTradeInfo.direction
      }+Trade%0AEntry:+${mockTradeInfo.entryPrice.toFixed(5)}`,
      chartData: {
        engine: "RealCandlestickEngine",
        generatedAt: new Date().toISOString(),
        candleCount: 100,
        tradeLevels: 3,
        timeframe: "M1",
        symbol: mockTradeInfo.symbol,
        tradeVisualization: true,
        method: "GET",
      },
      tradeInfo: mockTradeInfo,
      metadata: {
        generatedAt: new Date().toISOString(),
        tradeId,
        options,
        engine: "RealCandlestickEngine",
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[TRADE CHART API] Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// Helper functions
function getRandomSymbol(): string {
  const symbols = ["BTCUSD", "ETHUSD", "EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "USDCAD", "AUDUSD"];
  return symbols[Math.floor(Math.random() * symbols.length)];
}

function getRandomPrice(symbol: string): number {
  const prices: { [key: string]: number } = {
    BTCUSD: 43250 + (Math.random() - 0.5) * 2000,
    ETHUSD: 2650 + (Math.random() - 0.5) * 200,
    EURUSD: 1.0875 + (Math.random() - 0.5) * 0.02,
    GBPUSD: 1.265 + (Math.random() - 0.5) * 0.02,
    USDJPY: 149.5 + (Math.random() - 0.5) * 2,
    XAUUSD: 2025 + (Math.random() - 0.5) * 50,
    USDCAD: 1.345 + (Math.random() - 0.5) * 0.02,
    AUDUSD: 0.675 + (Math.random() - 0.5) * 0.02,
  };

  return Number((prices[symbol] || 1.0).toFixed(5));
}

function calculateDuration(startTime: string): string {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  } else {
    return `${diffMinutes}m`;
  }
}
