"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeaderAuth } from "./header-auth";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/bots", label: "Bots" },
  { href: "/strategies", label: "Strategies" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/charts", label: "Charts" },
];

export default function Navigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-blue-100/30 bg-white/10 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-xl text-blue-600">Tekoa Trading</span>
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
                  isActive(item.href) ? "text-blue-600" : "text-gray-700 hover:text-blue-600"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <HeaderAuth />
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-4 md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 py-6 space-y-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`block text-lg font-medium transition-colors ${
                  isActive(item.href) ? "text-blue-600" : "text-gray-700 hover:text-blue-600"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-gray-200">
              <HeaderAuth />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
