import '@testing-library/jest-dom'
import { beforeEach, afterEach, vi } from 'vitest'

// グローバルなテスト設定
beforeEach(() => {
  // localStorageをクリア
  if (typeof localStorage !== 'undefined') {
    localStorage.clear()
  }
  
  // console.errorのモック（テストでエラーログを抑制）
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  // モックを復元
  vi.restoreAllMocks()
})