#!/bin/bash

# Vercel本番データベースへのマイグレーション実行スクリプト

echo "🚀 Vercel本番データベースのマイグレーションを開始します..."

# 環境変数をVercelから取得
echo "📋 環境変数を取得中..."
vercel env pull .env.production

# マイグレーションを実行
echo "🔄 データベースマイグレーションを実行中..."
npx prisma migrate deploy

# Prisma Clientを生成
echo "⚙️ Prisma Clientを生成中..."
npx prisma generate

echo "✅ マイグレーション完了!"
echo ""
echo "📊 データベーススキーマを確認する場合:"
echo "npx prisma studio"
echo ""
echo "🔍 マイグレーション状況を確認する場合:"
echo "npx prisma migrate status"