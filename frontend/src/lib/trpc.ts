import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../backend/src/routers/root";
import { auth } from "@clerk/nextjs";

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl() {
  if (typeof window !== "undefined") return "http://localhost:5000"; // browser should use backend url directly
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url
  return `http://localhost:${process.env.PORT ?? 5000}`; // dev SSR should use localhost
}

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/trpc`,
      headers: async () => {
        // Get the session token from Clerk
        if (typeof window !== "undefined") {
          // Client-side: get token from window.Clerk
          const token = await (window as any).Clerk?.session?.getToken();
          return token ? { authorization: `Bearer ${token}` } : {};
        } else {
          // Server-side: get token from auth()
          try {
            const { getToken } = auth();
            const token = await getToken();
            return token ? { authorization: `Bearer ${token}` } : {};
          } catch {
            return {};
          }
        }
      },
    }),
  ],
});
