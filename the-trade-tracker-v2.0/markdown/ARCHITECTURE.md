# Trade Tracker MVP Architecture

This document outlines the architecture and implementation details for the Trade Tracker MVP, an AI-powered trading automation platform.

## System Architecture

The Trade Tracker platform follows a modern, service-oriented architecture with these key components:

```
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│                     │      │                     │      │                     │
│   Next.js Frontend  │◄────►│   Express Backend   │◄────►│ PostgreSQL Database │
│                     │      │                     │      │                     │
└─────────────────────┘      └─────────────────────┘      └─────────────────────┘
          ▲                            ▲
          │                            │
          │                            ▼
          │                   ┌─────────────────────┐
          └───────────────────┤                     │
                              │  Python Chart Engine │
                              │                     │
                              └─────────────────────┘
```

### Key Components

1. **Next.js Frontend**
   - TypeScript-based React application
   - Feature-based architecture for maintainability
   - shadcn/ui component library for consistent UI
   - tRPC for type-safe API communication
   - Real-time updates via WebSockets

2. **Express Backend**
   - TypeScript-based Node.js API server
   - tRPC for type-safe API endpoints
   - JWT authentication for security
   - Service-oriented design pattern

3. **PostgreSQL Database**
   - Managed with Drizzle ORM
   - Schema-driven database design
   - Migration management with drizzle-kit

4. **Python Chart Engine**
   - Matplotlib/mplfinance for chart generation
   - FastAPI for microservice architecture
   - Technical indicator calculation
   - Candle and pattern visualization

## Feature Modules

The application is organized using a feature-based architecture:

- **Authentication & User Management**
  - JWT-based authentication
  - Role-based access control
  - User profile management

- **Broker Integration**
  - Capital.com API integration
  - Real-time account monitoring
  - Order execution

- **Chart Analysis**
  - Technical indicator processing
  - Server-side chart rendering
  - Pattern recognition

- **AI Trading Strategies**
  - Bot configuration and management
  - Strategy execution
  - Backtest capabilities

- **Credits & Monetization**
  - Stripe integration
  - Credit-based usage tracking
  - Payment processing

## Communication Flow

1. **Frontend to Backend**: Uses tRPC for type-safe communication with the Express server
2. **Backend to Database**: Uses Drizzle ORM for database operations
3. **Backend to Chart Engine**: Uses HTTP/REST for requesting chart generation
4. **Backend to Capital.com**: Uses the Capital.com REST API
5. **Real-time Updates**: Uses WebSockets for live data streaming

## Database Schema

The database uses Drizzle ORM with proper migrations following these principles:

- Always use `drizzle-kit generate` to create migration files
- Use `drizzle-kit migrate` to apply migrations
- Use `drizzle-kit push` for direct schema changes
- Use `drizzle-kit pull` to sync with external schema changes

## Chart Engine Integration

The Python chart engine will operate as a separate microservice that:

1. Receives candle data and indicator parameters from the Express backend
2. Generates charts using Matplotlib/mplfinance
3. Returns base64-encoded images or stores them for retrieval
4. Handles various chart types and technical indicators
5. Provides pattern recognition capabilities

## Implementation Plan

1. **Phase 1: Foundation**
   - Complete base architecture ✅
   - Set up authentication system
   - Implement database models

2. **Phase 2: Core Features**
   - Integrate Capital.com API
   - Build chart generation engine
   - Implement Stripe payment processing

3. **Phase 3: AI Integration**
   - Implement Gemini 2.0 integration
   - Create strategy execution engine
   - Build trading decision framework

4. **Phase 4: User Experience**
   - Refine dashboard interface
   - Implement notification system
   - Optimize for mobile responsiveness

5. **Phase 5: Launch Preparation**
   - Comprehensive testing
   - Security review
   - Production deployment preparations
