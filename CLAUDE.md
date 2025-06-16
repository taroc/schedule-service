# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `yarn dev` - Start development server with Turbopack (http://localhost:3000)
- `yarn build` - Build production application  
- `yarn start` - Start production server
- `yarn lint` - Run ESLint checks
- `yarn test` - Run all tests (Vitest framework configured)
- `yarn test <path>` - Run specific test file
- `yarn db:up` - Start PostgreSQL database with Docker
- `yarn db:down` - Stop PostgreSQL database
- `yarn db:migrate` - Run Prisma migrations
- `yarn db:reset` - Reset database with fresh migrations
- `yarn db:studio` - Open Prisma Studio

## Architecture Overview

This is a Next.js 15 schedule coordination service using the App Router architecture with JWT-based authentication.

### Authentication System
- **JWT tokens** with 7-day expiration stored in localStorage
- **bcryptjs** password hashing with 10 salt rounds
- **PostgreSQL database** with Prisma ORM for persistent user storage
- **AuthContext** manages authentication state across the application

### Key Authentication Flow
1. User registers/logs in → JWT token generated
2. Token stored in localStorage and validated on app load
3. Protected routes check authentication status
4. API routes validate Bearer tokens

### Data Storage
Uses PostgreSQL database with Prisma ORM for persistent data storage:
- Database schema defined in `prisma/schema.prisma`
- Prisma Client for type-safe database queries
- Connection pooling and foreign key constraints
- All storage classes use Prisma for database persistence (userStorage, eventStorage, scheduleStorage, matchingEngine)
- Docker Compose setup for local PostgreSQL development

### API Routes
**Authentication** (`/src/app/api/auth/`):
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration  
- `GET /api/auth/verify` - Token verification

**Events** (`/src/app/api/events/`):
- `GET /api/events` - List events (with status filtering)
- `POST /api/events` - Create new event
- `GET /api/events/[id]` - Get event details
- `PUT /api/events/[id]` - Update event
- `DELETE /api/events/[id]` - Delete event
- `POST /api/events/[id]/join` - Join event (triggers automatic matching)
- `DELETE /api/events/[id]/join` - Leave event

**Schedules** (`/src/app/api/schedules/`):
- `POST /api/schedules/availability` - Set availability (triggers automatic matching)
- `GET /api/schedules/availability` - Get user availability

**Matching** (`/src/app/api/matching/`):
- `GET /api/matching` - Get matching statistics

### Page Structure
- **Root page** - Auto-redirects based on auth status
- **/auth** - Combined login/register interface
- **/dashboard** - Protected user dashboard with event management and schedule coordination

### Component Organization
- `/src/components/auth/` - Authentication UI components
- `/src/components/events/` - Event management components (EventList, EventForm, etc.)
- `/src/components/schedules/` - Schedule management components (ScheduleCalendar, etc.)
- `/src/components/matching/` - Matching status and results display (MatchingStatus)
- `/src/contexts/AuthContext.tsx` - Authentication state management
- `/src/lib/` - Business logic (auth, storage layers, matchingEngine)
- `/src/types/` - TypeScript interfaces (user, event, schedule)

## Important Configuration
- **Path mapping**: `@/*` maps to `./src/*`
- **JWT secret**: Defaults to hardcoded value, set `JWT_SECRET` environment variable for production
- **Database**: PostgreSQL database via Docker Compose (postgresql://postgres:postgres@localhost:5432/schedule_service_dev)
- **Turbopack**: Enabled for fast development builds
- **Japanese locale**: UI is in Japanese, HTML lang="ja"

## Completed Features
- Phase 1: User authentication and event management ✓
- Phase 2: User schedule management with time slots (morning, afternoon, full day) ✓ 
- Phase 3: Automatic matching engine for event scheduling ✓
- Event deadline functionality ✓
- Automatic matching triggers (on participant join and schedule update) ✓
- UI improvements with visual event status distinction ✓
- Comprehensive test coverage (unit + integration tests) ✓
- Database persistence with PostgreSQL and Prisma ORM ✓

## Automatic Matching System
The system supports real-time schedule coordination where:
- Users create events requiring specific numbers of participants and days
- Participants register their availability in time slots (morning, afternoon, full day)
- **Automatic matching triggers** when:
  1. A user joins an event (`POST /api/events/[id]/join`)
  2. A user updates their schedule (`POST /api/schedules/availability`)
- Matching engine finds common available dates and automatically updates event status
- Events are visually distinguished by status (open vs matched) with color coding
- Matched events display detailed information including final dates

## Testing Strategy
- **Unit tests**: `src/lib/__tests__/matchingEngine.test.ts` (16 tests) - Core matching logic
- **API integration tests**: `src/app/api/__tests__/events-join-integration.test.ts` (3 tests) - End-to-end scenarios
- **Run tests**: `yarn test` (all tests) or `yarn test <specific-file>`
- **Test coverage**: Automatic matching scenarios are fully tested and verified

## Documentation
- **ARCHITECTURE.md**: Comprehensive system documentation with specifications, database design, API design, and improvement recommendations