"use client";

import { ReactNode } from "react";
import { useUser, useAuth as useClerkAuth } from "@clerk/nextjs";

interface AuthWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

// Check if Clerk is available
function isClerkAvailable() {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const isDevelopment = process.env.NODE_ENV === "development";
  const hasValidClerkKey = clerkKey && clerkKey.startsWith("pk_");

  return !isDevelopment || hasValidClerkKey;
}

export function AuthWrapper({ children, fallback }: AuthWrapperProps) {
  // If Clerk is not available, just render children (development mode)
  if (!isClerkAvailable()) {
    return <>{children}</>;
  }

  const { user, isLoaded } = useUser();
  const isSignedIn = !!user;

  if (!isLoaded) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    );
  }

  if (!isSignedIn) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground">Please sign in to continue</p>
        </div>
      )
    );
  }

  return <>{children}</>;
}

// Hook to get current user safely
export function useAuth() {
  const { user, isLoaded: userLoaded, isSignedIn } = useUser();
  const { isLoaded: authLoaded } = useClerkAuth();

  return {
    user,
    isSignedIn: isSignedIn || false,
    isLoaded: userLoaded && authLoaded,
  };
}
