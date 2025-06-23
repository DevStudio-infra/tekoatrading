/**
 * Development authentication utilities
 * IMPORTANT: These should only be used in development mode
 * In production, auth tokens should come from a proper authentication flow
 */

// Default test user for development
const DEV_USER = {
  id: 1,
  userId: 1,
  email: 'dev@example.com',
  // Add a fake expiration 24 hours from now
  exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
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
  if (typeof window === 'undefined') {
    // Don't run during server-side rendering
    return;
  }
  
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Dev auth tokens should not be used in production!');
    return;
  }
  
  // Temporarily bypass existing token check to force regeneration for debugging
  // const existingToken = localStorage.getItem('authToken');
  // if (!existingToken) {
  try {
    console.info('[DEV] Forcing creation/re-creation of development authentication token for debugging.');
    
    // Create a base64 encoded token that the backend can validate
    const devToken = createDevToken();
    
    // Store the token
    localStorage.setItem('authToken', devToken);
    console.info('[DEV] Development token created/re-created successfully.');
  } catch (error) {
    console.error('[DEV] Error creating/re-creating development token:', error);
  }
  // }
}

// Export alias for better naming consistency
export const createDevAuthToken = ensureDevAuthToken;
