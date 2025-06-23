"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

interface EnhancedThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: EnhancedThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="trade-tracker-theme"
      themes={["light", "dark", "system"]}>
      <div className="transition-colors duration-300 ease-in-out">{children}</div>
    </NextThemesProvider>
  );
}
