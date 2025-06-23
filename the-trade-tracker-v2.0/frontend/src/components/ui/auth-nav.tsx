"use client";

import { SignedIn, SignedOut, useUser, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { IconUser, IconSettings, IconChevronDown, IconLogout } from "@tabler/icons-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AuthNav() {
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <div className="flex items-center gap-4">
      <SignedIn>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-auto px-3 gap-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-blue-200/50 dark:border-blue-800/50 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
                <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs">
                  {user?.fullName?.charAt(0) || user?.emailAddresses[0]?.emailAddress?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start text-xs">
                <span className="text-gray-900 dark:text-gray-100 font-medium">{user?.fullName || "User"}</span>
                <span className="text-gray-500 dark:text-gray-400">{user?.emailAddresses[0]?.emailAddress?.split("@")[0]}</span>
              </div>
              <IconChevronDown className="h-3 w-3 text-gray-500 dark:text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900">
            <div className="flex items-center gap-2 p-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
                <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                  {user?.fullName?.charAt(0) || user?.emailAddresses[0]?.emailAddress?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.fullName || "User"}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{user?.emailAddresses[0]?.emailAddress}</span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                <IconSettings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                signOut(() => {
                  window.location.href = "/home";
                })
              }
              className="flex items-center gap-2 cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30">
              <IconLogout className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SignedIn>

      <SignedOut>
        <Link href="/sign-in" className="px-4 py-2 text-sm font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2">
          <IconUser className="h-4 w-4" />
          Sign In
        </Link>
      </SignedOut>
    </div>
  );
}
