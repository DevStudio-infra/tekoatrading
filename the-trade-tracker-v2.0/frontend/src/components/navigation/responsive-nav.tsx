"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Menu, LayoutDashboard, Bot, BarChart3, TrendingUp, Settings, Zap, CreditCard, ChevronRight, Home, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile, useIsTouchDevice, getTouchFriendlyClasses } from "@/lib/responsive-utils";

interface NavItem {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  description?: string;
  category?: "main" | "tools" | "settings";
}

interface ResponsiveNavProps {
  className?: string;
}

export function ResponsiveNav({ className }: ResponsiveNavProps) {
  const t = useTranslations("navigation");
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const isTouchDevice = useIsTouchDevice();
  const [isOpen, setIsOpen] = useState(false);

  const navItems: NavItem[] = [
    {
      id: "dashboard",
      title: t("dashboard"),
      href: "/dashboard",
      icon: LayoutDashboard,
      description: "Overview and analytics",
      category: "main",
    },
    {
      id: "bots",
      title: t("bots"),
      href: "/bots",
      icon: Bot,
      badge: 3,
      description: "Manage trading bots",
      category: "main",
    },
    {
      id: "strategies",
      title: t("strategies"),
      href: "/strategies",
      icon: BarChart3,
      badge: "New",
      description: "Create and manage strategies",
      category: "main",
    },
    {
      id: "trading",
      title: t("trading"),
      href: "/trading",
      icon: TrendingUp,
      description: "Live trading interface",
      category: "main",
    },
    {
      id: "evaluations",
      title: "Evaluations",
      href: "/bot-evaluations",
      icon: Zap,
      badge: 5,
      description: "Bot performance analysis",
      category: "tools",
    },
    {
      id: "broker-credentials",
      title: "Broker Setup",
      href: "/broker-credentials",
      icon: CreditCard,
      description: "Configure broker connections",
      category: "tools",
    },
    {
      id: "settings",
      title: t("settings"),
      href: "/settings",
      icon: Settings,
      description: "Account and preferences",
      category: "settings",
    },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname.endsWith("/dashboard");
    }
    return pathname.startsWith(href);
  };

  const groupedItems = navItems.reduce((acc, item) => {
    const category = item.category || "main";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const NavItemComponent = ({ item, onClick, className: itemClassName }: { item: NavItem; onClick?: () => void; className?: string }) => {
    const active = isActive(item.href);
    const touchClasses = getTouchFriendlyClasses(isTouchDevice, "medium");

    return (
      <Link href={item.href} onClick={onClick}>
        <motion.div
          className={cn(
            "group relative flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            touchClasses,
            active && "bg-accent text-accent-foreground",
            itemClassName
          )}
          whileHover={{ scale: isTouchDevice ? 1 : 1.02 }}
          whileTap={{ scale: 0.98 }}>
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
              active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
            )}>
            <item.icon className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{item.title}</span>
              {item.badge && (
                <Badge variant={active ? "default" : "secondary"} className="text-xs scale-90">
                  {item.badge}
                </Badge>
              )}
            </div>
            {item.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>}
          </div>

          {!isMobile && (
            <ChevronRight
              className={cn("h-4 w-4 transition-all duration-200", "opacity-0 group-hover:opacity-100 group-hover:translate-x-1", active && "opacity-100 text-primary")}
            />
          )}

          {active && (
            <motion.div
              layoutId="activeIndicator"
              className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"
              initial={false}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </motion.div>
      </Link>
    );
  };

  const MobileNav = () => (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className={cn("md:hidden gap-2", getTouchFriendlyClasses(isTouchDevice, "medium"))}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open navigation menu</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Trade Tracker
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)] px-6">
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {category === "main" ? "Main" : category === "tools" ? "Tools" : "Settings"}
                </h3>
                <div className="space-y-1">
                  {items.map((item) => (
                    <NavItemComponent key={item.id} item={item} onClick={() => setIsOpen(false)} />
                  ))}
                </div>
                {category !== "settings" && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );

  const DesktopNav = () => (
    <nav className={cn("hidden md:flex md:flex-col md:w-64 md:space-y-1", className)}>
      {Object.entries(groupedItems).map(([category, items]) => (
        <div key={category} className="space-y-1">
          {category !== "main" && (
            <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3">{category === "tools" ? "Tools" : "Settings"}</h3>
          )}
          {items.map((item) => (
            <NavItemComponent key={item.id} item={item} />
          ))}
        </div>
      ))}
    </nav>
  );

  if (isMobile) {
    return <MobileNav />;
  }

  return <DesktopNav />;
}

// Breadcrumb component for better navigation context
export function ResponsiveBreadcrumb() {
  const pathname = usePathname();
  const t = useTranslations("navigation");

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs = [{ title: t("dashboard"), href: "/dashboard" }];

    let currentPath = "";
    segments.forEach((segment) => {
      currentPath += `/${segment}`;

      // Skip locale segment
      if (segment.length === 2 && /^[a-z]{2}$/.test(segment)) {
        return;
      }

      // Map segments to readable names
      const segmentMap: Record<string, string> = {
        dashboard: t("dashboard"),
        bots: t("bots"),
        strategies: t("strategies"),
        trading: t("trading"),
        settings: t("settings"),
        "bot-evaluations": "Evaluations",
        "broker-credentials": "Broker Setup",
      };

      const title = segmentMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      breadcrumbs.push({ title, href: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
          {index === breadcrumbs.length - 1 ? (
            <span className="font-medium text-foreground">{crumb.title}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-foreground transition-colors">
              {crumb.title}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
