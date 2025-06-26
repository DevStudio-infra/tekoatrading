/**
 * Development authentication utilities for when Clerk is not configured
 * IMPORTANT: These should only be used in development mode
 */

"use client";

import { useState, useEffect } from "react";

interface DevUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: Array<{ emailAddress: string }>;
  imageUrl: string | null;
}

export const DEV_USER_ID = "dev_user_123";
export const DEV_AUTH_TOKEN = "dev-token-12345";

export function getCurrentUserId(): string {
  return DEV_USER_ID;
}

export function ensureDevAuthToken(): void {
  if (typeof window !== "undefined") {
    if (!localStorage.getItem("authToken")) {
      localStorage.setItem("authToken", DEV_AUTH_TOKEN);
    }
  }
}

// Mock Clerk user for development
export function getMockUser() {
  return {
    id: DEV_USER_ID,
    firstName: "Dev",
    lastName: "User",
    emailAddresses: [{ emailAddress: "dev@example.com" }],
  };
}

// Hook to replace useUser from Clerk in development
export function useDevUser() {
  const [user, setUser] = useState<DevUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setUser({
        id: "dev_user_123",
        firstName: "Trading",
        lastName: "Demo",
        emailAddresses: [{ emailAddress: "demo@tekoa.trading" }],
        imageUrl: null,
      });
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return { user, isLoaded };
}

// Export alias for compatibility
export const createDevAuthToken = ensureDevAuthToken;
