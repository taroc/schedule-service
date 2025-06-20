# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `yarn dev` - Start development server with Turbopack (http://localhost:3000)
- `yarn build` - Build production application (includes Prisma Client generation)
- `yarn start` - Start production server
- `yarn lint` - Run ESLint checks
- `yarn test` - Run all tests (Vitest framework configured)
- `yarn test <path>` - Run specific test file
- `yarn test:ui` - Run tests with Vitest UI
- `yarn test:run` - Run tests once and exit
- `yarn test:coverage` - Run tests with coverage report
- `yarn db:studio` - Open Prisma Studio
- `yarn seed` - Seed test data using scripts/seed-test-data.ts

## Architecture Overview

This is a Next.js 15 schedule coordination service using the App Router architecture with JWT-based authentication and Prisma Accelerate for high-performance database access.

### Authentication System
- **JWT tokens** with 7-day expiration stored in localStorage
- **bcryptjs** password hashing with 10 salt rounds
- **Prisma Accelerate** for high-performance database access and global edge caching
- **AuthContext** manages authentication state across the application

### Key Authentication Flow
1. User registers/logs in → JWT token generated
2. Token stored in localStorage and validated on app load
3. Protected routes check authentication status
4. API routes validate Bearer tokens

### Data Storage
Uses Prisma Accelerate for high-performance database access:
- Database schema defined in `prisma/schema.prisma`
- Prisma Client with Accelerate extension for type-safe database queries
- Global edge caching and connection pooling via Prisma Accelerate
- All storage classes use Prisma with Accelerate for database persistence (userStorage, eventStorage, scheduleStorage, matchingEngine)
- No local database setup required - uses Prisma Accelerate for all environments

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
- **Database**: Prisma Accelerate connection (prisma+postgres://accelerate.prisma-data.net/?api_key=...)
- **Turbopack**: Enabled for fast development builds
- **Japanese locale**: UI is in Japanese, HTML lang="ja"

## Implementation Status
- ✅ Phase 1: User authentication and event management
- ✅ Phase 2: User schedule management with time slots (daytime, evening)
- ✅ Phase 3: Time-slot based matching engine (NOT date-based)
- ✅ Event deadline functionality
- ✅ Automatic matching triggers (on participant join and schedule update)
- ✅ UI improvements with visual event status distinction
- ✅ Time-slot unit specification for events (requiredTimeSlots)
- ✅ Database persistence with Prisma Accelerate
- 🚧 Test coverage updates needed for time-slot matching
- 🚧 Cleanup of deprecated backward compatibility code needed

## Time-Slot Based Matching System
The system supports real-time schedule coordination where:
- Users create events requiring specific numbers of participants and **time-slot units** (NOT days)
- Participants register their availability in time slots (daytime, evening)
- **Time-slot matching** ensures daytime-available and evening-available users don't incorrectly match
- **Automatic matching triggers** when:
  1. A user joins an event (`POST /api/events/[id]/join`)
  2. A user updates their schedule (`POST /api/schedules/availability`)
- Matching engine finds common available time-slots and automatically updates event status
- Events are visually distinguished by status (open vs matched) with color coding
- Matched events display detailed information including final time-slots (date + time-slot pairs)

## Testing Strategy
- **Unit tests**: `src/lib/__tests__/matchingEngine.test.ts` (16 tests) - Core matching logic
- **API integration tests**: `src/app/api/__tests__/events-join-integration.test.ts` (3 tests) - End-to-end scenarios
- **Test framework**: Vitest with jsdom environment and React Testing Library
- **Test setup**: `src/test/setup.ts` configures global test environment
- **Run tests**: `yarn test` (watch mode), `yarn test:run` (single run), `yarn test:coverage` (with coverage)
- **Test coverage**: Automatic matching scenarios are fully tested and verified

## UI/UX Guidelines

### Interactive Elements
- **All clickable elements MUST have `cursor-pointer` class** to indicate interactivity
- **Buttons, links, clickable cards, and interactive text** should include `cursor-pointer`
- **Disabled buttons** should use `disabled:cursor-not-allowed` to show unavailable state
- **Examples**:
  ```tsx
  // Good: Button with pointer cursor
  <button className="bg-blue-500 hover:bg-blue-600 cursor-pointer">Click me</button>
  
  // Good: Disabled button with appropriate cursor
  <button disabled className="bg-gray-300 disabled:cursor-not-allowed">Disabled</button>
  
  // Good: Clickable card
  <div className="border rounded-lg cursor-pointer hover:shadow-md" onClick={handleClick}>
  
  // Good: Conditional clickable text
  <h3 className={`text-xl ${isClickable ? 'cursor-pointer hover:text-blue-600' : ''}`}>
  ```

## Documentation
- **README.md**: Main project documentation with setup instructions and feature overview
- **prisma/schema.prisma**: Database schema definitions
- **src/types/**: TypeScript type definitions for the application

## CRITICAL DEVELOPMENT RULES

### Code Quality Standards
1. **NO BACKWARD COMPATIBILITY**: Do not maintain backward compatibility. Remove deprecated fields and old code paths cleanly.
2. **NO ANY/AS TYPES**: Never use `any` or `as` type assertions in TypeScript. Always use proper typing.
   - If absolutely unavoidable, add detailed comment explaining why it's required
   - Prefer type guards, proper interfaces, and generic constraints
3. **TEST-DRIVEN DEVELOPMENT**: Always start with tests when adding/modifying features
   - Write/update test cases first
   - Ensure tests pass before considering implementation complete
   - Maintain high test coverage

### Type Safety Guidelines
```typescript
// ❌ BAD: Using any/as
const data = response as any;
const result = JSON.parse(jsonString) as SomeType;

// ✅ GOOD: Proper typing
interface ApiResponse {
  data: SomeType;
}
const response: ApiResponse = await fetch(...);

// ✅ GOOD: Type guards
function isSomeType(obj: unknown): obj is SomeType {
  return typeof obj === 'object' && obj !== null && 'expectedField' in obj;
}
```

### Development Workflow
1. Identify feature/bug requirements
2. **Write/update tests first**
3. Run tests to confirm they fail appropriately
4. Implement minimal code to make tests pass
5. Refactor while maintaining test coverage
6. Clean up any deprecated code paths

These rules are MANDATORY and must be followed for all code changes.