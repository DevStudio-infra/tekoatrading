import { NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

// Use the actual user UUID from the database
const DEV_USER_UUID = "f99c772b-aca6-4163-954d-e2fd3fece3aa";

/**
 * Development token using base64 JSON encoding that the backend will accept
 * This token includes the exp field to ensure it's properly formatted for JWT validation
 */
export const createDevToken = () => {
  const devTokenData = {
    userId: DEV_USER_UUID,
    id: DEV_USER_UUID,
    email: "raphael.malburg@gmail.com",
    exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
  };

  return `Bearer ${Buffer.from(JSON.stringify(devTokenData)).toString("base64")}`;
};

// Pre-created development token
export const DEV_AUTH_TOKEN = createDevToken();

/**
 * Utility function to handle authentication for API routes
 * Works in both development and production environments
 */
export async function handleApiAuth(request: NextRequest): Promise<{
  userId: string | null;
  authHeader: string | null;
  isAuthenticated: boolean;
}> {
  let userId: string | null = null;
  let authHeader: string | null = null;
  let isAuthenticated = false;

  // In development mode, bypass Clerk authentication
  if (process.env.NODE_ENV === "development") {
    console.log("[API Auth] Development mode: Bypassing Clerk authentication");
    userId = DEV_USER_UUID;

    // Always use the development token in development mode
    authHeader = DEV_AUTH_TOKEN;
    isAuthenticated = true;

    console.log(`[API Auth] Using development userId: ${userId}`);
    console.log("[API Auth] Using development token for authentication");
  } else {
    // In production, use Clerk authentication
    try {
      const auth = getAuth(request);
      userId = auth.userId;

      if (userId) {
        isAuthenticated = true;
        // In production, use the authorization header from the request
        authHeader = request.headers.get("authorization");
      }
    } catch (authError) {
      console.error("[API Auth] Authentication error:", authError);
      isAuthenticated = false;
    }
  }

  return { userId, authHeader, isAuthenticated };
}

/**
 * Utility function to fix authorization header format if needed
 * This is useful when the client sends a token in the wrong format
 */
export function fixAuthorizationHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;

  // If already in the correct format (Bearer eyJ...), return as is
  if (authHeader.startsWith("Bearer eyJ")) {
    return authHeader;
  }

  // If it doesn't have 'Bearer ' prefix, add it
  if (!authHeader.startsWith("Bearer ")) {
    return `Bearer ${authHeader}`;
  }

  // If it's our custom development token format, convert it to proper JWT format
  try {
    // Extract the token part (remove 'Bearer ' if present)
    const tokenPart = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;

    // Check if it's a base64 encoded JSON token
    if (tokenPart.indexOf(".") === -1) {
      // Not a JWT (which has dots)
      try {
        // Try to decode and parse as JSON
        const decodedJson = Buffer.from(tokenPart, "base64").toString();
        const tokenData = JSON.parse(decodedJson);

        // Ensure it has the exp field
        if (!tokenData.exp) {
          tokenData.exp = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now
        }

        // Re-encode with proper format
        return `Bearer ${Buffer.from(JSON.stringify(tokenData)).toString("base64")}`;
      } catch {
        // If we can't parse as JSON, just return with Bearer prefix
        console.log("[API Auth] Token is not a base64 JSON, returning with Bearer prefix");
        return `Bearer ${tokenPart}`;
      }
    }

    // It's already a JWT token with Bearer prefix
    return authHeader;
  } catch (error) {
    console.error("[API Auth] Error fixing authorization header:", error);
    // If we can't fix it, return the original
    return authHeader;
  }
}
