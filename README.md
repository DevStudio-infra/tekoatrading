# Tekoa Trading - AI-Powered Trading Platform

A next-generation trading platform that combines artificial intelligence, automated trading bots, and advanced technical analysis to provide intelligent trading solutions.

## 🚀 Features

- **AI-Powered Analysis**: Advanced machine learning algorithms for market analysis
- **Automated Trading Bots**: Create and manage sophisticated trading bots
- **Strategy Management**: Design custom trading strategies with technical indicators
- **Portfolio Management**: Real-time portfolio tracking and P&L analysis
- **Interactive Charts**: Professional trading charts with technical indicators
- **Risk Management**: Built-in risk assessment and position sizing
- **Real-time Data**: Live market data integration

## 🏗️ Architecture

### Monorepo Structure

```
tekoa-trading/
├── backend/          # Node.js + TypeScript + tRPC + Prisma
├── frontend/         # Next.js 14 + TypeScript + Tailwind CSS
├── chart-engine/     # Python FastAPI + TA-Lib + mplfinance
└── docker-compose.yml
```

### Technology Stack

**Backend:**

- Node.js + TypeScript
- tRPC for type-safe APIs
- Prisma ORM with PostgreSQL
- LangChain + Google Gemini for AI agents
- Winston for logging

**Frontend:**

- Next.js 14 with App Router
- TypeScript + Tailwind CSS
- tRPC client for API calls
- React Query for state management

**Chart Engine:**

- Python FastAPI
- TA-Lib for technical indicators
- mplfinance for chart generation
- yfinance for market data

**Infrastructure:**

- Docker Compose for development
- PostgreSQL database
- ESLint + Prettier for code quality

## 🛠️ Installation & Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/RaphaelMalburg/TekoaTrading.git
   cd TekoaTrading
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration
   ```

4. **Start with Docker Compose**

   ```bash
   docker-compose up -d
   ```

5. **Initialize database**

   ```bash
   cd backend
   npm run db:push
   npm run seed
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - Chart Engine: http://localhost:8000

### Manual Setup (Development)

1. **Backend**

   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Frontend**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Chart Engine**
   ```bash
   cd chart-engine
   pip install -r requirements.txt
   python main.py
   ```

## 🔧 Configuration

### Environment Variables

**Backend (.env)**

```env
DATABASE_URL=postgresql://tekoa:tekoa@localhost:5432/tekoa
PORT=4000
NODE_ENV=development
GOOGLE_API_KEY=your_google_api_key_here
CHART_ENGINE_URL=http://localhost:8000
```

### Database Schema

The application uses Prisma with the following main models:

- **User**: User accounts and authentication
- **Portfolio**: User portfolios and balances
- **Bot**: Automated trading bots
- **Strategy**: Trading strategies and rules
- **Trade**: Individual trade records

## 🤖 AI Trading Agents

The platform includes several AI agents powered by Google Gemini:

1. **Technical Analysis Agent**: Analyzes market data and provides trading signals
2. **Risk Assessment Agent**: Evaluates trade risk and position sizing
3. **Trading Decision Agent**: Makes final trading decisions based on all inputs

## 📊 API Endpoints

### tRPC Routers

- **users**: User management and profiles
- **bots**: Trading bot CRUD operations
- **strategies**: Strategy management
- **ai**: AI analysis and trading decisions

### Chart Engine API

- `POST /generate-chart`: Generate trading charts with indicators
- `POST /calculate-indicator`: Calculate technical indicators
- `GET /supported-indicators`: List available indicators

## 🚀 Usage

### Creating a Trading Bot

1. Navigate to the "Trading Bots" page
2. Click "Create New Bot"
3. Configure bot settings and assign a strategy
4. Activate the bot to start automated trading

### Designing Strategies

1. Go to "Strategies" page
2. Click "Create New Strategy"
3. Set risk parameters (max risk, stop loss, take profit)
4. Select technical indicators
5. Save and assign to bots

### Viewing Charts

1. Visit the "Charts" page
2. Enter a symbol (e.g., AAPL, TSLA)
3. Select timeframe and period
4. Add technical indicators
5. Generate chart for analysis

## 🧪 Testing

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test

# Test chart engine
cd chart-engine
python -m pytest
```

## 📈 Performance

- **Backend**: Handles 1000+ concurrent requests
- **Chart Engine**: Generates charts in <2 seconds
- **AI Analysis**: Decision making in <5 seconds
- **Real-time Updates**: WebSocket support for live data

## 🔐 Security

- Input validation with Zod schemas
- SQL injection protection via Prisma
- Rate limiting on API endpoints
- Secure environment variable management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@tekoa.ai or create an issue on GitHub.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the frontend framework
- [tRPC](https://trpc.io/) for type-safe APIs
- [Prisma](https://prisma.io/) for database management
- [LangChain](https://langchain.com/) for AI agent framework
- [TA-Lib](https://ta-lib.org/) for technical analysis

---

**Built with ❤️ by the Tekoa Trading Team**
