# ClickUp to Gusto Connector

## Overview

A full-stack web application that synchronizes time tracking data between ClickUp and Gusto for automated payroll processing. The system provides a dashboard for monitoring sync jobs, viewing time entries, configuring API connections, and managing mapping rules that determine how ClickUp tasks are categorized for QuickBooks job costing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build Tools**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR and optimized production builds
- Wouter for lightweight client-side routing instead of React Router

**UI Framework**
- shadcn/ui component library built on Radix UI primitives for accessible, customizable components
- Tailwind CSS v4 (using @tailwindcss/vite plugin) for utility-first styling with custom design tokens
- New York style variant with custom color scheme (primary blue, neutral grays)

**State Management**
- TanStack Query (React Query) for server state management, caching, and data fetching
- No global client state library - relies on server state and local component state

**Component Organization**
- Page components in `client/src/pages/` (Dashboard, TimeEntries, Logs, Settings)
- Shared Layout component with sidebar navigation
- UI components follow shadcn/ui pattern with TypeScript and Radix UI composition
- Custom hooks for mobile detection and toast notifications

### Backend Architecture

**Runtime & Framework**
- Node.js with Express.js for HTTP server
- TypeScript with ES modules throughout
- HTTP server created separately to support potential WebSocket upgrades

**API Design**
- RESTful API endpoints under `/api` prefix
- Configuration management (GET/POST `/api/configuration`)
- Mapping rules CRUD operations
- Sync logs retrieval and manual sync triggering
- ClickUp integration endpoints (teams, time entries)

**Development vs Production**
- Development: Vite dev server integrated as Express middleware with HMR
- Production: Pre-built static assets served from `dist/public`
- Environment-aware logging with timestamps and source tracking

### Data Storage

**Database**
- PostgreSQL as the primary database
- Drizzle ORM for type-safe database queries and migrations
- Connection pooling via `pg` library's Pool
- Database schema defined in `shared/schema.ts` for code sharing between client and server

**Schema Design**
- `users` table: Basic authentication (username/password)
- `configurations` table: Single-row config store for sync settings (team ID, Gusto tokens, QuickBooks connection status, sync frequency/time). Note: ClickUp API key is stored as an environment secret (`CLICKUP_API_KEY`), not in the database.
- `mappingRules` table: Pattern-based rules for matching ClickUp tasks to QuickBooks jobs (supports pattern matching with priority ordering)
- `syncLogs` table: Audit trail of sync operations with status, timestamps, and record counts

**Data Access Layer**
- `DatabaseStorage` class implements `IStorage` interface for abstraction
- Direct Drizzle queries in storage layer
- Type-safe operations using Drizzle's schema inference

### External Dependencies

**ClickUp Integration**
- REST API v2 integration (`https://api.clickup.com/api/v2`)
- API key authentication via Authorization header
- Services: Team listing, time entry retrieval (7-day lookback)
- Custom service class (`ClickUpService`) handles API requests and data transformation
- Time entry matching against mapping rules using pattern matching logic

**Gusto Integration**
- OAuth 2.0 access token stored in configuration
- Company ID required for API operations
- Integration prepared but implementation details not fully visible in codebase

**QuickBooks Integration**
- Connection status tracked as boolean flag
- Job costing system integrated via mapping rules
- Actual QuickBooks API integration details not visible in current codebase

**Third-Party Services**
- Replit-specific plugins for development (cartographer, dev banner, runtime error modal)
- Custom Vite plugin for OpenGraph image meta tag updates based on deployment URL

### Build & Deployment

**Build Process**
- Custom build script (`script/build.ts`) using esbuild and Vite
- Client: Vite production build to `dist/public`
- Server: esbuild bundles to `dist/index.cjs` with selective dependency bundling
- Allowlist approach: Common dependencies bundled to reduce syscalls and improve cold start times

**Environment Configuration**
- `DATABASE_URL` required for PostgreSQL connection
- `CLICKUP_API_KEY` required for ClickUp API access (stored as environment secret, not in database)
- Development mode uses tsx for TypeScript execution
- Production mode runs compiled JavaScript with NODE_ENV check
- Drizzle migrations via `db:push` script

**Session Management**
- Session storage configured (connect-pg-simple for PostgreSQL-backed sessions visible in dependencies)
- Authentication layer prepared but implementation not fully visible