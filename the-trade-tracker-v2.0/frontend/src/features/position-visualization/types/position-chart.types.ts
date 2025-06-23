export interface CandleData {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface ActivePosition {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL";
  entryPrice: number;
  entryTime: string;
  stopLoss?: number;
  takeProfit?: number;
  quantity: number;
  currentPrice?: number;
  unrealizedPnL?: number;
  unrealizedPnLPercent?: number;
  status?: "OPEN" | "CLOSED" | "PENDING";
}

export interface PositionChartProps {
  symbol: string;
  candleData: CandleData[];
  position: ActivePosition;
  theme?: "light" | "dark";
  height?: number;
  showControls?: boolean;
  onPriceUpdate?: (price: number) => void;
}

export interface PositionInfoPanelProps {
  position: ActivePosition;
  currentPrice: number;
  realTimePnL: number;
  realTimePnLPercent: number;
}

export interface PriceUpdate {
  symbol: string;
  bid: number;
  ask: number;
  timestamp: number;
}

export interface PositionMetrics {
  riskRewardRatio: number;
  timeInPosition: number;
  distanceToStopLoss: number;
  distanceToTakeProfit: number;
  maxDrawdown?: number;
  maxProfit?: number;
}

export interface ChartTheme {
  background: string;
  textColor: string;
  gridColor: string;
  crosshairColor: string;
  upColor: string;
  downColor: string;
  entryLineColor: string;
  stopLossColor: string;
  takeProfitColor: string;
  currentPriceColor: string;
}
