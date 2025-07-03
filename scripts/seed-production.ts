#!/usr/bin/env tsx

/**
 * 本番データベース用初期データシードスクリプト（シンプル版）
 * 
 * 使用方法:
 * yarn seed:prod
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import * as path from 'path';

// 本番環境変数を読み込み
dotenv.config({ path: path.join(process.cwd(), '.env.production') });

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Starting production database seeding...');
  
  try {
    // 管理者ユーザーの作成
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123!';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    await prisma.user.upsert({
      where: { id: 'admin' },
      update: {},
      create: {
        id: 'admin',
        password: hashedPassword
      }
    });
    
    console.log('✅ Admin user created/updated');
    console.log(`   - User ID: admin`);
    console.log(`   - Password: ${adminPassword}`);
    console.log('⚠️  IMPORTANT: Change the admin password after first login!');
    
    console.log('\n🎉 Production seeding completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();