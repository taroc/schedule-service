#!/bin/bash

# Vercel本番データベースへのマイグレーション実行スクリプト (Prisma Accelerate対応)

echo "🚀 Vercel本番データベースのマイグレーションを開始します..."

# 環境変数をVercelから取得
echo "📋 環境変数を取得中..."
vercel env pull .env.production

# DIRECT_URLが設定されているかチェック
if grep -q "DIRECT_URL" .env.production; then
    echo "✅ DIRECT_URL が見つかりました。マイグレーションを実行します..."
    # DIRECT_URLを使用してマイグレーション
    DIRECT_URL=$(grep DIRECT_URL .env.production | cut -d'=' -f2 | tr -d '"')
    DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy
else
    echo "⚠️ DIRECT_URL が見つかりません。通常のDATABASE_URLでマイグレーションを試行します..."
    npx prisma migrate deploy
fi

# Prisma Clientを生成
echo "⚙️ Prisma Clientを生成中..."
npx prisma generate

echo "✅ マイグレーション完了!"
echo ""
echo "📊 データベーススキーマを確認する場合:"
echo "DATABASE_URL=\$DIRECT_URL npx prisma studio"
echo ""
echo "🔍 マイグレーション状況を確認する場合:"
echo "DATABASE_URL=\$DIRECT_URL npx prisma migrate status"