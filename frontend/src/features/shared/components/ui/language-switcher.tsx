"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { ChevronDown, Globe } from "lucide-react";

const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
];

export function LanguageSwitcher() {
  const pathname = usePathname();
  const [currentLocale, setCurrentLocale] = React.useState("en");

  React.useEffect(() => {
    const locale = pathname.split("/")[1];
    if (languages.some((lang) => lang.code === locale)) {
      setCurrentLocale(locale);
    }
  }, [pathname]);

  const getLocalizedPath = (locale: string) => {
    const segments = pathname.split("/");
    segments[1] = locale;
    return segments.join("/");
  };

  const currentLang = languages.find((lang) => lang.code === currentLocale) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLang.flag}</span>
          <span className="hidden md:inline">{currentLang.name}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {languages.map((lang) => (
          <DropdownMenuItem key={lang.code} asChild>
            <Link
              href={getLocalizedPath(lang.code) as any}
              className="flex items-center gap-2 cursor-pointer w-full"
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
              {lang.code === currentLocale && <span className="ml-auto text-xs">✓</span>}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
