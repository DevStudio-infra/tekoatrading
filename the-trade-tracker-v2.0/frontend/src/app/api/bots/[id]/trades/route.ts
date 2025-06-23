import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Authenticate the user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: botId } = await params;

    if (!botId) {
      return NextResponse.json({ error: "Bot ID is required" }, { status: 400 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const syncLive = searchParams.get("syncLive") !== "false"; // Default to true
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Forward request to backend
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const backendParams = new URLSearchParams({
      syncLive: syncLive.toString(),
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await fetch(`${backendUrl}/api/v1/trades/bot/${botId}?${backendParams}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.BACKEND_API_KEY || "dev-key"}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      return NextResponse.json({ error: errorData.message || "Failed to fetch bot trades" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching bot trades:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
