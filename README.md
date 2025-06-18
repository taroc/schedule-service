# スケジュール調整サービス

Next.js 15 と Prisma Accelerate を使用した自動マッチング機能付きスケジュール調整サービス

## 🌟 特徴

### 革新的なアプローチ
- **自動マッチング**: 参加者の空き時間を自動で照合してイベント成立を判定
- **リアルタイム調整**: イベント参加・スケジュール更新時に即座にマッチング実行
- **プライバシー重視**: 他人の予定は確認できない安全な設計
- **時間帯別管理**: 午前・午後・終日の時間帯別スケジュール管理

### 技術的な特徴
- **高性能データベース**: Prisma Accelerate による高速アクセス
- **JWT認証**: 7日間有効なセキュアな認証システム
- **レスポンシブデザイン**: モバイル・デスクトップ最適化
- **包括的テスト**: ユニット・統合テストによる品質保証

## 🚀 主要機能

### ✅ 実装済み機能

1. **ユーザー認証システム**
   - JWT トークンベースの認証（7日間有効）
   - bcryptjs によるパスワードハッシュ化
   - 自動ログイン・ログアウト機能

2. **イベント管理**
   - イベント作成・編集・削除
   - 必要参加者数・必要日数の指定
   - 参加締切の設定
   - イベント参加・離脱機能

3. **スケジュール管理**
   - 時間帯別空き時間登録（午前・午後・終日）
   - カレンダーインターフェース
   - 複数日程の一括登録

4. **自動マッチングエンジン**
   - **リアルタイム実行**: イベント参加時・スケジュール更新時
   - **条件チェック**: 参加者数・共通空き日程・期限の自動判定
   - **ステータス管理**: 募集中・成立済み・期限切れの自動更新

5. **UI・UX**
   - タブ式ダッシュボード
   - イベント状況の視覚的区別
   - マッチング状況のリアルタイム表示

## 🛠 技術スタック

| 分野 | 技術 |
|------|------|
| **フレームワーク** | Next.js 15 (App Router) |
| **言語** | TypeScript |
| **データベース** | Prisma Accelerate (PostgreSQL) |
| **認証** | JWT + bcryptjs |
| **スタイリング** | Tailwind CSS v4 |
| **テスト** | Vitest + React Testing Library |
| **開発** | Turbopack |

## 📋 開発環境

### 必要な環境
- Node.js 18+
- Yarn package manager
- Prisma Accelerate アカウント

### セットアップ

1. **リポジトリのクローン**
   ```bash
   git clone <repository-url>
   cd schedule-service
   ```

2. **依存関係のインストール**
   ```bash
   yarn install
   ```

3. **環境変数の設定**
   `.env` ファイルを作成し、以下を設定：
   ```bash
   DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_API_KEY"
   JWT_SECRET="your-secure-jwt-secret"
   ```

4. **Prisma Client の生成**
   ```bash
   npx prisma generate
   ```

5. **開発サーバーの起動**
   ```bash
   yarn dev
   ```

   http://localhost:3000 でアプリケーションが起動します。

### 開発コマンド

```bash
# 開発サーバー (Turbopack)
yarn dev

# プロダクションビルド
yarn build

# テスト実行
yarn test
yarn test:ui          # Vitest UI
yarn test:coverage    # カバレッジ付き

# データベース管理
yarn db:studio        # Prisma Studio
yarn seed            # テストデータ作成

# コード品質
yarn lint
```

## 🗂 プロジェクト構造

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API エンドポイント
│   │   ├── auth/          # 認証API (login, register, verify)
│   │   ├── events/        # イベントAPI (CRUD, 参加管理)
│   │   ├── schedules/     # スケジュールAPI (空き時間管理)
│   │   └── matching/      # マッチングAPI (統計情報)
│   ├── auth/              # 認証ページ
│   └── dashboard/         # ダッシュボード
├── components/            # React コンポーネント
│   ├── auth/             # 認証関連 (LoginForm, RegisterForm)
│   ├── events/           # イベント関連 (EventList, CreateEventForm)
│   ├── matching/         # マッチング関連 (MatchingStatus)
│   ├── schedule/         # スケジュール関連 (Calendar, AvailabilityManager)
│   └── ui/               # 共通UI (NotificationToast)
├── contexts/             # React Context (AuthContext)
├── hooks/                # カスタムフック (useNotification)
├── lib/                  # ビジネスロジック
│   ├── auth.ts           # JWT認証
│   ├── prisma.ts         # Prisma Client
│   ├── *Storage.ts       # データアクセス層
│   ├── matchingEngine.ts # マッチングエンジン
│   └── __tests__/        # ユニットテスト
└── types/                # TypeScript型定義
```

## 🔍 API エンドポイント

### 認証 (`/api/auth`)
- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ログイン
- `GET /api/auth/verify` - トークン検証

### イベント (`/api/events`)
- `GET /api/events` - イベント一覧
- `POST /api/events` - イベント作成
- `GET /api/events/[id]` - イベント詳細
- `PUT /api/events/[id]` - イベント更新
- `DELETE /api/events/[id]` - イベント削除
- `POST /api/events/[id]/join` - イベント参加（自動マッチング実行）
- `DELETE /api/events/[id]/join` - イベント離脱

### スケジュール (`/api/schedules`)
- `POST /api/schedules/availability` - 空き時間設定（自動マッチング実行）
- `GET /api/schedules/availability` - 空き時間取得

### マッチング (`/api/matching`)
- `GET /api/matching` - マッチング統計

## 🎯 自動マッチング仕様

### マッチング条件
1. **参加者数**: 参加者数 ≥ 必要参加者数
2. **日程条件**: 共通空き日程 ≥ 必要日数
3. **期限条件**: 現在時刻 ≤ 参加締切（設定時のみ）

### 実行タイミング
- ✅ **ユーザーがイベントに参加した時**
- ✅ **ユーザーがスケジュールを更新した時**
- 🔧 **定期バッチ処理**（実装可能）

## 🧪 テスト

### テスト構成
- **ユニットテスト**: マッチングエンジン、認証、ストレージ層
- **統合テスト**: API エンドポイント、コンポーネント
- **テストフレームワーク**: Vitest + React Testing Library

### テスト実行
```bash
# 全テスト実行
yarn test

# 特定テスト実行
yarn test src/lib/__tests__/matchingEngine.test.ts

# カバレッジ付きテスト
yarn test:coverage
```

## 🚀 デプロイ

### Vercel デプロイ

1. **Vercelプロジェクト作成**
   - GitHubリポジトリをVercelに接続

2. **環境変数設定**
   ```
   DATABASE_URL=prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_API_KEY
   JWT_SECRET=your-secure-jwt-secret
   ```

3. **自動デプロイ**
   - mainブランチへのpushで自動デプロイ

## 📚 ドキュメント

- **[CLAUDE.md](./CLAUDE.md)** - Claude Code 用の開発ガイド
- **prisma/schema.prisma** - データベーススキーマ
- **src/types/** - TypeScript型定義

## 🔒 セキュリティ

- **JWT認証**: 7日間有効期限、localStorage保存
- **パスワードハッシュ**: bcryptjs（10 rounds）
- **API保護**: Bearer token による認証必須
- **入力検証**: TypeScriptによる型安全性

## 📈 今後の拡張予定

- 🔔 **通知システム** - イベント成立・期限切れ通知
- 🔄 **リアルタイム更新** - WebSocket による即座な画面更新
- 📱 **モバイルアプリ** - React Native での専用アプリ
- 🤖 **AI機能** - 最適日程の提案機能