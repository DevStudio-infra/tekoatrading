"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { HeaderAuth } from "@/components/layout/header-auth";
import { Button } from "@/components/ui/button";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { Sparkles } from "@/components/ui/sparkles";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/home", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/home#pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
  { href: "/dashboard", label: "Dashboard" },
];

export function LandingNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (href: string) => {
    if (href.includes("#")) {
      // For hash links, just check if the base path matches
      return pathname === href.split("#")[0];
    }
    // Special case for home page vs root redirect
    if (pathname === "/" && href === "/home") {
      return true;
    }
    return pathname === href;
  };

  const handleSheetOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-blue-100/30 dark:border-blue-900/30 bg-white/10 dark:bg-gray-900/10 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/home">
            <Sparkles>
              <span className="font-bold text-xl text-blue-600 dark:text-blue-400">TradeTracker</span>
            </Sparkles>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-base font-medium transition-colors ${
                  isActive(item.href) ? "text-blue-600 dark:text-blue-400" : "text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400"
                }`}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <ThemeToggle />
            <HeaderAuth />
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-4 md:hidden">
          <LanguageSwitcher />
          <ThemeToggle />
          <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <IconMenu2 className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[350px]">
              <SheetHeader className="mb-6">
                <SheetTitle className="text-left">
                  <Link href="/home" onClick={() => setIsOpen(false)}>
                    <span className="font-bold text-xl text-blue-600 dark:text-blue-400">TradeTracker</span>
                  </Link>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-6">
                {navItems.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className={`text-lg font-medium transition-colors ${
                        isActive(item.href) ? "text-blue-600 dark:text-blue-400" : "text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400"
                      }`}>
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
                <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-start">
                    <LanguageSwitcher />
                  </div>
                  <HeaderAuth />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
