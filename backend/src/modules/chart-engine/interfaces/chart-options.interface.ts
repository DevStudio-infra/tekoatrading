export interface HistoricalDataPoint {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartOptions {
  symbol: string;
  timeframe: string;
  width?: number;
  height?: number;
  theme?: "light" | "dark";
  showVolume?: boolean;
  indicators?: IndicatorSettings;
  botId?: string;
}

export interface IndicatorSettings {
  [key: string]: {
    enabled: boolean;
    period?: number;
    color?: string;
    [key: string]: any;
  };
}

export interface ChartResult {
  chartUrl: string;
  imageBuffer?: Buffer;
  generatedAt: Date;
  isFallback: boolean;
}
