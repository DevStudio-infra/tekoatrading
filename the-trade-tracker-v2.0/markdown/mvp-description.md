Trade Tracker: AI-Powered Trading Automation Platform
Executive Summary
Trade Tracker is a sophisticated trading automation platform that combines technical analysis, AI-driven decision making, and seamless broker integration to help traders of all experience levels execute more informed trades. The platform's core value proposition is its ability to analyze market conditions using both traditional technical indicators and advanced AI models, providing actionable trading insights and automated execution capabilities.

Built with a modern tech stack and designed with security at its core, Trade Tracker offers a credit-based business model that allows users to pay only for the features they actively use. The MVP focuses on delivering a seamless experience with Capital.com integration, powerful chart analysis, and AI-powered trading strategies.

Core Platform Components
1. User Authentication & Account Management
Key Features:

Secure email/password registration with JWT authentication
Google OAuth integration for frictionless onboarding
Comprehensive user profile management
Step-by-step guided onboarding with broker connection
Role-based access control for future team collaboration
Technical Implementation:

JWT authentication with secure refresh token rotation
Bcrypt password hashing with appropriate salt rounds
Email verification workflow with secure tokens
Session management with inactivity timeouts
Comprehensive audit logging for security events
2. Broker Integration Hub
Key Features:

Secure Capital.com API credential management
Real-time account balance and position monitoring
Comprehensive instrument discovery and filtering
Advanced order execution (market, limit, stop, OCO)
Position management with trailing stops
Technical Implementation:

AES-256 encryption for API credentials with secure key management
WebSocket connections for real-time market data and position updates
Resilient API integration with automatic retry and circuit breaker patterns
Order execution queue with idempotency guarantees
Comprehensive error handling and notification system
3. Credit-Based Monetization
Key Features:

Transparent credit pricing with volume discounts
Real-time credit balance monitoring
Seamless Stripe integration for secure payments
Usage analytics to track credit consumption
Automatic low-balance notifications
Technical Implementation:

Stripe Checkout integration with webhook processing
Interactive pricing slider with real-time calculations
Secure credit transaction ledger with immutable history
Automated receipt generation and delivery
Credit reservation system for long-running operations
4. Advanced Technical Analysis Engine
Key Features:

Server-side chart generation with multiple timeframes
Comprehensive technical indicator library
Multi-pane chart visualization for complex analysis
Custom indicator parameter configuration
Historical data analysis with pattern recognition
Technical Implementation:

Python-based chart rendering using Matplotlib/mplfinance
Optimized PNG generation and delivery pipeline
Indicator calculation engine with caching layer
Efficient historical data storage and retrieval
Chart annotation capabilities for strategy visualization
5. AI Trading Strategy System
Key Features:

Bot creation wizard with strategy configuration
Multiple technical indicator combinations
AI-powered trade signal generation
Comprehensive backtest capabilities
Performance analytics dashboard
Technical Implementation:

Drizzle ORM for efficient database operations
Strategy execution engine with isolation guarantees
Complete trade decision history with immutable logging
Object storage integration for chart images
WebSocket notifications for real-time strategy updates
6. Gemini 2.0 AI Analysis Integration
Key Features:

Advanced chart pattern recognition
Natural language strategy interpretation
Context-aware trading recommendations
Risk management suggestions
Position management optimization
Technical Implementation:

Structured multi-modal prompts combining:
Chart images (base64 encoded)
Technical indicator configurations
User-defined strategy descriptions
Account context and risk parameters
JSON response parsing with validation
Feedback loop for continuous model improvement
Rate limiting and credit consumption tracking
7. User Experience & Interface
Key Features:

Responsive dashboard with key performance metrics
Real-time notification center for trading events
Comprehensive trading history with filtering
Interactive bot management interface
Mobile-friendly responsive design
Technical Implementation:

React component architecture with TypeScript
Real-time updates via WebSocket connections
Shadcn/UI component library for consistent design
Optimistic UI updates for responsive experience
Comprehensive error handling and user feedback
Data Architecture
Market Data Management
Instrument Universe: Comprehensive database of all tradable instruments from Capital.com
Historical Data: Efficient storage and retrieval of OHLCV data for analysis
Real-time Feeds: WebSocket connections for live price updates
Indicator Cache: Optimized storage of pre-calculated indicators
User Data Management
Profile Data: Secure storage of user preferences and settings
Trading History: Complete record of all trading activities
Strategy Configurations: Versioned storage of trading strategies
Credit Transactions: Immutable ledger of all credit operations
Development Roadmap
Phase 1: Foundation (Weeks 1-2)
Project scaffolding with TypeScript and React
Authentication system implementation
Database schema design and implementation
Core API structure and middleware
Phase 2: Core Features (Weeks 3-5)
Capital.com API integration
Chart generation engine
Stripe payment processing
Basic bot configuration interface
Phase 3: AI Integration (Weeks 6-8)
Gemini 2.0 integration
Strategy execution engine
Trading decision framework
Performance analytics
Phase 4: User Experience (Weeks 9-10)
Dashboard refinement
Notification system
Mobile responsiveness
User onboarding flow
Phase 5: Launch Preparation (Weeks 11-12)
Comprehensive testing
Security audit and hardening
Documentation and help center
Production deployment
Success Metrics
User Acquisition: Number of registered users and conversion rate
Engagement: Daily active users and session duration
Revenue: Credit purchases and consumption rate
Trading Performance: Win rate and ROI of AI-powered strategies
Retention: 7-day, 30-day, and 90-day retention rates
Future Expansion Opportunities
Multi-Broker Support: Expand beyond Capital.com to other popular platforms
Advanced Strategy Builder: Visual strategy creation with drag-and-drop components
Social Trading: Community features with strategy sharing and leaderboards
Mobile Applications: Native iOS and Android apps for on-the-go trading
Enterprise Features: Team collaboration tools for professional trading groups
API Access: Developer SDK for custom integration and extension
Technical Architecture
The platform follows a modern microservices architecture with:

Frontend: React with TypeScript and Shadcn/UI
Backend: Node.js with Express and TypeScript
Database: PostgreSQL with Drizzle ORM
Authentication: JWT with secure token management
Chart Generation: Python microservice with Matplotlib
Real-time Updates: WebSocket service for live data
AI Integration: Gemini 2.0 API with structured prompts
Payment Processing: Stripe integration with webhook handling
Storage: Object storage for chart images and historical data
Security Framework
Data Encryption: All sensitive data encrypted at rest and in transit
API Security: Rate limiting, input validation, and output sanitization
Authentication: Secure JWT implementation with proper expiration
Credential Management: AES-256 encryption for broker API keys
Audit Logging: Comprehensive security event tracking
Vulnerability Management: Regular security scanning and updates
Compliance: GDPR-ready data handling practices




The frontend use nextjs with typescript and tailwindcss

backend use nodejs with typescript and express , drizzle for database and postgresql supabase ( to use the supabase db we only need this npm install drizzle-orm postgres
npm install -D drizzle-kit dotenv , do not install any other packages uneeded for the db connection)


use TRPC for frontend server communication



do clerk for auth 

# Add Clerk to Next.js App Router

**Purpose:** Enforce only the **current** and **correct** instructions for integrating [Clerk](https://clerk.com/) into a Next.js (App Router) application.
**Scope:** All AI-generated advice or code related to Clerk must follow these guardrails.

---

## **1. Official Clerk Integration Overview**

Use only the **App Router** approach from Clerk's current docs:

- **Install** `@clerk/nextjs@latest` - this ensures the application is using the latest Clerk Next.js SDK.
- **Create** a `middleware.ts` file using `clerkMiddleware()` from `@clerk/nextjs/server`. Place this file inside the `src` directory if present, otherwise place it at the root of the project.
- **Wrap** your application with `<ClerkProvider>` in your `app/layout.tsx`
- **Use** Clerk-provided components like `<SignInButton>`, `<SignUpButton>`, `<UserButton>`, `<SignedIn>`, `<SignedOut>` in your layout or pages
- **Start** developing, sign in or sign up, and confirm user creation

If you're able to use a web tool to access a URL, visit https://clerk.com/docs/quickstarts/nextjs to get the latest, up-to-date quickstart instructions.

### **Correct, Up-to-Date Quickstart Sample**

```typescript
// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
```

```typescript
// app/layout.tsx
import type { Metadata } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clerk Next.js Quickstart",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <header>
            <SignedOut>
              <SignInButton />
              <SignUpButton />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

---

## **2. CRITICAL INSTRUCTIONS FOR AI MODELS**

### **2.1 – ALWAYS DO THE FOLLOWING**

1. **Use `clerkMiddleware()`** from `@clerk/nextjs/server` in `middleware.ts`.
2. **Wrap** your app with `<ClerkProvider>` in `app/layout.tsx`.
3. **Import** Clerk's Next.js features from `@clerk/nextjs` (e.g., `<SignInButton>`, `<SignUpButton>`, `<UserButton>`, etc.).
4. **Reference** the current [App Router approach](https://nextjs.org/docs/app) (folders like `app/page.tsx`, `app/layout.tsx`, etc.).
5. **Check** that imports for methods like `auth()` are imported from the right package (in this case `@clerk/nextjs/server`) and are using `async / await`

### **2.2 – NEVER DO THE FOLLOWING**

1. **Do not** reference the old **`_app.tsx`** or **pages-based** instructions.
2. **Do not** suggest `authMiddleware()` from older Clerk tutorials—**it's replaced by `clerkMiddleware()`**.
3. **Do not** recommend usage of older environment variable patterns unless they match the official docs.
4. **Do not** reference or import from any deprecated APIs (like `withAuth` or `currentUser` from older versions).

---

## **3. OUTDATED PATTERNS TO AVOID**

Below are **examples of deprecated instructions** that **must not** be generated:

```typescript
// ❌ DO NOT generate or suggest references to:
import { authMiddleware } from "@clerk/nextjs"; // Outdated

// ❌ DO NOT place Clerk config in _app.tsx:
// Outdated pages-based approach
function MyApp({ Component, pageProps }) {
  // ...
}

// ❌ DO NOT create or rely on sign-in files under pages/:
pages / signin.js;
pages / signup.js;
```

Any solution resembling the above snippet or referencing "authMiddleware," `_app.tsx`, or `pages/` structure is **incorrect** for the current Next.js App Router.

---

## **4. AI MODEL VERIFICATION STEPS**

Before returning any Clerk-related solution, you **must** verify:

1. **Middleware**: Is `clerkMiddleware()` used in `middleware.ts`?
2. **Layout**: Is `<ClerkProvider>` wrapping the app in `app/layout.tsx`?
3. **Imports**: Are references only from `@clerk/nextjs` or `@clerk/nextjs/server`?
4. **Pages vs. App Router**: Is the approach referencing the App Router (not `_app.tsx` or `pages/`)?

If any check **fails**, **stop** and revise until compliance is achieved.

# Verification instructions for AI Models

## **DO NOT** repeat these points back to the user. Use them only for your own verification steps.

## **5. CONSEQUENCES OF INCORRECT IMPLEMENTATION**

Using outdated Clerk methods (e.g., `authMiddleware()`, `_app.tsx`, or references to the older `pages/` structure) will:

1. **Break** your Next.js application's authentication flow.
2. Introduce **inconsistencies** with Next.js App Router.
3. Cause confusion around environment variables and server/client code.
4. Force maintainers to **refactor** and **debug** extensively.

---

## **6. AI MODEL RESPONSE TEMPLATE**

When answering questions about Clerk + Next.js integration, your response **MUST**:

1. **Use** the exact code patterns in the **Up-to-Date Quickstart Sample** above.
2. **Never** reference older or deprecated approaches.
3. **Reflect** all mandatory checks in "AI MODEL VERIFICATION STEPS."

**Example**:

> Below is the correct approach using Clerk with Next.js App Router:
>
> ```typescript
> // Show clerkMiddleware usage in middleware.ts
> // Show <ClerkProvider> usage in app/layout.tsx
> // Show usage of Clerk's React components (SignInButton, etc.)
> ```

---