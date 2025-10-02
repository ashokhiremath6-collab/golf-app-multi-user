# Overview

Blues Golf Challenge is a comprehensive golf scoring and handicap management Progressive Web Application (PWA) that tracks 18-hole golf rounds, calculates handicaps automatically, and provides live leaderboards. The application follows official golf rules for score calculations and handicap management, featuring automated monthly handicap recalculations via cron jobs.

# Recent Changes

## October 2, 2025 - Player Organization Access Fix ✅
- **Issue**: Players (non-admins) couldn't access organization pages, seeing "No organisation found" error
- **Root Cause**: GET /api/organizations endpoint only returned organizations to super admins, excluding regular players
- **Solution**: 
  - Created new storage method `getUserAccessibleOrganizations()` that returns organizations where user is:
    1. Super admin → all organizations
    2. Organization admin → admin organizations
    3. Player → player organizations
  - Updated GET /api/organizations to use new method, removing super admin requirement
  - Players can now access and view organizations they belong to
- **Impact**: Regular players like Varun and Shivam can now access Young Turks Golf via direct link
- **Files Modified**: server/storage.ts (new method), server/routes.ts (endpoint update)

## October 2, 2025 - Production Player Profile Guardrail ✅
- **Issue**: Score submission failed in production when authenticated users didn't have player profiles in their organization
- **Solution**: Added comprehensive player profile validation and helpful error messaging
  - **Frontend Guardrail**: New Round page now detects missing player profile before submission attempt
    - Displays clear alert explaining the requirement
    - Provides differentiated instructions for admins (add yourself via Admin panel) vs regular users (contact admin)
    - Includes navigation button to Admin panel for convenience
    - Prevents confusing form interactions when profile is missing
  - **Backend Enhancement**: Updated POST /api/rounds endpoint to return structured error code `PLAYER_PROFILE_REQUIRED`
    - Enables consistent client-side error handling
    - Maintains backward compatibility with existing error message
  - **Testing**: Full data-testid coverage for alert and navigation button
- **Impact**: Users now receive immediate, actionable guidance instead of silent submission failures

## October 1, 2025 - Redesigned History Page UI ✅
- **New Design**: Completely redesigned history page to match user's screenshot with dropdown-based round selection
  - **Title**: Changed to "Player History"
  - **Player Selection**: Dropdown defaulting to "Your History" (current user's rounds)
  - **Round Selection**: Dropdown showing most recent round by default, formatted as "{Course} (Slope {n}) - {date} (Net {n})"
  - **Player Info Display**: Shows player name, handicap, and course handicap for selected round
  - **Round Info Display**: Shows course name and date in top-right corner
  - **Scorecard Table**: Compact table format showing holes 1-9 (OUT) and 10-18 (IN) with par and scores
    - Circles par scores, highlights birdies
    - Fetches actual course-specific par values from holes endpoint
    - Robust handling of missing scores with "-" placeholders
  - **Round Statistics**: Displays Round Gross, Round Net (blue), Round Over (yellow), Round DTH (color-coded)
  - **Season Averages**: Shows Rounds, Avg Gross, Avg Net (blue), Avg Over (yellow), Avg DTH (color-coded)
  - **Technical**: Fixed TDZ errors, proper score totals calculation, aligned DTH color with formatting

## October 1, 2025 - Redesigned Leaderboard UI ✅
- **New Design**: Completely redesigned leaderboard to match modern table-based layout
  - **Header**: Changed from "{Organization} Leaderboard" to "Golf Leaderboards" with dynamic season subtitle (e.g., "2024-25 Season")
  - **View History Button**: Added button in top-right to navigate to history page
  - **Simplified Tabs**: Reduced to 2 tabs - "Season Total" (Trophy icon) and "Monthly" (Calendar icon)
  - **Summary Stats Cards**: 
    - Season Total: 4 cards showing Total Rounds, Avg Net (blue), Avg Over (yellow), Avg DTH (colored)
    - Monthly: 3 cards showing Total Rounds, Avg Net (blue), Avg Over (yellow)
  - **Clean Table Layout**: 
    - Season: RANK | PLAYER | ROUNDS | AVG NET | AVG DTH | HCP
    - Monthly: RANK | PLAYER | ROUNDS | AVG NET | AVG OVER | HCP
  - **Color Coding**: AVG NET in blue, AVG DTH conditionally colored (green for negative/under, orange for positive/over)
  - **"You" Badge**: Added badge next to current user's entry in both leaderboards
  - **Loading States**: Proper skeleton loading for both season and monthly data

## October 1, 2025 - Automatic Slope-Adjusted Course Handicap ✅
- **Feature**: Backend now automatically calculates slope-adjusted course handicaps when rounds are created
  - **Formula**: Handicap Index = (Willingdon Handicap × 113) / 110, then Course Handicap = round(Handicap Index × Course Slope / 113)
  - **Example**: Player with Willingdon handicap 16 playing slope 120 course gets course handicap 17
  - **Implementation**: All 3 round creation endpoints (organization-scoped, player, admin) auto-calculate courseHandicap before score calculations
  - **Frontend**: Removed courseHandicap parameter from Admin.tsx and NewRound.tsx - backend handles calculation automatically
  - **Admin Override**: Round update endpoint still allows manual courseHandicap adjustment for historical data corrections
  - **Note**: Uses slope-only adjustment model (not full USGA WHS which includes Course Rating - Par); sufficient for current use case

## October 1, 2025 - DTH Calculation Fix ✅
- **Critical Bug Fix**: Fixed avgDTH (Average Difference To Handicap) calculation to use historical handicaps
  - **Problem**: avgDTH was incorrectly using player's current handicap, causing historical DTH values to change when handicaps were updated
  - **Solution**: Changed calculation to use `rounds.courseHandicap` (the handicap active when round was played) instead of `players.currentHandicap`
  - **Impact**: DTH values now remain stable - if a player had handicap 16 in August and played +2 over handicap, that +2 DTH remains even if their handicap changes to 17 in September
  - **Technical**: Simplified avgDTH calculation from complex CASE statement to `AVG(overPar - courseHandicap)` in all leaderboard queries

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