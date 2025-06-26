"use client";

import { ReactNode, useState } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, trpcClient } from "../../lib/trpc";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      appearance={{
        variables: {
          colorPrimary: "#2563eb",
          colorTextOnPrimaryBackground: "#ffffff",
          borderRadius: "0.5rem",
        },
        elements: {
          formButtonPrimary:
            "bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded",
          card: "bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-800",
          formField: "mb-5",
          formFieldLabel: "text-gray-700 dark:text-gray-300 text-sm font-medium",
          formFieldInput:
            "w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base p-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent",
        },
      }}
    >
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </trpc.Provider>
    </ClerkProvider>
  );
}
