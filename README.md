# Blues Golf Challenge

A comprehensive golf scoring and handicap management Progressive Web Application (PWA) built with React, Express.js, and PostgreSQL.

## 🏌️ Features

- **18-hole Golf Round Entry**: Complete score tracking with automatic double-bogey capping
- **Real-time Handicap Calculations**: Follows exact golf rules with ±2 monthly adjustments
- **Live Leaderboards**: Ranking by lowest Average Over Par for the season
- **Admin Dashboard**: Player/course management, historical data import, handicap recalculation
- **Score History**: Detailed round-by-round analysis with expandable hole-by-hole breakdowns
- **Monthly Automation**: Automated handicap recalculation via cron jobs
- **PWA Support**: Mobile-first design with offline capabilities
- **WhatsApp Integration**: Share monthly summaries via URL schemes

## 🚀 Tech Stack

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS + Shadcn UI components
- React Query for state management
- Wouter for routing
- PWA service worker

**Backend:**
- Express.js with TypeScript
- PostgreSQL with Drizzle ORM
- Replit Auth (OpenID Connect)
- Node-cron for scheduling
- Zod for validation

**Infrastructure:**
- Vercel deployment with cron jobs
- Session storage with connect-pg-simple
- Row Level Security (RLS) policies

## 📋 Golf Rules Implementation

### Scoring Calculations
- **Per-hole Cap**: `min(raw_score, par + 2)` (double bogey maximum)
- **Gross (Capped)**: Sum of all capped hole scores
- **Net Score**: `Gross (capped) - Course Handicap`
- **Over Par**: `Gross (capped) - Course Par Total`

### Monthly Handicap Updates
- Runs automatically on the 1st of each month at 00:00 UTC
- Formula: `new_handicap = 0.5 * avg_monthly_over_par + 0.5 * previous_handicap`
- Change limited to ±2 per month
- Floored at 0, rounded to nearest integer
- No rounds in month = carry forward previous handicap

### Leaderboard Ranking
1. Lowest Average Over Par (primary)
2. Most recent better Over Par score (tie-breaker)
3. Total rounds played (secondary tie-breaker)

## 🏗️ Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Replit account (for authentication)

### Local Development

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd blues-golf-challenge
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your database and auth credentials
   ```

3. **Database Setup**
   ```bash
   # Push schema to database
   npm run db:push
   
   # Seed initial data
   curl -X POST http://localhost:5000/api/seed
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   Application will be available at `http://localhost:5000`

### Production Deployment

1. **Vercel Deployment**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   ```

2. **Environment Variables**
   Set these in your Vercel dashboard:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `AUTH_WHITELIST`
   - `REPL_ID`
   - `REPLIT_DOMAINS`

3. **Database Migration**
   ```bash
   # Run once after deployment
   npm run db:push
   ```

## 📊 Data Management

### Initial Data (Seed)
```bash
# Creates default players and courses
curl -X POST https://your-domain.com/api/seed
