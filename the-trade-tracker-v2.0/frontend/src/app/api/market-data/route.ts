import { NextRequest, NextResponse } from "next/server";

interface OHLCVData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface MarketDataResponse {
  symbol: string;
  data: OHLCVData[];
  isMarketOpen: boolean;
  timeframe: string;
  count: number;
}

// Development token for backend access
const devTokenData = {
  userId: 1,
  id: 1,
  email: "dev@example.com",
};
const DEV_AUTH_TOKEN = "Bearer " + Buffer.from(JSON.stringify(devTokenData)).toString("base64");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "BTCUSD";
  const interval = searchParams.get("interval") || "1h";
  const count = parseInt(searchParams.get("count") || "100");

  console.log(`[MARKET DATA API] Request: symbol=${symbol}, interval=${interval}, count=${count}`);

  try {
    // Try to fetch from backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
    const response = await fetch(`${backendUrl}/api/market-data?symbol=${symbol}&interval=${interval}&count=${count}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Add timeout
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[MARKET DATA API] Backend success: ${data.length || 0} points`);
      return NextResponse.json(data);
    } else {
      console.error(`[MARKET DATA API] Backend failed: ${response.status} ${response.statusText}`);
      throw new Error(`Backend responded with ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.error("[MARKET DATA API] Error fetching market data:", error);

    // Return error instead of fallback data
    return NextResponse.json(
      {
        error: "Market data not available",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
