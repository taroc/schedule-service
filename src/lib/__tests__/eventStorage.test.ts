import { describe, it, expect, beforeEach, vi } from 'vitest'
import { eventStorage } from '../eventStorage'
import { userStorage } from '../userStorage'
import { CreateEventRequest } from '@/types/event'
import { scheduleStorage } from '../scheduleStorage'
import { mockPrisma } from './mocks/mockPrisma'

// Mock the storage modules
vi.mock('../userStorage')
vi.mock('../scheduleStorage')

describe('eventStorage', () => {
  const mockEventRequest: CreateEventRequest = {
    name: 'Test Event',
    description: 'Test Description',
    requiredParticipants: 3,
    requiredTimeSlots: 2,
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3日後
    periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明日から
    periodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1週間後まで
  }

  const mockEventWithDeadline: CreateEventRequest = {
    name: 'Test Event with Deadline',
    description: 'Test Description',
    requiredParticipants: 3,
    requiredTimeSlots: 2,
    periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明日から
    periodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1週間後まで
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // 明日
  }

  let mockCreatorId: string
  let mockUserId1: string
  let mockUserId2: string
  let mockUserId3: string
  let mockUserId4: string
  let testRunId: string

  beforeEach(() => {
    vi.clearAllMocks()
    
    // テスト毎にユニークなIDを生成
    testRunId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
    mockCreatorId = `creator-${testRunId}`
    mockUserId1 = `user1-${testRunId}`
    mockUserId2 = `user2-${testRunId}`
    mockUserId3 = `user3-${testRunId}`
    mockUserId4 = `user4-${testRunId}`

    // Mock userStorage.createUser to avoid database calls
    const mockUserStorage = vi.mocked(userStorage)
    mockUserStorage.createUser.mockResolvedValue({
      id: 'mock-user-id',
      password: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    // Mock Prisma operations for eventStorage
    let eventIdCounter = 0
    mockPrisma.event.create.mockImplementation(async (args) => {
      eventIdCounter++
      return {
        id: `event-${Date.now()}-${eventIdCounter}`,
        name: args.data.name,
        description: args.data.description,
        requiredParticipants: args.data.requiredParticipants,
        requiredTimeSlots: args.data.requiredTimeSlots || 1,
        creatorId: args.data.creatorId,
        status: 'open',
        participants: [args.data.creatorId],
        deadline: args.data.deadline,
        createdAt: new Date(),
        updatedAt: new Date(),
        periodStart: args.data.periodStart,
        periodEnd: args.data.periodEnd,
        reservationStatus: 'open',
        matchedTimeSlots: null
      }
    })
    
    mockPrisma.event.findMany.mockResolvedValue([])
    mockPrisma.event.findUnique.mockResolvedValue(null)
    mockPrisma.event.update.mockImplementation(async (args) => ({ ...args.data }))
    mockPrisma.event.delete.mockResolvedValue({})
    mockPrisma.event.updateMany.mockResolvedValue({ count: 0 })
  })

  describe('createEvent', () => {
    it('should create event with correct creator ID', async () => {
      // Act
      const event = await eventStorage.createEvent(mockEventRequest, mockCreatorId)
      
      // Assert
      expect(event).toBeDefined()
      expect(event.id).toBeDefined()
      expect(event.name).toBe(mockEventRequest.name)
      expect(event.description).toBe(mockEventRequest.description)
      expect(event.requiredParticipants).toBe(mockEventRequest.requiredParticipants)
      expect(event.requiredTimeSlots).toBe(mockEventRequest.requiredTimeSlots)
      expect(event.periodStart).toBeInstanceOf(Date)
      expect(event.periodEnd).toBeInstanceOf(Date)
      expect(event.creatorId).toBe(mockCreatorId)
      expect(event.status).toBe('open')
      expect(event.participants).toEqual([mockCreatorId])
      expect(event.createdAt).toBeInstanceOf(Date)
      expect(event.updatedAt).toBeInstanceOf(Date)
      expect(event.deadline).toBeInstanceOf(Date)
    })

    it('should create event with deadline', async () => {
      // Act
      const event = await eventStorage.createEvent(mockEventWithDeadline, mockCreatorId)
      
      // Assert
      expect(event).toBeDefined()
      expect(event.deadline).toBeInstanceOf(Date)
      expect(event.deadline).toEqual(mockEventWithDeadline.deadline)
    })

    it('should generate unique IDs for different events', async () => {
      // Create another creator for the second event
      const anotherCreatorId = `creator2-${testRunId}`
      await userStorage.createUser({
        userId: anotherCreatorId,
        password: 'password123'
      })
      
      // Act
      const event1 = await eventStorage.createEvent(mockEventRequest, mockCreatorId)
      const event2 = await eventStorage.createEvent(mockEventRequest, anotherCreatorId)
      
      // Assert
      expect(event1.id).not.toBe(event2.id)
      expect(event1.creatorId).toBe(mockCreatorId)
      expect(event2.creatorId).toBe(anotherCreatorId)
    })

    it('should set correct timestamps', async () => {
      // Act
      const event = await eventStorage.createEvent(mockEventRequest, mockCreatorId)
      
      // Assert
      expect(event.createdAt).toBeInstanceOf(Date)
      expect(event.updatedAt).toBeInstanceOf(Date)
      expect(event.createdAt.getTime()).toBeLessThanOrEqual(event.updatedAt.getTime())
    })
  })

  describe('getEventsByCreator', () => {
    it('should return events created by specific user', async () => {
      // Arrange
      const creator1 = `user-123-${testRunId}`
      const creator2 = `user-456-${testRunId}`
      
      // Create the test users first
      await userStorage.createUser({
        userId: creator1,
        password: 'password123'
      })
      await userStorage.createUser({
        userId: creator2,
        password: 'password123'
      })
      
      await eventStorage.createEvent(mockEventRequest, creator1)
      await eventStorage.createEvent({ ...mockEventRequest, name: 'Event 2' }, creator2)
      await eventStorage.createEvent({ ...mockEventRequest, name: 'Event 3' }, creator1)
      
      // Act
      const creator1Events = await eventStorage.getEventsByCreator(creator1)
      const creator2Events = await eventStorage.getEventsByCreator(creator2)
      
      // Assert
      expect(creator1Events).toHaveLength(2)
      expect(creator2Events).toHaveLength(1)
      expect(creator1Events.every(event => event.creatorId === creator1)).toBe(true)
      expect(creator2Events.every(event => event.creatorId === creator2)).toBe(true)
    })

    it('should return empty array when creator has no events', async () => {
      // Arrange
      const creator1 = `user-123-${testRunId}`
      const creator2 = `user-456-${testRunId}`
      
      await userStorage.createUser({
        userId: creator1,
        password: 'password123'
      })
      await userStorage.createUser({
        userId: creator2,
        password: 'password123'
      })
      
      await eventStorage.createEvent(mockEventRequest, creator1)
      
      // Act
      const events = await eventStorage.getEventsByCreator(creator2)
      
      // Assert
      expect(events).toEqual([])
    })
  })

  describe('addParticipant', () => {
    it('should not allow creator to participate again in their own event', async () => {
      // Arrange
      const event = await eventStorage.createEvent(mockEventRequest, mockCreatorId)
      
      // Act
      const result = await eventStorage.addParticipant(event.id, mockCreatorId)
      
      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('Already joined')
    })

    it('should allow other users to participate', async () => {
      // Arrange
      const event = await eventStorage.createEvent(mockEventRequest, mockCreatorId)
      const participantId = mockUserId1 // Use existing test user
      
      // Act
      const result = await eventStorage.addParticipant(event.id, participantId)
      
      // Assert
      expect(result.success).toBe(true)
      
      // 参加者が追加されたかチェック
      const updatedEvent = await eventStorage.getEventById(event.id)
      expect(updatedEvent?.participants).toContain(participantId)
    })

    it('should prevent duplicate participation', async () => {
      // Arrange
      const event = await eventStorage.createEvent(mockEventRequest, mockCreatorId)
      const participantId = mockUserId1 // Use existing test user
      
      await eventStorage.addParticipant(event.id, participantId)
      
      // Act
      const result = await eventStorage.addParticipant(event.id, participantId)
      
      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('Already joined')
    })
  })

  describe('deleteEvent', () => {
    it('should delete event and related participations', async () => {
      // Arrange
      const event = await eventStorage.createEvent(mockEventRequest, mockCreatorId)
      await eventStorage.addParticipant(event.id, mockUserId1)
      
      // Act
      const result = await eventStorage.deleteEvent(event.id)
      
      // Assert
      expect(result).toBe(true)
      const deletedEvent = await eventStorage.getEventById(event.id)
      expect(deletedEvent).toBeNull()
      
      // 参加記録も削除されているかチェック
      const participantEvents = await eventStorage.getParticipantEvents(mockUserId1)
      expect(participantEvents).toHaveLength(0)
    })
  })

  describe('updateEventStatus', () => {
    it('should update event status and matched time slots', async () => {
      // Arrange
      const event = await eventStorage.createEvent(mockEventRequest, mockCreatorId)
      const matchedTimeSlots = [
        { date: new Date('2025-01-01'), timeSlot: 'daytime' as const },
        { date: new Date('2025-01-02'), timeSlot: 'evening' as const }
      ]
      
      // Act
      const result = await eventStorage.updateEventStatus(event.id, 'matched', matchedTimeSlots)
      
      // Assert
      expect(result).toBe(true)
      
      // 更新されたイベントを取得してチェック
      const updatedEvent = await eventStorage.getEventById(event.id)
      expect(updatedEvent?.status).toBe('matched')
      expect(updatedEvent?.matchedTimeSlots).toHaveLength(2)
      expect(updatedEvent?.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      // Arrange
      const anotherCreatorId = `user-456-${testRunId}`
      const participantId = `user-789-${testRunId}`
      
      // Create test users
      await userStorage.createUser({
        userId: anotherCreatorId,
        password: 'password123'
      })
      await userStorage.createUser({
        userId: participantId,
        password: 'password123'
      })
      
      const event1 = await eventStorage.createEvent(mockEventRequest, mockCreatorId)
      const event2 = await eventStorage.createEvent(mockEventRequest, anotherCreatorId)
      
      await eventStorage.addParticipant(event1.id, participantId)
      await eventStorage.addParticipant(event2.id, participantId)
      await eventStorage.updateEventStatus(event1.id, 'matched')
      
      // Act
      const stats = await eventStorage.getStats()
      
      // Assert
      expect(stats.totalEvents).toBeGreaterThanOrEqual(2)
      expect(stats.openEvents).toBeGreaterThanOrEqual(1)
      expect(stats.matchedEvents).toBeGreaterThanOrEqual(1)
      expect(stats.totalParticipations).toBeGreaterThanOrEqual(2) // 少なくとも2つの参加
    }, 10000) // 10秒のタイムアウト
  })

  describe('schedule integration', () => {
    it('should find events with available time slots', async () => {
      // Arrange - ユーザーとイベントを作成
      const user1 = mockUserId1
      const user2 = mockUserId2
      
      // イベントを作成
      const event = await eventStorage.createEvent({
        ...mockEventRequest,
        requiredParticipants: 2
      }, user1)
      
      // 参加者を追加
      await eventStorage.addParticipant(event.id, user2)
      
      // 共通で空いている時間帯を設定
      const commonDate = '2025-01-01'
      await scheduleStorage.setAvailability(user1, [commonDate], { daytime: true, evening: false })
      await scheduleStorage.setAvailability(user2, [commonDate], { daytime: true, evening: false })
      
      // Act - 取得したイベントを確認
      const retrievedEvent = await eventStorage.getEventById(event.id)
      
      // Assert
      expect(retrievedEvent).toBeDefined()
      expect(retrievedEvent?.participants).toContain(user2)
      expect(retrievedEvent?.requiredTimeSlots).toBe(2)
    })
  })

  describe('deadline functionality', () => {
    it('should get expired events', async () => {
      // Arrange - 期限切れのイベントを作成
      const expiredDeadline = new Date(Date.now() - 60 * 60 * 1000) // 1時間前
      const expiredEvent = await eventStorage.createEvent({
        ...mockEventRequest,
        deadline: expiredDeadline
      }, mockCreatorId)

      // Act
      const expiredEvents = await eventStorage.getExpiredEvents()

      // Assert
      expect(expiredEvents).toHaveLength(1)
      expect(expiredEvents[0].id).toBe(expiredEvent.id)
      expect(expiredEvents[0].deadline).toEqual(expiredDeadline)
    })

    it('should expire overdue events', async () => {
      // Arrange - 期限切れのイベントを作成
      const expiredDeadline = new Date(Date.now() - 60 * 60 * 1000) // 1時間前
      const expiredEvent = await eventStorage.createEvent({
        ...mockEventRequest,
        deadline: expiredDeadline
      }, mockCreatorId)

      // Act
      const expiredCount = await eventStorage.expireOverdueEvents()

      // Assert
      expect(expiredCount).toBe(1)
      
      // ステータスが更新されているかチェック
      const updatedEvent = await eventStorage.getEventById(expiredEvent.id)
      expect(updatedEvent?.status).toBe('expired')
    })

    it('should not expire events with future deadlines', async () => {
      // Arrange - 将来の期限のイベントを作成
      const futureDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000) // 明日
      await eventStorage.createEvent({
        ...mockEventRequest,
        deadline: futureDeadline
      }, mockCreatorId)

      // Act
      const expiredCount = await eventStorage.expireOverdueEvents()

      // Assert
      expect(expiredCount).toBe(0)
    })

    it('should not affect events without deadlines', async () => {
      // Arrange - 期限なしのイベントを作成
      await eventStorage.createEvent(mockEventRequest, mockCreatorId)

      // Act
      const expiredCount = await eventStorage.expireOverdueEvents()

      // Assert
      expect(expiredCount).toBe(0)
    })
  })

  describe('participating events filtering', () => {
    it('should exclude matched events from participating events list', async () => {
      // Arrange
      const creator = mockUserId3
      const participant = mockUserId4
      
      // オープンなイベントを作成
      const openEvent = await eventStorage.createEvent({
        ...mockEventRequest,
        name: 'Open Event'
      }, creator)
      
      // 成立済みイベントを作成
      const matchedEvent = await eventStorage.createEvent({
        ...mockEventRequest,
        name: 'Matched Event'
      }, creator)
      
      // 参加者を追加
      await eventStorage.addParticipant(openEvent.id, participant)
      await eventStorage.addParticipant(matchedEvent.id, participant)
      
      // 一つのイベントを成立状態にする（時間帯も指定）
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7日後
      const matchedTimeSlots = [
        { date: futureDate, timeSlot: 'daytime' as const }
      ]
      await eventStorage.updateEventStatus(matchedEvent.id, 'matched', matchedTimeSlots)
      
      // Act
      const participatingEvents = await eventStorage.getParticipatingEventsInRange(participant)
      const matchedEvents = await eventStorage.getMatchedEventsForUser(participant)
      
      // Assert
      expect(participatingEvents).toHaveLength(1)
      expect(participatingEvents[0].name).toBe('Open Event')
      expect(participatingEvents[0].status).toBe('open')
      
      expect(matchedEvents).toHaveLength(1)
      expect(matchedEvents[0].name).toBe('Matched Event')
      expect(matchedEvents[0].status).toBe('matched')
    })
  })
})