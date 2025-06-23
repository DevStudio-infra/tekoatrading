import { NextRequest, NextResponse } from "next/server";
import { handleApiAuth } from "@/lib/api-auth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

export async function GET(request: NextRequest, { params }: { params: { id: string; symbol: string } }) {
  try {
    const { userId, authHeader, isAuthenticated } = await handleApiAuth(request);

    if (!isAuthenticated || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: botId, symbol } = params;

    const response = await fetch(`${BACKEND_URL}/api/bots/${botId}/market-data/${symbol}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader || `Bearer ${userId}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json({ error: errorData.error || "Failed to get market data" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error getting market data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
