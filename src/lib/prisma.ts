import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })
}

// Prisma Accelerateの拡張は必要に応じて個別に適用
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Accelerate機能が必要な場合のヘルパー関数
export const getPrismaWithAccelerate = async () => {
  if (process.env.DATABASE_URL?.includes('accelerate')) {
    const { withAccelerate } = await import('@prisma/extension-accelerate')
    return prisma.$extends(withAccelerate())
  }
  return prisma
}