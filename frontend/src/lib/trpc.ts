import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../backend/src/routers/root";
import { auth } from "@clerk/nextjs";

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl() {
  if (typeof window !== "undefined") return "http://localhost:3001"; // browser should use backend url directly
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url
  return `http://localhost:${process.env.PORT ?? 3001}`; // dev SSR should use localhost
}

// Function to create TRPC client with proper auth token
export function createTRPCClient(getToken?: () => Promise<string | null>) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/trpc`,
        headers: async () => {
          // Get the session token from Clerk
          if (typeof window !== "undefined") {
            // Client-side: use provided getToken function or fallback to Clerk
            try {
              let token = null;

              if (getToken) {
                token = await getToken();
              } else {
                // Fallback to window.Clerk if no getToken provided
                token = await (window as any).Clerk?.session?.getToken();
              }

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
              return token ? { authorization: `Bearer ${token}` } : {};
            } catch (error) {
              console.warn("Failed to get server-side token:", error);
              return {};
            }
          }
        },
      }),
    ],
  });
}

// Default client for backward compatibility (but should be replaced with the dynamic one)
export const trpcClient = createTRPCClient();
