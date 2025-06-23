/**
 * Development authentication utilities
 * IMPORTANT: These should only be used in development mode
 * In production, auth tokens should come from a proper authentication flow
 */

// Default test user for development
const DEV_USER = {
  id: "demo-user-123",
  userId: "demo-user-123",
  email: "dev@tekoatrading.com",
  firstName: "Demo",
  lastName: "User",
  // Add a fake expiration 24 hours from now
  exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
};

/**
 * Creates a Base64 encoded token that the backend can verify in development mode
 */
function createDevToken() {
  return btoa(JSON.stringify(DEV_USER));
}

/**
 * Ensures a development auth token is present in localStorage
 * Only for use in development environments
 */
export function ensureDevAuthToken(): void {
  if (typeof window === "undefined") {
    // Don't run during server-side rendering
    return;
  }

  if (process.env.NODE_ENV !== "development") {
    console.warn("Dev auth tokens should not be used in production!");
    return;
  }

  try {
    console.info("[DEV] Creating development authentication token for Tekoa Trading.");

    // Create a base64 encoded token that the backend can validate
    const devToken = createDevToken();

    // Store the token
    localStorage.setItem("authToken", devToken);
    console.info("[DEV] Development token created successfully.");
  } catch (error) {
    console.error("[DEV] Error creating development token:", error);
  }
}

/**
 * Gets the current user ID from the dev token or Clerk
 */
export function getCurrentUserId(): string {
  if (typeof window === "undefined") {
    return DEV_USER.userId;
  }

  if (process.env.NODE_ENV === "development") {
    return DEV_USER.userId;
  }

  // In production, this would come from Clerk
  return DEV_USER.userId;
}

// Export alias for better naming consistency
export const createDevAuthToken = ensureDevAuthToken;
