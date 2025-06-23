import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

// Get the backend URL from environment variables or use default
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Development token using base64 JSON encoding that the backend will accept
// Using the actual user UUID from the database
const DEV_USER_UUID = "f99c772b-aca6-4163-954d-e2fd3fece3aa";
const devTokenData = {
  userId: DEV_USER_UUID,
  id: DEV_USER_UUID,
  email: "raphael.malburg@gmail.com",
};
const DEV_AUTH_TOKEN = `Bearer ${Buffer.from(JSON.stringify(devTokenData)).toString("base64")}`;

/**
 * GET handler for retrieving user's bots
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[Bots API] GET request received");

    // Handle authentication - with dev mode fallback
    let userId: string | null = null;
    let authHeader: string | null = null;

    if (process.env.NODE_ENV === "development") {
      console.log("[Bots API] Development mode: Bypassing Clerk authentication");
      userId = DEV_USER_UUID;
      authHeader = DEV_AUTH_TOKEN;
      console.log("[Bots API] Using development token for authentication");
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
      console.error("Unauthorized access attempt to bots API");
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters from the request URL
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    // Forward the request to the backend
    const backendUrl = `${BACKEND_URL}/api/v1/bots${queryString ? `?${queryString}` : ""}`;
    console.log("[Bots API] Forwarding to:", backendUrl);

    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader || "",
      },
    });

    if (!backendResponse.ok) {
      console.error("[Bots API] Backend request failed:", backendResponse.status, backendResponse.statusText);
      const errorText = await backendResponse.text();
      console.error("[Bots API] Backend error response:", errorText);

      return NextResponse.json({ success: false, message: "Failed to fetch bots from backend" }, { status: backendResponse.status });
    }

    const data = await backendResponse.json();
    console.log("[Bots API] Successfully fetched bots:", data.bots?.length || 0, "items");

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Bots API] Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST handler for creating a new bot
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[Bots API] POST request received");

    // Handle authentication - with dev mode fallback
    let userId: string | null = null;
    let authHeader: string | null = null;

    if (process.env.NODE_ENV === "development") {
      console.log("[Bots API] Development mode: Bypassing Clerk authentication");
      userId = DEV_USER_UUID;
      authHeader = DEV_AUTH_TOKEN;
      console.log("[Bots API] Using development token for authentication");
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
      console.error("Unauthorized access attempt to bots API");
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Get the request body
    const body = await request.json();
    console.log("[Bots API] Request body:", body);

    // Forward the request to the backend
    const backendUrl = `${BACKEND_URL}/api/v1/bots`;
    console.log("[Bots API] Forwarding POST to:", backendUrl);

    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader || "",
      },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      console.error("[Bots API] Backend POST request failed:", backendResponse.status, backendResponse.statusText);
      const errorText = await backendResponse.text();
      console.error("[Bots API] Backend error response:", errorText);

      return NextResponse.json({ success: false, message: "Failed to create bot" }, { status: backendResponse.status });
    }

    const data = await backendResponse.json();
    console.log("[Bots API] Successfully created bot:", data);

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Bots API] POST Error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
