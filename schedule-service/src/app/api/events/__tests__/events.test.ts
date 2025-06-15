import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

// モジュールのモック
vi.mock('@/lib/eventStorage', () => ({
  eventStorage: {
    createEvent: vi.fn(),
    getAllEvents: vi.fn(),
    getEventsByCreator: vi.fn(),
    getOpenEvents: vi.fn(),
  }
}))

vi.mock('@/lib/userStorage', () => ({
  userStorage: {
    getUserById: vi.fn(),
  }
}))

vi.mock('@/lib/auth', () => ({
  verifyToken: vi.fn()
}))

import { eventStorage } from '@/lib/eventStorage'
import { userStorage } from '@/lib/userStorage'
import { verifyToken } from '@/lib/auth'

describe('/api/events', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User'
  }

  const mockEvent = {
    id: 'event-123',
    name: 'Test Event',
    description: 'Test Description',
    requiredParticipants: 3,
    requiredDays: 2,
    creatorId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'open' as const,
    participants: []
  }

  // mockEventSerializedは使用しないため削除

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/events', () => {
    const createMockRequest = (body: unknown, token?: string) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['authorization'] = `Bearer ${token}`
      }
      
      return new NextRequest('http://localhost:3000/api/events', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
    }

    it('should create event successfully when valid data and auth provided', async () => {
      // Arrange
      vi.mocked(verifyToken).mockReturnValue(mockUser)
      vi.mocked(eventStorage.createEvent).mockResolvedValue(mockEvent)
      
      const eventData = {
        name: 'Test Event',
        description: 'Test Description',
        requiredParticipants: 3,
        requiredDays: 2
      }
      
      const request = createMockRequest(eventData, 'valid-token')
      
      // Act
      const response = await POST(request)
      const data = await response.json()
      
      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual(expect.objectContaining({
        id: mockEvent.id,
        name: mockEvent.name,
        description: mockEvent.description,
        requiredParticipants: mockEvent.requiredParticipants,
        requiredDays: mockEvent.requiredDays,
        creatorId: mockEvent.creatorId,
        status: mockEvent.status,
        participants: mockEvent.participants
      }))
      expect(data.createdAt).toBeDefined()
      expect(data.updatedAt).toBeDefined()
      expect(eventStorage.createEvent).toHaveBeenCalledWith(eventData, mockUser.id)
      expect(verifyToken).toHaveBeenCalledWith('valid-token')
    })
  })

  describe('GET /api/events', () => {
    const createMockRequest = (searchParams: Record<string, string> = {}) => {
      const url = new URL('http://localhost:3000/api/events')
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
      
      return new NextRequest(url.toString(), {
        method: 'GET',
      })
    }

    it('should return events with creator names', async () => {
      // Arrange
      const mockEvents = [mockEvent]
      const mockCreator = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      vi.mocked(eventStorage.getAllEvents).mockResolvedValue(mockEvents)
      vi.mocked(userStorage.getUserById).mockResolvedValue(mockCreator)
      
      const request = createMockRequest()
      
      // Act
      const response = await GET(request)
      const data = await response.json()
      
      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0]).toEqual(expect.objectContaining({
        id: mockEvent.id,
        name: mockEvent.name,
        description: mockEvent.description,
        requiredParticipants: mockEvent.requiredParticipants,
        requiredDays: mockEvent.requiredDays,
        creatorId: mockEvent.creatorId,
        status: mockEvent.status,
        participants: mockEvent.participants,
        creatorName: 'Test User'
      }))
      expect(data[0].createdAt).toBeDefined()
      expect(data[0].updatedAt).toBeDefined()
      expect(userStorage.getUserById).toHaveBeenCalledWith('user-123')
    })

    it('should return "不明" when creator is not found', async () => {
      // Arrange
      const mockEvents = [mockEvent]
      
      vi.mocked(eventStorage.getAllEvents).mockResolvedValue(mockEvents)
      vi.mocked(userStorage.getUserById).mockResolvedValue(null)
      
      const request = createMockRequest()
      
      // Act
      const response = await GET(request)
      const data = await response.json()
      
      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0]).toEqual(expect.objectContaining({
        id: mockEvent.id,
        name: mockEvent.name,
        description: mockEvent.description,
        requiredParticipants: mockEvent.requiredParticipants,
        requiredDays: mockEvent.requiredDays,
        creatorId: mockEvent.creatorId,
        status: mockEvent.status,
        participants: mockEvent.participants,
        creatorName: '不明'
      }))
      expect(data[0].createdAt).toBeDefined()
      expect(data[0].updatedAt).toBeDefined()
      expect(userStorage.getUserById).toHaveBeenCalledWith('user-123')
    })

    it('should handle getUsersByCreator query correctly', async () => {
      // Arrange
      const creatorId = 'user-123'
      const mockEvents = [mockEvent]
      const mockCreator = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      vi.mocked(eventStorage.getEventsByCreator).mockResolvedValue(mockEvents)
      vi.mocked(userStorage.getUserById).mockResolvedValue(mockCreator)
      
      const request = createMockRequest({ creatorId })
      
      // Act
      const response = await GET(request)
      const data = await response.json()
      
      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0]).toEqual(expect.objectContaining({
        id: mockEvent.id,
        name: mockEvent.name,
        description: mockEvent.description,
        requiredParticipants: mockEvent.requiredParticipants,
        requiredDays: mockEvent.requiredDays,
        creatorId: mockEvent.creatorId,
        status: mockEvent.status,
        participants: mockEvent.participants,
        creatorName: 'Test User'
      }))
      expect(data[0].createdAt).toBeDefined()
      expect(data[0].updatedAt).toBeDefined()
      expect(eventStorage.getEventsByCreator).toHaveBeenCalledWith(creatorId)
      expect(userStorage.getUserById).toHaveBeenCalledWith('user-123')
    })

    it('should handle open events query correctly', async () => {
      // Arrange
      const mockEvents = [mockEvent]
      const mockCreator = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      vi.mocked(eventStorage.getOpenEvents).mockResolvedValue(mockEvents)
      vi.mocked(userStorage.getUserById).mockResolvedValue(mockCreator)
      
      const request = createMockRequest({ status: 'open' })
      
      // Act
      const response = await GET(request)
      const data = await response.json()
      
      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0]).toEqual(expect.objectContaining({
        id: mockEvent.id,
        name: mockEvent.name,
        description: mockEvent.description,
        requiredParticipants: mockEvent.requiredParticipants,
        requiredDays: mockEvent.requiredDays,
        creatorId: mockEvent.creatorId,
        status: mockEvent.status,
        participants: mockEvent.participants,
        creatorName: 'Test User'
      }))
      expect(data[0].createdAt).toBeDefined()
      expect(data[0].updatedAt).toBeDefined()
      expect(eventStorage.getOpenEvents).toHaveBeenCalled()
      expect(userStorage.getUserById).toHaveBeenCalledWith('user-123')
    })
  })

  describe('creator name resolution edge cases', () => {
    const createMockRequest = () => {
      return new NextRequest('http://localhost:3000/api/events', {
        method: 'GET',
      })
    }

    it('should handle multiple events with different creators', async () => {
      // Arrange
      const mockEvents = [
        { ...mockEvent, id: 'event-1', creatorId: 'user-1' },
        { ...mockEvent, id: 'event-2', creatorId: 'user-2' },
        { ...mockEvent, id: 'event-3', creatorId: 'user-1' } // Same creator as first
      ]
      
      vi.mocked(eventStorage.getAllEvents).mockResolvedValue(mockEvents)
      vi.mocked(userStorage.getUserById)
        .mockResolvedValueOnce({
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User One',
          password: 'hashed',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .mockResolvedValueOnce({
          id: 'user-2',
          email: 'user2@example.com',
          name: 'User Two',
          password: 'hashed',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .mockResolvedValueOnce({
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User One',
          password: 'hashed',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      
      const request = createMockRequest()
      
      // Act
      const response = await GET(request)
      const data = await response.json()
      
      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(3)
      expect(data[0].creatorName).toBe('User One')
      expect(data[1].creatorName).toBe('User Two')
      expect(data[2].creatorName).toBe('User One')
      expect(userStorage.getUserById).toHaveBeenCalledTimes(3)
    })

    it('should handle getUserById errors gracefully', async () => {
      // Arrange
      const mockEvents = [mockEvent]
      
      vi.mocked(eventStorage.getAllEvents).mockResolvedValue(mockEvents)
      vi.mocked(userStorage.getUserById).mockRejectedValue(new Error('Database error'))
      
      const request = createMockRequest()
      
      // Act
      const response = await GET(request)
      
      // Assert
      expect(response.status).toBe(500)
    })

    it('should return events with participant names resolved', async () => {
      // Arrange
      const mockEventWithParticipants = {
        ...mockEvent,
        participants: ['participant-1', 'participant-2']
      }
      const mockCreator = {
        id: 'user-123',
        email: 'creator@example.com',
        name: 'Event Creator',
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      const mockParticipant1 = {
        id: 'participant-1',
        email: 'participant1@example.com',
        name: 'Participant One',
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      const mockParticipant2 = {
        id: 'participant-2',
        email: 'participant2@example.com',
        name: 'Participant Two',
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      vi.mocked(eventStorage.getAllEvents).mockResolvedValue([mockEventWithParticipants])
      vi.mocked(userStorage.getUserById)
        .mockResolvedValueOnce(mockCreator) // for creator
        .mockResolvedValueOnce(mockParticipant1) // for participant-1
        .mockResolvedValueOnce(mockParticipant2) // for participant-2
      
      const request = createMockRequest()
      
      // Act
      const response = await GET(request)
      const data = await response.json()
      
      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0]).toEqual(expect.objectContaining({
        id: mockEventWithParticipants.id,
        name: mockEventWithParticipants.name,
        creatorId: mockEventWithParticipants.creatorId,
        creatorName: 'Event Creator',
        participants: ['participant-1', 'participant-2'],
        participantNames: ['Participant One', 'Participant Two']
      }))
      
      // getUserById should be called for creator + each participant
      expect(userStorage.getUserById).toHaveBeenCalledTimes(3)
      expect(userStorage.getUserById).toHaveBeenCalledWith('user-123')
      expect(userStorage.getUserById).toHaveBeenCalledWith('participant-1')
      expect(userStorage.getUserById).toHaveBeenCalledWith('participant-2')
    })

    it('should handle missing participant names gracefully', async () => {
      // Arrange
      const mockEventWithParticipants = {
        ...mockEvent,
        participants: ['participant-1', 'missing-participant']
      }
      const mockCreator = {
        id: 'user-123',
        email: 'creator@example.com',
        name: 'Event Creator',
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      const mockParticipant1 = {
        id: 'participant-1',
        email: 'participant1@example.com',
        name: 'Participant One',
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      vi.mocked(eventStorage.getAllEvents).mockResolvedValue([mockEventWithParticipants])
      vi.mocked(userStorage.getUserById)
        .mockResolvedValueOnce(mockCreator) // for creator
        .mockResolvedValueOnce(mockParticipant1) // for participant-1
        .mockResolvedValueOnce(null) // for missing-participant
      
      const request = createMockRequest()
      
      // Act
      const response = await GET(request)
      const data = await response.json()
      
      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0]).toEqual(expect.objectContaining({
        id: mockEventWithParticipants.id,
        name: mockEventWithParticipants.name,
        creatorId: mockEventWithParticipants.creatorId,
        creatorName: 'Event Creator',
        participants: ['participant-1', 'missing-participant'],
        participantNames: ['Participant One', '不明']
      }))
    })
  })
})