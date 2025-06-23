"use client";

import React, { ReactNode, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";
import { ensureDevAuthToken } from "@/lib/dev-auth";
import { trpc } from "@/utils/trpc";

interface ProvidersProps {
  children: ReactNode;
}

function Providers({ children }: ProvidersProps) {
  // Create a query client directly
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: false,
          },
        },
      })
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
          formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded",
          card: "bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800",
          formField: "mb-5",
          formFieldLabel: "text-gray-700 dark:text-gray-300 text-sm font-medium",
          formFieldInput:
            "w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-base p-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent",
        },
      }}>
      <QueryClientProvider client={queryClient}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <Toaster position="top-right" richColors closeButton />
            {children}
          </ThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default Providers;
