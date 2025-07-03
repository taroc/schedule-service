# 本番データベースマイグレーションガイド（シンプル版）

## 概要

このガイドでは、schedule-serviceアプリケーションの本番データベースマイグレーション手順を説明します。

## 前提条件

- `.env.production` ファイルが設定済み
- Prisma Accelerateが設定済み

## マイグレーション手順

### 1. 環境変数の確認
```bash
# .env.production に以下が設定されているか確認
# - DATABASE_URL (本番データベース)
# - JWT_SECRET (本番用シークレット)
# - ADMIN_PASSWORD (管理者パスワード)
```

### 2. マイグレーション実行
```bash
# 本番マイグレーションを実行
yarn migrate:prod
```

### 3. 初期データの投入
```bash
# 管理者ユーザーを作成
yarn seed:prod
```

### 4. 一括実行
```bash
# マイグレーションとシードを一括実行
yarn deploy:prod
```

## マイグレーション後の確認

1. 管理者ユーザーでログイン (`admin` / 環境変数で設定したパスワード)
2. 基本機能のテスト

## トラブルシューティング

### マイグレーション失敗時
```bash
# 手動でマイグレーション実行
NODE_ENV=production npx prisma migrate deploy
```

---

**⚠️ 重要**: 本番データベースのバックアップを事前に取得してください。