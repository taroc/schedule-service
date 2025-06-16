# デプロイメントガイド

## ローカル開発

### 前提条件
- Docker & Docker Compose
- Node.js 18+
- Yarn

### ローカル開発の開始

#### オプション1: PostgreSQL (推奨)

1. **PostgreSQLの起動**
   ```bash
   yarn db:up
   ```

2. **依存関係のインストール**
   ```bash
   yarn install
   ```

3. **データベースマイグレーション**
   ```bash
   yarn db:migrate
   ```

4. **開発サーバーの起動**
   ```bash
   yarn dev
   ```

#### オプション2: SQLite (Dockerが使えない環境)

```bash
yarn dev:sqlite
```

このコマンドで自動的にSQLiteデータベースをセットアップして開発サーバーを起動します。

### 便利なコマンド
- `yarn db:down` - PostgreSQLの停止
- `yarn db:studio` - Prisma Studio（データベースGUI）
- `yarn db:reset` - データベースのリセット

## Vercelデプロイ手順

### 前提条件
- Vercelアカウント
- Vercel CLI（オプション）

### デプロイ手順

### 1. Vercel Postgres の設定

1. Vercelダッシュボードで新しいプロジェクトを作成
2. "Storage" タブからPostgresデータベースを追加
3. 接続URLを取得

### 2. 環境変数の設定

Vercelダッシュボードで以下の環境変数を設定：

```
DATABASE_URL=postgres://default:xxx@xxx-pooler.xxx.postgres.vercel-storage.com/verceldb?sslmode=require
```

### 3. データベースの初期化

デプロイ後、Prisma Migrateでデータベースを初期化：

```bash
npx prisma migrate deploy
```

### 4. 自動デプロイ

GitHubリポジトリを接続して自動デプロイを設定

## 主な変更点

- SQLite → PostgreSQL + Prisma
- 全てのデータベース操作をPrismaクライアントに移行
- Vercel用のbuildコマンドにprisma generateを追加
- 本番環境用のデータベース接続設定

## 注意事項

- 本番環境では`JWT_SECRET`環境変数を設定してください
- PostgreSQLのコネクションプーリングを有効にしてください
- Prismaの接続制限に注意してください