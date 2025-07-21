import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

// モジュールのモック
vi.mock('@/lib/eventStorage', () => ({
  eventStorage: {
    createEvent: vi.fn(),
    getAllEvents: vi.fn(),
    getEventsByCreator: vi.fn(),
    getEventsByStatus: vi.fn(),
    getParticipantEvents: vi.fn(),
    getAvailableEventsForUser: vi.fn()
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
    password: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockEvent = {
    id: 'event-123',
    name: 'Test Event',
    description: 'Test Description',
    requiredParticipants: 3,
    requiredHours: 6,
    creatorId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
    periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    status: 'open' as const,
    participants: [],
    matchedTimeSlots: undefined,
    reservationStatus: 'open' as const
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
      vi.mocked(userStorage.getUserById).mockResolvedValue(mockUser)
      vi.mocked(eventStorage.createEvent).mockResolvedValue(mockEvent)
      
      const eventData = {
        name: 'Test Event',
        description: 'Test Description',
        requiredParticipants: 3,
        requiredHours: 6,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        periodStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
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
        requiredHours: mockEvent.requiredHours,
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

    const createMockRequestWithAuth = (searchParams: Record<string, string> = {}, token: string) => {
      const url = new URL('http://localhost:3000/api/events')
      Object.entries(searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value)
      })
      
      return new NextRequest(url.toString(), {
        method: 'GET',
        headers: {
          'authorization': `Bearer ${token}`
        }
      })
    }

    it('should return events without creator names', async () => {
      // Arrange
      const mockEvents = [mockEvent]
      
      vi.mocked(eventStorage.getAllEvents).mockResolvedValue(mockEvents)
      // userStorage.getUserById is no longer called
      
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
        requiredHours: mockEvent.requiredHours,
        creatorId: mockEvent.creatorId,
        status: mockEvent.status,
        participants: mockEvent.participants,
      }))
      expect(data[0].createdAt).toBeDefined()
      expect(data[0].updatedAt).toBeDefined()
      // userStorage.getUserById is no longer called since names are not stored
    })

    it('should return "不明" when creator is not found', async () => {
      // Arrange
      const mockEvents = [mockEvent]
      
      vi.mocked(eventStorage.getAllEvents).mockResolvedValue(mockEvents)
      // userStorage.getUserById is no longer called
      
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
        requiredHours: mockEvent.requiredHours,
        creatorId: mockEvent.creatorId,
        status: mockEvent.status,
        participants: mockEvent.participants,
      }))
      expect(data[0].createdAt).toBeDefined()
      expect(data[0].updatedAt).toBeDefined()
      // userStorage.getUserById is no longer called since names are not stored
    })

    it('should handle getUsersByCreator query correctly', async () => {
      // Arrange
      const creatorId = 'user-123'
      const mockEvents = [mockEvent]
      const mockCreator = {
        id: 'user-123',
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
        requiredHours: mockEvent.requiredHours,
        creatorId: mockEvent.creatorId,
        status: mockEvent.status,
        participants: mockEvent.participants,
      }))
      expect(data[0].createdAt).toBeDefined()
      expect(data[0].updatedAt).toBeDefined()
      expect(eventStorage.getEventsByCreator).toHaveBeenCalledWith(creatorId)
      // userStorage.getUserById is no longer called since names are not stored
    })

    it('should handle open events query correctly with auth (legacy behavior)', async () => {
      // Arrange
      const mockEvents = [mockEvent]
      
      vi.mocked(eventStorage.getEventsByStatus).mockResolvedValue(mockEvents)
      
      const request = createMockRequest({ status: 'matched' }) // Use non-open status for legacy behavior
      
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
        requiredHours: mockEvent.requiredHours,
        creatorId: mockEvent.creatorId,
        status: mockEvent.status,
        participants: mockEvent.participants,
      }))
      expect(data[0].createdAt).toBeDefined()
      expect(data[0].updatedAt).toBeDefined()
      expect(eventStorage.getEventsByStatus).toHaveBeenCalledWith('matched')
    })

    it('should require authentication for status=open query', async () => {
      // Arrange
      const request = createMockRequest({ status: 'open' })
      
      // Act
      const response = await GET(request)
      const data = await response.json()
      
      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('認証が必要です')
    })

    it('should return available events for authenticated user when status=open', async () => {
      // Arrange
      const mockAvailableEvents = [
        { ...mockEvent, id: 'available-event-1', creatorId: 'other-user' },
        { ...mockEvent, id: 'available-event-2', creatorId: 'another-user' }
      ]
      
      vi.mocked(verifyToken).mockReturnValue(mockUser)
      vi.mocked(eventStorage.getAvailableEventsForUser).mockResolvedValue(mockAvailableEvents)
      
      const request = createMockRequestWithAuth({ status: 'open' }, 'valid-token')
      
      // Act
      const response = await GET(request)
      const data = await response.json()
      
      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(eventStorage.getAvailableEventsForUser).toHaveBeenCalledWith(mockUser.id)
      expect(data[0].id).toBe('available-event-1')
      expect(data[1].id).toBe('available-event-2')
    })

    it('should return 401 for invalid token when status=open', async () => {
      // Arrange
      vi.mocked(verifyToken).mockReturnValue(null)
      
      const request = createMockRequestWithAuth({ status: 'open' }, 'invalid-token')
      
      // Act
      const response = await GET(request)
      const data = await response.json()
      
      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('認証が必要です')
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
      
      const request = createMockRequest()
      
      // Act
      const response = await GET(request)
      const data = await response.json()
      
      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(3)
      expect(data[0].creatorId).toBe('user-1')
      expect(data[1].creatorId).toBe('user-2')
      expect(data[2].creatorId).toBe('user-1')
      // Note: creatorName is no longer returned by the API
    })

    it('should handle getUserById errors gracefully', async () => {
      // Arrange
      const mockEvents = [mockEvent]
      
      vi.mocked(eventStorage.getAllEvents).mockResolvedValue(mockEvents)
      // Note: getUserById is no longer called in GET /events, so this test is no longer relevant
      
      const request = createMockRequest()
      
      // Act
      const response = await GET(request)
      
      // Assert
      expect(response.status).toBe(200) // Should succeed since getUserById is not called
      expect(response.status).not.toBe(500)
    })

    it('should return events with participant IDs only', async () => {
      // Arrange
      const mockEventWithParticipants = {
        ...mockEvent,
        participants: ['participant-1', 'participant-2']
      }
      
      vi.mocked(eventStorage.getAllEvents).mockResolvedValue([mockEventWithParticipants])
      
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
        participants: ['participant-1', 'participant-2']
        // Note: participantNames are no longer returned by the API
      }))
      
      // getUserById is no longer called since names are not resolved
    })

    it('should handle events with participant IDs regardless of participant existence', async () => {
      // Arrange
      const mockEventWithParticipants = {
        ...mockEvent,
        participants: ['participant-1', 'missing-participant']
      }
      
      vi.mocked(eventStorage.getAllEvents).mockResolvedValue([mockEventWithParticipants])
      
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
        participants: ['participant-1', 'missing-participant']
        // Note: API only returns participant IDs, not names
      }))
    })
  })
})