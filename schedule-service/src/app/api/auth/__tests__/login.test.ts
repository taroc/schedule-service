import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../login/route'

// モジュールのモック
vi.mock('@/lib/userStorage', () => ({
  userStorage: {
    verifyPassword: vi.fn(),
  }
}))

vi.mock('@/lib/auth', () => ({
  generateToken: vi.fn().mockReturnValue('mock-jwt-token')
}))

import { userStorage } from '@/lib/userStorage'
import { generateToken } from '@/lib/auth'

describe('/api/auth/login', () => {
  const mockLoginData = {
    email: 'test@example.com',
    password: 'password123'
  }

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  }

  describe('successful login', () => {
    it('should authenticate user and return token when valid credentials provided', async () => {
      // モックの設定
      vi.mocked(userStorage.verifyPassword).mockResolvedValue(mockUser)
      
      const request = createMockRequest(mockLoginData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        user: {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name
        },
        token: 'mock-jwt-token'
      })
      
      expect(userStorage.verifyPassword).toHaveBeenCalledWith(
        mockLoginData.email,
        mockLoginData.password
      )
      expect(generateToken).toHaveBeenCalledWith({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name
      })
    })
  })

  describe('validation errors', () => {
    it('should return 400 when email is missing', async () => {
      const invalidData = { ...mockLoginData, email: '' }
      const request = createMockRequest(invalidData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email and password are required')
      expect(userStorage.verifyPassword).not.toHaveBeenCalled()
    })

    it('should return 400 when password is missing', async () => {
      const invalidData = { ...mockLoginData, password: '' }
      const request = createMockRequest(invalidData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email and password are required')
      expect(userStorage.verifyPassword).not.toHaveBeenCalled()
    })

    it('should return 400 when both fields are missing', async () => {
      const request = createMockRequest({})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email and password are required')
      expect(userStorage.verifyPassword).not.toHaveBeenCalled()
    })
  })

  describe('authentication failures', () => {
    it('should return 401 when user does not exist', async () => {
      vi.mocked(userStorage.verifyPassword).mockResolvedValue(null)
      
      const request = createMockRequest(mockLoginData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid credentials')
      expect(userStorage.verifyPassword).toHaveBeenCalledWith(
        mockLoginData.email,
        mockLoginData.password
      )
      expect(generateToken).not.toHaveBeenCalled()
    })

    it('should return 401 when password is incorrect', async () => {
      vi.mocked(userStorage.verifyPassword).mockResolvedValue(null)
      
      const invalidData = { ...mockLoginData, password: 'wrong-password' }
      const request = createMockRequest(invalidData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid credentials')
      expect(userStorage.verifyPassword).toHaveBeenCalledWith(
        invalidData.email,
        invalidData.password
      )
      expect(generateToken).not.toHaveBeenCalled()
    })

    it('should return 401 when email does not exist', async () => {
      vi.mocked(userStorage.verifyPassword).mockResolvedValue(null)
      
      const invalidData = { ...mockLoginData, email: 'nonexistent@example.com' }
      const request = createMockRequest(invalidData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid credentials')
      expect(userStorage.verifyPassword).toHaveBeenCalledWith(
        invalidData.email,
        invalidData.password
      )
      expect(generateToken).not.toHaveBeenCalled()
    })
  })

  describe('server errors', () => {
    it('should return 500 when unexpected error occurs', async () => {
      const error = new Error('Database connection failed')
      vi.mocked(userStorage.verifyPassword).mockRejectedValue(error)
      
      const request = createMockRequest(mockLoginData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(userStorage.verifyPassword).toHaveBeenCalledWith(
        mockLoginData.email,
        mockLoginData.password
      )
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
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
    it('should handle special characters in credentials', async () => {
      const specialData = {
        email: 'test+special@example.com',
        password: 'P@ssw0rd!'
      }
      
      vi.mocked(userStorage.verifyPassword).mockResolvedValue({
        ...mockUser,
        email: specialData.email
      })
      
      const request = createMockRequest(specialData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user.email).toBe(specialData.email)
      expect(userStorage.verifyPassword).toHaveBeenCalledWith(
        specialData.email,
        specialData.password
      )
    })

    it('should handle case sensitivity in email', async () => {
      const casedData = {
        email: 'Test@Example.COM',
        password: 'password123'
      }
      
      vi.mocked(userStorage.verifyPassword).mockResolvedValue(null)
      
      const request = createMockRequest(casedData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid credentials')
      expect(userStorage.verifyPassword).toHaveBeenCalledWith(
        casedData.email,
        casedData.password
      )
    })

    it('should handle empty strings as invalid credentials', async () => {
      const emptyData = {
        email: '',
        password: ''
      }
      
      const request = createMockRequest(emptyData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email and password are required')
      expect(userStorage.verifyPassword).not.toHaveBeenCalled()
    })
  })
})