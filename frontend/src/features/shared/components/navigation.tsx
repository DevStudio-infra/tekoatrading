"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ThemeToggle } from "./ui/theme-toggle";
import { LanguageSwitcher } from "./ui/language-switcher";
import { useAuth } from "../../auth/components/auth-wrapper";
import { useClerk } from "@clerk/nextjs";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";

export function Navigation() {
  const t = useTranslations("common");
  const { user, isSignedIn, isLoaded } = useAuth();
  const { signOut } = useClerk();
  const params = useParams();
  const locale = params.locale || "en";

  const handleSignOut = () => {
    signOut();
  };

  // Don't render anything until auth is loaded to prevent flashing
  if (!isLoaded) {
    return (
      <nav className="relative z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href={`/${locale}`} className="text-xl font-bold text-foreground">
                Tekoa Trading
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <LanguageSwitcher />
              <div className="w-8 h-8 animate-pulse bg-muted rounded-full"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="relative z-10 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href={`/${locale}`} className="text-xl font-bold text-foreground">
              Tekoa Trading
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <LanguageSwitcher />

            {isSignedIn ? (
              <div className="flex items-center space-x-4">
                {/* Dashboard Button */}
                <Link href={`/${locale}/dashboard`}>
                  <Button variant="outline" size="sm">
                    {t("dashboard")}
                  </Button>
                </Link>

                {/* User Avatar with Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.imageUrl || ""} alt={user?.firstName || "User"} />
                        <AvatarFallback>
                          {user?.firstName?.charAt(0) ||
                            user?.emailAddresses?.[0]?.emailAddress?.charAt(0) ||
                            "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user?.firstName && user?.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user?.firstName || "User"}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.emailAddresses?.[0]?.emailAddress || ""}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/${locale}/dashboard`} className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>{t("dashboard")}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/${locale}/settings`} className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>{t("settings")}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer" onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{t("signOut")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href={`/${locale}/sign-in`}>
                  <Button variant="ghost" size="sm">
                    {t("signIn")}
                  </Button>
                </Link>
                <Link href={`/${locale}/sign-up`}>
                  <Button variant="default" size="sm">
                    {t("signUp")}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
