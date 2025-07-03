#!/usr/bin/env tsx

/**
 * 本番データベースマイグレーションスクリプト（シンプル版）
 * 
 * 使用方法:
 * yarn migrate:prod
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';
import * as path from 'path';

// 本番環境変数を読み込み
dotenv.config({ path: path.join(process.cwd(), '.env.production') });

console.log('🚀 Starting production database migration...');
console.log(`📅 Timestamp: ${new Date().toISOString()}`);

try {
  // 1. Prisma Client生成
  console.log('\n🔄 Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // 2. マイグレーション実行
  console.log('\n🚀 Running Prisma migration...');
  execSync('npx prisma migrate deploy', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  console.log('\n🎉 Production migration completed successfully!');
  
} catch (error) {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
}