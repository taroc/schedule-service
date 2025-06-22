import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../register/route'

// モジュールのモック
vi.mock('@/lib/userStorage', () => ({
  userStorage: {
    createUser: vi.fn(),
  }
}))

vi.mock('@/lib/auth', () => ({
  generateToken: vi.fn().mockReturnValue('mock-jwt-token')
}))

import { userStorage } from '@/lib/userStorage'
import { generateToken } from '@/lib/auth'

describe('/api/auth/register', () => {
  const mockUserData = {
    userId: 'testuser',
    password: 'password123'
  }

  const mockCreatedUser = {
    id: 'testuser',
    password: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = (body: unknown) => {
    return new NextRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }

  describe('successful registration', () => {
    it('should create user and return token when valid data provided', async () => {
      // モックの設定
      vi.mocked(userStorage.createUser).mockResolvedValue(mockCreatedUser)
      
      const request = createMockRequest(mockUserData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        user: {
          id: mockCreatedUser.id
        },
        token: 'mock-jwt-token'
      })
      
      expect(userStorage.createUser).toHaveBeenCalledWith(mockUserData)
      expect(generateToken).toHaveBeenCalledWith({
        id: mockCreatedUser.id
      })
    })
  })

  describe('validation errors', () => {
    it('should return 400 when userId is missing', async () => {
      const invalidData = { ...mockUserData, userId: '' }
      const request = createMockRequest(invalidData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('User ID and password are required')
      expect(userStorage.createUser).not.toHaveBeenCalled()
    })

    it('should return 400 when password is missing', async () => {
      const invalidData = { ...mockUserData, password: '' }
      const request = createMockRequest(invalidData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('User ID and password are required')
      expect(userStorage.createUser).not.toHaveBeenCalled()
    })


    it('should return 400 when all fields are missing', async () => {
      const request = createMockRequest({})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('User ID and password are required')
      expect(userStorage.createUser).not.toHaveBeenCalled()
    })
  })

  describe('user already exists', () => {
    it('should return 409 when user already exists', async () => {
      const error = new Error('User ID already exists')
      vi.mocked(userStorage.createUser).mockRejectedValue(error)
      
      const request = createMockRequest(mockUserData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('User ID already exists')
      expect(userStorage.createUser).toHaveBeenCalledWith(mockUserData)
    })
  })

  describe('server errors', () => {
    it('should return 500 when unexpected error occurs', async () => {
      const error = new Error('Database connection failed')
      vi.mocked(userStorage.createUser).mockRejectedValue(error)
      
      const request = createMockRequest(mockUserData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(userStorage.createUser).toHaveBeenCalledWith(mockUserData)
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid-json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('edge cases', () => {
    it('should handle special characters in user data', async () => {
      const specialData = {
        userId: 'test+special',
        password: 'P@ssw0rd!'
      }
      
      vi.mocked(userStorage.createUser).mockResolvedValue({
        ...mockCreatedUser,
        id: specialData.userId
      })
      
      const request = createMockRequest(specialData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.id).toBe(specialData.userId)
    })

    it('should handle very long inputs', async () => {
      const longData = {
        userId: 'a'.repeat(100),
        password: 'P'.repeat(200)
      }
      
      vi.mocked(userStorage.createUser).mockResolvedValue({
        ...mockCreatedUser,
        id: longData.userId
      })
      
      const request = createMockRequest(longData)
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(userStorage.createUser).toHaveBeenCalledWith(longData)
    })
  })
})