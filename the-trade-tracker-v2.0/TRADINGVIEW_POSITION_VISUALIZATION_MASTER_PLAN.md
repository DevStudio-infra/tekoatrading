# TradingView Position Visualization - Master Implementation Plan

## 🎯 **Executive Summary**

This master plan outlines the implementation of a comprehensive position visualization system using **TradingView Lightweight Charts v5.0.7** (latest stable version, 35KB, Apache 2.0 license). Users will see real-time interactive charts showing exactly where they entered trades, with dynamic stop loss, take profit levels, and live P&L calculations.

## 📊 **Technology Stack & Dependencies**

### **Core Libraries** (Latest Versions)

```bash
# Frontend Dependencies
npm install lightweight-charts@5.0.7
npm install @types/lightweight-charts@latest
npm install date-fns@3.6.0
npm install lucide-react@latest
npm install framer-motion@11.x
```

### **Browser Compatibility**

- Chrome 88+ ✅
- Firefox 85+ ✅
- Safari 14+ ✅
- Edge 88+ ✅
- Mobile browsers (iOS Safari 14+, Chrome Mobile 88+) ✅

---

## 🏗️ **Architecture Overview**

### **Frontend Architecture** (Next.js 15 + TypeScript)

```
frontend/src/features/position-visualization/
├── components/
│   ├── position-chart.tsx              # Main TradingView chart component
│   ├── position-chart-container.tsx    # Responsive wrapper
│   ├── position-info-panel.tsx         # Live P&L and trade details
│   ├── chart-controls.tsx              # Timeframe/indicators controls
│   ├── trade-level-markers.tsx         # Entry/SL/TP visual markers
│   └── chart-error-boundary.tsx        # Error handling
├── hooks/
│   ├── usePositionChart.ts             # Chart initialization & management
│   ├── useRealTimePrice.ts             # WebSocket price updates
│   ├── useTradeLevels.ts               # Trade level calculations
│   └── useChartData.ts                 # OHLCV data management
├── lib/
│   ├── chart-config.ts                 # TradingView v5 configuration
│   ├── chart-themes.ts                 # Light/dark themes
│   ├── trade-calculations.ts           # P&L, R:R calculations
│   └── chart-utils.ts                  # Helper functions
└── types/
    ├── position-chart.types.ts         # TypeScript interfaces
    └── trading-data.types.ts           # Trading data structures
```

### **Backend Services** (Express.js + TypeScript)

```
backend/services/position-visualization/
├── position-chart-data.service.ts      # OHLCV data aggregation
├── real-time-price.service.ts          # WebSocket price streaming
├── trade-level-calculator.service.ts   # Entry/SL/TP calculations
└── chart-snapshot.service.ts           # Chart image generation
```

---

## 🚀 **Implementation Phases**

### **Phase 1: Core Chart Infrastructure** (Week 1)

**Priority: Critical | Estimated: 5 days**

#### **1.1 Install TradingView v5.0.7**

```bash
cd frontend
npm install lightweight-charts@5.0.7
npm install @types/lightweight-charts
```

#### **1.2 Core Position Chart Component**

**File**: `frontend/src/features/position-visualization/components/position-chart.tsx`

```typescript
import { createChart, IChartApi, ISeriesApi, LineStyle } from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

interface PositionChartProps {
  symbol: string;
  candleData: CandleData[];
  position: ActivePosition;
  theme?: "light" | "dark";
  height?: number;
  showControls?: boolean;
  onPriceUpdate?: (price: number) => void;
}

interface ActivePosition {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL";
  entryPrice: number;
  entryTime: string;
  stopLoss: number;
  takeProfit: number;
  quantity: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  unrealizedPnLPercent?: number;
}

export function PositionChart({ symbol, candleData, position, theme = "dark", height = 400, showControls = true, onPriceUpdate }: PositionChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<IChartApi | null>(null);
  const [candleSeries, setCandleSeries] = useState<ISeriesApi<"Candlestick"> | null>(null);

  // Chart initialization with v5.0.7 features
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chartInstance = createChart(chartContainerRef.current, {
      layout: {
        background: { color: theme === "dark" ? "#1a1a1a" : "#ffffff" },
        textColor: theme === "dark" ? "#d1d5db" : "#374151",
      },
      grid: {
        vertLines: { color: theme === "dark" ? "#2d3748" : "#e5e7eb" },
        horzLines: { color: theme === "dark" ? "#2d3748" : "#e5e7eb" },
      },
      crosshair: {
        mode: 1, // Normal crosshair
        vertLine: {
          labelVisible: true,
          labelBackgroundColor: theme === "dark" ? "#4a5568" : "#9ca3af",
        },
        horzLine: {
          labelVisible: true,
          labelBackgroundColor: theme === "dark" ? "#4a5568" : "#9ca3af",
        },
      },
      rightPriceScale: {
        borderColor: theme === "dark" ? "#4a5568" : "#9ca3af",
        textColor: theme === "dark" ? "#d1d5db" : "#374151",
      },
      timeScale: {
        borderColor: theme === "dark" ? "#4a5568" : "#9ca3af",
        textColor: theme === "dark" ? "#d1d5db" : "#374151",
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      kineticScroll: {
        touch: true,
        mouse: false,
      },
    });

    const series = chartInstance.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#10b981",
      wickDownColor: "#ef4444",
      wickUpColor: "#10b981",
    });

    // Set candle data
    series.setData(candleData);

    // Add trade level lines
    addTradeLevelMarkers(chartInstance, position);

    setChart(chartInstance);
    setCandleSeries(series);

    // Cleanup
    return () => {
      chartInstance.remove();
    };
  }, [theme, candleData]);

  // Add trade level visual markers
  const addTradeLevelMarkers = (chartInstance: IChartApi, position: ActivePosition) => {
    // Entry Price Line
    const entryLine = chartInstance.addLineSeries({
      color: "#3b82f6", // Blue
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      title: `Entry: ${position.entryPrice}`,
      priceLineVisible: true,
      lastValueVisible: true,
    });
    entryLine.setData([
      { time: position.entryTime, value: position.entryPrice },
      { time: Date.now() / 1000, value: position.entryPrice },
    ]);

    // Stop Loss Line
    const stopLossLine = chartInstance.addLineSeries({
      color: "#ef4444", // Red
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      title: `Stop Loss: ${position.stopLoss}`,
      priceLineVisible: true,
      lastValueVisible: true,
    });
    stopLossLine.setData([
      { time: position.entryTime, value: position.stopLoss },
      { time: Date.now() / 1000, value: position.stopLoss },
    ]);

    // Take Profit Line
    const takeProfitLine = chartInstance.addLineSeries({
      color: "#10b981", // Green
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      title: `Take Profit: ${position.takeProfit}`,
      priceLineVisible: true,
      lastValueVisible: true,
    });
    takeProfitLine.setData([
      { time: position.entryTime, value: position.takeProfit },
      { time: Date.now() / 1000, value: position.takeProfit },
    ]);

    // Current Price Line (if different from last candle)
    if (position.currentPrice) {
      const currentPriceLine = chartInstance.addLineSeries({
        color: "#f59e0b", // Orange
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        title: `Current: ${position.currentPrice}`,
        priceLineVisible: true,
        lastValueVisible: true,
      });
      currentPriceLine.setData([{ time: Date.now() / 1000, value: position.currentPrice }]);
    }
  };

  return (
    <div className="relative w-full">
      <div ref={chartContainerRef} style={{ height: `${height}px` }} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg" />

      {showControls && (
        <div className="absolute top-2 left-2 flex gap-2">
          <button className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">1H</button>
          <button className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">4H</button>
          <button className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">1D</button>
        </div>
      )}
    </div>
  );
}
```

#### **1.3 Position Info Panel Component**

**File**: `frontend/src/features/position-visualization/components/position-info-panel.tsx`

```typescript
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Percent, Clock } from "lucide-react";

interface PositionInfoPanelProps {
  position: ActivePosition;
  currentPrice: number;
  realTimePnL: number;
  realTimePnLPercent: number;
}

export function PositionInfoPanel({ position, currentPrice, realTimePnL, realTimePnLPercent }: PositionInfoPanelProps) {
  const isProfit = realTimePnL >= 0;
  const riskRewardRatio = Math.abs(position.takeProfit - position.entryPrice) / Math.abs(position.entryPrice - position.stopLoss);

  return (
    <div className="space-y-4">
      {/* Position Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Badge variant={position.direction === "BUY" ? "default" : "destructive"}>{position.direction}</Badge>
            {position.symbol}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Current P&L */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">P&L</span>
            <div className="flex items-center gap-1">
              {isProfit ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
              <span className={`font-bold ${isProfit ? "text-green-600" : "text-red-600"}`}>${realTimePnL.toFixed(2)}</span>
              <span className={`text-sm ${isProfit ? "text-green-500" : "text-red-500"}`}>({realTimePnLPercent.toFixed(2)}%)</span>
            </div>
          </div>

          {/* Position Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Entry</span>
              <div className="font-mono font-medium text-blue-600">{position.entryPrice}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Current</span>
              <div className="font-mono font-medium">{currentPrice.toFixed(5)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Stop Loss</span>
              <div className="font-mono font-medium text-red-600">{position.stopLoss}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Take Profit</span>
              <div className="font-mono font-medium text-green-600">{position.takeProfit}</div>
            </div>
          </div>

          {/* Risk Metrics */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Risk:Reward</span>
              <span className="font-medium">1:{riskRewardRatio.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Quantity</span>
              <span className="font-medium">{position.quantity}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Time in Position</span>
            <span className="font-medium">{formatDuration(Date.now() - new Date(position.entryTime).getTime())}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Distance to SL</span>
            <span className="font-medium">{Math.abs(currentPrice - position.stopLoss).toFixed(5)}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Distance to TP</span>
            <span className="font-medium">{Math.abs(position.takeProfit - currentPrice).toFixed(5)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}
```

### **Phase 2: Real-Time Integration** (Week 2)

**Priority: High | Estimated: 5 days**

#### **2.1 Real-Time Price Hook**

**File**: `frontend/src/features/position-visualization/hooks/useRealTimePrice.ts`

```typescript
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";

interface PriceUpdate {
  symbol: string;
  bid: number;
  ask: number;
  timestamp: number;
}

export function useRealTimePrice(symbol: string, enabled: boolean = true) {
  const { getToken } = useAuth();
  const [price, setPrice] = useState<number>(0);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !symbol) return;

    let ws: WebSocket;
    let reconnectTimer: NodeJS.Timeout;

    const connect = async () => {
      try {
        const token = await getToken();
        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/prices?token=${token}&symbol=${symbol}`;

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setConnected(true);
          setError(null);
          console.log(`Connected to price feed for ${symbol}`);
        };

        ws.onmessage = (event) => {
          try {
            const update: PriceUpdate = JSON.parse(event.data);
            const midPrice = (update.bid + update.ask) / 2;
            setPrice(midPrice);
          } catch (err) {
            console.error("Error parsing price update:", err);
          }
        };

        ws.onclose = () => {
          setConnected(false);
          // Reconnect after 5 seconds
          reconnectTimer = setTimeout(connect, 5000);
        };

        ws.onerror = (err) => {
          setError("WebSocket connection error");
          setConnected(false);
        };
      } catch (err) {
        setError("Failed to connect to price feed");
        reconnectTimer = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [symbol, enabled, getToken]);

  return { price, connected, error };
}
```

#### **2.2 WebSocket Backend Service**

**File**: `backend/services/position-visualization/real-time-price.service.ts`

```typescript
import WebSocket from "ws";
import { capitalComService } from "../capital-com.service";

export class RealTimePriceService {
  private clients: Map<string, Set<WebSocket>> = new Map();
  private priceIntervals: Map<string, NodeJS.Timeout> = new Map();

  subscribeToSymbol(ws: WebSocket, symbol: string, userId: string): void {
    const key = `${symbol}_${userId}`;

    if (!this.clients.has(key)) {
      this.clients.set(key, new Set());
    }

    this.clients.get(key)!.add(ws);

    // Start price updates for this symbol if not already running
    if (!this.priceIntervals.has(symbol)) {
      this.startPriceUpdates(symbol);
    }

    // Send initial price
    this.sendInitialPrice(ws, symbol);
  }

  private async startPriceUpdates(symbol: string): Promise<void> {
    const interval = setInterval(async () => {
      try {
        const priceData = await capitalComService.getLatestPrice(symbol);

        if (priceData) {
          const update = {
            symbol,
            bid: priceData.bid,
            ask: priceData.ask || priceData.offer || priceData.ofr,
            timestamp: Date.now(),
          };

          this.broadcastPriceUpdate(symbol, update);
        }
      } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error);
      }
    }, 1000); // Update every second

    this.priceIntervals.set(symbol, interval);
  }

  private broadcastPriceUpdate(symbol: string, update: any): void {
    for (const [key, clients] of this.clients.entries()) {
      if (key.startsWith(symbol)) {
        clients.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(update));
          }
        });
      }
    }
  }

  unsubscribe(ws: WebSocket): void {
    for (const [key, clients] of this.clients.entries()) {
      clients.delete(ws);

      if (clients.size === 0) {
        this.clients.delete(key);

        // Stop price updates if no more clients
        const symbol = key.split("_")[0];
        const hasOtherClients = Array.from(this.clients.keys()).some((k) => k.startsWith(symbol));

        if (!hasOtherClients && this.priceIntervals.has(symbol)) {
          clearInterval(this.priceIntervals.get(symbol)!);
          this.priceIntervals.delete(symbol);
        }
      }
    }
  }
}
```

### **Phase 3: Enhanced Visualization** (Week 3)

**Priority: Medium | Estimated: 4 days**

#### **3.1 Mobile-Responsive Chart Container**

**File**: `frontend/src/features/position-visualization/components/position-chart-container.tsx`

```typescript
import { useEffect, useState } from "react";
import { PositionChart } from "./position-chart";
import { PositionInfoPanel } from "./position-info-panel";
import { useIsMobile } from "@/lib/responsive-utils";

interface PositionChartContainerProps {
  position: ActivePosition;
  onClose?: () => void;
}

export function PositionChartContainer({ position, onClose }: PositionChartContainerProps) {
  const isMobile = useIsMobile();
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch chart data
  useEffect(() => {
    fetchChartData();
  }, [position.symbol]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/positions/${position.id}/chart-data`);
      const data = await response.json();
      setCandleData(data.candleData || []);
    } catch (error) {
      console.error("Error fetching chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? "flex flex-col" : "grid grid-cols-4 gap-6"} h-full`}>
      {/* Chart Area */}
      <div className={isMobile ? "mb-4" : "col-span-3"}>
        <PositionChart symbol={position.symbol} candleData={candleData} position={position} height={isMobile ? 300 : 500} showControls={true} />
      </div>

      {/* Info Panel */}
      <div className={isMobile ? "" : "col-span-1"}>
        <PositionInfoPanel
          position={position}
          currentPrice={position.currentPrice || 0}
          realTimePnL={position.unrealizedPnL || 0}
          realTimePnLPercent={position.unrealizedPnLPercent || 0}
        />
      </div>
    </div>
  );
}
```

### **Phase 4: Integration & Testing** (Week 4)

**Priority: Critical | Estimated: 3 days**

#### **4.1 Update Trades Page with Position Charts**

**File**: `frontend/src/app/[locale]/(dashboard)/trades/page.tsx` (Update existing)

```typescript
// Add to existing imports
import { PositionChartContainer } from '@/features/position-visualization/components/position-chart-container';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Add to existing state
const [selectedPositionForChart, setSelectedPositionForChart] = useState<Trade | null>(null);

// Add chart button to trade table actions
const handleViewPositionChart = useCallback((trade: Trade) => {
  // Only show chart for open positions
  if (trade.status === 'OPEN') {
    setSelectedPositionForChart(trade);
  }
}, []);

// Add to table columns (modify existing)
{
  accessorKey: "actions",
  header: "Actions",
  cell: ({ row }) => {
    const trade = row.original;
    return (
      <div className="flex gap-2">
        {trade.status === 'OPEN' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewPositionChart(trade)}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            View Position
          </Button>
        )}
        {/* Existing actions */}
      </div>
    );
  },
}

// Add chart modal (replace existing chart modal)
<Dialog
  open={!!selectedPositionForChart}
  onOpenChange={(open) => !open && setSelectedPositionForChart(null)}
>
  <DialogContent className="max-w-7xl max-h-[95vh]">
    <DialogHeader>
      <DialogTitle>
        Position Analysis - {selectedPositionForChart?.symbol} {selectedPositionForChart?.direction}
      </DialogTitle>
    </DialogHeader>

    {selectedPositionForChart && (
      <PositionChartContainer
        position={selectedPositionForChart}
        onClose={() => setSelectedPositionForChart(null)}
      />
    )}
  </DialogContent>
</Dialog>
```

---

## 📱 **Mobile-First Design Features**

### **Responsive Chart Behavior**

- **Desktop**: Full-featured chart with side panel
- **Tablet**: Stacked layout with collapsed info panel
- **Mobile**: Vertical stack with swipeable panels

### **Touch Interactions**

- Pinch-to-zoom for price analysis
- Swipe navigation between timeframes
- Touch-friendly control buttons (44px minimum)
- Haptic feedback on iOS devices

### **Performance Optimizations**

- WebGL acceleration for smooth 60fps charts
- Efficient candle rendering for mobile GPUs
- Minimal memory footprint (< 50MB)
- Progressive data loading

---

## 🔧 **API Endpoints**

### **New Backend Endpoints**

```typescript
// Position chart data
GET /api/positions/:id/chart-data
Response: {
  candleData: CandleData[],
  position: ActivePosition,
  currentPrice: number
}

// Real-time WebSocket
WS /ws/prices?symbol=BTC/USD&token=auth_token
Message: {
  symbol: string,
  bid: number,
  ask: number,
  timestamp: number
}

// Position performance
GET /api/positions/:id/performance
Response: {
  realTimePnL: number,
  realTimePnLPercent: number,
  metrics: PositionMetrics
}
```

---

## 🧪 **Testing Strategy**

### **Unit Tests**

- Chart component rendering
- Price calculation accuracy
- WebSocket connection handling
- Mobile responsive behavior

### **Integration Tests**

- Real-time price updates
- Chart data synchronization
- Error boundary functionality
- Performance under load

### **Manual Testing Checklist**

- [ ] Chart loads correctly for all symbols
- [ ] Trade levels display accurately
- [ ] Real-time prices update smoothly
- [ ] Mobile touch interactions work
- [ ] Error states handle gracefully
- [ ] Performance remains smooth with multiple charts

---

## 📈 **Success Metrics**

### **Technical Performance**

- Chart load time: < 2 seconds
- Real-time update latency: < 500ms
- Mobile performance: 60fps
- Memory usage: < 50MB per chart

### **User Experience**

- Chart interaction responsiveness
- Visual clarity of trade levels
- Accuracy of P&L calculations
- Mobile usability score

---

## 🚀 **Future Enhancements**

### **Advanced Features** (Post-MVP)

- Technical indicators (RSI, MACD, Bollinger Bands)
- Drawing tools (trend lines, Fibonacci)
- Multiple timeframe analysis
- Trade history overlay
- Screenshot/sharing functionality

### **Professional Features**

- Volume profile analysis
- Order book visualization
- Multi-symbol comparison
- Advanced chart types (Renko, Point & Figure)

---

## 📚 **Resources & Documentation**

### **TradingView Lightweight Charts v5.0.7**

- [Official Documentation](https://tradingview.github.io/lightweight-charts/)
- [GitHub Repository](https://github.com/tradingview/lightweight-charts)
- [API Reference](https://tradingview.github.io/lightweight-charts/docs/api)
- [Migration Guide to v5](https://tradingview.github.io/lightweight-charts/docs/migrations/to-v5)

### **Implementation Examples**

- [React Integration Examples](https://codesandbox.io/examples/package/lightweight-charts)
- [TypeScript Usage](https://github.com/tradingview/lightweight-charts/tree/master/plugin-examples)
- [Mobile Optimization Guide](https://tradingview.github.io/lightweight-charts/docs/mobile)

---

## ⚡ **Quick Start Commands**

```bash
# 1. Install dependencies
cd frontend && npm install lightweight-charts@5.0.7

# 2. Copy component files
# (Copy the components from the plan above)

# 3. Update trades page
# (Modify existing trades page with position chart integration)

# 4. Test the implementation
npm run dev

# 5. Verify WebSocket connection
# Check browser console for "Connected to price feed" message
```

---

**Total Implementation Time**: 3-4 weeks
**Priority**: High (Critical user requirement)
**Dependencies**: TradingView Lightweight Charts v5.0.7, WebSocket infrastructure
**Compatibility**: All modern browsers, iOS/Android mobile apps ready
