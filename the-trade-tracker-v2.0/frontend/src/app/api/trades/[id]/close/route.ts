import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Authenticate the user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: tradeId } = await params;

    if (!tradeId) {
      return NextResponse.json({ error: "Trade ID is required" }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { reason = "Manual close from dashboard" } = body;

    // Forward request to backend
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const response = await fetch(`${backendUrl}/api/v1/trades/${tradeId}/close`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.BACKEND_API_KEY || "dev-key"}`,
      },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json({ error: errorData.message || "Failed to close trade" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error closing trade:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
