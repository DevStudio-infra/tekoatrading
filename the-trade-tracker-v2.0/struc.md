backend/
├── api/                # API route handlers/controllers (e.g., REST endpoints)
│   ├── controllers/    # Controller files for different resources
│   └── ...             # Other API-related files
├── db/                 # Database-related files (schema, migrations, ORM setup)
│   ├── migrations/     # Migration scripts (managed by drizzle-kit)
│   ├── schema/         # Database schema definitions
│   └── ...             
├── services/           # Business logic and service classes
├── entities/           # Data models/entities (often for ORM)
├── utils/              # Utility/helper functions
├── config/             # Configuration files (environment, database, etc.)
├── scripts/            # Standalone scripts for maintenance, testing, etc.
├── tests/              # Backend tests (unit, integration)
├── index.ts            # Main entry point for the backend server
└── ...                 # Other supporting files

API Layer: Handles HTTP requests and responses, delegates to services.
Services: Encapsulate business logic, orchestrate between data access and controllers.
Entities/Models: Define data structures for ORM/database mapping.
DB: Contains schema, migrations, and ORM configuration. Uses drizzle-kit for migrations and schema management.
Config: Centralizes environment and service configuration.
Utils: Shared helper functions.
Scripts: For automation, testing, seeding, or admin tasks.

frontend/
├── public/                 # Static assets (favicon, images, etc.)
├── src/
│   ├── core/               # Core UI components (logo, theme, router, etc.)
│   ├── features/           # Feature-specific modules (grouped by domain)
│   │   ├── <feature>/      # Each feature (e.g., bots, trading, analysis)
│   │   │   ├── components/ # UI components for the feature
│   │   │   ├── hooks/      # React hooks for feature logic
│   │   │   └── ...         
│   ├── charts/             # Charting components and utilities
│   ├── common/             # Shared/reusable components
│   ├── dashboard/          # Dashboard-related components
│   ├── layout/             # Layout and navigation components
│   ├── ui/                 # UI library components (buttons, inputs, etc.)
│   ├── pages/              # Top-level pages/routes
│   ├── hooks/              # Global or shared hooks
│   ├── utils/              # Utility functions
│   ├── services/           # API clients and service logic
│   ├── types/              # TypeScript type definitions
│   └── main.tsx            # App entry point
├── package.json            # Frontend dependencies and scripts
└── ...                     # Other config files (tsconfig, vite.config, etc.)

Core: Foundational UI elements and app-wide providers.
Features: Each feature is self-contained, with its own components and hooks.
Charts: Specialized charting logic and components.
Common: Shared UI elements used across features.
Dashboard/Layout: Organize main app structure and navigation.
UI: Reusable design system components.
Pages: Route-based entry points for the app.
Hooks/Utils/Services: Shared logic, helpers, and API interaction.
Types: TypeScript interfaces and types for consistency.