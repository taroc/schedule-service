# スケジュール調整サービス - プロジェクト進捗と実装計画

## プロジェクト概要

このプロジェクトは、従来のスケジュール調整サービスとは異なるアプローチを採用した新しいタイプのスケジュール調整サービスです。

### 特徴的な仕様
- **ユーザー中心の予定管理**: 予定はイベントではなくユーザーに紐づく
- **プライバシー重視**: 他人の予定は確認できない
- **自動マッチング**: 参加者の空いている日程を自動的に判定してイベント成立を決定

## 実装済み機能 ✅

### 1. 認証システム
- **ユーザー登録**: メールアドレス、パスワード、名前での登録
- **ログイン機能**: JWT トークンベースの認証
- **セッション管理**: トークンによる自動ログイン
- **セキュリティ**: bcryptjs によるパスワードハッシュ化

**実装ファイル:**
- `/src/lib/auth.ts` - JWT 認証ユーティリティ
- `/src/lib/userStorage.ts` - ユーザーデータ管理（getUserById追加）
- `/src/contexts/AuthContext.tsx` - 認証状態管理
- `/src/components/auth/` - ログイン・登録UI（文字色改善済み）
- `/src/app/api/auth/` - 認証API エンドポイント

### 2. イベント管理機能 ✅
- **イベント作成**: 名前、概要、必要人数、必要日数を指定してイベント作成
- **イベント一覧表示**: 自分が作成したイベントと参加可能なイベントの表示
- **イベント参加**: 他のユーザーが作成したイベントに参加可能
- **権限管理**: 作成者のみがイベントを編集・削除可能
- **状態管理**: イベントの状態（募集中、成立済み、キャンセル）を管理
- **タブ式UI**: 作成したイベント、参加可能なイベント、イベント作成を切り替え

**実装ファイル:**
- `/src/types/event.ts` - イベント関連の型定義
- `/src/lib/eventStorage.ts` - イベントデータ管理（メモリ内ストレージ）
- `/src/app/api/events/` - イベントCRUD API
- `/src/app/api/events/[id]/` - 個別イベント操作API
- `/src/app/api/events/[id]/join/` - イベント参加API
- `/src/components/events/CreateEventForm.tsx` - イベント作成フォーム
- `/src/components/events/EventList.tsx` - イベント一覧表示コンポーネント
- `/src/app/dashboard/page.tsx` - ダッシュボード（イベント機能・予定管理統合済み）

### 3. ユーザー予定管理機能 🆕
- **カレンダーインターフェース**: 月表示でのカレンダーUI
- **予定登録**: 日付をクリックして空き時間・忙しい時間を登録
- **予定編集・削除**: 既存予定の修正・削除機能
- **視覚的表示**: 空き時間（緑）、忙しい時間（赤）での色分け表示
- **レスポンシブ対応**: モバイル・デスクトップでの最適化

**実装ファイル:**
- `/src/types/schedule.ts` - 予定関連の型定義
- `/src/lib/scheduleStorage.ts` - 予定データ管理（メモリ内ストレージ）
- `/src/app/api/schedules/` - 予定CRUD API
- `/src/app/api/schedules/[id]/` - 個別予定操作API
- `/src/components/schedule/Calendar.tsx` - カレンダーUIコンポーネント
- `/src/components/schedule/ScheduleModal.tsx` - 予定編集モーダル
- `/src/components/schedule/ScheduleManager.tsx` - 予定管理統合コンポーネント

### 4. 基本UI構造
- **レスポンシブデザイン**: Tailwind CSS による現代的なUI
- **ナビゲーション**: 認証状態に応じた自動ページ遷移
- **ダッシュボード**: タブ式インターフェースでイベント管理機能を提供
- **フォーム改善**: 入力文字の視認性向上（text-gray-900追加）

## 実装計画 📋

### Phase 1: イベント管理機能 ✅ **完成**
- [x] **イベント作成機能**
  - イベント名、概要、必要人数、必要日数の入力
  - イベント一覧表示
  - 作成者のイベント管理
  - イベント参加・離脱機能
  - 権限管理とセキュリティ

### Phase 2: ユーザー予定管理機能 ✅ **完成**
- [x] **個人予定登録機能**
  - カレンダーインターフェース
  - 空き時間・忙しい時間の登録
  - 予定の編集・削除

### Phase 3: マッチングエンジン
- [ ] **イベント成立判定ロジック**
  - 参加者数チェック（必要人数以上）
  - スケジュールマッチング（連続した空き日数確保）
  - 自動通知システム

### Phase 4: 高度な機能
- [ ] **通知システム**
- [ ] **イベント履歴**
- [ ] **ユーザープロフィール管理**

## 技術仕様

### アーキテクチャ
- **フロントエンド**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS v4
- **認証**: JWT + bcryptjs
- **開発ツール**: Turbopack, Vitest, ESLint
- **パッケージ管理**: Yarn

### データ構造

#### Event（イベント）- **実装済み**
```typescript
interface Event {
  id: string;
  name: string;
  description: string;
  requiredParticipants: number;  // 必要人数
  requiredDays: number;          // 必要日数
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
  status: EventStatus;           // 'open' | 'matched' | 'cancelled'
  participants: string[];        // 参加者ID配列
  matchedDates?: Date[];         // 成立した日程
}
```

#### UserSchedule（ユーザー予定）- **Phase 2で実装予定**
```typescript
interface UserSchedule {
  id: string;
  userId: string;
  date: Date;
  isAvailable: boolean;  // その日が空いているかどうか
  createdAt: Date;
  updatedAt: Date;
}
```

## 開発環境

### 起動方法
```bash
yarn dev          # 開発サーバー起動 (http://localhost:3000)
yarn build        # プロダクションビルド
yarn lint         # コード品質チェック
vitest            # テスト実行
```

### プロジェクト構造
```
src/
├── app/              # Next.js App Router
│   ├── api/         # API エンドポイント
│   │   ├── auth/    # 認証API（登録、ログイン、検証）
│   │   ├── events/  # イベントAPI（CRUD、参加管理）
│   │   └── schedules/ # 予定管理API（CRUD）
│   ├── auth/        # 認証ページ
│   └── dashboard/   # メインダッシュボード（イベント管理UI）
├── components/       # React コンポーネント
│   ├── auth/        # 認証関連コンポーネント
│   ├── events/      # イベント関連コンポーネント
│   └── schedule/    # 予定管理関連コンポーネント
├── contexts/        # React Context（認証状態管理）
├── lib/             # ユーティリティ
│   ├── auth.ts      # JWT認証
│   ├── userStorage.ts   # ユーザーデータ管理
│   ├── eventStorage.ts  # イベントデータ管理
│   └── scheduleStorage.ts  # 予定データ管理
└── types/           # TypeScript 型定義
    ├── user.ts      # ユーザー関連型
    ├── event.ts     # イベント関連型
    └── schedule.ts  # 予定関連型
```

## 現在の制限事項

1. **データ永続化**: 現在はメモリ内ストレージ（開発用）
2. **本番環境設定**: JWT シークレット等の環境変数設定が必要
3. **テスト**: テストケースの実装が必要

## 次のステップ

1. **ユーザー予定管理機能の実装** - カレンダーUI、空き時間登録機能
2. **マッチングエンジンの実装** - 参加者の予定を照合してイベント成立判定
3. **データ永続化** - データベース統合（PostgreSQL等）
4. **テストケース実装** - ユニットテスト、統合テストの追加

## 現在の実装状況

### ✅ Phase 1完了: イベント管理機能
- 完全なイベントCRUD操作
- 参加者管理機能
- タブ式ダッシュボードUI
- 権限管理とセキュリティ

### ✅ Phase 2完了: ユーザー予定管理機能
- 完全なカレンダーインターフェース
- 空き時間・忙しい時間の登録・編集・削除機能
- ダッシュボードでの予定管理統合
- レスポンシブなUI/UX設計

### 🔄 Phase 3進行中: マッチングエンジン
このサービスの核となる「自動マッチング機能」により、従来のような手動での日程調整ではなく、システムが最適な日程を自動で見つけ出すことができます。次は参加者の予定を照合してイベント成立を判定する機能を実装します。