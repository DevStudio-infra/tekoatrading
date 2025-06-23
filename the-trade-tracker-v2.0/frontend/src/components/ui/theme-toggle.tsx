"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconMoon, IconSun } from "@tabler/icons-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure component only renders client-side to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9 rounded-full bg-background/30 backdrop-blur-md transition-all duration-300 hover:bg-background/50 hover:scale-105 focus:ring-2 focus:ring-primary/20"
      aria-label="Toggle theme">
      <div className="relative">
        {theme === "dark" ? (
          <IconSun className="h-5 w-5 text-amber-500 transition-all duration-300 rotate-0 scale-100" />
        ) : (
          <IconMoon className="h-5 w-5 text-blue-300 transition-all duration-300 rotate-0 scale-100" />
        )}
      </div>
    </Button>
  );
}
