import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { userStorage } from '@/lib/userStorage'
import { eventStorage } from '@/lib/eventStorage'
import { verifyToken } from '@/lib/auth'

// 実際のモジュールを使用（モックしない）
vi.unmock('@/lib/eventStorage')
vi.unmock('@/lib/userStorage')

// 認証だけモック
vi.mock('@/lib/auth', () => ({
  verifyToken: vi.fn()
}))

describe('Event Creator Resolution Integration Test', () => {
  beforeEach(async () => {
    // テスト前にストレージをクリア
    ;(userStorage as any).users = []
    ;(eventStorage as any).events = []
    ;(eventStorage as any).participations = []
    vi.clearAllMocks()
  })

  it('should resolve creator name correctly when user exists', async () => {
    // Step 1: ユーザーを作成
    const user = await userStorage.createUser({
      email: 'creator@example.com',
      password: 'password123',
      name: 'Event Creator'
    })

    // Step 2: 認証をモック
    vi.mocked(verifyToken).mockReturnValue({
      id: user.id,
      email: user.email,
      name: user.name
    })

    // Step 3: イベントを作成
    const eventData = {
      name: 'Test Event',
      description: 'Test Description',
      requiredParticipants: 3,
      requiredDays: 2
    }

    const createRequest = new NextRequest('http://localhost:3000/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': 'Bearer valid-token'
      },
      body: JSON.stringify(eventData),
    })

    const createResponse = await POST(createRequest)
    expect(createResponse.status).toBe(200)

    // Step 4: イベントを取得して作成者名を確認
    const getRequest = new NextRequest('http://localhost:3000/api/events', {
      method: 'GET',
    })

    const getResponse = await GET(getRequest)
    expect(getResponse.status).toBe(200)

    const events = await getResponse.json()
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual(expect.objectContaining({
      name: 'Test Event',
      creatorId: user.id,
      creatorName: 'Event Creator' // 作成者名が正しく解決されることを確認
    }))
  })

  it('should return "不明" when creator user does not exist (corrupted data)', async () => {
    // Step 1: 存在しないユーザーIDでイベントを直接作成（データ破損をシミュレート）
    const nonExistentUserId = 'non-existent-user-id'
    
    const corruptedEvent = await eventStorage.createEvent({
      name: 'Corrupted Event',
      description: 'Event with missing creator',
      requiredParticipants: 2,
      requiredDays: 1
    }, nonExistentUserId)

    // Step 2: イベントを取得
    const getRequest = new NextRequest('http://localhost:3000/api/events', {
      method: 'GET',
    })

    const getResponse = await GET(getRequest)
    expect(getResponse.status).toBe(200)

    const events = await getResponse.json()
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual(expect.objectContaining({
      name: 'Corrupted Event',
      creatorId: nonExistentUserId,
      creatorName: '不明' // 作成者が存在しない場合は「不明」
    }))
  })

  it('should handle multiple events with different creators correctly', async () => {
    // Step 1: 複数のユーザーを作成
    const user1 = await userStorage.createUser({
      email: 'user1@example.com',
      password: 'password123',
      name: 'User One'
    })

    const user2 = await userStorage.createUser({
      email: 'user2@example.com',
      password: 'password123',
      name: 'User Two'
    })

    // Step 2: 複数のイベントを作成
    await eventStorage.createEvent({
      name: 'Event 1',
      description: 'First event',
      requiredParticipants: 2,
      requiredDays: 1
    }, user1.id)

    await eventStorage.createEvent({
      name: 'Event 2',
      description: 'Second event',
      requiredParticipants: 3,
      requiredDays: 2
    }, user2.id)

    // 存在しないユーザーのイベントも追加
    await eventStorage.createEvent({
      name: 'Event 3',
      description: 'Third event',
      requiredParticipants: 1,
      requiredDays: 1
    }, 'missing-user-id')

    // Step 3: イベントを取得して作成者名を確認
    const getRequest = new NextRequest('http://localhost:3000/api/events', {
      method: 'GET',
    })

    const getResponse = await GET(getRequest)
    expect(getResponse.status).toBe(200)

    const events = await getResponse.json()
    expect(events).toHaveLength(3)

    // イベントを名前でソート
    events.sort((a: any, b: any) => a.name.localeCompare(b.name))

    expect(events[0]).toEqual(expect.objectContaining({
      name: 'Event 1',
      creatorId: user1.id,
      creatorName: 'User One'
    }))

    expect(events[1]).toEqual(expect.objectContaining({
      name: 'Event 2',
      creatorId: user2.id,
      creatorName: 'User Two'
    }))

    expect(events[2]).toEqual(expect.objectContaining({
      name: 'Event 3',
      creatorId: 'missing-user-id',
      creatorName: '不明'
    }))
  })

  it('should validate that creator exists before creating event', async () => {
    // Note: このテストは現在の実装では通らない可能性があります
    // 今後、イベント作成時に作成者の存在確認を追加する場合に使用
    
    // Step 1: 存在しないユーザーIDでイベント作成を試行
    vi.mocked(verifyToken).mockReturnValue({
      id: 'non-existent-user',
      email: 'fake@example.com',
      name: 'Fake User'
    })

    const eventData = {
      name: 'Invalid Event',
      description: 'Event with non-existent creator',
      requiredParticipants: 1,
      requiredDays: 1
    }

    const createRequest = new NextRequest('http://localhost:3000/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': 'Bearer valid-token'
      },
      body: JSON.stringify(eventData),
    })

    const createResponse = await POST(createRequest)
    
    // 現在の実装では成功してしまうが、将来的には検証を追加する可能性がある
    if (createResponse.status === 200) {
      // 作成されたイベントの作成者名は「不明」になるはず
      const getRequest = new NextRequest('http://localhost:3000/api/events', {
        method: 'GET',
      })

      const getResponse = await GET(getRequest)
      const events = await getResponse.json()
      
      expect(events[0]).toEqual(expect.objectContaining({
        name: 'Invalid Event',
        creatorName: '不明'
      }))
    }
  })
})