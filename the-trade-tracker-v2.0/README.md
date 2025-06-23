# Trade Tracker: AI-Powered Trading Automation Platform

## Project Structure

This project follows a monorepo structure with separate backend and frontend directories:

```
trade-tracker-v2.0/
├── backend/             # Express.js API server with TypeScript
│   ├── api/             # API routes and controllers
│   ├── db/              # Database schema and migrations (Drizzle ORM)
│   ├── services/        # Business logic
│   ├── entities/        # Data models
│   └── ...
├── frontend/            # Next.js application with TypeScript
│   ├── src/
│   │   ├── app/         # Next.js App Router pages
│   │   ├── components/  # Shared UI components (shadcn/ui)
│   │   ├── features/    # Feature-based organization
│   │   └── ...
```

## Tech Stack

### Backend
- Node.js with Express
- TypeScript
- PostgreSQL with Drizzle ORM
- JWT Authentication

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui component library

## Getting Started

### Quick Start (Both Frontend and Backend)

You can now run both the frontend and backend with a single command from the root directory:

#### Using the Command Script (Windows)

```
.\start-app.cmd
```

#### Using PowerShell Script

```
.\start-app.ps1
```
This PowerShell script provides interactive options for database migration tasks, allowing you to choose which drizzle-kit commands to run before starting the application.

#### Using NPM

```
npm install   # Only needed the first time to install concurrently
npm run dev   # Runs both frontend and backend in development mode
```

### Manual Setup

#### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

4. Configure your database connection in the `.env` file.

5. Generate database migrations using Drizzle:
   ```
   npm run db:generate
   ```

6. Push schema changes to the database:
   ```
   npm run db:push
   ```

7. Start the development server:
   ```
   npm run start
   ```

#### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Management

This project uses Drizzle ORM for database operations. The following commands are available:

- `npm run db:generate` - Generate migration files based on schema changes
- `npm run db:migrate` - Apply migrations to the database
- `npm run db:push` - Push schema changes directly to the database
- `npm run db:pull` - Pull database schema changes back to code
- `npm run db:studio` - Open Drizzle Studio for visual database management
