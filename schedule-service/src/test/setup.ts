import '@testing-library/jest-dom'

// グローバルなテスト設定
beforeEach(() => {
  // localStorageをクリア
  localStorage.clear()
  
  // console.errorのモック（テストでエラーログを抑制）
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  // モックを復元
  vi.restoreAllMocks()
})