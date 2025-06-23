import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Get authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get bot ID from params
    const { id: botId } = await params;
    if (!botId) {
      return NextResponse.json({ error: "Bot ID is required" }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { symbol, direction, orderType, quantity, limitPrice, stopLoss, takeProfit, rationale, aiConfidence, riskScore, evaluationId } = body;

    // Validate required fields
    if (!symbol || !direction || !orderType || !quantity) {
      return NextResponse.json({ error: "Symbol, direction, order type, and quantity are required" }, { status: 400 });
    }

    // Make request to backend
    const backendResponse = await fetch(`${process.env.BACKEND_URL}/api/bots/${botId}/execute-trade`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.BACKEND_API_KEY}`,
        "X-User-ID": userId,
      },
      body: JSON.stringify({
        symbol,
        direction,
        orderType,
        quantity,
        limitPrice,
        stopLoss,
        takeProfit,
        rationale,
        aiConfidence,
        riskScore,
        evaluationId,
      }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      return NextResponse.json({ error: errorData.message || "Failed to execute trade" }, { status: backendResponse.status });
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error executing trade:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
