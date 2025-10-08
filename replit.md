# Overview

Blues Golf Challenge is a comprehensive Progressive Web Application (PWA) for golf scoring and handicap management. It tracks 18-hole golf rounds, automatically calculates handicaps based on official golf rules, and provides live leaderboards. The application features automated monthly handicap recalculations and a focus on providing a seamless experience for golf enthusiasts. The business vision is to provide a reliable and engaging platform for golf clubs and players to manage their scores and handicaps efficiently, fostering competitive and fair play.

# Recent Changes

## October 8, 2025 - Added Force Logout Feature for Super Admin
- **Super Admin Session Management**: Added new "User Sessions" tab in Super Admin panel to view and manage active user sessions
- **Force Logout Capability**: Super admins can now force logout users whose authentication tokens have expired, resolving 401 errors
- **Security Enhancements**:
  - Explicit super admin authorization on session management endpoints
  - Session deletion scoped to Replit auth sessions only with pre-validation
  - Audit logging for all force logout actions
- **User Experience Improvements**:
  - Confirmation dialog before forcing user logout with clear warnings
  - Persistent error UI with retry capability for session loading failures
  - Clear toast notifications for all success and error states
- **Authentication Improvements**: Enhanced middleware to automatically clear expired sessions and require re-login

## October 6, 2025 - Fixed Monthly Statistics Display & Average Formatting
- **Monthly stats now load correctly**: Fixed queryKey construction in Home.tsx - removed organizationId from array to prevent it from being appended to URL path
- **Consistent decimal formatting**: Updated both Home and History pages to display all averages with one decimal place (.toFixed(1)) instead of rounding to whole numbers
- **Formatting updates**: Applied to avg gross, avg net, avg over par, and avg DTH across monthly and cumulative stats

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client is built with React 18 and TypeScript, utilizing a component-based architecture. Styling is managed with Tailwind CSS and Shadcn UI. React Query handles server state, while Wouter provides lightweight routing. The application also supports PWA features for an installable, mobile-first experience.

## Backend Architecture
The server uses Express.js with TypeScript, following a RESTful API design. It features dedicated service layers for golf calculations, handicap management, and data import. Zod schemas are used for robust input validation.

## Database Design
PostgreSQL is the primary database, accessed via Drizzle ORM for type-safe operations. The schema includes tables for users, players, courses, holes, rounds, handicap snapshots, and season settings. Row Level Security (RLS) ensures data access control based on user roles.

## Authentication & Authorization
Authentication is handled by Replit Auth (OpenID Connect) with session storage managed by connect-pg-simple. Authorization is role-based, differentiating between regular players and administrators.

## Data Processing & Business Logic
The application accurately calculates golf scores, including per-hole double-bogey capping and gross/net scores. Monthly handicap updates are automated via cron jobs, using a weighted formula with change limits. Leaderboards rank players by lowest average over par. Slope-adjusted course handicaps are automatically calculated for rounds.

# External Dependencies

## Database
- **Neon Database**: PostgreSQL hosting.
- **Drizzle ORM**: Type-safe database operations.
- **connect-pg-simple**: PostgreSQL session store.

## Authentication
- **Replit Auth**: OpenID Connect provider.
- **Passport.js**: Authentication middleware.

## Frontend Libraries
- **React Query**: Server state management.
- **Wouter**: Client-side routing.
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **React Hook Form**: Form management.

## Backend Services
- **Express.js**: Web application framework.
- **Node-cron**: Task scheduling.
- **Zod**: Runtime type validation.
- **Resend**: Email service for notifications.

## Deployment & Infrastructure
- **Vercel**: Hosting platform.
- **Vercel Cron**: Automated task scheduling.

## Development Tools
- **Vite**: Frontend build tool.
- **TypeScript**: Static type checking.
- **ESBuild**: JavaScript bundler.