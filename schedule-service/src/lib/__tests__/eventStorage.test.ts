import { describe, it, expect, beforeEach } from 'vitest'
import { eventStorage } from '../eventStorage'
import { CreateEventRequest } from '@/types/event'
import { scheduleStorage } from '../scheduleStorage'
import { getCommonAvailableDates } from '../scheduleUtils'

describe('eventStorage', () => {
  const mockEventRequest: CreateEventRequest = {
    name: 'Test Event',
    description: 'Test Description',
    requiredParticipants: 3,
    requiredDays: 2
  }

  const mockCreatorId = 'user-123'

  beforeEach(() => {
    // テスト前にストレージをクリア
    ;(eventStorage as any).events = []
    ;(eventStorage as any).participations = []
    ;(scheduleStorage as any).schedules = []
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
      expect(event.requiredDays).toBe(mockEventRequest.requiredDays)
      expect(event.creatorId).toBe(mockCreatorId)
      expect(event.status).toBe('open')
      expect(event.participants).toEqual([])
      expect(event.createdAt).toBeInstanceOf(Date)
      expect(event.updatedAt).toBeInstanceOf(Date)
    })

    it('should generate unique IDs for different events', async () => {
      // Act
      const event1 = await eventStorage.createEvent(mockEventRequest, mockCreatorId)
      const event2 = await eventStorage.createEvent(mockEventRequest, 'user-456')
      
      // Assert
      expect(event1.id).not.toBe(event2.id)
      expect(event1.creatorId).toBe(mockCreatorId)
      expect(event2.creatorId).toBe('user-456')
    })

    it('should set correct timestamps', async () => {
      // Arrange
      const beforeCreate = new Date()
      
      // Act
      const event = await eventStorage.createEvent(mockEventRequest, mockCreatorId)
      
      // Assert
      const afterCreate = new Date()
      expect(event.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
      expect(event.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
      expect(event.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
      expect(event.updatedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
    })
  })

  describe('getEventsByCreator', () => {
    it('should return events created by specific user', async () => {
      // Arrange
      const creator1 = 'user-123'
      const creator2 = 'user-456'
      
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
      await eventStorage.createEvent(mockEventRequest, 'user-123')
      
      // Act
      const events = await eventStorage.getEventsByCreator('user-456')
      
      // Assert
      expect(events).toEqual([])
    })
  })

  describe('addParticipant', () => {
    it('should not allow creator to participate in their own event', async () => {
      // Arrange
      const event = await eventStorage.createEvent(mockEventRequest, mockCreatorId)
      
      // Act
      const result = await eventStorage.addParticipant(event.id, mockCreatorId)
      
      // Assert
      expect(result).toBe(false)
      expect(event.participants).not.toContain(mockCreatorId)
    })

    it('should allow other users to participate', async () => {
      // Arrange
      const event = await eventStorage.createEvent(mockEventRequest, mockCreatorId)
      const participantId = 'user-456'
      
      // Act
      const result = await eventStorage.addParticipant(event.id, participantId)
      
      // Assert
      expect(result).toBe(true)
      expect(event.participants).toContain(participantId)
    })

    it('should prevent duplicate participation', async () => {
      // Arrange
      const event = await eventStorage.createEvent(mockEventRequest, mockCreatorId)
      const participantId = 'user-456'
      
      await eventStorage.addParticipant(event.id, participantId)
      
      // Act
      const result = await eventStorage.addParticipant(event.id, participantId)
      
      // Assert
      expect(result).toBe(false)
      expect(event.participants.filter(id => id === participantId)).toHaveLength(1)
    })
  })

  describe('deleteEvent', () => {
    it('should delete event and related participations', async () => {
      // Arrange
      const event = await eventStorage.createEvent(mockEventRequest, mockCreatorId)
      await eventStorage.addParticipant(event.id, 'user-456')
      
      // Act
      const result = await eventStorage.deleteEvent(event.id)
      
      // Assert
      expect(result).toBe(true)
      expect(await eventStorage.getEventById(event.id)).toBeNull()
      
      // 参加記録も削除されているかチェック
      const participantEvents = await eventStorage.getParticipantEvents('user-456')
      expect(participantEvents).toHaveLength(0)
    })
  })

  describe('updateEventStatus', () => {
    it('should update event status and matched dates', async () => {
      // Arrange
      const event = await eventStorage.createEvent(mockEventRequest, mockCreatorId)
      const matchedDates = [new Date('2025-01-01'), new Date('2025-01-02')]
      
      // Act
      const result = await eventStorage.updateEventStatus(event.id, 'matched', matchedDates)
      
      // Assert
      expect(result).toBe(true)
      expect(event.status).toBe('matched')
      expect(event.matchedDates).toEqual(matchedDates)
      expect(event.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      // Arrange
      const event1 = await eventStorage.createEvent(mockEventRequest, mockCreatorId)
      const event2 = await eventStorage.createEvent(mockEventRequest, 'user-456')
      
      await eventStorage.addParticipant(event1.id, 'user-789')
      await eventStorage.addParticipant(event2.id, 'user-789')
      await eventStorage.updateEventStatus(event1.id, 'matched')
      
      // Act
      const stats = eventStorage.getStats()
      
      // Assert
      expect(stats.totalEvents).toBe(2)
      expect(stats.openEvents).toBe(1)
      expect(stats.matchedEvents).toBe(1)
      expect(stats.totalParticipations).toBe(2)
    })
  })

  describe('schedule integration', () => {
    it('should find common available dates for participants', async () => {
      // Arrange - ユーザーの空き時間を設定
      const user1 = 'user-123'
      const user2 = 'user-456'
      const user3 = 'user-789'
      
      // 共通で空いている日を設定
      const commonDate1 = new Date('2025-01-01')
      const commonDate2 = new Date('2025-01-02')
      
      await scheduleStorage.bulkSetAvailability({
        dates: [commonDate1.toISOString(), commonDate2.toISOString()],
        timeSlots: { morning: true, afternoon: false, fullday: false }
      }, user1)
      
      await scheduleStorage.bulkSetAvailability({
        dates: [commonDate1.toISOString(), commonDate2.toISOString()],
        timeSlots: { morning: false, afternoon: true, fullday: false }
      }, user2)
      
      await scheduleStorage.bulkSetAvailability({
        dates: [commonDate1.toISOString(), commonDate2.toISOString()],
        timeSlots: { morning: false, afternoon: false, fullday: true }
      }, user3)
      
      // すべてのユーザーのスケジュールを取得
      const allSchedules = [
        ...(await scheduleStorage.getUserSchedules(user1)),
        ...(await scheduleStorage.getUserSchedules(user2)),
        ...(await scheduleStorage.getUserSchedules(user3))
      ]
      
      // Act - 共通空き日程を検索
      const commonDates = getCommonAvailableDates(
        allSchedules,
        [user1, user2, user3],
        new Date('2024-12-25'),
        new Date('2025-01-05'),
        2
      )
      
      // Assert - 全ユーザーが何らかの時間帯で空いている日付が返される
      expect(commonDates).toHaveLength(2)
      expect(commonDates[0].toDateString()).toBe(commonDate1.toDateString())
      expect(commonDates[1].toDateString()).toBe(commonDate2.toDateString())
    })
  })
})