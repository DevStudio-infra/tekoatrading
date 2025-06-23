"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { ensureDevAuthToken } from "../lib/dev-auth";
import { trpc, trpcClient } from "../lib/trpc";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
      ensureDevAuthToken();
    }
  }, []);

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "rgb(37, 99, 235)",
          colorTextOnPrimaryBackground: "white",
        },
        elements: {
          formButtonPrimary:
            "bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded",
          card: "bg-white shadow-sm border border-gray-200",
          formField: "mb-5",
          formFieldLabel: "text-gray-700 text-sm font-medium",
          formFieldInput:
            "w-full bg-white text-gray-900 text-base p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent",
        },
      }}
    >
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </trpc.Provider>
    </ClerkProvider>
  );
}
