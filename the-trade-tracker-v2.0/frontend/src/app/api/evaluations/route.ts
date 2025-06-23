import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

// Get the backend URL from environment variables or use default
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Development token using base64 JSON encoding that the backend will accept
// Using a proper UUID for development user
const DEV_USER_UUID = "f99c772b-aca6-4163-954d-e2fd3fece3aa";
const devTokenData = {
  userId: DEV_USER_UUID,
  id: DEV_USER_UUID,
  email: "raphael.malburg@gmail.com",
};
const DEV_AUTH_TOKEN = `Bearer ${Buffer.from(JSON.stringify(devTokenData)).toString("base64")}`;

/**
 * GET handler for retrieving user's evaluations
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[Evaluations API] GET request received");

    // Handle authentication - with dev mode fallback
    let userId: string | null = null;
    let authHeader: string | null = null;

    if (process.env.NODE_ENV === "development") {
      console.log("[Evaluations API] Development mode: Bypassing Clerk authentication");
      userId = DEV_USER_UUID;
      authHeader = DEV_AUTH_TOKEN;
      console.log("[Evaluations API] Using development token for authentication");
    } else {
      // In production, use Clerk authentication
      try {
        const auth = getAuth(request);
        userId = auth.userId;

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
      console.error("Unauthorized access attempt to evaluations API");
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters from the request URL
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    // Forward the request to the backend
    const backendUrl = `${BACKEND_URL}/api/v1/evaluations${queryString ? `?${queryString}` : ""}`;
    console.log("[Evaluations API] Forwarding to:", backendUrl);

    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader || "",
      },
    });

    if (!backendResponse.ok) {
      console.error("[Evaluations API] Backend request failed:", backendResponse.status, backendResponse.statusText);
      const errorText = await backendResponse.text();
      console.error("[Evaluations API] Backend error response:", errorText);

      return NextResponse.json({ success: false, message: "Failed to fetch evaluations from backend" }, { status: backendResponse.status });
    }

    const data = await backendResponse.json();
    console.log("[Evaluations API] Successfully fetched evaluations:", data.evaluations?.length || 0, "items");

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Evaluations API] Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
