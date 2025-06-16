import '@testing-library/jest-dom'
import { beforeEach, afterEach, vi } from 'vitest'
import { prisma } from '@/lib/prisma'

// グローバルなテスト設定
beforeEach(async () => {
  // localStorageをクリア
  if (typeof localStorage !== 'undefined') {
    localStorage.clear()
  }
  
  // console.errorのモック（テストでエラーログを抑制）
  vi.spyOn(console, 'error').mockImplementation(() => {})
  
  // データベースをクリーンアップ
  await prisma.eventParticipant.deleteMany()
  await prisma.userSchedule.deleteMany()
  await prisma.event.deleteMany()
  await prisma.user.deleteMany()
})

afterEach(() => {
  // モックを復元
  vi.restoreAllMocks()
})