# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `yarn dev` - Start development server with Turbopack (http://localhost:3000)
- `yarn build` - Build production application  
- `yarn start` - Start production server
- `yarn lint` - Run ESLint checks
- `vitest` - Run tests (testing framework configured)

## Architecture Overview

This is a Next.js 15 schedule coordination service using the App Router architecture with JWT-based authentication.

### Authentication System
- **JWT tokens** with 7-day expiration stored in localStorage
- **bcryptjs** password hashing with 10 salt rounds
- **In-memory user storage** (not persistent - development only)
- **AuthContext** manages authentication state across the application

### Key Authentication Flow
1. User registers/logs in → JWT token generated
2. Token stored in localStorage and validated on app load
3. Protected routes check authentication status
4. API routes validate Bearer tokens

### Data Storage
Uses SQLite database with better-sqlite3 for persistent data storage:
- Database connection and schema management in `/src/lib/database.ts`
- WAL mode enabled for better concurrency
- Foreign key constraints for data integrity
- All storage classes use database persistence (userStorage, eventStorage, scheduleStorage, matchingEngine)

### API Routes
Located in `/src/app/api/auth/`:
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration  
- `GET /api/auth/verify` - Token verification

### Page Structure
- **Root page** - Auto-redirects based on auth status
- **/auth** - Combined login/register interface
- **/dashboard** - Protected user dashboard (placeholder for schedule features)

### Component Organization
- `/src/components/auth/` - Authentication UI components
- `/src/contexts/AuthContext.tsx` - Authentication state management
- `/src/lib/` - Utilities (auth, userStorage)
- `/src/types/user.ts` - User-related TypeScript interfaces

## Important Configuration
- **Path mapping**: `@/*` maps to `./src/*`
- **JWT secret**: Defaults to hardcoded value, set `JWT_SECRET` environment variable for production
- **Database**: SQLite database stored in `/data/schedule.db`
- **Turbopack**: Enabled for fast development builds
- **Japanese locale**: UI is in Japanese, HTML lang="ja"

## Completed Features
- Phase 1: User authentication and event management ✓
- Phase 2: User schedule management with time slots (morning, afternoon, full day) ✓ 
- Phase 3: Automatic matching engine for event scheduling ✓
- Database persistence with SQLite ✓

## Architecture Overview
The system supports comprehensive schedule coordination where:
- Users create events requiring specific numbers of participants and days
- Participants register their availability in time slots
- Automatic matching engine finds common available dates
- Events are automatically marked as matched when conditions are met