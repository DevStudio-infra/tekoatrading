import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Development token using base64 JSON encoding that the backend will accept
const devTokenData = {
  userId: 1,
  id: 1,
  email: "dev@example.com",
};
const DEV_AUTH_TOKEN = "Bearer " + Buffer.from(JSON.stringify(devTokenData)).toString("base64");

interface Bot {
  id: string;
  name: string;
}

interface Trade {
  id: number;
  symbol: string;
  direction: string;
  entryPrice: number;
  quantity?: number;
  size?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  stopLoss?: number;
  takeProfit?: number;
  entryTime?: string;
  openTime?: string;
  exitTime?: string;
  closeTime?: string;
  openedAt?: string;
  closedAt?: string;
  createdAt?: string;
  status: string;
  currentPrice?: number;
  liveData?: unknown;
}

export async function GET(request: NextRequest) {
  console.log("[TRADES API] GET request received");

  try {
    // Get the authenticated user
    const { userId } = await auth();

    console.log("[TRADES API] Auth userId:", userId);

    // In development mode, allow access without authentication (consistent with middleware)
    let actualUserId = userId;
    if (process.env.NODE_ENV === "development" && !userId) {
      console.log("[TRADES API] DEV mode: No userId but allowing access with fallback user");
      // Use a fallback user ID for development (this should match your test user)
      actualUserId = "f99c772b-aca6-4163-954d-e2fd3fece3aa";
    }

    if (!actualUserId) {
      console.log("[TRADES API] No userId and not in development mode, returning unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const syncLive = searchParams.get("syncLive") !== "false"; // Default to true
    const limit = parseInt(searchParams.get("limit") || "100");

    console.log("[TRADES API] Query params:", { syncLive, limit });

    // First, get all bots for this user
    // Use the correct backend URL and API path structure
    const backendUrl = "http://localhost:5000";
    console.log("[TRADES API] Fetching bots from:", `${backendUrl}/api/v1/bots?userId=${actualUserId}`);

    // Get request headers for authorization
    let authHeader = request.headers.get("authorization");

    // In development, if no auth header is provided, use a test token
    if (!authHeader && process.env.NODE_ENV === "development") {
      authHeader = DEV_AUTH_TOKEN;
      console.log("[TRADES API] Using development token for authentication");
    }

    const botsResponse = await fetch(`${backendUrl}/api/v1/bots?userId=${actualUserId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader || "",
      },
    });

    if (!botsResponse.ok) {
      console.log("[TRADES API] Bots fetch failed:", botsResponse.status);
      throw new Error(`Failed to fetch bots: ${botsResponse.statusText}`);
    }

    const botsData = await botsResponse.json();
    console.log("[TRADES API] Bots data:", botsData);

    const bots = botsData.data || [];
    console.log("[TRADES API] Found bots:", bots.length);

    if (bots.length === 0) {
      console.log("[TRADES API] No bots found, returning empty arrays");
      return NextResponse.json({
        status: "success",
        data: {
          openTrades: [],
          closedTrades: [],
          totalOpen: 0,
          totalClosed: 0,
        },
      });
    }

    // Fetch trades for each bot
    const allTradesPromises = bots.map(async (bot: Bot) => {
      try {
        console.log("[TRADES API] Fetching trades for bot:", bot.id);

        const tradesResponse = await fetch(`${backendUrl}/api/v1/trades/bot/${bot.id}?syncLive=${syncLive}&limit=${limit}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader || "",
          },
        });

        if (!tradesResponse.ok) {
          console.log("[TRADES API] Trades fetch failed for bot", bot.id, ":", tradesResponse.status);
          return { trades: [], botName: bot.name };
        }

        const tradesData = await tradesResponse.json();
        console.log("[TRADES API] Trades data for bot", bot.id, ":", tradesData);

        return {
          trades: tradesData.data?.trades || [],
          botName: bot.name,
        };
      } catch (error) {
        console.log("[TRADES API] Error fetching trades for bot", bot.id, ":", error);
        return { trades: [], botName: bot.name };
      }
    });

    const allTradesData = await Promise.all(allTradesPromises);
    console.log("[TRADES API] All trades data:", allTradesData);

    // Combine and format trades
    const openTrades: Trade[] = [];
    const closedTrades: Trade[] = [];

    allTradesData.forEach(({ trades, botName }) => {
      trades.forEach((trade: Trade) => {
        const formattedTrade = {
          id: trade.id,
          botName: botName,
          symbol: trade.symbol,
          direction: trade.direction,
          entryPrice: trade.entryPrice,
          size: trade.quantity || trade.size,
          profitLoss: trade.profitLoss,
          profitLossPercent: trade.profitLossPercent,
          stopLoss: trade.stopLoss,
          takeProfit: trade.takeProfit,
          // Use openedAt for entry time, fallback to entryTime or createdAt
          entryTime: trade.openedAt || trade.entryTime || trade.openTime || trade.createdAt || new Date().toISOString(),
          // Use closedAt for exit time
          exitTime: trade.closedAt || trade.exitTime || trade.closeTime,
          status: trade.status,
          currentPrice: trade.currentPrice,
          liveData: trade.liveData,
        };

        if (trade.status === "OPEN") {
          openTrades.push(formattedTrade);
        } else {
          closedTrades.push(formattedTrade);
        }
      });
    });

    console.log("[TRADES API] Formatted trades:", {
      openCount: openTrades.length,
      closedCount: closedTrades.length,
    });

    // Sort trades by entry time (newest first)
    openTrades.sort((a, b) => new Date(b.entryTime || "").getTime() - new Date(a.entryTime || "").getTime());
    closedTrades.sort((a, b) => new Date(b.entryTime || "").getTime() - new Date(a.entryTime || "").getTime());

    return NextResponse.json({
      status: "success",
      data: {
        openTrades,
        closedTrades,
        totalOpen: openTrades.length,
        totalClosed: closedTrades.length,
        hasLiveData: syncLive,
      },
    });
  } catch (error) {
    console.error("[TRADES API] Error in GET /api/trades:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch trades",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
