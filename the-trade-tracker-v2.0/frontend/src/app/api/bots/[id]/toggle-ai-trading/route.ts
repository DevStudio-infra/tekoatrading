import { NextRequest, NextResponse } from "next/server";
import { handleApiAuth, fixAuthorizationHeader } from "@/lib/api-auth";

// Get the backend URL from environment variables or use default
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/**
 * POST handler for toggling bot AI trading
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log(`[Bot Toggle AI Trading API] POST request received for bot ${id}`);

    // Handle authentication using our utility function
    const { userId, authHeader, isAuthenticated } = await handleApiAuth(request);

    if (!isAuthenticated) {
      console.log("[Bot Toggle AI Trading API] Authentication failed");
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    console.log(`[Bot Toggle AI Trading API] Authenticated as user ${userId}`);

    // Ensure the authorization header is properly formatted
    const formattedAuthHeader = fixAuthorizationHeader(authHeader);
    console.log("[Bot Toggle AI Trading API] Using auth header:", formattedAuthHeader ? "Bearer [token]" : "None");

    // Forward request to backend
    console.log(`[Bot Toggle AI Trading API] Forwarding toggle AI trading request to backend: ${BACKEND_URL}/api/v1/bots/${id}/toggle-ai-trading`);

    const response = await fetch(`${BACKEND_URL}/api/v1/bots/${id}/toggle-ai-trading`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: formattedAuthHeader || "",
      },
      credentials: "include", // Include cookies if needed for auth
    });

    // Get the response from the backend
    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error("[Bot Toggle AI Trading API] Error parsing response:", e);
      return NextResponse.json({ success: false, message: "Error parsing server response" }, { status: 500 });
    }

    console.log(`[Bot Toggle AI Trading API] Backend response status: ${response.status}`);

    if (!response.ok) {
      console.error("[Bot Toggle AI Trading API] Error response:", data);
      return NextResponse.json({ success: false, message: data?.message || "Failed to toggle bot AI trading" }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Error in toggle bot AI trading endpoint:", error);
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
