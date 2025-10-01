# Overview

Blues Golf Challenge is a comprehensive golf scoring and handicap management Progressive Web Application (PWA) that tracks 18-hole golf rounds, calculates handicaps automatically, and provides live leaderboards. The application follows official golf rules for score calculations and handicap management, featuring automated monthly handicap recalculations via cron jobs.

# Recent Changes

## October 1, 2025 - Test Round Scorecard Entry ✅
- **Scorecard Dialog**: Replaced automatic test round generation with interactive scorecard form
  - Opens dialog with player selection, course selection, and date picker
  - 18-hole score entry grid with real-time total strokes calculation
  - Comprehensive validation: ensures 18 holes, scores 1-10, all fields required
  - Dialog closes only on successful submission, stays open on errors
  - Submit button disabled during creation to prevent duplicate submissions
  - Full data-testid coverage for testing: select-scorecard-player, select-scorecard-course, input-scorecard-date, input-hole-1 through input-hole-18, text-total-strokes, button-submit-scorecard, button-cancel-scorecard

## October 1, 2025 - Leaderboard & Admin Enhancements ✅
- **Leaderboard Fix**: Fixed critical "overPar.toFixed is not a function" error caused by API returning Decimal values as strings
  - Added type coercion in formatOverPar() function to safely handle string/number values
  - Fixed monthly leaderboard aggregation bug that caused string concatenation instead of numeric addition
  - Monthly averages now calculate correctly using proper arithmetic
- **Admin Handicap Editing**: Added ability for admins to manually set and edit player handicaps
  - New Edit button in Handicaps tab opens dialog for handicap entry
  - Validation enforces 0-54 range or blank (null) values
  - Uses organization-scoped PATCH endpoint with proper cache invalidation
  - Dialog includes data-testid attributes for testing

## September 25, 2025 - Organization Tabs Fixed ✅
- **Issue**: Organization tabs (Leaderboard, History, Handicaps, New Round, Admin) were showing blank screens due to calling incorrect API endpoints. Player name displayed user's name instead of organization player name. Super Admin tab appeared inappropriately in organization context.
- **Resolution**: Comprehensive frontend fixes to use organization-scoped endpoints throughout the application
- **Status**: ✅ All issues resolved - organization tabs fully operational
- **Technical Details**: 
  - Navigation component: Uses organization-scoped player data, shows correct player names, hides Super Admin tab in organization context
  - All organization pages: Updated to use organization-scoped API endpoints with proper authentication
  - Cache invalidation: Fixed to maintain organization data isolation
  - Admin page: Handles both global and organization contexts appropriately

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client is built with React 18 and TypeScript, using a modern component-based architecture. The UI is styled with Tailwind CSS and Shadcn UI components for consistent design. State management is handled through React Query for server state and local React state for component-specific data. Routing is implemented with Wouter for a lightweight solution.

## Backend Architecture
The server runs on Express.js with TypeScript, following a RESTful API design. The architecture separates concerns with dedicated service layers for golf calculations, handicap management, and data import functionality. Route handlers are organized by feature, with proper validation using Zod schemas.

## Database Design
PostgreSQL serves as the primary database with Drizzle ORM providing type-safe database operations. The schema includes tables for users, players, courses, holes, rounds, handicap snapshots, and season settings. Row Level Security (RLS) policies control data access based on user roles.

## Authentication & Authorization
Replit Auth (OpenID Connect) handles user authentication with session storage using connect-pg-simple. Authorization is role-based, distinguishing between regular players and administrators. Session management includes automatic token refresh and secure cookie handling.

## Data Processing & Business Logic
Golf score calculations follow exact rules: per-hole double-bogey capping, gross/net score computation, and over-par calculations. Monthly handicap updates use a weighted formula with change limits and are automated via cron jobs. The leaderboard ranks players by lowest average over par for the season.

## PWA Features
The application includes service worker functionality for offline capabilities and mobile-first responsive design. It supports installation as a native app experience on mobile devices.

## Build & Development
Vite serves as the build tool for fast development and optimized production builds. The project uses TypeScript throughout with strict type checking. Path aliases simplify imports across the codebase.

# External Dependencies

## Database
- **Neon Database**: PostgreSQL hosting with serverless capabilities
- **Drizzle ORM**: Type-safe database operations and migrations
- **connect-pg-simple**: PostgreSQL session store for Express sessions

## Authentication
- **Replit Auth**: OpenID Connect authentication provider
- **Passport.js**: Authentication middleware with OpenID strategy

## Frontend Libraries
- **React Query**: Server state management and caching
- **Wouter**: Lightweight client-side routing
- **Radix UI**: Accessible component primitives via Shadcn
- **Tailwind CSS**: Utility-first CSS framework
- **React Hook Form**: Form state management and validation

## Backend Services
- **Express.js**: Web application framework
- **Node-cron**: Task scheduling for monthly handicap updates
- **Zod**: Runtime type validation and schema definitions

## Deployment & Infrastructure
- **Vercel**: Hosting platform with cron job support
- **Vercel Cron**: Automated monthly handicap recalculation scheduling

## Development Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Static type checking
- **ESBuild**: JavaScript bundler for production builds