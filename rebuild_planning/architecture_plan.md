# Tekoa Trading - New Architecture Plan

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────────┤
│  Next.js 15 Frontend (TypeScript + Tailwind CSS + shadcn/ui)       │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  │  Pages/Routes   │ │   Components    │ │   Hooks/Utils   │       │
│  │                 │ │                 │ │                 │       │
│  │ • Dashboard     │ │ • UI Components │ │ • tRPC Hooks    │       │
│  │ • Bot Management│ │ • Charts        │ │ • State Mgmt    │       │
│  │ • Analytics     │ │ • Forms         │ │ • Utilities     │       │
│  │ • Settings      │ │ • Layouts       │ │ • Validations   │       │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘       │
│                                │                                    │
│                           tRPC Client                               │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/WebSocket
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          API LAYER                                 │
├─────────────────────────────────────────────────────────────────────┤
│  Express.js Server (TypeScript) + tRPC Router                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                       tRPC Routers                              │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │ │
│  │  │    Auth     │ │    Bots     │ │ Strategies  │ │ Analytics │ │ │
│  │  │   Router    │ │   Router    │ │   Router    │ │  Router   │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │ │
│  │  │  Trading    │ │   Market    │ │   Portfolio │ │   Charts  │ │ │
│  │  │   Router    │ │   Router    │ │   Router    │ │  Router   │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                │                                    │
│                          Middleware Layer                           │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ • Authentication (Clerk) • Rate Limiting • CORS • Validation    │ │
│  │ • Error Handling • Request Logging • Security Headers           │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│  Business Logic Services (Domain-Driven Design)                    │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  │   User Domain   │ │ Trading Domain  │ │ Analytics Domain│       │
│  │                 │ │                 │ │                 │       │
│  │ • UserService   │ │ • BotService    │ │ • MetricsService│       │
│  │ • ProfileService│ │ • StrategyService│ │ • ReportService │       │
│  │ • AuthService   │ │ • OrderService  │ │ • ExportService │       │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘       │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  │ Market Domain   │ │ AI/ML Domain    │ │ Integration     │       │
│  │                 │ │                 │ │ Domain          │       │
│  │ • MarketService │ │ • AIService     │ │ • BrokerService │       │
│  │ • ChartService  │ │ • AnalysisService│ │ • PaymentService│       │
│  │ • PriceService  │ │ • AgentService  │ │ • NotifyService │       │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MICROSERVICES LAYER                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │              PYTHON CHART GENERATION ENGINE                     │ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │ │
│  │  │   FastAPI       │ │ Chart Generator │ │ Technical       │   │ │
│  │  │   Server        │ │ Service         │ │ Indicators      │   │ │
│  │  │                 │ │                 │ │                 │   │ │
│  │  │ • REST API      │ │ • mplfinance    │ │ • RSI, MACD     │   │ │
│  │  │ • WebSocket     │ │ • matplotlib    │ │ • Bollinger     │   │ │
│  │  │ • Queue Jobs    │ │ • Plotly        │ │ • Moving Avg    │   │ │
│  │  │ • File Storage  │ │ • Chart Types   │ │ • Pattern Rec   │   │ │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       INFRASTRUCTURE LAYER                         │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  │   Database      │ │   External APIs │ │   AI Services   │       │
│  │                 │ │                 │ │                 │       │
│  │ • PostgreSQL    │ │ • Capital.com   │ │ • Google Gemini │       │
│  │ • Prisma ORM    │ │ • Stripe        │ │ • LangChain     │       │
│  │ • Fresh Schema  │ │ • Clerk Auth    │ │ • Agent Chain   │       │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘       │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  │   Caching       │ │   Message Queue │ │   File Storage  │       │
│  │                 │ │                 │ │                 │       │
│  │ • Redis         │ │ • WebSockets    │ │ • Supabase      │       │
│  │ • Query Cache   │ │ • Event Bus     │ │ • Chart Images  │       │
│  │ • Session Store │ │ • Job Queue     │ │ • Asset Storage │       │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
```

## Detailed Architecture Components

### 1. Frontend Architecture (Next.js 15)

#### Project Structure

```
src/
├── app/                          # App Router (Next.js 15)
│   ├── (auth)/                  # Auth group
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (dashboard)/             # Protected dashboard
│   │   ├── dashboard/
│   │   ├── bots/
│   │   ├── strategies/
│   │   ├── analytics/
│   │   └── settings/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/                   # Reusable UI components
│   ├── ui/                      # shadcn/ui components
│   ├── forms/                   # Form components
│   ├── charts/                  # Chart components
│   ├── layout/                  # Layout components
│   └── common/                  # Common components
├── hooks/                       # Custom React hooks
│   ├── use-trpc.ts             # tRPC hooks
│   ├── use-auth.ts             # Auth hooks
│   └── use-trading.ts          # Trading hooks
├── lib/                         # Utilities and configurations
│   ├── trpc.ts                 # tRPC client setup
│   ├── auth.ts                 # Auth configuration
│   ├── utils.ts                # Utility functions
│   └── validations.ts          # Zod schemas
├── stores/                      # State management
│   ├── auth-store.ts           # Auth state
│   ├── trading-store.ts        # Trading state
│   └── ui-store.ts            # UI state
└── types/                       # TypeScript types
    ├── auth.ts
    ├── trading.ts
    └── api.ts
```

#### Internationalization Structure

```
src/
├── messages/                    # i18n translation files
│   ├── en.json                 # English (default)
│   ├── pt.json                 # Portuguese
│   └── es.json                 # Spanish
├── middleware.ts               # i18n middleware
└── i18n.ts                     # i18n configuration
```

#### Key Frontend Features

- **Internationalization**: Built-in i18n support with next-intl
  - **English** (default/main language)
  - **Portuguese** (pt)
  - **Spanish** (es)
  - URL-based locale detection (/en, /pt, /es)
  - Automatic browser language detection
  - Dynamic locale switching
- **Type Safety**: Full TypeScript coverage with strict mode
- **Component Library**: shadcn/ui for consistent design system
- **State Management**: Zustand for client state, tRPC for server state
- **Real-time Updates**: WebSocket integration for live data
- **Responsive Design**: Mobile-first responsive design
- **Performance**: Optimized with Next.js 15 features (Turbopack, etc.)

### 2. Backend Architecture (Express + tRPC)

#### Project Structure

```
src/
├── routers/                     # tRPC routers
│   ├── auth.ts                 # Authentication routes
│   ├── bots.ts                 # Bot management routes
│   ├── strategies.ts           # Strategy routes
│   ├── trading.ts              # Trading execution routes
│   ├── market.ts               # Market data routes
│   ├── analytics.ts            # Analytics routes
│   ├── portfolio.ts            # Portfolio management
│   └── index.ts                # Router composition
├── services/                    # Business logic services
│   ├── auth/                   # Authentication services
│   ├── trading/                # Trading domain services
│   ├── market/                 # Market data services
│   ├── ai/                     # AI/ML services
│   ├── analytics/              # Analytics services
│   ├── brokers/                # Broker integration services
│   │   ├── capital.ts          # Capital.com integration
│   │   ├── base-broker.ts      # Abstract broker interface
│   │   └── broker-factory.ts   # Broker factory pattern
│   └── integrations/           # External integrations
├── middleware/                  # Express middleware
│   ├── auth.ts                 # Auth middleware
│   ├── validation.ts           # Input validation
│   ├── rate-limit.ts           # Rate limiting
│   └── error-handler.ts        # Error handling
├── lib/                        # Shared utilities
│   ├── database.ts             # Database connection
│   ├── cache.ts                # Caching utilities
│   ├── logger.ts               # Logging utilities
│   └── config.ts               # Configuration
├── types/                      # TypeScript types
│   ├── auth.ts
│   ├── trading.ts
│   ├── market.ts
│   └── api.ts
├── prisma/                     # Database schema
│   ├── schema.prisma           # Clean, lean schema
│   └── seed.ts                 # Database seeding
├── data/                       # Static data files
│   └── capital-trading-pairs.json # Capital.com trading pairs
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
└── server.ts                   # Express server setup
```

#### Key Backend Features

- **tRPC Only**: Consistent API design with type safety
- **Domain-Driven Design**: Services organized by business domain
- **Dependency Injection**: Proper service composition
- **Error Handling**: Consistent error handling patterns
- **Validation**: Input/output validation with Zod
- **Caching**: Strategic caching for performance
- **Logging**: Comprehensive logging and monitoring
- **Security**: Enterprise-grade security practices

### 3. Database Design (PostgreSQL + Prisma)

#### Core Entities

```prisma
// User management
model User {
  id          String @id @default(cuid())
  clerkId     String @unique
  email       String
  username    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  bots        Bot[]
  strategies  Strategy[]
  trades      Trade[]
  portfolio   Portfolio?
}

// Trading strategies
model Strategy {
  id              String @id @default(cuid())
  name            String
  description     String
  type            StrategyType
  configuration   Json
  userId          String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  user            User @relation(fields: [userId], references: [id])
  bots            Bot[]
}

// Trading bots
model Bot {
  id              String @id @default(cuid())
  name            String
  userId          String
  strategyId      String
  symbol          String
  timeframe       String
  isActive        Boolean @default(false)
  configuration   Json
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  user            User @relation(fields: [userId], references: [id])
  strategy        Strategy @relation(fields: [strategyId], references: [id])
  trades          Trade[]
  evaluations     Evaluation[]
}

// Trading execution
model Trade {
  id              String @id @default(cuid())
  botId           String
  userId          String
  symbol          String
  side            TradeSide
  quantity        Decimal
  entryPrice      Decimal
  exitPrice       Decimal?
  status          TradeStatus
  pnl             Decimal?
  executedAt      DateTime
  closedAt        DateTime?

  // Relations
  bot             Bot @relation(fields: [botId], references: [id])
  user            User @relation(fields: [userId], references: [id])
}
```

#### Database Features

- **Clean Schema**: Simplified, normalized database design
- **Type Safety**: Full Prisma type generation
- **Migrations**: Automatic migration management
- **Indexing**: Proper indexes for performance
- **Constraints**: Business rule enforcement at DB level
- **Audit Trail**: Comprehensive audit logging

### 4. AI Agent Architecture

#### Agent Structure

```typescript
// Base agent interface
interface TradingAgent {
  initialize(): Promise<void>;
  analyze(context: TradingContext): Promise<AgentResult>;
  cleanup(): Promise<void>;
}

// Specialized agents
class TechnicalAnalysisAgent implements TradingAgent {
  // Technical indicator analysis
}

class RiskAssessmentAgent implements TradingAgent {
  // Risk evaluation and position sizing
}

class MarketSentimentAgent implements TradingAgent {
  // Market sentiment and news analysis
}

class TradingDecisionAgent implements TradingAgent {
  // Final trading decision synthesis
}
```

#### Agent Features

- **Modular Design**: Specialized agents for different tasks
- **Professional Logic**: AI that thinks like experienced traders
- **Risk Management**: Built-in risk assessment and management
- **Multi-timeframe**: Analysis across multiple time horizons
- **Performance Tracking**: Continuous learning and improvement

### 5. Real-time System

#### WebSocket Architecture

```typescript
// WebSocket service
class WebSocketService {
  // Connection management
  // Message routing
  // Authentication
  // Error handling
  // Scalability support
}

// Event types
enum EventType {
  TRADE_EXECUTED = "trade_executed",
  BOT_STATUS_CHANGED = "bot_status_changed",
  MARKET_UPDATE = "market_update",
  PORTFOLIO_UPDATE = "portfolio_update",
}
```

#### Real-time Features

- **Connection Management**: Proper WebSocket lifecycle
- **Authentication**: Secure WebSocket connections
- **Message Queuing**: Offline message support
- **Error Recovery**: Automatic reconnection
- **Scalability**: Horizontal scaling support

### 7. Python Chart Generation Engine

#### Microservice Architecture

```python
# FastAPI Chart Generation Service
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import mplfinance as mpf
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from typing import List, Optional
import base64
import io

app = FastAPI(title="Tekoa Trading Chart Engine")

class ChartRequest(BaseModel):
    symbol: str
    timeframe: str
    ohlcv_data: List[dict]
    indicators: Optional[dict] = None
    style: str = "charles"
    chart_type: str = "candlestick"
    width: int = 1200
    height: int = 800

class ChartResponse(BaseModel):
    chart_base64: str
    chart_url: Optional[str] = None
    indicators_data: dict
    metadata: dict

@app.post("/generate-chart", response_model=ChartResponse)
async def generate_chart(request: ChartRequest):
    """Generate trading chart with technical indicators"""
    try:
        # Convert OHLCV data to DataFrame
        df = pd.DataFrame(request.ohlcv_data)
        df['datetime'] = pd.to_datetime(df['timestamp'])
        df.set_index('datetime', inplace=True)

        # Calculate technical indicators
        indicators_data = {}
        additional_plots = []

        if request.indicators:
            indicators_data = calculate_indicators(df, request.indicators)
            additional_plots = create_indicator_plots(indicators_data)

        # Generate chart
        chart_base64 = create_chart(
            df,
            request.symbol,
            request.timeframe,
            additional_plots,
            request.style,
            request.chart_type,
            (request.width, request.height)
        )

        return ChartResponse(
            chart_base64=chart_base64,
            indicators_data=indicators_data,
            metadata={
                "symbol": request.symbol,
                "timeframe": request.timeframe,
                "data_points": len(df),
                "indicators": list(request.indicators.keys()) if request.indicators else []
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

#### Chart Engine Features

- **Chart Types**: Candlestick, OHLC, Line, Area charts
- **Technical Indicators**: RSI, MACD, Bollinger Bands, Moving Averages, Stochastic
- **Pattern Recognition**: Support/Resistance, Trend Lines, Chart Patterns
- **Multi-timeframe**: Support for all major timeframes (1m to 1M)
- **Customization**: Themes, colors, annotations, overlays
- **Export Options**: PNG, SVG, Base64 encoding
- **Real-time Updates**: WebSocket support for live chart updates

#### Integration with Node.js Backend

```typescript
// Chart Service in Node.js backend
class ChartService {
  private chartEngineUrl = process.env.CHART_ENGINE_URL || "http://localhost:8001";
  private supabaseClient = createSupabaseClient();

  async generateChart(request: ChartGenerationRequest): Promise<ChartResponse> {
    try {
      // Generate chart via Python service
      const response = await fetch(`${this.chartEngineUrl}/generate-chart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const chartData = await response.json();

      // Store chart image in Supabase bucket
      const chartUrl = await this.storeChartImage(
        chartData.chart_base64,
        `${request.symbol}_${request.timeframe}_${Date.now()}.png`
      );

      return {
        ...chartData,
        chart_url: chartUrl
      };
    } catch (error) {
      throw new Error(`Chart generation failed: ${error.message}`);
    }
  }

  private async storeChartImage(base64Data: string, filename: string): Promise<string> {
    const buffer = Buffer.from(base64Data, 'base64');

    const { data, error } = await this.supabaseClient.storage
      .from('chart-images')
      .upload(filename, buffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) throw error;

    const { data: publicUrl } = this.supabaseClient.storage
      .from('chart-images')
      .getPublicUrl(filename);

    return publicUrl.publicUrl;
  }
}

      if (!response.ok) {
        throw new Error(`Chart generation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Chart generation error:", error);
      throw error;
    }
  }

  async generateMultiTimeframeChart(symbol: string, timeframes: string[]): Promise<MultiTimeframeChartResponse> {
    const charts = await Promise.all(timeframes.map((timeframe) => this.generateChart({ symbol, timeframe /* ... */ })));

    return {
      symbol,
      timeframes,
      charts: charts.map((chart, index) => ({
        timeframe: timeframes[index],
        chartBase64: chart.chart_base64,
        indicators: chart.indicators_data,
      })),
    };
  }
}
```

### 8. Broker Integration Architecture

#### Multi-Broker Structure (Extensible Design)

```typescript
// Abstract base broker interface
abstract class BaseBroker {
  abstract name: string;
  abstract authenticate(credentials: BrokerCredentials): Promise<boolean>;
  abstract getAccountInfo(): Promise<AccountInfo>;
  abstract getPositions(): Promise<Position[]>;
  abstract getTradingPairs(): Promise<TradingPair[]>;
  abstract placeTrade(order: TradeOrder): Promise<TradeResult>;
  abstract getMarketData(symbol: string): Promise<MarketData>;
  abstract validateSymbol(symbol: string): Promise<boolean>;
}

// Capital.com implementation (Initial broker)
class CapitalBroker extends BaseBroker {
  name = "Capital.com";

  async authenticate(credentials: CapitalCredentials): Promise<boolean> {
    // Capital.com specific authentication
    return true;
  }

  async getTradingPairs(): Promise<TradingPair[]> {
    // Load and return Capital.com trading pairs
    const pairs = await this.loadCapitalTradingPairs();
    return pairs.map((pair) => ({
      ...pair,
      broker: "Capital.com",
      brokerId: "capital",
    }));
  }

  private async loadCapitalTradingPairs(): Promise<CapitalTradingPair[]> {
    // Load from capital-trading-pairs.json
    const data = await fs.readFile("./data/capital-trading-pairs.json", "utf8");
    return JSON.parse(data);
  }
}

// Broker factory for extensibility
class BrokerFactory {
  private static brokers: Record<string, BaseBroker> = {
    capital: new CapitalBroker(),
    // Future brokers can be added here:
    // "binance": new BinanceBroker(),
    // "kraken": new KrakenBroker(),
  };

  static getBroker(brokerId: string): BaseBroker {
    const broker = this.brokers[brokerId];
    if (!broker) {
      throw new Error(`Broker ${brokerId} not supported`);
    }
    return broker;
  }

  static getSupportedBrokers(): string[] {
    return Object.keys(this.brokers);
  }
}
```

#### Trading Pairs Structure

```json
// capital-trading-pairs.json
{
  "broker": "Capital.com",
  "brokerId": "capital",
  "lastUpdated": "2024-01-15T10:00:00Z",
  "pairs": [
    {
      "symbol": "EURUSD",
      "name": "Euro vs US Dollar",
      "category": "forex",
      "baseAsset": "EUR",
      "quoteAsset": "USD",
      "minTradeSize": 0.01,
      "maxTradeSize": 100,
      "tickSize": 0.0001,
      "tradingHours": "24/5",
      "broker": "Capital.com",
      "brokerId": "capital"
    },
    {
      "symbol": "AAPL",
      "name": "Apple Inc",
      "category": "stocks",
      "baseAsset": "AAPL",
      "quoteAsset": "USD",
      "minTradeSize": 1,
      "maxTradeSize": 10000,
      "tickSize": 0.01,
      "tradingHours": "09:30-16:00 EST",
      "broker": "Capital.com",
      "brokerId": "capital"
    }
  ]
}
```

#### Broker Architecture Features

- **Initial Focus**: Capital.com only for MVP
- **Extensible Design**: Abstract interfaces for future broker additions
- **Broker Identification**: All trading pairs flagged with broker info
- **Centralized Management**: Factory pattern for broker instantiation
- **Validation**: Symbol validation per broker
- **Credentials Management**: Secure credential storage per broker
- **Error Handling**: Broker-specific error handling

#### Future Broker Support

The architecture is designed to easily add new brokers:

```typescript
// Example: Adding Binance support in the future
class BinanceBroker extends BaseBroker {
  name = "Binance";

  async authenticate(credentials: BinanceCredentials): Promise<boolean> {
    // Binance specific authentication
  }

  async getTradingPairs(): Promise<TradingPair[]> {
    // Binance API call to get trading pairs
    const pairs = await this.fetchBinancePairs();
    return pairs.map((pair) => ({
      ...pair,
      broker: "Binance",
      brokerId: "binance",
    }));
  }
}

// Simply register in factory
BrokerFactory.registerBroker("binance", new BinanceBroker());
```

### 9. Chart Storage & Asset Management

#### Supabase Integration

```typescript
// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Chart storage service
class ChartStorageService {
  private bucket = "chart-images";

  async uploadChart(chartData: string, filename: string): Promise<string> {
    const buffer = Buffer.from(chartData, "base64");

    const { data, error } = await supabase.storage.from(this.bucket).upload(filename, buffer, {
      contentType: "image/png",
      upsert: true,
      cacheControl: "3600", // 1 hour cache
    });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    return this.getPublicUrl(filename);
  }

  async getPublicUrl(filename: string): Promise<string> {
    const { data } = supabase.storage.from(this.bucket).getPublicUrl(filename);

    return data.publicUrl;
  }

  async deleteChart(filename: string): Promise<void> {
    const { error } = await supabase.storage.from(this.bucket).remove([filename]);

    if (error) throw new Error(`Delete failed: ${error.message}`);
  }
}
```

#### Storage Features

- **Efficient Storage**: Supabase bucket for chart images
- **CDN Integration**: Global CDN for fast image delivery
- **Automatic Optimization**: Image compression and optimization
- **URL Generation**: Public URLs for chart access
- **Cleanup**: Automatic cleanup of old charts
- **Caching**: Browser and CDN caching for performance

### 10. Unified Database Schema (Lean & Efficient)

#### Clean Prisma Schema

```prisma
// schema.prisma - Lean and efficient design
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Core user management
model User {
  id        String @id @default(cuid())
  clerkId   String @unique
  email     String @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  bots                Bot[]
  trades              Trade[]
  brokerCredentials   BrokerCredential[]

  @@map("users")
}

// Broker credentials (multi-broker support)
model BrokerCredential {
  id        String @id @default(cuid())
  userId    String
  broker    String // "capital", "binance", etc.
  apiKey    String
  apiSecret String
  isActive  Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  bots Bot[]

  @@unique([userId, broker])
  @@map("broker_credentials")
}

// Trading bots
model Bot {
  id                    String @id @default(cuid())
  userId                String
  name                  String
  symbol                String
  broker                String // "capital", "binance", etc.
  brokerCredentialId    String
  strategy              Json
  riskSettings          Json
  isActive              Boolean @default(false)
  balance               Decimal @default(0)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  // Relations
  user              User @relation(fields: [userId], references: [id], onDelete: Cascade)
  brokerCredential  BrokerCredential @relation(fields: [brokerCredentialId], references: [id])
  trades            Trade[]
  evaluations       BotEvaluation[]

  @@map("bots")
}

// Trading execution records
model Trade {
  id          String @id @default(cuid())
  botId       String
  userId      String
  symbol      String
  side        String // "buy" | "sell"
  quantity    Decimal
  entryPrice  Decimal
  exitPrice   Decimal?
  status      String // "open" | "closed" | "cancelled"
  pnl         Decimal?
  executedAt  DateTime @default(now())
  closedAt    DateTime?

  // Relations
  bot  Bot @relation(fields: [botId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("trades")
}

// Bot performance evaluations
model BotEvaluation {
  id          String @id @default(cuid())
  botId       String
  chartUrl    String? // Supabase URL for chart image
  analysis    Json
  score       Decimal
  evaluatedAt DateTime @default(now())

  // Relations
  bot Bot @relation(fields: [botId], references: [id], onDelete: Cascade)

  @@map("bot_evaluations")
}
```

#### Database Design Principles

- **Lean Schema**: Only essential fields, no unused columns
- **Proper Relations**: Cascade deletes and foreign keys
- **Broker Flexibility**: Support for multiple brokers via broker field
- **JSON Fields**: Flexible storage for strategy and settings
- **Efficient Indexing**: Proper indexes on frequently queried fields
- **Type Safety**: Full Prisma type generation
- **Audit Trail**: Created/updated timestamps where needed

## Key Architectural Principles

### 1. Type Safety

- **End-to-End**: TypeScript throughout the stack
- **tRPC**: Type-safe API contracts
- **Zod**: Runtime validation matching types
- **Prisma**: Type-safe database queries

### 2. Separation of Concerns

- **Presentation Layer**: UI components and layouts
- **API Layer**: tRPC routers and middleware
- **Business Logic**: Domain services
- **Data Layer**: Database and external APIs

### 3. Scalability

- **Horizontal Scaling**: Stateless services
- **Caching Strategy**: Multi-level caching
- **Database Optimization**: Proper indexing and queries
- **Resource Management**: Efficient resource utilization

### 4. Security

- **Authentication**: Clerk integration
- **Authorization**: Role-based access control
- **Data Protection**: Encryption at rest and in transit
- **Input Validation**: Comprehensive validation
- **Audit Logging**: Security event tracking

### 5. Maintainability

- **Clean Code**: SOLID principles
- **Documentation**: Comprehensive code documentation
- **Testing**: High test coverage
- **Monitoring**: Application performance monitoring
- **Deployment**: Automated CI/CD pipeline

This architecture provides a solid foundation for building a scalable, maintainable, and professional trading platform that can grow with the business needs.
