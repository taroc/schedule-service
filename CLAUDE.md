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

### Critical Build Requirements
- **ALWAYS run `yarn lint` before committing** - Build will fail if ESLint errors exist
- **NO `any` types allowed** - Replace with proper TypeScript interfaces
- **Remove unused imports** - ESLint will block build with unused variable errors

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

### Data Serialization Patterns
**IMPORTANT**: API routes convert Date objects to ISO strings for JSON serialization. Client components must handle both:
```typescript
// Safe date handling pattern for components
const dateValue = typeof data.date === 'string' ? new Date(data.date) : data.date;
```
This pattern is critical for components like `MultiSelectCalendar` that receive API data.

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
- ✅ Real-time automatic matching validation and testing completed
- ✅ **API error handling enhancement** - 堅牢なエラーハンドリングと graceful degradation（TDD実装済み）
- ✅ **Loading states and skeleton UI** - ユーザー体験向上のためのスケルトンローディング（TDD実装済み）
- ✅ **Error Boundary implementation** - アプリケーション全体のエラー境界とユーザーフレンドリーなエラー表示（TDD実装済み）
- 🚧 UX enhancements for schedule management interface
- 🚧 Performance optimizations for initial page loads

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

### Test-Driven Development (TDD)
このプロジェクトでは **t-wadaさんのTDD方法論** を厳格に適用します：

#### TDDの基本サイクル
1. **🔴 Red Phase**: 最初に失敗するテストを書く
2. **🟢 Green Phase**: テストが通る最小限のコードを実装する  
3. **🔵 Refactor Phase**: テストを保持しながらコードの質を向上させる

#### TDD実装例
```typescript
// 🔴 Red Phase: 失敗するテストを先に書く
describe('🔴 Red Phase: API Error Handling', () => {
  it('データベース接続エラー時に500ではなく適切なエラーレスポンスを返すべき', async () => {
    // Arrange: 認証は成功するがDBエラーが発生する状況
    vi.mocked(verifyJWT).mockResolvedValue({ userId: 'user1' });
    vi.mocked(getEventsByUserId).mockRejectedValue(new Error('Database connection failed'));
    
    // Act: API呼び出し
    const response = await GET(request);
    const data = await response.json();
    
    // Assert: 適切なエラーハンドリング
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: '統計データの取得に失敗しました' });
  });
});

// 🟢 Green Phase: テストが通るように実装
export async function GET(request: NextRequest) {
  try {
    const user = await verifyJWT(token);
    const [createdEventsResult, participatingEventsResult] = await Promise.allSettled([
      getEventsByUserId(user.userId),
      getParticipatingEvents(user.userId)
    ]);
    // 実装続き...
  } catch (error) {
    return NextResponse.json({ error: '統計データの取得に失敗しました' }, { status: 500 });
  }
}

// 🔵 Refactor Phase: コードの質を向上（型安全性など）
interface EventSummary {
  status: 'open' | 'matched' | 'cancelled' | 'expired';
}
const createdEvents: EventSummary[] = createdEventsResult.status === 'fulfilled' ? createdEventsResult.value : [];
```

### 包括的なテストカバレッジ

#### 既存のテストスイート
- **Unit tests**: `src/lib/__tests__/matchingEngine.test.ts` (16 tests) - Core matching logic
- **API integration tests**: `src/app/api/__tests__/events-join-integration.test.ts` (3 tests) - End-to-end scenarios

#### 新規実装されたテストスイート（TDD方式）
- **API Error Handling**: `src/app/api/events/__tests__/stats-error-handling.test.ts` (6 tests)
  - データベース接続エラー、部分的失敗、認証エラー、予期しないエラーのハンドリング
- **UI Components**: `src/components/ui/__tests__/skeletons.test.tsx` (13 tests) 
  - スケルトンUI、アクセシビリティ、レスポンシブ対応
- **EventList Integration**: `src/components/events/__tests__/EventList-skeleton.test.tsx` (7 tests)
  - ローディング状態、異なるdisplayMode、アクセシビリティ
- **Error Boundary**: `src/components/ui/__tests__/ErrorBoundary.test.tsx` (14 tests)
  - エラータイプ別表示、カスタムfallback、エラー報告、リセット機能

### テスト実装の重要な原則

#### 1. テストファースト開発
```typescript
// ❌ BAD: 実装後にテストを追加
// 実装 → テスト追加

// ✅ GOOD: TDD方式
// 失敗するテスト → 実装 → リファクタリング
```

#### 2. 適切なテスト構造
```typescript
describe('🔴 Red Phase: Component Name', () => {
  describe('機能カテゴリ', () => {
    it('具体的な期待動作を日本語で記述すべき', () => {
      // Arrange: テスト環境セットアップ
      // Act: テスト対象の実行
      // Assert: 期待結果の検証
    });
  });
});
```

#### 3. モックとスタブの適切な使用
```typescript
// 外部依存をモック
vi.mock('@/lib/auth', () => ({
  verifyJWT: vi.fn(),
}));

// 型安全なモック
interface MockEvent {
  id: string;
  status: 'open' | 'matched' | 'cancelled' | 'expired';
}
vi.mocked(getEventsByUserId).mockResolvedValue(mockEvents as MockEvent[]);
```

#### 4. アクセシビリティテスト
```typescript
it('エラー状態が適切にaria属性で伝達されるべき', () => {
  render(<ErrorBoundary><ThrowError /></ErrorBoundary>);
  
  const errorContainer = screen.getByTestId('error-boundary-fallback');
  expect(errorContainer).toHaveAttribute('role', 'alert');
  expect(errorContainer).toHaveAttribute('aria-live', 'assertive');
});
```

### テスト環境とツール

#### Test Framework Setup
- **Test framework**: Vitest with jsdom environment and React Testing Library
- **Test setup**: `src/test/setup.ts` configures global test environment
- **Run commands**: 
  - `yarn test` (watch mode)
  - `yarn test:run` (single run) 
  - `yarn test:coverage` (with coverage)
  - `yarn test <path>` (specific test file)

#### Test Data Management
- **Seed script**: `scripts/seed-test-data.ts` creates realistic test data with current date baselines
- **Mock system**: `src/lib/__tests__/mocks/mockPrisma.ts` provides comprehensive Prisma mocking
- **Date handling**: All test data uses relative dates (Date.now() + offset) to avoid time-dependent failures

### テスト品質基準

#### 必須要件
- **すべての新機能はTDDで実装**: 例外なし
- **テストカバレッジ維持**: 新しいコードは必ずテスト済み
- **型安全なテスト**: `any` 型の使用禁止、適切なインターフェース定義
- **アクセシビリティテスト**: UI コンポーネントは aria 属性のテストを含む

#### テスト実行フロー
1. **開発前**: 要件に基づいて失敗するテストを作成
2. **開発中**: テストが通るように最小限の実装
3. **開発後**: テストを保持しながらリファクタリング
4. **コミット前**: 必ず `yarn test` および `yarn lint` を実行

#### テストの分類
- **Unit Tests**: 個別関数・コンポーネントの動作確認
- **Integration Tests**: API エンドポイントと複数コンポーネントの連携
- **Error Handling Tests**: エラー境界、失敗ケース、回復処理
- **Accessibility Tests**: スクリーンリーダー、キーボードナビゲーション
- **Performance Tests**: ローディング状態、レスポンシブ対応

この TDD 方法論により、堅牢で保守性の高いコードベースを維持し、回帰バグを防止します。

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

### Loading States and Feedback
- **Implement skeleton loading** for better perceived performance during data fetching
- **Provide clear success/error feedback** for all user actions
- **Use loading spinners** for operations that take more than 500ms
- **Examples**:
  ```tsx
  // Good: Skeleton loading for dashboard stats
  <div className="animate-pulse">
    <div className="h-4 bg-gray-300 rounded mb-2"></div>
    <div className="h-8 bg-gray-300 rounded"></div>
  </div>
  
  // Good: Action feedback with toast notifications
  <Toast type="success">イベントが正常に作成されました</Toast>
  <Toast type="error">データの読み込みに失敗しました</Toast>
  ```

### Error Handling Patterns
- **Graceful degradation**: Show partial data when possible instead of complete failure
- **User-friendly error messages**: Avoid technical jargon in user-facing errors
- **Retry mechanisms**: Provide easy ways for users to retry failed operations
- **Examples**:
  ```tsx
  // Good: Error boundary with retry option
  <ErrorBoundary>
    <button onClick={retry} className="cursor-pointer">
      データを再読み込み
    </button>
  </ErrorBoundary>
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

### Development Workflow (TDD Required)
1. **要件分析**: 機能・バグ修正の要件を明確化
2. **🔴 Red Phase**: 失敗するテストを最初に作成
   - 期待する動作を具体的にテストケースで表現
   - `yarn test <test-file>` で失敗することを確認
3. **🟢 Green Phase**: テストが通る最小限のコードを実装
   - テストが通るための最低限の機能のみ実装
   - 完璧なコードを目指さず、テストをパスすることに集中
4. **🔵 Refactor Phase**: テストを保持しながらコードの質を向上
   - 型安全性の向上、パフォーマンス最適化、可読性向上
   - `yarn test` でテストが継続して通ることを確認
5. **品質チェック**: `yarn lint` で ESLint 規則に準拠
6. **廃止コードの清理**: 後方互換性コードの削除

**このワークフローは必須であり、すべてのコード変更で従う必要があります。**

#### TDD実装時の注意事項
- **テストが落ちることを確認してから実装を開始**: 偽装テスト（常にパスするテスト）を防ぐため
- **テストの修正ではなく実装の修正**: テストが失敗した場合、テストを修正するのではなく実装を修正する
- **段階的な実装**: 一度に多くの機能を実装せず、小さなステップで進める
- **継続的なリファクタリング**: 動作するコードができたら品質向上のためのリファクタリングを行う

## Known Issues and Improvements

### Database Stability Issues
- **Internal Server Error on fresh start**: `/api/events/stats` endpoint may fail on initial database connection
- **Resolution**: Run `npx prisma db push` followed by `yarn seed` to reset and populate database
- **Prevention**: Implement better error boundaries and graceful fallbacks in API routes

### Performance Optimization Areas
- **Initial page load**: Loading states can persist for 2-3 seconds
- **Resolution**: Implement skeleton loading components and optimize API response times
- **Data fetching**: Consider implementing React Query for better caching and background updates

### UX Enhancement Opportunities
- **Schedule management**: Calendar interface requires multiple clicks for date range selection
- **Improvement**: Add quick-select buttons for common patterns (weekdays, weekends, specific time slots)
- **Visual feedback**: Loading states and action confirmations could be more prominent

## Common Troubleshooting

### Database Issues
- **"Internal server error"**: Database connection may be unstable, run `npx prisma db push --force-reset && yarn seed`
- **Missing data**: Use `yarn seed` to populate with realistic test data
- **Prisma errors**: Run `npx prisma generate` to regenerate client

### Date/Time Issues
- **TypeError: date.toDateString is not a function**: Use safe date conversion pattern above
- **Test failures with dates**: Ensure test data uses relative dates, not fixed dates

### Build Failures
- **ESLint errors**: Check for unused imports, `any` types, and proper type definitions
- **Prisma generation**: Run `npx prisma generate` if seeing Prisma Client errors

### API Response Patterns
- **Authentication**: All protected routes require `Authorization: Bearer <token>` header
- **Date serialization**: API routes return ISO strings, components must convert to Date objects
- **Error handling**: APIs return `{ error: string }` for errors, `{ success: boolean }` for success

### Development Workflow Issues
- **Port conflicts**: Use `pkill -f "yarn dev"` to stop existing development servers
- **Cache issues**: Clear browser cache and restart development server if seeing stale data