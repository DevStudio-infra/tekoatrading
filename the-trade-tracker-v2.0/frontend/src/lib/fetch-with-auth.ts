import { jwtDecode } from "jwt-decode";
import { fixAuthorizationHeader } from "./api-auth";

/**
 * Utility function to fetch with authentication headers
 * This simplifies making authenticated API calls from the frontend
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  // Check if we're in a browser environment before accessing localStorage
  // This prevents errors during server-side rendering
  let token: string | null = null;

  // Log the environment variable to understand its value in the current context
  console.log(`[fetchWithAuth] Current environment: ${process.env.NODE_ENV}`);

  // In development mode, create a development token that matches the backend expectation
  if (process.env.NODE_ENV === "development") {
    // Use the actual user UUID from the database
    const DEV_USER_UUID = "f99c772b-aca6-4163-954d-e2fd3fece3aa";
    const devTokenData = {
      userId: DEV_USER_UUID,
      id: DEV_USER_UUID,
      email: "raphael.malburg@gmail.com",
      exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
    };

    // Use base64 encoding for the development token
    token = `Bearer ${Buffer.from(JSON.stringify(devTokenData)).toString("base64")}`;
    console.log("[fetchWithAuth] Created development token for authentication with UUID:", DEV_USER_UUID);
  }
  // In production, try to get the token from Clerk
  else if (typeof window !== "undefined") {
    try {
      // First check if Clerk has a session
      const clerkToken = localStorage.getItem("__clerk_client_jwt");

      if (clerkToken) {
        console.log("[fetchWithAuth] Clerk token found");
        token = `Bearer ${clerkToken}`;
      } else {
        // Fallback to our stored token
        const storedToken = localStorage.getItem("authToken");

        if (storedToken) {
          console.log("[fetchWithAuth] Token found in localStorage");

          try {
            // Verify the token is not expired
            const decodedToken = jwtDecode<{ exp: number }>(storedToken);
            const currentTime = Date.now() / 1000; // Current time in seconds

            if (decodedToken.exp < currentTime) {
              console.log("[fetchWithAuth] Token is expired. Removing from localStorage.");
              localStorage.removeItem("authToken");
            } else {
              console.log("[fetchWithAuth] Token is valid and not expired.");
              token = `Bearer ${storedToken}`;
            }
          } catch (error) {
            console.error("[fetchWithAuth] Error decoding token:", error);
            localStorage.removeItem("authToken");
          }
        } else {
          console.log("[fetchWithAuth] No token found in localStorage.");
        }
      }
    } catch (error) {
      console.error("[fetchWithAuth] Error accessing Clerk token:", error);
    }
  } else {
    console.log("[fetchWithAuth] Not in browser environment, no localStorage access possible.");
  }

  // Ensure the token is properly formatted
  const formattedToken = fixAuthorizationHeader(token);
  console.log("[fetchWithAuth] Using auth header:", formattedToken ? "Bearer [token]" : "None");

  // Log token availability
  if (!formattedToken) {
    console.log("[fetchWithAuth] No valid token available, Authorization header will NOT be set.");
  }

  // Create properly typed headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  // Add authorization header if token exists
  if (formattedToken) {
    headers["Authorization"] = formattedToken;
  }

  // Merge the provided options with default headers
  const mergedOptions: RequestInit = {
    ...options,
    headers,
    credentials: "include", // Always include credentials for cross-origin requests
  };

  // Safely log headers without TypeScript errors
  const headersForLogging = { ...headers };
  console.log(
    "[fetchWithAuth] Headers for the outgoing request:",
    JSON.stringify(
      {
        ...headersForLogging,
        Authorization: headers["Authorization"] ? "Bearer [token]" : "None",
      },
      null,
      2
    )
  );

  // Construct absolute URL if it's a relative API path
  let absoluteUrl = url;
  if (typeof window !== "undefined") {
    // Use the Next.js API routes as proxies to avoid CORS issues
    const baseUrl = window.location.origin;

    // Only prepend the origin if it's a relative URL
    if (url.startsWith("/")) {
      absoluteUrl = `${baseUrl}${url}`;
    }

    console.log(`[fetchWithAuth] Constructed absolute URL for API call: ${absoluteUrl}`);
  }

  // Make the fetch request
  return fetch(absoluteUrl, mergedOptions);
}
