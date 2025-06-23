import { ChartTheme } from "../types/position-chart.types";

export const darkTheme: ChartTheme = {
  background: "#1a1a1a",
  textColor: "#d1d5db",
  gridColor: "#2d3748",
  crosshairColor: "#4a5568",
  upColor: "#10b981",
  downColor: "#ef4444",
  entryLineColor: "#3b82f6",
  stopLossColor: "#ef4444",
  takeProfitColor: "#10b981",
  currentPriceColor: "#f59e0b",
};

export const lightTheme: ChartTheme = {
  background: "#ffffff",
  textColor: "#374151",
  gridColor: "#e5e7eb",
  crosshairColor: "#9ca3af",
  upColor: "#10b981",
  downColor: "#ef4444",
  entryLineColor: "#3b82f6",
  stopLossColor: "#ef4444",
  takeProfitColor: "#10b981",
  currentPriceColor: "#f59e0b",
};

export function getTheme(theme: "light" | "dark"): ChartTheme {
  return theme === "dark" ? darkTheme : lightTheme;
}
