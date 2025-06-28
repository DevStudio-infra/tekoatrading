import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import { auth } from "@clerk/nextjs/server";
import type { AppRouter } from "../../../backend/src/routers/root";

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl() {
  if (typeof window !== "undefined") return "http://localhost:3001";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:3001`;
}

// Enhanced token refresh logic for production
async function getTokenWithRefresh(getToken?: () => Promise<string | null>) {
  if (!getToken) return null;

  try {
    let token = await getToken();

    // If token is expired or about to expire, try to refresh
    if (token) {
      try {
        // Decode token to check expiration (without verification)
        const payload = JSON.parse(atob(token.split(".")[1]));
        const now = Math.floor(Date.now() / 1000);

        // If token expires in less than 5 minutes, try to refresh
        if (payload.exp && payload.exp - now < 300) {
          console.log("Token expiring soon, attempting refresh...");

          // For Clerk, we can request a new token
          token = await getToken();

          if (token) {
            console.log("Token refreshed successfully");
          }
        }
      } catch (decodeError) {
        console.warn("Could not decode token for refresh check:", decodeError);
        // Token might be malformed, try to get a fresh one
        token = await getToken();
      }
    }

    return token;
  } catch (error) {
    console.error("Token refresh failed:", error);
    return null;
  }
}

// Function to create TRPC client with proper auth token
export function createTRPCClient(getToken?: () => Promise<string | null>) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/trpc`,
        headers: async () => {
          // Development mode bypass for testing
          if (process.env.NODE_ENV === "development" && !getToken) {
            console.log("Development mode: Skipping authentication for TRPC");
            return {};
          }

          // Get the session token from Clerk
          if (typeof window !== "undefined") {
            // Client-side: use provided getToken function or fallback to Clerk
            try {
              let token = null;

              if (getToken) {
                token = await getTokenWithRefresh(getToken);
              } else {
                // Fallback to window.Clerk if no getToken provided
                const clerk = (window as any).Clerk;
                if (clerk?.session) {
                  token = await clerk.session.getToken();
                }
              }

              console.log("Client-side token obtained:", !!token);
              return token ? { authorization: `Bearer ${token}` } : {};
            } catch (error) {
              console.warn("Failed to get client-side token:", error);
              return {};
            }
          } else {
            // Server-side: get token from auth()
            try {
              const { getToken: serverGetToken } = auth();
              const token = await serverGetToken();
              console.log("Server-side token obtained:", !!token);
              return token ? { authorization: `Bearer ${token}` } : {};
            } catch (error) {
              console.warn("Failed to get server-side token:", error);
              return {};
            }
          }
        },
        // Add retry logic for authentication errors
        fetch: async (url, options) => {
          const response = await fetch(url, options);

          // If we get a 401, try to refresh token and retry once
          if (response.status === 401 && getToken) {
            console.log("Got 401, attempting token refresh and retry...");
            try {
              const newToken = await getTokenWithRefresh(getToken);
              if (newToken && options?.headers) {
                (options.headers as any).authorization = `Bearer ${newToken}`;
                return await fetch(url, options);
              }
            } catch (retryError) {
              console.error("Token refresh retry failed:", retryError);
            }
          }

          return response;
        },
      }),
    ],
  });
}

// Default client for backward compatibility (but should be replaced with the dynamic one)
export const trpcClient = createTRPCClient();
