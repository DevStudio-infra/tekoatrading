/**
 * Interface for chart generation options
 */
/**
 * Type for chart indicators configuration
 */
export interface IndicatorSettings {
  window?: number; // For moving averages
  color?: string; // Indicator color
  fast?: number; // For MACD
  slow?: number; // For MACD
  signal?: number; // For MACD
  period?: number; // Generic period parameter
  panel?: number; // Panel number for oscillators (1 = main panel, 2+ = separate panels)
  [key: string]: any; // Allow other custom properties
}

/**
 * Chart options interface
 */
export interface ChartOptions {
  symbol: string;
  timeframe: string;
  width?: number;
  height?: number;
  indicators?: string[] | Record<string, IndicatorSettings>;
  theme?: "light" | "dark";
  showVolume?: boolean;
  separateOscillators?: boolean; // Whether to place oscillators in separate panels
  macdSettings?: {
    fastPeriod?: number;
    slowPeriod?: number;
    signalPeriod?: number;
  };
  atrSettings?: {
    period?: number;
    color?: string;
  };
  // Additional properties needed for backward compatibility
  userId?: string;
  strategyName?: string;
  useRealData?: boolean;
  chartType?: "candle" | "line" | "area" | "bar";
  skipLocalStorage?: boolean; // Whether to skip saving the chart to local storage
}

/**
 * Historical OHLCV data point structure
 */
export interface HistoricalDataPoint {
  timestamp: number;
  datetime?: string; // ISO string format for chart engine compatibility
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Chart generation result
 */
export interface ChartResult {
  chartUrl: string;
  imageBuffer?: Buffer;
  generatedAt: Date;
  isFallback: boolean;
}
