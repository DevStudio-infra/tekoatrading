import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Development token using base64 JSON encoding that the backend will accept
const devTokenData = {
  userId: 1,
  id: 1,
  email: "dev@example.com",
};
const DEV_AUTH_TOKEN = `Bearer ${Buffer.from(JSON.stringify(devTokenData)).toString("base64")}`;

export async function GET(request: NextRequest) {
  try {
    console.log("[Analytics P&L History API] GET request received");

    // Handle authentication - with dev mode fallback
    let userId: string | null = null;
    let authHeader: string | null = null;

    if (process.env.NODE_ENV === "development") {
      console.log("[Analytics P&L History API] Development mode: Bypassing Clerk authentication");
      // Use a hardcoded userId for development
      userId = "1";
      // Always use the development token in development mode
      authHeader = DEV_AUTH_TOKEN;
      console.log("[Analytics P&L History API] Using development token for authentication");
    } else {
      // In production, use Clerk authentication
      try {
        const { userId: clerkUserId } = await auth();
        userId = clerkUserId;

        if (userId) {
          // In production, use the authorization header from the request
          authHeader = request.headers.get("authorization");
        }
      } catch (authError) {
        console.error("Authentication error:", authError);
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
      }
    }

    if (!userId) {
      console.error("Unauthorized access attempt to analytics P&L history API");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d";
    const groupBy = searchParams.get("groupBy") || "day";

    console.log(`[Analytics P&L History API] Fetching P&L history for period: ${period}, groupBy: ${groupBy}`);

    // Call backend API
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const response = await fetch(`${backendUrl}/api/v1/analytics/pnl-history?period=${period}&groupBy=${groupBy}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader || `Bearer ${userId}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          message: errorData.message || "Failed to fetch P&L history",
          error: errorData.error,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Analytics P&L History API Error:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
