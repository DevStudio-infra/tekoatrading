import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

// Get the backend URL from environment variables or use default
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Use the actual user UUID from the database
const DEV_USER_UUID = "f99c772b-aca6-4163-954d-e2fd3fece3aa";

// Development token using base64 JSON encoding that the backend will accept
const devTokenData = {
  userId: DEV_USER_UUID,
  id: DEV_USER_UUID,
  email: "raphael.malburg@gmail.com",
};
// Include the Bearer prefix as required by the backend
const DEV_AUTH_TOKEN = `Bearer ${Buffer.from(JSON.stringify(devTokenData)).toString("base64")}`;

/**
 * GET handler for fetching bot evaluations
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    console.log(`[Bot Evaluations API] GET request received for bot ${id}`);

    // In development mode, always bypass Clerk authentication
    let userId: string | null = null;

    if (process.env.NODE_ENV === "development") {
      console.log("[Bot Evaluations API] Development mode: Bypassing Clerk authentication");
      // Use the consistent UUID for development
      userId = DEV_USER_UUID;
      console.log(`[Bot Evaluations API] Using development userId: ${userId}`);
    } else {
      // In production, use Clerk authentication
      try {
        const auth = getAuth(request);
        userId = auth.userId;
      } catch (authError) {
        console.error("Authentication error:", authError);
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
      }

      if (!userId) {
        console.error("Unauthorized access attempt to fetch bot evaluations");
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
      }
    }

    // In development mode, always use the development token regardless of what's in the header
    let authHeader;

    if (process.env.NODE_ENV === "development") {
      // Always use the development token in development mode
      authHeader = DEV_AUTH_TOKEN;
      console.log("[Bot Evaluations API] Using development token for authentication");
    } else {
      // In production, use the authorization header from the request
      authHeader = request.headers.get("authorization");
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || "10";

    // Log the authentication state
    console.log("[Bot Evaluations API] Request headers:", { auth: authHeader ? "Present" : "Missing" });
    console.log("[Bot Evaluations API] Auth header format:", authHeader ? authHeader.substring(0, 20) + "..." : "None");

    // Forward request to backend
    console.log(`[Bot Evaluations API] Forwarding evaluations request to backend: ${BACKEND_URL}/api/v1/bots/${id}/evaluations`);

    const response = await fetch(`${BACKEND_URL}/api/v1/bots/${id}/evaluations?limit=${limit}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader || "",
      },
      credentials: "include", // Include cookies if needed for auth
    });

    // Get the response from the backend
    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error("[Bot Evaluations API] Error parsing response:", e);
      return NextResponse.json({ success: false, message: "Error parsing server response" }, { status: 500 });
    }

    console.log(`[Bot Evaluations API] Backend response status: ${response.status}`);

    if (!response.ok) {
      console.error("[Bot Evaluations API] Error response:", data);
      return NextResponse.json({ success: false, message: data?.message || "Failed to fetch bot evaluations" }, { status: response.status });
    }

    // Extract the evaluations data from the backend response
    // Backend returns: { message: "Bot evaluations retrieved successfully", evaluations: [...] }
    // Frontend service expects: { evaluations: [...] }
    return NextResponse.json({ evaluations: data.evaluations || [] });
  } catch (error: unknown) {
    console.error("Error in fetch bot evaluations endpoint:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
  }
}
